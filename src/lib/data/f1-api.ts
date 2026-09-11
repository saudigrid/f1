import { RESULTS_API } from '@/lib/config/sources';
import type { Driver, Race, Standings, StandingRow, Team } from '@/lib/types';

import {
  CIRCUIT_NAMES_AR,
  COUNTRIES,
  DRIVER_NAMES_AR,
  NATIONALITY_CODES,
  RACE_NAMES_AR,
  TEAM_DETAILS,
  TEAM_NAMES_AR,
  translate,
} from './arabic-names';

/**
 * عميل واجهة نتائج الفورمولا 1 (Jolpica، متوافقة مع Ergast).
 *
 * مفتوحة ومجانية وبلا مفتاح. هذه هي مصدر الحقيقة للسباقات والترتيب — تحلّ
 * محلّ البيانات التجريبية بمجرد تشغيل `npm run sync`.
 *
 * كل الأسماء تُعرَّب هنا عند حدود النظام، فلا يدخل نص إنجليزي إلى بقية
 * التطبيق إلا كاسم علم مقصود (`nameEn`).
 */

// ── أشكال الاستجابة الخام ─────────────────────────────────────
interface ApiDriver {
  driverId: string;
  permanentNumber?: string;
  givenName: string;
  familyName: string;
  nationality: string;
}

interface ApiConstructor {
  constructorId: string;
  name: string;
}

interface ApiRace {
  season: string;
  round: string;
  raceName: string;
  date: string;
  time?: string;
  Circuit: {
    circuitId: string;
    circuitName: string;
    Location: { country: string; locality: string };
  };
  Results?: {
    position: string;
    laps?: string;
    Driver: ApiDriver;
  }[];
}

async function get<T>(path: string): Promise<T> {
  const url = `${RESULTS_API.base}/${path}`;
  const response = await fetch(url, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    throw new Error(`فشل طلب ${url} — الحالة ${response.status}`);
  }

  return (await response.json()) as T;
}

/** يحوّل تاريخ ووقت الواجهة إلى ISO. بعض الجولات بلا وقت معلن بعد. */
function toIso(date: string, time?: string): string {
  return new Date(`${date}T${time ?? '12:00:00Z'}`).toISOString();
}

// ── السباقات ──────────────────────────────────────────────────

export async function fetchRaces(season: number): Promise<Race[]> {
  const data = await get<{ MRData: { RaceTable: { Races: ApiRace[] } } }>(
    `${season}/races/?format=json&limit=100`,
  );

  const now = Date.now();

  return data.MRData.RaceTable.Races.map((race): Race => {
    const countryName = race.Circuit.Location.country;
    const country = COUNTRIES[countryName] ?? { ar: countryName, code: '' };
    const startsAt = toIso(race.date, race.time);

    return {
      id: race.Circuit.circuitId,
      round: Number(race.round),
      name: translate(RACE_NAMES_AR, race.raceName, race.raceName, 'سباق'),
      nameEn: race.raceName,
      circuit: translate(
        CIRCUIT_NAMES_AR,
        race.Circuit.circuitId,
        race.Circuit.circuitName,
        'حلبة',
      ),
      country: country.ar,
      countryCode: country.code,
      startsAt,
      // عدد اللفات لا توفّره قائمة السباقات — يُملأ من النتائج بعد انتهاء الجولة
      laps: 0,
      status: new Date(startsAt).getTime() > now ? 'upcoming' : 'completed',
      podium: null,
    };
  }).sort((a, b) => a.round - b.round);
}

/**
 * يملأ منصات التتويج وعدد اللفات للجولات المنتهية.
 *
 * الواجهة تقبل مركزاً واحداً في المسار (`/results/1`) ولا تقبل قائمة، فنطلب
 * المراكز الثلاثة بالتوازي. ثلاثة طلبات صغيرة أرخص من طلب واحد يجرّ نتائج
 * كل السائقين في كل جولة.
 */
