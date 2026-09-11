/**
 * تاريخ كل فريق وكل سائق، وأرقام الرياضة القياسية — من زحف واحد.
 *
 *   npm run sync:history
 *
 * يكتب ملفّين من **نفس الزحف**:
 *
 *   src/data/team-history.json    مواسم كل فريق، وكل سائق قاد له
 *   src/data/driver-records.json  حياة كل سائق العالمية + الأرقام القياسية
 *
 * ## لماذا نقرأ النتائج بالموسم لا بالفريق ولا بالسائق
 *
 * الطريق المباشر «لكل فريق: اجلب سائقيه» يعني 214 طلباً ثم طلباً آخر لكل
 * سائق — آلاف الطلبات. أما قراءة **نتائج كل موسم** فتعطي كل شيء دفعة واحدة:
 * نحو 300 طلب لكل تاريخ الرياضة. الفارق ليس في السرعة فحسب بل في احتمال
 * النجاة من حدّ التزامن.
 *
 * ⚠️ متسلسل بالكامل عمداً. Jolpica يحدّ **التزامن** لا العدد اليومي، فطلبان
 * متوازيان أخطر من مئتين متتابعين — وهذا ما أسقط البناء ثلاث مرات سابقاً.
 *
 * ## لماذا ملفّان من زحف واحد لا زحفان
 *
 * كل صفّ نتيجة يحمل مجّاناً ما يلزم الأرقام القياسية: تاريخ ميلاد السائق
 * وتاريخ السباق نفسه، في **نفس** الاستجابة التي تُقرأ أصلاً لبناء تاريخ
 * الفرق. زحف ثانٍ لجلب هذا فقط يضاعف الوقت والحمل على Jolpica بلا داعٍ —
 * وهو بالضبط ما يخالفه مبدأ الموقع: ما لا يتغيّر لا يُطلَب مرّتين.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';

import { sleep } from '@/lib/data/download';

import { acquireLock } from './lock';

const BASE = 'https://api.jolpi.ca/ergast/f1';
const UA = { 'user-agent': 'SaudiF1Grid/1.0 (https://saudif1grid.com) sync-script' };

/** ⚠️ Jolpica يقصّ أي حدّ أعلى من 100 بصمت. */
const PAGE = 100;

/* ════════════════════════════════════════════════
   تاريخ الفرق — كما كان
   ════════════════════════════════════════════════ */

export interface TeamDriverRow {
  id: string;
  nameEn: string;
  firstSeason: number;
  lastSeason: number;
  /** عدد المواسم التي قاد فيها لهذا الفريق. */
  seasons: number;
  entries: number;
  wins: number;
  podiums: number;
  points: number;
}

export interface TeamHistory {
  /** المواسم التي شارك فيها فعلاً — تكشف الفجوات (رينو: 1977-1985 ثم 2002-2011). */
  seasons: number[];
  entries: number;
  wins: number;
  podiums: number;
  poles: number;
  points: number;
  bestFinish: number | null;
  firstWin: { season: number; round: number; race: string } | null;
  lastWin: { season: number; round: number; race: string } | null;
  drivers: TeamDriverRow[];
}

export type TeamHistoryIndex = Record<string, TeamHistory>;

/* ════════════════════════════════════════════════
   سجلّ كل سائق العالمي + الأرقام القياسية
   ════════════════════════════════════════════════ */

export interface DriverRecord {
  nameEn: string;
  nationality: string;
  /** YYYY-MM-DD — يأتي مجّاناً مع كل صفّ نتيجة. */
  dateOfBirth: string | null;
  seasons: number[];
  entries: number;
  wins: number;
  podiums: number;
  /** الانطلاق من المركز الأول — لا مرادف لـ«pole» التأهيلية قبل أي عقوبات. */
  gridFirst: number;
  points: number;
  bestFinish: number | null;
  firstWin: { season: number; round: number; race: string; date: string } | null;
  lastWin: { season: number; round: number; race: string; date: string } | null;
  /** أطول سلسلة انتصارات متتالية في مسيرته — عبر أي فريق. */
  bestStreak: number;
  bestStreakFrom: { season: number; round: number; race: string } | null;
  bestStreakTo: { season: number; round: number; race: string } | null;
}

export type DriverRecordIndex = Record<string, DriverRecord>;

interface RecordHolder {
  driverId: string;
  value: number;
}

