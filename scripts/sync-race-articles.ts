/**
 * مقالة كل سباق — من ويكيبيديا **العربية** مباشرة.
 *
 *   npm run sync:races
 *
 * يكتب `src/data/race-articles.json`: لكل سباق منذ 1950 مُلخّصه العربي ورابط
 * مقالته.
 *
 * ## لماذا العربية مباشرة لا الترجمة
 *
 * ويكيبيديا العربية تملك فعلاً مقالة لكل جائزة كبرى تقريباً. فالمسار الصحيح
 * أن نقرأ منها لا أن نترجم الإنجليزية: نصّ مكتوب بالعربية أصلاً أدقّ من ترجمة
 * آلية، **ولا يستهلك حصة الترجمة المحجوزة للأخبار اليومية**.
 *
 * ## لماذا هذا رخيص رغم أن السباقات ألف ومئة
 *
 * الطلبات مُجمَّعة: واجهة ويكيبيديا تقبل **خمسين عنواناً** في طلب روابط اللغات
 * الواحد، و**عشرين** في طلب المُلخّصات. فألف ومئة سباق تصير نحو ثمانين طلباً
 * لا ألفين ومئتين — الفرق بين دقيقة ونصف ساعة.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';

import { sleep } from '@/lib/data/download';

import { acquireLock } from './lock';

const JOLPICA = 'https://api.jolpi.ca/ergast/f1';
const UA = { 'user-agent': 'SaudiF1Grid/1.0 (https://saudif1grid.com) sync-script' };

/** ويكيبيديا تقبل خمسين عنواناً لروابط اللغات، وعشرين للمُلخّصات. */
const LANGLINK_BATCH = 50;
const EXTRACT_BATCH = 20;

export interface RaceArticle {
  /** عنوان المقالة العربية. */
  title: string;
  /** الفقرة الأولى، نصّاً صرفاً. */
  summary: string;
  /** رابط المقالة العربية. */
  url: string;
}

/** المفتاح `"{الموسم}-{الجولة}"`. */
export type RaceArticleIndex = Record<string, RaceArticle>;

async function json<T>(url: string): Promise<T | null> {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    if (attempt > 0) await sleep(1_200 * 2 ** (attempt - 1));
    try {
      const response = await fetch(url, { headers: UA, signal: AbortSignal.timeout(30_000) });
      if (response.status === 429 || response.status >= 500) continue;
      if (!response.ok) return null;
      return (await response.json()) as T;
    } catch {
      // مهلة — نعيد المحاولة
    }
  }
  return null;
}

interface WikiQuery {
  query?: {
    normalized?: { from: string; to: string }[];
    redirects?: { from: string; to: string }[];
    pages?: Record<
      string,
      { title: string; missing?: string; langlinks?: { lang: string; '*': string }[]; extract?: string }
    >;
  };
}

/**
 * تتبّع سلسلة التطبيع والتحويل.
 *
 * ⚠️ ويكيبيديا لا تعيد النتائج بالعناوين التي أرسلناها: تُطبّع «a_b» إلى
 * «A b» ثم تتبع التحويلات. بدون هذه الخريطة يعود كل شيء بعنوان لا نعرفه،
 * فتضيع المطابقة بصمت ويخرج الملف فارغاً.
 */
function resolver(payload: WikiQuery): (title: string) => string {
  const step = new Map<string, string>();
  for (const row of payload.query?.normalized ?? []) step.set(row.from, row.to);
  for (const row of payload.query?.redirects ?? []) step.set(row.from, row.to);

  return (title: string) => {
    let current = title;
    // الحدّ يمنع الدوران في تحويل دائري
    for (let hop = 0; hop < 6; hop += 1) {
      const next = step.get(current);
      if (!next || next === current) break;
      current = next;
    }
    return current;
  };
}

