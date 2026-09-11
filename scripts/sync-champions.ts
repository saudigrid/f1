/**
 * أبطال العالم في كل موسم — سائقين وصانعين.
 *
 *   npm run sync:champions
 *
 * لماذا ملف بدل نداء وقت الطلب؟ لأن Jolpica لا تعطي ألقاب سائق واحد بنداء
 * واحد (تطلب `season_year` إلزامياً)، فمعرفة أن فانخيو بطل خمس مرات تكلّف 77
 * طلباً. وهي بيانات **لا تتغيّر**: بطل 1958 هو بطل 1958 إلى الأبد. فنجلبها
 * مرة ونكتبها، وتقرأها صفحة السائق وصفحة الحقب فوراً.
 *
 * الموسم الجاري يُجلب أيضاً، لكن صدارته ليست لقباً — لذلك يُستبعد ما لم يكتمل
 * (انظر الفلترة أدناه).
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';

import { sleep } from '@/lib/data/download';

const BASE = 'https://api.jolpi.ca/ergast/f1';
const UA = { 'user-agent': 'SaudiF1Grid/1.0 (https://saudif1grid.com) sync-script' };

export interface SeasonChampions {
  season: number;
  driverId: string | null;
  driverName: string | null;
  driverNationality: string | null;
  constructorId: string | null;
  constructorName: string | null;
  /** عدد الجولات المحتسَبة في الترتيب. */
  rounds: number | null;
  /**
   * هل انتهى الموسم؟
   *
   * ⚠️ متصدّر موسم جارٍ **ليس بطلاً**. أول تشغيلة سجّلت أنطونيلي بطلاً لـ2026
   * لأن الترتيب الحالي يضعه أولاً — والموسم لم ينته بعد. من يقرأ هذا الملف
   * يجب أن يعدّ الألقاب من المواسم المكتملة وحدها.
   */
  complete: boolean;
}

/**
 * جلب مع إعادة محاولة، **يرمي** عند الفشل النهائي.
 *
 * أول تشغيلة أعادت 69 بطلاً من 77: صفحات 2007 و2010 وغيرها قوبلت بحدّ المعدّل
 * فعادت null، فسُجِّل «لا بطل لهذا الموسم» — وهذا كذب لا نقص. الفراغ الصامت
 * أسوأ من التوقّف الصريح: الأول يُنشَر، والثاني يُصلَح.
 */
async function json<T>(url: string): Promise<T> {
  let lastError = 'سبب غير معروف';

  for (let attempt = 0; attempt < 5; attempt += 1) {
    if (attempt > 0) await sleep(1_500 * 2 ** (attempt - 1));
    try {
      const response = await fetch(url, { headers: UA, signal: AbortSignal.timeout(20_000) });
      if (response.status === 429 || response.status >= 500) {
        lastError = `الحالة ${response.status}`;
        continue;
      }
      if (!response.ok) throw new Error(`الحالة ${response.status}`);
      return (await response.json()) as T;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
  }

  throw new Error(`تعذّر ${url} — ${lastError}`);
}

interface StandingsList {
  season: string;
  round: string;
  DriverStandings?: {
    Driver: { driverId: string; givenName: string; familyName: string; nationality: string };
  }[];
  ConstructorStandings?: { Constructor: { constructorId: string; name: string } }[];
}

type StandingsResponse = { MRData: { StandingsTable: { StandingsLists: StandingsList[] } } };

async function main(): Promise<void> {
  const seasonsData = await json<{ MRData: { SeasonTable: { Seasons: { season: string }[] } } }>(
    `${BASE}/seasons/?format=json&limit=200`,
  );

  const seasons = seasonsData.MRData.SeasonTable.Seasons.map((entry) => Number(entry.season)).sort(
    (a, b) => a - b,
  );

  if (seasons.length === 0) throw new Error('تعذّر جلب قائمة المواسم.');

  console.log(`▶ أبطال ${seasons.length} موسماً…\n`);

  const thisYear = new Date().getUTCFullYear();
  const rows: SeasonChampions[] = [];

  for (const season of seasons) {
    const [drivers, constructors] = await Promise.all([
      json<StandingsResponse>(`${BASE}/${season}/driverStandings/1/?format=json`),
      json<StandingsResponse>(`${BASE}/${season}/constructorStandings/1/?format=json`),
    ]);

    const driverList = drivers.MRData.StandingsTable.StandingsLists?.[0];
    const driver = driverList?.DriverStandings?.[0]?.Driver ?? null;
    const constructor =
      constructors.MRData.StandingsTable.StandingsLists?.[0]?.ConstructorStandings?.[0]
        ?.Constructor ?? null;

    /**
     * موسم ماضٍ منتهٍ بالضرورة. أما الجاري (والقادم) فنسأل روزنامته: هل مرّ
     * تاريخ آخر سباق فيها؟ هذا الطلب الثالث يُدفع لموسم أو موسمين لا لسبعة
     * وسبعين.
     */
    let complete = season < thisYear;
    if (!complete) {
      const calendar = await json<{ MRData: { RaceTable: { Races: { date: string }[] } } }>(
        `${BASE}/${season}/races/?format=json&limit=100`,
      );
      const dates = calendar.MRData.RaceTable.Races.map((race) => race.date).sort();
      const finale = dates[dates.length - 1];
      complete = finale !== undefined && new Date(`${finale}T23:59:59Z`).getTime() < Date.now();
    }

    rows.push({
      season,
      driverId: driver?.driverId ?? null,
      driverName: driver ? `${driver.givenName} ${driver.familyName}` : null,
      driverNationality: driver?.nationality ?? null,
      // لقب الصانعين لم يوجد قبل 1958 — الغياب هنا حقيقة لا نقص بيانات
      constructorId: constructor?.constructorId ?? null,
      constructorName: constructor?.name ?? null,
      rounds: driverList?.round ? Number(driverList.round) : null,
      complete,
    });

    console.log(
      `  ${season}${complete ? '  ' : ' ⧗'} ` +
        `${(driver ? `${driver.givenName} ${driver.familyName}` : '—').padEnd(24)}` +
        `${constructor?.name ?? '—'}`,
    );

    await sleep(250);
  }

  const file = path.join(process.cwd(), 'src', 'data', 'champions.json');
  await fs.writeFile(file, `${JSON.stringify(rows, null, 2)}\n`, 'utf8');

  const done = rows.filter((row) => row.complete);
  const missing = done.filter((row) => !row.driverId).map((row) => row.season);

  console.log('\n── الخلاصة ─────────────────────');
  console.log(`مواسم        : ${rows.length}  (منتهية ${done.length})`);
  console.log(`بطل سائقين   : ${done.filter((row) => row.driverId).length}`);
  console.log(`بطل صانعين   : ${done.filter((row) => row.constructorId).length}  (اللقب بدأ 1958)`);

  // موسم منتهٍ بلا بطل مستحيل — لو ظهر فالبيانات ناقصة لا الرياضة
  if (missing.length > 0) {
    throw new Error(`مواسم منتهية بلا بطل سائقين: ${missing.join('، ')}`);
  }
}

main().catch((error) => {
  console.error('\n✗ فشلت المزامنة:', error instanceof Error ? error.message : error);
  process.exit(1);
});
