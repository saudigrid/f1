/**
 * تاريخ الصانعين — 214 فريقاً منذ 1950.
 *
 *   npm run sync:teams
 *   npm run sync:teams -- --force
 *
 * يكتب `src/data/constructors.json`: المدى الزمني، والانتصارات، والألقاب،
 * والشعار.
 *
 * ⚠️ **مورّد المحرّك غير موجود في أي واجهة مفتوحة.** لا Jolpica ولا ويكي
 * بيانات تعطيه بشكل موثوق لأنه يتغيّر كل موسم (مكلارين: فورد ← بورش ← هوندا
 * ← بيجو ← مرسيدس ← هوندا ← مرسيدس). فهو مكتوب بيد للفرق البارزة في
 * `src/data/engines.ts`، ويُترك فارغاً لمن لا نعرفه — والفراغ أصدق من تخمين.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';

import { ENGINE_SUPPLIERS } from '@/data/engines';
import { LOGO_BLOCKLIST } from '@/data/logo-blocklist';
import { constructorTitles } from '@/lib/data/champions';
import { downloadAsset, sleep } from '@/lib/data/download';
import { getCommonsFile, searchCommons } from '@/lib/images/commons';
import type { ImageCredit } from '@/lib/types';

import { acquireLock } from './lock';

const BASE = 'https://api.jolpi.ca/ergast/f1';
const UA = { 'user-agent': 'SaudiF1Grid/1.0 (https://saudif1grid.com) sync-script' };

export interface ConstructorRecord {
  id: string;
  name: string;
  nationality: string;
  wikipediaUrl: string;
  firstSeason: number | null;
  lastSeason: number | null;
  seasonCount: number;
  wins: number;
  titles: number[];
  /** هل الفريق على الشبكة هذا الموسم؟ */
  active: boolean;
  engines: string | null;
  logo: string | null;
  logoCredit: ImageCredit | null;
}

async function json<T>(url: string): Promise<T | null> {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    if (attempt > 0) await sleep(1_500 * 2 ** (attempt - 1));
    try {
      const response = await fetch(url, { headers: UA, signal: AbortSignal.timeout(25_000) });
      if (response.status === 429 || response.status >= 500) continue;
      if (!response.ok) return null;
      return (await response.json()) as T;
    } catch {
      // مهلة — نعيد
    }
  }
  return null;
}

/**
 * شعار الفريق.
 *
 * الشعارات علامات تجارية، لكن استخدامها **للدلالة على الفريق نفسه** استعمال
 * وصفي معتاد في التغطية الصحفية. ومع ذلك لا نأخذ إلا ما كان على كومنز برخصة
 * حرّة — فكثير من الشعارات البسيطة في الملك العام لأن الأشكال المجرّدة لا
 * تُحمى بحقّ المؤلف.
 */
async function findLogo(name: string): Promise<{ url: string; credit: ImageCredit } | null> {
  const words = name.toLowerCase().split(/\s+/).filter((word) => word.length > 2);

  for (const term of [`${name} F1 logo`, `${name} logo`]) {
    const hits = await searchCommons(
      term,
      (title) => {
        const haystack = title.toLowerCase().replace(/[_\-.:()/,]+/g, ' ');
        return /\b(logo|emblem|badge|wordmark|monogram)\b/.test(haystack) &&
          words.some((word) => haystack.includes(word));
      },
      { allowHistoric: true },
    );

    if (hits.length > 0) {
      const file = await getCommonsFile(hits[0].url, 400);
      return { url: file?.url ?? hits[0].url, credit: file?.credit ?? hits[0].credit };
    }
    await sleep(800);
  }
  return null;
}

interface ApiConstructor {
  constructorId: string;
  name: string;
  nationality: string;
  url: string;
}