/** عنوان مقالة إنجليزية من رابطها. */
function titleFromUrl(url: string): string | null {
  const match = /\/wiki\/([^?#]+)/.exec(url);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]).replace(/_/g, ' ');
  } catch {
    return null;
  }
}

interface ApiRace {
  season: string;
  round: string;
  raceName: string;
  url?: string;
}

/** كل سباقات كل المواسم. */
async function listRaces(): Promise<ApiRace[]> {
  const seasons = await json<{ MRData: { total: string; SeasonTable: { Seasons: { season: string }[] } } }>(
    `${JOLPICA}/seasons/?format=json&limit=100`,
  );
  const years = (seasons?.MRData.SeasonTable.Seasons ?? []).map((row) => Number(row.season));
  if (years.length === 0) throw new Error('تعذّر جلب قائمة المواسم');

  const races: ApiRace[] = [];
  for (const year of years) {
    const page = await json<{ MRData: { RaceTable: { Races: ApiRace[] } } }>(
      `${JOLPICA}/${year}/races/?format=json&limit=100`,
    );
    const rows = page?.MRData.RaceTable.Races ?? [];
    races.push(...rows);
    process.stdout.write(`\r  المواسم: ${year} — ${races.length} سباقاً`);
    await sleep(250);
  }
  process.stdout.write('\n');
  return races;
}

/** العناوين العربية المقابلة لعناوين إنجليزية. */
async function arabicTitles(englishTitles: string[]): Promise<Map<string, string>> {
  const found = new Map<string, string>();

  for (let index = 0; index < englishTitles.length; index += LANGLINK_BATCH) {
    const batch = englishTitles.slice(index, index + LANGLINK_BATCH);
    const url =
      'https://en.wikipedia.org/w/api.php?action=query&format=json&formatversion=1&redirects=1' +
      `&prop=langlinks&lllang=ar&lllimit=500&titles=${encodeURIComponent(batch.join('|'))}`;

    const payload = await json<WikiQuery>(url);
    if (payload) {
      const resolve = resolver(payload);
      const byTitle = new Map(
        Object.values(payload.query?.pages ?? {}).map((page) => [page.title, page]),
      );

      for (const title of batch) {
        const page = byTitle.get(resolve(title));
        const arabic = page?.langlinks?.[0]?.['*'];
        if (arabic) found.set(title, arabic);
      }
    }

    process.stdout.write(
      `\r  روابط اللغات: ${Math.min(index + LANGLINK_BATCH, englishTitles.length)} / ${englishTitles.length} — بالعربية ${found.size}`,
    );
    await sleep(300);
  }
  process.stdout.write('\n');
  return found;
}

/** مُلخّصات المقالات العربية. */
async function arabicSummaries(titles: string[]): Promise<Map<string, string>> {
  const found = new Map<string, string>();

  for (let index = 0; index < titles.length; index += EXTRACT_BATCH) {
    const batch = titles.slice(index, index + EXTRACT_BATCH);
    const url =
      'https://ar.wikipedia.org/w/api.php?action=query&format=json&formatversion=1&redirects=1' +
      `&prop=extracts&exintro=1&explaintext=1&titles=${encodeURIComponent(batch.join('|'))}`;

    const payload = await json<WikiQuery>(url);
    if (payload) {
      const resolve = resolver(payload);
      const byTitle = new Map(
        Object.values(payload.query?.pages ?? {}).map((page) => [page.title, page]),
      );

      for (const title of batch) {
        const extract = byTitle.get(resolve(title))?.extract?.trim();
        // فقرة أقصر من ذلك ليست مُلخّصاً بل بقيّة قالب
        if (extract && extract.length >= 60) found.set(title, extract);
      }
    }

    process.stdout.write(
      `\r  المُلخّصات: ${Math.min(index + EXTRACT_BATCH, titles.length)} / ${titles.length} — بنصّ ${found.size}`,
    );
    await sleep(300);
  }
  process.stdout.write('\n');
  return found;
}

async function run(): Promise<void> {
  const release = await acquireLock('sync-race-articles');
  try {
    console.log('▶ مقالات السباقات من ويكيبيديا العربية\n');

    const races = await listRaces();

    /**
     * سباقات كثيرة تتشارك المقالة نفسها؟ لا — لكن بعضها بلا رابط أصلاً
     * (مواسم قديمة في Ergast)، وتلك تُترك دون مُلخّص لا تُخمَّن.
     */
    const linked = races
      .map((race) => ({ race, title: race.url ? titleFromUrl(race.url) : null }))
      .filter((row): row is { race: ApiRace; title: string } => row.title !== null);

    console.log(`  سباقات : ${races.length} · بمقالة إنجليزية: ${linked.length}\n`);

    const unique = [...new Set(linked.map((row) => row.title))];
    const arabicByEnglish = await arabicTitles(unique);

    const arabicUnique = [...new Set(arabicByEnglish.values())];
    const summaryByArabic = await arabicSummaries(arabicUnique);

    const index: RaceArticleIndex = {};
    for (const { race, title } of linked) {
      const arabic = arabicByEnglish.get(title);
      if (!arabic) continue;
      const summary = summaryByArabic.get(arabic);
      if (!summary) continue;

      index[`${race.season}-${race.round}`] = {
        title: arabic,
        summary,
        url: `https://ar.wikipedia.org/wiki/${encodeURIComponent(arabic.replace(/ /g, '_'))}`,
      };
    }

    const file = path.join(process.cwd(), 'src', 'data', 'race-articles.json');
    await fs.writeFile(file, `${JSON.stringify(index, null, 2)}\n`, 'utf8');

    const covered = Object.keys(index).length;
    console.log(`\n✓ ${covered} سباقاً بمقالة عربية من ${races.length} (${Math.round((covered / races.length) * 100)}%)`);
    console.log(`  ${path.relative(process.cwd(), file)}`);
  } finally {
    await release();
  }
}

run().catch((error) => {
  console.error('\n✗ فشل:', error instanceof Error ? error.message : error);
  process.exit(1);
});
