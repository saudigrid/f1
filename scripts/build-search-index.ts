/**
 * يبني فهرس البحث العام.
 *
 *   npm run search:index
 *
 * يكتب `public/search-index.json`: كل سائق وفريق وحلبة وحقبة بمعرّفه واسميه
 * العربي والإنجليزي ورابطه.
 *
 * ## لماذا في `public/` لا في الحزمة
 *
 * الفهرس نحو 150 كيلوبايت. لو استُورد في مكوّن لدخل حزمة **كل** صفحة، فدفع
 * ثمنَه كلُّ زائر حتى من لم يفتح البحث قطّ. وضعه في `public/` يجعله ملفاً
 * يُجلب **عند أول فتح للبحث** ويُخزَّن بعدها — فالثمن يدفعه من استخدمه.
 *
 * ## لماذا يُبنى مسبقاً لا عند الطلب
 *
 * البيانات كلها ثابتة على القرص. بناؤه في كل طلب يعني قراءة أربعة ملفات JSON
 * وتحويلها في كل ضغطة مفتاح — والقاعدة نفسها التي حكمت الموقع كله: ما لا
 * يتغيّر لا يُحسَب مرّتين.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';

import { ERAS } from '@/data/eras';
import { canonicalTeamId } from '@/data/team-aliases';
import { TEAM_NAMES } from '@/data/team-names';
import type { SearchEntry } from '@/lib/search/types';

interface DriverCard {
  id: string;
  name?: string;
  nameEn?: string;
  nationality?: string;
  image?: string | null;
  active?: boolean;
}

interface CircuitCard {
  id: string;
  name?: string;
  nameEn?: string;
  country?: string;
  locality?: string;
  image?: string | null;
  active?: boolean;
}

interface ConstructorRow {
  id: string;
  name: string;
  firstSeason: number | null;
  lastSeason: number | null;
  active: boolean;
  logo: string | null;
}

interface Champion {
  driverId: string | null;
}

async function readJson<T>(...segments: string[]): Promise<T> {
  return JSON.parse(await fs.readFile(path.join(process.cwd(), ...segments), 'utf8')) as T;
}

async function main(): Promise<void> {
  const drivers = await readJson<DriverCard[]>('src', 'data', 'driver-cards.json');
  const circuits = await readJson<CircuitCard[]>('src', 'data', 'circuits.json');
  const teams = await readJson<ConstructorRow[]>('src', 'data', 'constructors.json');
  const customLogos = await readJson<Record<string, string>>('src', 'data', 'team-logos.json');
  const customPhotos = await readJson<Record<string, string>>('src', 'data', 'driver-photos.json');

  /** أبطال العالم — يتصدّرون نتائج البحث عن اسم متكرّر. */
  const champions = await readJson<Champion[]>('src', 'data', 'champions.json');
  const championIds = new Set(
    champions.map((row) => row.driverId).filter((id): id is string => Boolean(id)),
  );

  const entries: SearchEntry[] = [];

  for (const driver of drivers) {
    if (!driver.name || !driver.nameEn) continue;
    const image = customPhotos[driver.id] ?? driver.image ?? undefined;
    entries.push({
      k: 'driver',
      n: driver.name,
      e: driver.nameEn,
      h: `/drivers/${driver.id}`,
      s: driver.nationality,
      ...(image ? { i: image } : {}),
      ...(championIds.has(driver.id) || driver.active ? { p: 1 as const } : {}),
    });
  }

  for (const circuit of circuits) {
    if (!circuit.name) continue;
    entries.push({
      k: 'circuit',
      n: circuit.name,
      e: circuit.nameEn ?? circuit.id,
      h: `/circuits/${circuit.id}`,
      s: [circuit.locality, circuit.country].filter(Boolean).join('، ') || undefined,
      ...(circuit.image ? { i: circuit.image } : {}),
      ...(circuit.active ? { p: 1 as const } : {}),
    });
  }

  /**
   * ⚠️ المعرّفات المدمجة تُستبعَد. «lotus-climax» لا صفحة له — دُمج في
   * «team_lotus»، فنتيجة بحث باسمه تقود إلى 404.
   */
  for (const team of teams) {
    if (canonicalTeamId(team.id) !== team.id) continue;
    const range =
      team.firstSeason === null
        ? undefined
        : team.active
          ? `منذ ${team.firstSeason}`
          : `${team.firstSeason}–${team.lastSeason}`;

    const logo = customLogos[team.id] ?? team.logo ?? undefined;
    entries.push({
      k: 'team',
      n: TEAM_NAMES[team.id]?.ar ?? team.name,
      e: team.name,
      // الفرق النشطة ليست لها صفحة مستقلّة بعد — تُعرض كلها في /teams
      h: team.active ? '/teams' : `/teams/former/${team.id}`,
      s: range,
      ...(logo ? { i: logo } : {}),
      ...(team.active ? { p: 1 as const } : {}),
    });
  }

  for (const era of ERAS) {
    // الحقبة الحالية بلا نهاية — تُعرض «إلى اليوم» لا «undefined»
    const range = `${era.from}–${era.to ?? 'اليوم'}`;
    entries.push({
      k: 'era',
      n: era.title,
      e: range,
      h: `/eras#${era.id}`,
      s: range,
    });
  }

  const file = path.join(process.cwd(), 'public', 'search-index.json');
  await fs.writeFile(file, JSON.stringify(entries), 'utf8');

  const size = (await fs.stat(file)).size;
  const counts = entries.reduce<Record<string, number>>((all, entry) => {
    all[entry.k] = (all[entry.k] ?? 0) + 1;
    return all;
  }, {});

  console.log('▶ فهرس البحث\n');
  console.log(`  سائقون : ${counts.driver ?? 0}`);
  console.log(`  فرق    : ${counts.team ?? 0}`);
  console.log(`  حلبات  : ${counts.circuit ?? 0}`);
  console.log(`  حقب    : ${counts.era ?? 0}`);
  console.log(`  المجموع: ${entries.length}`);
  console.log(`\n  ${(size / 1024).toFixed(0)} كيلوبايت — يُجلب عند أول فتح للبحث فقط`);
}

main().catch((error) => {
  console.error('\n✗ فشل:', error instanceof Error ? error.message : error);
  process.exit(1);
});