export interface RecordsSummary {
  mostWins: RecordHolder[];
  mostPodiums: RecordHolder[];
  mostPoints: RecordHolder[];
  mostGridFirst: RecordHolder[];
  mostEntries: RecordHolder[];
  mostTitles: RecordHolder[];
  mostWinsSeason: (RecordHolder & { season: number })[];
  mostPointsSeason: (RecordHolder & { season: number })[];
  longestWinStreak: (RecordHolder & { from: DriverRecord['bestStreakFrom']; to: DriverRecord['bestStreakTo'] })[];
  /** العمر بالأيام وقت الفوز أو التتويج — يُحوَّل إلى سنوات في العرض. */
  youngestWinner: { driverId: string; ageDays: number; season: number; round: number; race: string } | null;
  oldestWinner: { driverId: string; ageDays: number; season: number; round: number; race: string } | null;
  youngestChampion: { driverId: string; ageDays: number; season: number } | null;
  oldestChampion: { driverId: string; ageDays: number; season: number } | null;
}

/* ════════════════════════════════════════════════
   شبكة
   ════════════════════════════════════════════════ */

async function json<T>(url: string): Promise<T | null> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    if (attempt > 0) await sleep(1_500 * 2 ** (attempt - 1));
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

interface ApiResult {
  position: string;
  points: string;
  grid: string;
  Driver: {
    driverId: string;
    givenName: string;
    familyName: string;
    dateOfBirth?: string;
    nationality?: string;
  };
  Constructor: { constructorId: string };
}

interface ApiRace {
  season: string;
  round: string;
  raceName: string;
  date: string;
  Results?: ApiResult[];
}

/* ── الفرق ──────────────────────────────────────── */

interface TeamAccumulator {
  seasons: Set<number>;
  entries: number;
  wins: number;
  podiums: number;
  poles: number;
  points: number;
  bestFinish: number | null;
  firstWin: TeamHistory['firstWin'];
  lastWin: TeamHistory['lastWin'];
  drivers: Map<
    string,
    {
      nameEn: string;
      seasons: Set<number>;
      entries: number;
      wins: number;
      podiums: number;
      points: number;
    }
  >;
}

function blankTeam(): TeamAccumulator {
  return {
    seasons: new Set(),
    entries: 0,
    wins: 0,
    podiums: 0,
    poles: 0,
    points: 0,
    bestFinish: null,
    firstWin: null,
    lastWin: null,
    drivers: new Map(),
  };
}

/* ── السائقون ───────────────────────────────────── */

interface DriverAccumulator {
  nameEn: string;
  nationality: string;
  dateOfBirth: string | null;
  seasons: Set<number>;
  entries: number;
  wins: number;
  podiums: number;
  gridFirst: number;
  points: number;
  bestFinish: number | null;
  firstWin: DriverRecord['firstWin'];
  lastWin: DriverRecord['lastWin'];
  /** حالة السلسلة الجارية — تُحدَّث سباقاً بسباق بترتيب التقويم. */
  streak: number;
  streakFrom: DriverRecord['bestStreakFrom'];
  bestStreak: number;
  bestStreakFrom: DriverRecord['bestStreakFrom'];
  bestStreakTo: DriverRecord['bestStreakTo'];
}

function blankDriver(nameEn: string, nationality: string, dateOfBirth: string | null): DriverAccumulator {
  return {
    nameEn,
    nationality,
    dateOfBirth,
    seasons: new Set(),
    entries: 0,
    wins: 0,
    podiums: 0,
    gridFirst: 0,
    points: 0,
    bestFinish: null,
    firstWin: null,
    lastWin: null,
    streak: 0,
    streakFrom: null,
    bestStreak: 0,
    bestStreakFrom: null,
    bestStreakTo: null,
  };
}

/** أيام بين تاريخَي YYYY-MM-DD — تكفي لحساب العمر بلا مكتبة تواريخ. */
function daysBetween(from: string, to: string): number {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  return Math.round((end - start) / 86_400_000);
}