async function run(): Promise<void> {
  const force = process.argv.includes('--force');
  const file = path.join(process.cwd(), 'src', 'data', 'constructors.json');

  let existing: ConstructorRecord[] = [];
  try {
    existing = JSON.parse(await fs.readFile(file, 'utf8')) as ConstructorRecord[];
  } catch {
    existing = [];
  }
  const byId = new Map(existing.map((row) => [row.id, row]));

  // كل الصانعين
  const all: ApiConstructor[] = [];
  for (let offset = 0; ; offset += 100) {
    const page = await json<{
      MRData: { total: string; ConstructorTable: { Constructors: ApiConstructor[] } };
    }>(`${BASE}/constructors/?format=json&limit=100&offset=${offset}`);

    const rows = page?.MRData.ConstructorTable.Constructors ?? [];
    all.push(...rows);
    if (rows.length < 100) break;
    await sleep(400);
  }

  // فرق الموسم الحالي
  const year = new Date().getUTCFullYear();
  const current = await json<{ MRData: { ConstructorTable: { Constructors: ApiConstructor[] } } }>(
    `${BASE}/${year}/constructors/?format=json&limit=100`,
  );
  const activeIds = new Set(
    (current?.MRData.ConstructorTable.Constructors ?? []).map((row) => row.constructorId),
  );

  console.log(`▶ ${all.length} صانعاً\n`);

  let done = 0;
  for (const constructor of all) {
    const cached = byId.get(constructor.constructorId);
    if (!force && cached?.firstSeason) {
      // نحدّث النشاط والألقاب فقط — الباقي ثابت
      byId.set(constructor.constructorId, {
        ...cached,
        active: activeIds.has(constructor.constructorId),
        titles: constructorTitles(constructor.constructorId),
      });
      continue;
    }

    /**
     * ⚠️ متتابعان لا متوازيان. Jolpica يحدّ **التزامن**، وطلبان معاً × عدّة
     * عمليات = 429 — وهو ما أسقط البناء ثلاث مرات قبل أن نفهم السبب.
     */
    const seasons = await json<{ MRData: { SeasonTable: { Seasons: { season: string }[] } } }>(
      `${BASE}/constructors/${constructor.constructorId}/seasons/?format=json&limit=100`,
    );
    const wins = await json<{ MRData: { total: string } }>(
      `${BASE}/constructors/${constructor.constructorId}/results/1/?format=json&limit=1`,
    );

    const years = (seasons?.MRData.SeasonTable.Seasons ?? [])
      .map((row) => Number(row.season))
      .sort((a, b) => a - b);

    /**
     * ⚠️ لا بحث لمن في قائمة الحظر. أسماء فرق كثيرة كلمات إنجليزية عادية
     * (Eagle، Shadow، Life، Turner)، فالبحث يجد **الاسم** لا **الجهة** ويعود
     * بشعار شركة حواسيب أو مغنّية. راجع `logo-blocklist.ts` — كل مدخل فيها
     * خطأ وقع فعلاً وصُحّح بيد.
     */
    const blocked = LOGO_BLOCKLIST.has(constructor.constructorId);
    const logo = cached?.logo || blocked ? null : await findLogo(constructor.name);
    let logoPath = cached?.logo ?? null;
    let logoCredit = cached?.logoCredit ?? null;

    if (logo) {
      logoPath = await downloadAsset(logo.url, 'teams', constructor.constructorId);
      logoCredit = logoPath ? logo.credit : null;
    }

    byId.set(constructor.constructorId, {
      id: constructor.constructorId,
      name: constructor.name,
      nationality: constructor.nationality,
      wikipediaUrl: constructor.url,
      firstSeason: years[0] ?? null,
      lastSeason: years[years.length - 1] ?? null,
      seasonCount: years.length,
      wins: Number(wins?.MRData.total ?? 0) || 0,
      titles: constructorTitles(constructor.constructorId),
      active: activeIds.has(constructor.constructorId),
      engines: ENGINE_SUPPLIERS[constructor.constructorId] ?? null,
      logo: logoPath,
      logoCredit,
    });

    done += 1;
    const row = byId.get(constructor.constructorId)!;
    console.log(
      `  ${row.logo ? '◆' : '·'} ${constructor.constructorId.padEnd(20)}` +
        `${String(row.firstSeason ?? '—').padStart(4)}–${String(row.lastSeason ?? '—').padEnd(5)}` +
        `${String(row.wins).padStart(4)} فوز${row.titles.length ? `  ${row.titles.length} لقب` : ''}`,
    );

    if (done % 10 === 0) {
      const rows = all.map((c) => byId.get(c.constructorId)).filter(Boolean) as ConstructorRecord[];
      await fs.writeFile(file, `${JSON.stringify(rows, null, 2)}\n`, 'utf8');
    }
    await sleep(500);
  }

  const rows = all
    .map((c) => byId.get(c.constructorId))
    .filter(Boolean) as ConstructorRecord[];

  rows.sort((a, b) => (b.titles.length - a.titles.length) || (b.wins - a.wins));
  await fs.writeFile(file, `${JSON.stringify(rows, null, 2)}\n`, 'utf8');

  console.log('\n── الخلاصة ─────────────────────');
  console.log(`صانعون   : ${rows.length}`);
  console.log(`بشعار    : ${rows.filter((r) => r.logo).length}`);
  console.log(`بمحرّك    : ${rows.filter((r) => r.engines).length}`);
  console.log(`نشطون    : ${rows.filter((r) => r.active).length}`);
}

async function main(): Promise<void> {
  const release = await acquireLock('sync-constructors');
  try {
    await run();
  } finally {
    await release();
  }
}

main().catch((error) => {
  console.error('\n✗ فشلت المزامنة:', error instanceof Error ? error.message : error);
  process.exit(1);
});