export async function attachPodiums(season: number, races: Race[]): Promise<Race[]> {
  const pages = await Promise.all(
    [1, 2, 3].map((position) =>
      get<{ MRData: { RaceTable: { Races: ApiRace[] } } }>(
        `${season}/results/${position}/?format=json&limit=100`,
      ),
    ),
  );

  const podiumByRound = new Map<number, { position: number; driverId: string }[]>();
  const lapsByRound = new Map<number, number>();

  for (const page of pages) {
    for (const race of page.MRData.RaceTable.Races) {
      const result = race.Results?.[0];
      if (!result) continue;

      const round = Number(race.round);
      const slots = podiumByRound.get(round) ?? [];
      slots.push({ position: Number(result.position), driverId: result.Driver.driverId });
      podiumByRound.set(round, slots);

      if (result.laps) lapsByRound.set(round, Number(result.laps));
    }
  }

  return races.map((race) => {
    const podium = podiumByRound.get(race.round);
    if (!podium) return race;

    // وجود نتيجة دليل قاطع على انتهاء السباق، أقوى من مقارنة التواريخ
    return {
      ...race,
      podium: podium.sort((a, b) => a.position - b.position),
      laps: lapsByRound.get(race.round) ?? race.laps,
      status: 'completed' as const,
    };
  });
}

// ── السائقون والفرق ───────────────────────────────────────────

interface DriverStandingRow {
  position: string;
  points: string;
  wins: string;
  Driver: ApiDriver;
  Constructors: ApiConstructor[];
}

interface ConstructorStandingRow {
  position: string;
  points: string;
  wins: string;
  Constructor: ApiConstructor;
}

interface StandingsResponse<T> {
  MRData: {
    StandingsTable: {
      StandingsLists: { season: string; round: string; [key: string]: unknown }[];
    };
  } & { [key: string]: unknown };
  __rows?: T;
}

async function fetchStandingsList(
  season: number,
  kind: 'driverstandings' | 'constructorstandings',
): Promise<{ season: string; round: string; [key: string]: unknown } | null> {
  const data = await get<StandingsResponse<unknown>>(`${season}/${kind}/?format=json&limit=100`);
  return data.MRData.StandingsTable.StandingsLists[0] ?? null;
}

/** الفارق عن المتصدّر يُحسب هنا مرة واحدة بدل حسابه في متصفح كل زائر. */
function withGap(rows: Omit<StandingRow, 'gapToLeader'>[]): StandingRow[] {
  const leader = rows[0]?.points ?? 0;
  return rows.map((row) => ({ ...row, gapToLeader: leader - row.points }));
}

export interface SeasonData {
  drivers: Driver[];
  teams: Team[];
  standings: Standings;
}

export async function fetchSeason(season: number): Promise<SeasonData> {
  const [driverList, constructorList] = await Promise.all([
    fetchStandingsList(season, 'driverstandings'),
    fetchStandingsList(season, 'constructorstandings'),
  ]);

  if (!driverList || !constructorList) {
    throw new Error(`لا يوجد ترتيب منشور لموسم ${season} بعد.`);
  }

  const driverRows = driverList.DriverStandings as DriverStandingRow[];
  const constructorRows = constructorList.ConstructorStandings as ConstructorStandingRow[];

  const drivers: Driver[] = driverRows.map((row) => ({
    id: row.Driver.driverId,
    name: translate(
      DRIVER_NAMES_AR,
      row.Driver.driverId,
      `${row.Driver.givenName} ${row.Driver.familyName}`,
      'سائق',
    ),
    nameEn: `${row.Driver.givenName} ${row.Driver.familyName}`,
    number: Number(row.Driver.permanentNumber ?? 0),
    teamId: row.Constructors[0]?.constructorId ?? '',
    countryCode: NATIONALITY_CODES[row.Driver.nationality] ?? '',
  }));

  const teams: Team[] = constructorRows.map((row) => {
    const id = row.Constructor.constructorId;
    const details = TEAM_DETAILS[id];
    return {
      id,
      name: translate(TEAM_NAMES_AR, id, row.Constructor.name, 'فريق'),
      nameEn: row.Constructor.name,
      color: details?.color ?? '#888888',
      base: details?.base ?? '',
      powerUnit: details?.powerUnit ?? '',
    };
  });

  const standings: Standings = {
    season,
    updatedAt: new Date().toISOString(),
    drivers: withGap(
      driverRows.map((row) => ({
        position: Number(row.position),
        entityId: row.Driver.driverId,
        points: Number(row.points),
        wins: Number(row.wins),
      })),
    ),
    constructors: withGap(
      constructorRows.map((row) => ({
        position: Number(row.position),
        entityId: row.Constructor.constructorId,
        points: Number(row.points),
        wins: Number(row.wins),
      })),
    ),
  };

  return { drivers, teams, standings };
}
