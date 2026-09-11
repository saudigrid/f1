/**
 * تاريخ كل فريق — مواسمه، وسائقوه، وما حقّقه.
 *
 *   npm run sync:history
 *
 * يكتب `src/data/team-history.json`: لكل صانع مواسمُه بالضبط (لا مداه فقط)،
 * وكل سائق قاد له مع سنواته ومشاركاته وانتصاراته ومنصّاته.
 *
 * ## لماذا نقرأ النتائج بالموسم لا بالفريق
 *
 * الطريق المباشر «لكل فريق: اجلب سائقيه» يعني 214 طلباً ثم طلباً آخر لكل
 * سائق لمعرفة سنواته — آلاف الطلبات. أما قراءة **نتائج كل موسم** فتعطي
 * الثلاثي (فريق، سائق، سنة) كاملاً دفعة واحدة: نحو 300 طلب لكل تاريخ
 * الرياضة. الفارق ليس في السرعة فحسب بل في احتمال النجاة من حدّ التزامن.
 *
 * ⚠️ متسلسل بالكامل عمداً. Jolpica يحدّ **التزامن** لا العدد اليومي، فطلبان
 * متوازيان أخطر من مئتين متتابعين — وهذا ما أسقط البناء ثلاث مرات سابقاً.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';

import { sleep } from '@/lib/data/download';

import { acquireLock } from './lock';

const BASE = 'https://api.jolpi.ca/ergast/f1';
const UA = { 'user-agent': 'SaudiF1Grid/1.0 (https://saudif1grid.com) sync-script' };

/** ⚠️ Jolpica يقصّ أي حدّ أعلى من 100 بصمت. */
const PAGE = 100;

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
  /** أفضل مركز وصله في سباق. */
  bestFinish: number | null;
  /** أول انتصار وآخره — «من أين إلى أين» بلغة النتائج. */
  firstWin: { season: number; round: number; race: string } | null;
  lastWin: { season: number; round: number; race: string } | null;
  drivers: TeamDriverRow[];
}

export type TeamHistoryIndex = Record<string, TeamHistory>;

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
  number?: string;
  position: string;
  positionText: string;
  points: string;
  Driver: { driverId: string; givenName: string; familyName: string };
  Constructor: { constructorId: string };
  grid: string;
}

interface ApiRace {
  season: string;
  round: string;
  raceName: string;
  Results?: ApiResult[];
}

interface Accumulator {
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

function blank(): Accumulator {
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

async function run(): Promise<void> {
  const release = await acquireLock('sync-team-history');
  try {
    console.log('▶ تاريخ الفرق — نتائج كل موسم منذ 1950\n');

    const seasonsPayload = await json<{
      MRData: { SeasonTable: { Seasons: { season: string }[] } };
    }>(`${BASE}/seasons/?format=json&limit=100`);

    const years = (seasonsPayload?.MRData.SeasonTable.Seasons ?? []).map((row) => Number(row.season));
    if (years.length === 0) throw new Error('تعذّر جلب قائمة المواسم');

    const teams = new Map<string, Accumulator>();
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

        const races = page.MRData.RaceTable.Races ?? [];
        for (const race of races) {
          const season = Number(race.season);
          const round = Number(race.round);

          for (const result of race.Results ?? []) {
            results += 1;
            const teamId = result.Constructor.constructorId;
            let team = teams.get(teamId);
            if (!team) {
              team = blank();
              teams.set(teamId, team);
            }

            const position = Number(result.position);
            const points = Number(result.points) || 0;
            const won = position === 1;
            const podium = position >= 1 && position <= 3;

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
              // المواسم تُقرأ تصاعدياً، فأول انتصار يُثبَّت مرة وآخره يُحدَّث دوماً
              if (!team.firstWin) team.firstWin = stamp;
              team.lastWin = stamp;
            }

            let driver = team.drivers.get(result.Driver.driverId);
            if (!driver) {
              driver = {
                nameEn: `${result.Driver.givenName} ${result.Driver.familyName}`.trim(),
                seasons: new Set(),
                entries: 0,
                wins: 0,
                podiums: 0,
                points: 0,
              };
              team.drivers.set(result.Driver.driverId, driver);
            }
            driver.seasons.add(season);
            driver.entries += 1;
            driver.points += points;
            if (won) driver.wins += 1;
            if (podium) driver.podiums += 1;
          }
        }

        const total = Number(page.MRData.total) || 0;
        if (offset + PAGE >= total || races.length === 0) break;
        await sleep(220);
      }

      process.stdout.write(`\r  ${year} — ${teams.size} فريقاً · ${results} نتيجة · ${requests} طلباً`);
      await sleep(220);
    }
    process.stdout.write('\n');

    const index: TeamHistoryIndex = {};
    for (const [id, team] of teams) {
      const drivers: TeamDriverRow[] = [...team.drivers.entries()]
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
        /** الأثقل أثراً أولاً: الانتصارات، فالمنصّات، فالمشاركات. */
        .sort((a, b) => b.wins - a.wins || b.podiums - a.podiums || b.entries - a.entries);

      index[id] = {
        seasons: [...team.seasons].sort((a, b) => a - b),
        entries: team.entries,
        wins: team.wins,
        podiums: team.podiums,
        poles: team.poles,
        points: Math.round(team.points * 100) / 100,
        bestFinish: team.bestFinish,
        firstWin: team.firstWin,
        lastWin: team.lastWin,
        drivers,
      };
    }

    const file = path.join(process.cwd(), 'src', 'data', 'team-history.json');
    await fs.writeFile(file, `${JSON.stringify(index, null, 2)}\n`, 'utf8');

    const pairs = Object.values(index).reduce((sum, team) => sum + team.drivers.length, 0);
    console.log(`\n✓ ${Object.keys(index).length} فريقاً · ${pairs} ثنائية (فريق، سائق) · ${results} نتيجة`);
    console.log(`  ${path.relative(process.cwd(), file)}`);
  } finally {
    await release();
  }
}

run().catch((error) => {
  console.error('\n✗ فشل:', error instanceof Error ? error.message : error);
  process.exit(1);
});