async function run(): Promise<void> {
  const release = await acquireLock('sync-team-history');
  try {
    console.log('▶ تاريخ الفرق والسائقين والأرقام القياسية — نتائج كل موسم منذ 1950\n');

    const seasonsPayload = await json<{
      MRData: { SeasonTable: { Seasons: { season: string }[] } };
    }>(`${BASE}/seasons/?format=json&limit=100`);

    const years = (seasonsPayload?.MRData.SeasonTable.Seasons ?? []).map((row) => Number(row.season));
    if (years.length === 0) throw new Error('تعذّر جلب قائمة المواسم');

    const teams = new Map<string, TeamAccumulator>();
    const drivers = new Map<string, DriverAccumulator>();

    /** آخر تاريخ سباق في كل موسم — تقريب لحظة حسم اللقب. */
    const seasonLastRaceDate = new Map<number, string>();
    /** انتصارات وقطات ونقاط كل سائق في كل موسم — لأرقام «أكثر … في موسم». */
    const seasonStats = new Map<string, { driverId: string; season: number; wins: number; points: number }>();

    type WinExtreme = { driverId: string; ageDays: number; season: number; round: number; race: string };
    const winExtremes: { min: WinExtreme | null; max: WinExtreme | null } = { min: null, max: null };

    let requests = 0;
    let results = 0;

    for (const year of years) {
      for (let offset = 0; ; offset += PAGE) {
        const page = await json<{
          MRData: { total: string; RaceTable: { Races: ApiRace[] } };
        }>(`${BASE}/${year}/results/?format=json&limit=${PAGE}&offset=${offset}`);
        requests += 1;

        if (!page) {
          throw new Error(`تعذّر جلب نتائج ${year} عند الإزاحة ${offset}`);
        }

        // ⚠️ الاعتماد على ترتيب الجولات تصاعدياً ضروري لحساب سلاسل الانتصارات
        const races = page.MRData.RaceTable.Races ?? [];
        for (const race of races) {
          const season = Number(race.season);
          const round = Number(race.round);
          seasonLastRaceDate.set(season, race.date);

          for (const result of race.Results ?? []) {
            results += 1;
            const driverId = result.Driver.driverId;
            const teamId = result.Constructor.constructorId;
            const position = Number(result.position);
            const points = Number(result.points) || 0;
            const won = position === 1;
            const podium = position >= 1 && position <= 3;

            /* ── الفريق ── */
            let team = teams.get(teamId);
            if (!team) {
              team = blankTeam();
              teams.set(teamId, team);
            }
            team.seasons.add(season);
            team.entries += 1;
            team.points += points;
            if (won) team.wins += 1;
            if (podium) team.podiums += 1;
            if (Number(result.grid) === 1) team.poles += 1;
            if (position > 0 && (team.bestFinish === null || position < team.bestFinish)) {
              team.bestFinish = position;
            }
            if (won) {
              const stamp = { season, round, race: race.raceName };
              if (!team.firstWin) team.firstWin = stamp;
              team.lastWin = stamp;
            }

            let teamDriver = team.drivers.get(driverId);
            if (!teamDriver) {
              teamDriver = {
                nameEn: `${result.Driver.givenName} ${result.Driver.familyName}`.trim(),
                seasons: new Set(),
                entries: 0,
                wins: 0,
                podiums: 0,
                points: 0,
              };
              team.drivers.set(driverId, teamDriver);
            }
            teamDriver.seasons.add(season);
            teamDriver.entries += 1;
            teamDriver.points += points;
            if (won) teamDriver.wins += 1;
            if (podium) teamDriver.podiums += 1;

            /* ── السائق عالمياً ── */
            let driver = drivers.get(driverId);
            if (!driver) {
              driver = blankDriver(
                `${result.Driver.givenName} ${result.Driver.familyName}`.trim(),
                result.Driver.nationality ?? '',
                result.Driver.dateOfBirth ?? null,
              );
              drivers.set(driverId, driver);
            }
            driver.seasons.add(season);
            driver.entries += 1;
            driver.points += points;
            if (won) driver.wins += 1;
            if (podium) driver.podiums += 1;
            if (Number(result.grid) === 1) driver.gridFirst += 1;
            if (position > 0 && (driver.bestFinish === null || position < driver.bestFinish)) {
              driver.bestFinish = position;
            }

            if (won) {
              const stamp = { season, round, race: race.raceName, date: race.date };
              if (!driver.firstWin) driver.firstWin = stamp;
              driver.lastWin = stamp;

              // سلسلة الانتصارات: تمتدّ أو تبدأ من هنا
              if (driver.streak === 0) driver.streakFrom = { season, round, race: race.raceName };
              driver.streak += 1;
              if (driver.streak > driver.bestStreak) {
                driver.bestStreak = driver.streak;
                driver.bestStreakFrom = driver.streakFrom;
                driver.bestStreakTo = { season, round, race: race.raceName };
              }

              // أصغر/أكبر فائز — بالأيام، يُحوَّل لسنوات عند الكتابة
              if (driver.dateOfBirth) {
                const ageDays = daysBetween(driver.dateOfBirth, race.date);
                const entry = { driverId, ageDays, season, round, race: race.raceName };
                if (!winExtremes.min || ageDays < winExtremes.min.ageDays) winExtremes.min = entry;
                if (!winExtremes.max || ageDays > winExtremes.max.ageDays) winExtremes.max = entry;
              }
            } else {
              // أي نتيجة غير فوز تقطع السلسلة — بما فيها عدم الفوز في سباق دخله
              driver.streak = 0;
              driver.streakFrom = null;
            }

            /* ── إحصاء الموسم الواحد ── */
            const seasonKey = `${driverId}__${season}`;
            let stat = seasonStats.get(seasonKey);
            if (!stat) {
              stat = { driverId, season, wins: 0, points: 0 };
              seasonStats.set(seasonKey, stat);
            }
            if (won) stat.wins += 1;
            stat.points += points;
          }
        }

        const total = Number(page.MRData.total) || 0;
        if (offset + PAGE >= total || races.length === 0) break;
        await sleep(220);
      }

      process.stdout.write(
        `\r  ${year} — ${teams.size} فريقاً · ${drivers.size} سائقاً · ${results} نتيجة · ${requests} طلباً`,
      );
      await sleep(220);
    }
    process.stdout.write('\n');

    /* ════════════════════════════════════════════
       كتابة تاريخ الفرق — كما كان
       ════════════════════════════════════════════ */

    const teamIndex: TeamHistoryIndex = {};
    for (const [id, team] of teams) {
      const teamDrivers: TeamDriverRow[] = [...team.drivers.entries()]
        .map(([driverId, row]) => {
          const list = [...row.seasons].sort((a, b) => a - b);
          return {
            id: driverId,
            nameEn: row.nameEn,
            firstSeason: list[0],
            lastSeason: list[list.length - 1],
            seasons: list.length,
            entries: row.entries,
            wins: row.wins,
            podiums: row.podiums,
            points: Math.round(row.points * 100) / 100,
          };
        })
        .sort((a, b) => b.wins - a.wins || b.podiums - a.podiums || b.entries - a.entries);

      teamIndex[id] = {
        seasons: [...team.seasons].sort((a, b) => a - b),
        entries: team.entries,
        wins: team.wins,
        podiums: team.podiums,
        poles: team.poles,
        points: Math.round(team.points * 100) / 100,
        bestFinish: team.bestFinish,
        firstWin: team.firstWin,
        lastWin: team.lastWin,
        drivers: teamDrivers,
      };
    }

    const teamFile = path.join(process.cwd(), 'src', 'data', 'team-history.json');
    await fs.writeFile(teamFile, `${JSON.stringify(teamIndex, null, 2)}\n`, 'utf8');

    /* ════════════════════════════════════════════
       كتابة سجلّ السائقين
       ════════════════════════════════════════════ */

    const driverIndex: DriverRecordIndex = {};
    for (const [id, driver] of drivers) {
      driverIndex[id] = {
        nameEn: driver.nameEn,
        nationality: driver.nationality,
        dateOfBirth: driver.dateOfBirth,
        seasons: [...driver.seasons].sort((a, b) => a - b),
        entries: driver.entries,
        wins: driver.wins,
        podiums: driver.podiums,
        gridFirst: driver.gridFirst,
        points: Math.round(driver.points * 100) / 100,
        bestFinish: driver.bestFinish,
        firstWin: driver.firstWin,
        lastWin: driver.lastWin,
        bestStreak: driver.bestStreak,
        bestStreakFrom: driver.bestStreakFrom,
        bestStreakTo: driver.bestStreakTo,
      };
    }

    /* ── الأرقام القياسية ── */

    const top = (pick: (row: DriverAccumulator) => number, n = 10): RecordHolder[] =>
      [...drivers.entries()]
        .map(([driverId, row]) => ({ driverId, value: pick(row) }))
        .filter((row) => row.value > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, n);

    /** أبطال العالم — من champions.json المزامَن مسبقاً، لا نداء إضافي. */
    let titleCounts = new Map<string, number>();
    try {
      const champions = JSON.parse(
        await fs.readFile(path.join(process.cwd(), 'src', 'data', 'champions.json'), 'utf8'),
      ) as { season: number; driverId: string | null; complete: boolean }[];

      for (const row of champions) {
        if (!row.driverId || !row.complete) continue;
        titleCounts.set(row.driverId, (titleCounts.get(row.driverId) ?? 0) + 1);
      }
    } catch {
      // champions.json قد لا يكون مزامَناً بعد — الأرقام القياسية الأخرى تبقى صالحة
    }

    const mostTitles: RecordHolder[] = [...titleCounts.entries()]
      .map(([driverId, value]) => ({ driverId, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    const seasonRows = [...seasonStats.values()];
    const mostWinsSeason = [...seasonRows]
      .filter((row) => row.wins > 0)
      .sort((a, b) => b.wins - a.wins)
      .slice(0, 10)
      .map((row) => ({ driverId: row.driverId, value: row.wins, season: row.season }));
    const mostPointsSeason = [...seasonRows]
      .filter((row) => row.points > 0)
      .sort((a, b) => b.points - a.points)
      .slice(0, 10)
      .map((row) => ({ driverId: row.driverId, value: Math.round(row.points * 100) / 100, season: row.season }));

    const longestWinStreak = [...drivers.entries()]
      .map(([driverId, row]) => ({
        driverId,
        value: row.bestStreak,
        from: row.bestStreakFrom,
        to: row.bestStreakTo,
      }))
      .filter((row) => row.value > 1) // سلسلة من سباق واحد ليست "سلسلة"
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    /** أصغر/أكبر بطل — يحتاج تاريخ ميلاد البطل وآخر سباق في موسمه. */
    let youngestChampion: RecordsSummary['youngestChampion'] = null;
    let oldestChampion: RecordsSummary['oldestChampion'] = null;
    try {
      const champions = JSON.parse(
        await fs.readFile(path.join(process.cwd(), 'src', 'data', 'champions.json'), 'utf8'),
      ) as { season: number; driverId: string | null; complete: boolean }[];

      for (const row of champions) {
        if (!row.driverId || !row.complete) continue;
        const driver = drivers.get(row.driverId);
        const lastRace = seasonLastRaceDate.get(row.season);
        if (!driver?.dateOfBirth || !lastRace) continue;

        const ageDays = daysBetween(driver.dateOfBirth, lastRace);
        const entry = { driverId: row.driverId, ageDays, season: row.season };
        if (!youngestChampion || ageDays < youngestChampion.ageDays) youngestChampion = entry;
        if (!oldestChampion || ageDays > oldestChampion.ageDays) oldestChampion = entry;
      }
    } catch {
      // —
    }

    const recordsSummary: RecordsSummary = {
      mostWins: top((row) => row.wins),
      mostPodiums: top((row) => row.podiums),
      mostPoints: top((row) => row.points),
      mostGridFirst: top((row) => row.gridFirst),
      mostEntries: top((row) => row.entries),
      mostTitles,
      mostWinsSeason,
      mostPointsSeason,
      longestWinStreak,
      youngestWinner: winExtremes.min,
      oldestWinner: winExtremes.max,
      youngestChampion,
      oldestChampion,
    };

    const driverFile = path.join(process.cwd(), 'src', 'data', 'driver-records.json');
    await fs.writeFile(
      driverFile,
      `${JSON.stringify({ drivers: driverIndex, records: recordsSummary }, null, 2)}\n`,
      'utf8',
    );

    const pairs = Object.values(teamIndex).reduce((sum, team) => sum + team.drivers.length, 0);
    console.log('\n── الخلاصة ─────────────────────');
    console.log(`فرق          : ${Object.keys(teamIndex).length} · ${pairs} ثنائية (فريق، سائق)`);
    console.log(`سائقون       : ${Object.keys(driverIndex).length}`);
    console.log(`نتائج مقروءة : ${results}`);
    console.log(`\n  ${path.relative(process.cwd(), teamFile)}`);
    console.log(`  ${path.relative(process.cwd(), driverFile)}`);
  } finally {
    await release();
  }
}

run().catch((error) => {
  console.error('\n✗ فشل:', error instanceof Error ? error.message : error);
  process.exit(1);
});
