import { RESULTS_API } from '@/lib/config/sources';

import { driverTitles } from './champions';
import { circuitNameAr, country, driverNameAr, localityAr, nationality, raceNameAr } from './i18n';

/**
 * طبقة البيانات التاريخية — كل مواسم الفورمولا 1 منذ 1950.
 *
 * تُقرأ مباشرة من واجهة Jolpica المفتوحة بلا مفتاح وبلا حصة. لا نخزّنها في
 * ملفات لأن حجمها كبير (881 سائقاً، ~1,100 سباق) ولأنها **لا تتغيّر**: نتيجة
 * سباق 1976 هي نفسها إلى الأبد. لذلك نعتمد على تخزين Next للطلبات بمدة طويلة،
 * ونقصّرها للموسم الجاري وحده.
 */

/** التاريخ لا يتغيّر — نخزّنه شهراً. */
const HISTORY_TTL = 60 * 60 * 24 * 30;
/** الموسم الجاري يتغيّر بعد كل سباق. */
const CURRENT_TTL = 60 * 60 * 6;

export const CURRENT_SEASON = new Date().getUTCFullYear();

/**
 * طلب واحد إلى واجهة النتائج، مع تراجع تصاعدي على الرفض المؤقّت.
 *
 * ⚠️ المحاولة الواحدة لا تكفي هنا. عند البناء يصيّر Next الصفحات على أحد عشر
 * عاملاً متوازياً، فتنهال الطلبات على واجهة مفتوحة تبرّعية دفعة واحدة وتردّ
 * **429**. أسقط ذلك بناءً كاملاً مرّتين — والحال نفسه سيتكرّر عند كل نشر.
 * الانتظار ثوانيَ أرخص بكثير من بناء فاشل.
 *
 * ثلاثة تفاصيل تعلّمناها بالتجربة، كلٌّ منها ضروري:
 *
 *   • **`Retry-After` أولاً.** الخادم يعرف متى يقبلنا أفضل من تخميننا. أربع
 *     محاولات بتراجع 1‑2‑4 ثانية لم تكفِ لأنها تجاهلت ما طلبه صراحةً.
 *   • **تشويش عشوائي.** أحد عشر عاملاً بدأت معاً تتراجع معاً، فتعيد الاصطدام
 *     في اللحظة ذاتها. التشويش يفرّق موجاتها.
 *   • **سقف انتظار.** بلا سقف يصير التراجع الأسّي دقائق تُجمّد البناء.
 *
 * 429 و5xx مؤقّتان فنعيد المحاولة؛ 404 دائم فنرمي فوراً بلا انتظار.
 */
const MAX_ATTEMPTS = 6;
const MAX_BACKOFF_MS = 20_000;

function backoffMs(attempt: number, retryAfter: string | null): number {
  const seconds = Number(retryAfter);
  if (Number.isFinite(seconds) && seconds > 0) {
    return Math.min(seconds * 1_000, MAX_BACKOFF_MS);
  }
  const base = Math.min(1_000 * 2 ** (attempt - 1), MAX_BACKOFF_MS);
  return base + Math.random() * base; // تشويش حتى الضعف
}

async function get<T>(path: string, ttl = HISTORY_TTL): Promise<T> {
  let status = 0;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const response = await fetch(`${RESULTS_API.base}/${path}`, {
      headers: { accept: 'application/json' },
      next: { revalidate: ttl },
    });

    if (response.ok) return (await response.json()) as T;

    status = response.status;
    if (status !== 429 && status < 500) break;

    if (attempt < MAX_ATTEMPTS - 1) {
      await new Promise((resolve) =>
        setTimeout(resolve, backoffMs(attempt + 1, response.headers.get('retry-after'))),
      );
    }
  }

  throw new Error(`فشل طلب ${path} — الحالة ${status}`);
}

// ── الأنواع الخام ─────────────────────────────────────────────
interface ApiDriver {
  driverId: string;
  url?: string;
  permanentNumber?: string;
  code?: string;
  givenName: string;
  familyName: string;
  dateOfBirth?: string;
  nationality: string;
}

interface ApiCircuit {
  circuitId: string;
  url: string;
  circuitName: string;
  Location: { lat: string; long: string; locality: string; country: string };
}

interface ApiRace {
  season: string;
  round: string;
  raceName: string;
  date: string;
  time?: string;
  url?: string;
  Circuit: ApiCircuit;
  Results?: {
    position: string;
    positionText?: string;
    grid?: string;
    points: string;
    laps?: string;
    status?: string;
    Driver: ApiDriver;
    Constructor: { constructorId: string; name: string };
    Time?: { time: string; millis?: string };
    FastestLap?: { rank?: string; lap?: string; Time?: { time: string } };
  }[];
}

// ── الأنواع المعروضة ──────────────────────────────────────────

export interface CircuitSummary {
  id: string;
  name: string;
  nameEn: string;
  locality: string;
  localityEn: string;
  country: string;
  countryCode: string;
  wikipediaUrl: string;
  lat: number;
  long: number;
  /** هل الحلبة ضمن روزنامة الموسم الحالي؟ */
  active: boolean;
  /** عدد السباقات التي أُقيمت عليها. */
  raceCount: number;
  firstYear: number | null;
  lastYear: number | null;
}

export interface PodiumEntry {
  position: number;
  driverId: string;
  driverName: string;
  constructor: string;
}

export interface RaceSummary {
  season: number;
  round: number;
  name: string;
  nameEn: string;
  date: string;
  circuitId: string;
  circuitName: string;
  country: string;
  countryCode: string;
  wikipediaUrl: string | null;
  podium: PodiumEntry[];
}

export interface FastestLap {
  driverId: string;
  driverName: string;
  time: string;
  season: number;
  raceName: string;
}

// ── الحلبات ───────────────────────────────────────────────────

/** كل حلبة استضافت سباقاً في التاريخ. */
export async function listCircuits(): Promise<CircuitSummary[]> {
  const [all, current] = await Promise.all([
    get<{ MRData: { CircuitTable: { Circuits: ApiCircuit[] } } }>(
      'circuits/?format=json&limit=200',
    ),
    get<{ MRData: { RaceTable: { Races: ApiRace[] } } }>(
      `${CURRENT_SEASON}/races/?format=json&limit=100`,
      CURRENT_TTL,
    ).catch(() => null),
  ]);

  const activeIds = new Set(
    (current?.MRData.RaceTable.Races ?? []).map((race) => race.Circuit.circuitId),
  );

  return all.MRData.CircuitTable.Circuits.map((circuit) => {
    const location = country(circuit.Location.country);
    return {
      id: circuit.circuitId,
      name: circuitNameAr(circuit.circuitId, circuit.circuitName),
      nameEn: circuit.circuitName,
      locality: localityAr(circuit.Location.locality),
      localityEn: circuit.Location.locality,
      country: location.ar,
      countryCode: location.code,
      wikipediaUrl: circuit.url,
      lat: Number(circuit.Location.lat),
      long: Number(circuit.Location.long),
      active: activeIds.has(circuit.circuitId),
      raceCount: 0,
      firstYear: null,
      lastYear: null,
    };
  }).sort((a, b) => a.nameEn.localeCompare(b.nameEn));
}

function toPodium(race: ApiRace): PodiumEntry[] {
  return (race.Results ?? [])
    .filter((result) => Number(result.position) <= 3)
    .map((result) => ({
      position: Number(result.position),
      driverId: result.Driver.driverId,
      driverName: driverNameAr(
        result.Driver.driverId,
        `${result.Driver.givenName} ${result.Driver.familyName}`,
      ),
      constructor: result.Constructor.name,
    }))
    .sort((a, b) => a.position - b.position);
}

function toRaceSummary(race: ApiRace): RaceSummary {
  const location = country(race.Circuit.Location.country);
  return {
    season: Number(race.season),
    round: Number(race.round),
    name: raceNameAr(race.raceName),
    nameEn: race.raceName,
    date: race.date,
    circuitId: race.Circuit.circuitId,
    circuitName: circuitNameAr(race.Circuit.circuitId, race.Circuit.circuitName),
    country: location.ar,
    countryCode: location.code,
    wikipediaUrl: race.url ?? null,
    podium: toPodium(race),
  };
}

/** كل سباق أُقيم على حلبة بعينها، مع منصّاته. */
export async function getCircuitRaces(circuitId: string): Promise<RaceSummary[]> {
  const pages = await Promise.all(
    [1, 2, 3].map((position) =>
      get<{ MRData: { RaceTable: { Races: ApiRace[] } } }>(
        `circuits/${circuitId}/results/${position}/?format=json&limit=100`,
      ).catch(() => null),
    ),
  );

  const byKey = new Map<string, RaceSummary>();

  for (const page of pages) {
    for (const race of page?.MRData.RaceTable.Races ?? []) {
      const key = `${race.season}-${race.round}`;
      const existing = byKey.get(key);
      const entry = toPodium(race)[0];

      if (existing) {
        if (entry) existing.podium.push(entry);
      } else {
        byKey.set(key, toRaceSummary(race));
      }
    }
  }

  return [...byKey.values()]
    .map((race) => ({ ...race, podium: race.podium.sort((a, b) => a.position - b.position) }))
    .sort((a, b) => b.season - a.season);
}

/** أسرع لفة مسجّلة على الحلبة عبر تاريخها. */
export async function getCircuitFastestLap(circuitId: string): Promise<FastestLap | null> {
  const data = await get<{ MRData: { RaceTable: { Races: ApiRace[] } } }>(
    `circuits/${circuitId}/fastest/1/results/?format=json&limit=100`,
  ).catch(() => null);

  const laps = (data?.MRData.RaceTable.Races ?? []).flatMap((race) =>
    (race.Results ?? [])
      .filter((result) => result.FastestLap?.Time?.time)
      .map((result) => ({
        driverId: result.Driver.driverId,
        driverName: driverNameAr(
          result.Driver.driverId,
          `${result.Driver.givenName} ${result.Driver.familyName}`,
        ),
        time: result.FastestLap!.Time!.time,
        season: Number(race.season),
        raceName: raceNameAr(race.raceName),
      })),
  );

  if (laps.length === 0) return null;

  /** الأزمنة بصيغة m:ss.mmm — نحوّلها لثوانٍ للمقارنة الصحيحة. */
  const toSeconds = (time: string): number => {
    const [minutes, seconds] = time.split(':');
    return seconds === undefined ? Number(minutes) : Number(minutes) * 60 + Number(seconds);
  };

  return laps.sort((a, b) => toSeconds(a.time) - toSeconds(b.time))[0];
}

// ── المواسم والسباقات ─────────────────────────────────────────

/** كل المواسم من 1950 حتى الحالي، الأحدث أولاً. */
export async function listSeasons(): Promise<number[]> {
  const data = await get<{ MRData: { SeasonTable: { Seasons: { season: string }[] } } }>(
    'seasons/?format=json&limit=200',
  );
  return data.MRData.SeasonTable.Seasons.map((s) => Number(s.season)).sort((a, b) => b - a);
}

/** سباقات موسم بعينه مع منصّات التتويج. */
export async function getSeasonRaces(season: number): Promise<RaceSummary[]> {
  const isCurrent = season >= CURRENT_SEASON;
  const ttl = isCurrent ? CURRENT_TTL : HISTORY_TTL;

  const [calendar, ...positions] = await Promise.all([
    get<{ MRData: { RaceTable: { Races: ApiRace[] } } }>(
      `${season}/races/?format=json&limit=100`,
      ttl,
    ),
    ...[1, 2, 3].map((position) =>
      get<{ MRData: { RaceTable: { Races: ApiRace[] } } }>(
        `${season}/results/${position}/?format=json&limit=100`,
        ttl,
      ).catch(() => null),
    ),
  ]);

  const podiums = new Map<number, PodiumEntry[]>();
  for (const page of positions) {
    for (const race of page?.MRData.RaceTable.Races ?? []) {
      const round = Number(race.round);
      podiums.set(round, [...(podiums.get(round) ?? []), ...toPodium(race)]);
    }
  }

  return calendar.MRData.RaceTable.Races.map((race) => {
    const summary = toRaceSummary(race);
    return {
      ...summary,
      podium: (podiums.get(summary.round) ?? []).sort((a, b) => a.position - b.position),
    };
  }).sort((a, b) => a.round - b.round);
}

// ── السائقون ──────────────────────────────────────────────────

export interface DriverSummary {
  id: string;
  name: string;
  nameEn: string;
  code: string | null;
  number: number | null;
  nationality: string;
  countryCode: string;
  dateOfBirth: string | null;
  wikipediaUrl: string | null;
  /** هل يقود في الموسم الحالي؟ */
  active: boolean;
}

function toDriverSummary(driver: ApiDriver, active: boolean): DriverSummary {
  const nat = nationality(driver.nationality);
  return {
    id: driver.driverId,
    name: driverNameAr(driver.driverId, `${driver.givenName} ${driver.familyName}`),
    nameEn: `${driver.givenName} ${driver.familyName}`,
    code: driver.code ?? null,
    number: driver.permanentNumber ? Number(driver.permanentNumber) : null,
    nationality: nat.ar,
    countryCode: nat.code,
    dateOfBirth: driver.dateOfBirth ?? null,
    wikipediaUrl: driver.url ?? null,
    active,
  };
}

/** كل من قاد في الفورمولا 1 منذ 1950. الواجهة تحدّ الصفحة بـ100 فنقسّم. */
export async function listAllDrivers(): Promise<DriverSummary[]> {
  const first = await get<{
    MRData: { total: string; DriverTable: { Drivers: ApiDriver[] } };
  }>('drivers/?format=json&limit=100');

  const total = Number(first.MRData.total);
  const offsets = Array.from({ length: Math.ceil(total / 100) - 1 }, (_, i) => (i + 1) * 100);

  /**
   * متسلسل لا متوازٍ، مع إعادة محاولة.
   *
   * إطلاق ثماني صفحات دفعة واحدة كان يُقابَل بحدّ معدّل، فتسقط صفحتان بصمت
   * (`.catch(() => null)`) ويعود 697 سائقاً بدل 881 — نقص لا يظهر كخطأ بل
   * كأسماء غائبة من القاموس. التسلسل أبطأ بثوانٍ ويعطي العدد كاملاً.
   */
  const rest: ({ MRData: { DriverTable: { Drivers: ApiDriver[] } } } | null)[] = [];

  for (const offset of offsets) {
    let page: { MRData: { DriverTable: { Drivers: ApiDriver[] } } } | null = null;

    for (let attempt = 0; attempt < 3 && !page; attempt += 1) {
      if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, 1_200 * attempt));
      page = await get<{ MRData: { DriverTable: { Drivers: ApiDriver[] } } }>(
        `drivers/?format=json&limit=100&offset=${offset}`,
      ).catch(() => null);
    }

    if (!page) {
      throw new Error(`تعذّر جلب صفحة السائقين عند الإزاحة ${offset} — القائمة ستكون ناقصة.`);
    }
    rest.push(page);
  }

  const activeIds = await raceDriverIds(CURRENT_SEASON);

  const all = [
    ...first.MRData.DriverTable.Drivers,
    ...rest.flatMap((page) => page?.MRData.DriverTable.Drivers ?? []),
  ];

  return all
    .map((driver) => toDriverSummary(driver, activeIds.has(driver.driverId)))
    .sort((a, b) => a.nameEn.localeCompare(b.nameEn));
}

// ── مسيرة السائق ─────────────────────────────────────────────

/**
 * نتيجة سباق واحد في مسيرة سائق.
 *
 * `position` رقم فقط لمن أُنهي سباقه مصنَّفاً. أما `positionText` فيحمل رمز
 * الحالة كما تعيده الواجهة: `R` انسحاب، `D` استبعاد، `W` انسحاب قبل الانطلاق،
 * `F` إخفاق في التأهّل، `N` غير مصنَّف. الفصل بينهما مقصود: من انسحب لم
 * «يحتلّ المركز 26»، وعرض الرقم الخام يكذب على القارئ.
 */
export interface CareerResult {
  season: number;
  round: number;
  raceName: string;
  date: string;
  circuitId: string;
  circuitName: string;
  countryCode: string;
  position: number | null;
  positionText: string;
  status: string | null;
  grid: number | null;
  points: number;
  constructorId: string;
  constructorName: string;
}

/** فريق قاد له السائق، بمدى سنواته وعدد سباقاته معه. */
export interface DriverTeam {
  id: string;
  name: string;
  firstYear: number;
  lastYear: number;
  races: number;
  wins: number;
}

export interface DriverCareer {
  driver: DriverSummary;
  /** كل سباقاته، الأحدث أولاً. */
  results: CareerResult[];
  teams: DriverTeam[];
  wins: CareerResult[];
  podiums: number;
  poles: number;
  points: number;
  firstSeason: number | null;
  lastSeason: number | null;
  /** مواسم فاز فيها بلقب العالم — من `champions.json`. */
  titles: number[];
}

/** بيانات سائق واحد، أو null إن لم يوجد المعرّف. */
export async function getDriver(driverId: string): Promise<DriverSummary | null> {
  const data = await get<{ MRData: { DriverTable: { Drivers: ApiDriver[] } } }>(
    `drivers/${encodeURIComponent(driverId)}/?format=json`,
  ).catch(() => null);

  const driver = data?.MRData.DriverTable.Drivers?.[0];
  if (!driver) return null;

  const active = (await raceDriverIds(CURRENT_SEASON)).has(driverId);

  return toDriverSummary(driver, active);
}

function toCareerResult(race: ApiRace): CareerResult | null {
  const result = race.Results?.[0];
  if (!result) return null;

  const location = country(race.Circuit.Location.country);
  const position = Number(result.position);

  return {
    season: Number(race.season),
    round: Number(race.round),
    raceName: raceNameAr(race.raceName),
    date: race.date,
    circuitId: race.Circuit.circuitId,
    circuitName: circuitNameAr(race.Circuit.circuitId, race.Circuit.circuitName),
    countryCode: location.code,
    // `positionText` رقمي فقط لمن صُنِّف — غيره رمز حالة
    position: /^\d+$/.test(result.positionText ?? '') ? position : null,
    positionText: result.positionText ?? String(result.position),
    status: result.status ?? null,
    grid: result.grid !== undefined ? Number(result.grid) : null,
    points: Number(result.points) || 0,
    constructorId: result.Constructor.constructorId,
    constructorName: result.Constructor.name,
  };
}

/**
 * مسيرة سائق كاملة: كل سباق قاده، وفرقه، وانتصاراته.
 *
 * الترقيم متسلسل لا متوازٍ — الدرس نفسه الذي كلّفنا 184 سائقاً ناقصاً في
 * `listAllDrivers`: الواجهة تحدّ المعدّل، والصفحة الساقطة بصمت تظهر كمسيرة
 * ناقصة لا كخطأ. أطول مسيرة (ألونسو) خمس صفحات، فالكلفة محتملة.
 */
export async function getDriverCareer(driverId: string): Promise<DriverCareer | null> {
  const driver = await getDriver(driverId);
  if (!driver) return null;

  const path = `drivers/${encodeURIComponent(driverId)}/results/?format=json&limit=100`;
  const first = await get<{
    MRData: { total: string; RaceTable: { Races: ApiRace[] } };
  }>(path).catch(() => null);

  if (!first) return { ...emptyCareer(driver) };

  const races = [...first.MRData.RaceTable.Races];
  const total = Number(first.MRData.total);

  for (let offset = 100; offset < total; offset += 100) {
    let page: { MRData: { RaceTable: { Races: ApiRace[] } } } | null = null;

    for (let attempt = 0; attempt < 3 && !page; attempt += 1) {
      if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, 900 * attempt));
      page = await get<{ MRData: { RaceTable: { Races: ApiRace[] } } }>(
        `${path}&offset=${offset}`,
      ).catch(() => null);
    }

    if (!page) break; // صفحة متعذّرة: مسيرة ناقصة خير من صفحة فارغة
    races.push(...page.MRData.RaceTable.Races);
  }

  const results = races
    .map(toCareerResult)
    .filter((result): result is CareerResult => result !== null)
    .sort((a, b) => b.season - a.season || b.round - a.round);

  const teams = new Map<string, DriverTeam>();
  for (const result of results) {
    const existing = teams.get(result.constructorId);
    if (existing) {
      existing.firstYear = Math.min(existing.firstYear, result.season);
      existing.lastYear = Math.max(existing.lastYear, result.season);
      existing.races += 1;
      if (result.position === 1) existing.wins += 1;
    } else {
      teams.set(result.constructorId, {
        id: result.constructorId,
        name: result.constructorName,
        firstYear: result.season,
        lastYear: result.season,
        races: 1,
        wins: result.position === 1 ? 1 : 0,
      });
    }
  }

  const seasons = results.map((result) => result.season);

  return {
    driver,
    results,
    teams: [...teams.values()].sort((a, b) => b.lastYear - a.lastYear || b.races - a.races),
    wins: results.filter((result) => result.position === 1),
    podiums: results.filter((result) => result.position !== null && result.position <= 3).length,
    poles: results.filter((result) => result.grid === 1).length,
    points: Math.round(results.reduce((sum, result) => sum + result.points, 0) * 100) / 100,
    firstSeason: seasons.length > 0 ? Math.min(...seasons) : null,
    lastSeason: seasons.length > 0 ? Math.max(...seasons) : null,
    titles: driverTitles(driverId),
  };
}

function emptyCareer(driver: DriverSummary): DriverCareer {
  return {
    driver,
    results: [],
    teams: [],
    wins: [],
    podiums: 0,
    poles: 0,
    points: 0,
    firstSeason: null,
    lastSeason: null,
    titles: driverTitles(driver.id),
  };
}

/**
 * معرّفات من **سابقوا** فعلاً هذا الموسم.
 *
 * ⚠️ لا تستعمل `{season}/drivers/` لهذا الغرض: تلك القائمة تضمّ كل من دخل أي
 * جلسة، بمن فيهم صاعدون يقودون تجربة حرّة واحدة صباح الجمعة. أعادت 32 اسماً
 * لموسم 2026 بينما الشبكة 23 — فكانت الصفحة تقول «32 سائقاً على الشبكة».
 * ترتيب السائقين يضمّ من خاض سباقاً وحده، ولو بصفر نقطة.
 */
async function raceDriverIds(season: number): Promise<Set<string>> {
  const data = await get<{
    MRData: {
      StandingsTable: { StandingsLists: { DriverStandings: { Driver: ApiDriver }[] }[] };
    };
  }>(`${season}/driverStandings/?format=json&limit=100`, CURRENT_TTL).catch(() => null);

  const rows = data?.MRData.StandingsTable.StandingsLists?.[0]?.DriverStandings ?? [];
  return new Set(rows.map((row) => row.Driver.driverId));
}

// ── الروزنامة ────────────────────────────────────────────────

/** جلسة واحدة في عطلة نهاية الأسبوع. */
export interface RaceSession {
  kind: 'fp1' | 'fp2' | 'fp3' | 'sprintQualifying' | 'sprint' | 'qualifying' | 'race';
  /** لحظة البدء بتوقيت UTC. null إن لم تُعلن الواجهة توقيتاً. */
  startsAt: string | null;
  date: string;
}

export interface CalendarRace {
  season: number;
  round: number;
  name: string;
  nameEn: string;
  circuitId: string;
  circuitName: string;
  locality: string;
  country: string;
  countryCode: string;
  wikipediaUrl: string | null;
  date: string;
  sessions: RaceSession[];
  /** هل فيها سباق سبرنت؟ يغيّر شكل العطلة كلها. */
  hasSprint: boolean;
}

interface ApiSession {
  date: string;
  time?: string;
}

/** يدمج التاريخ والوقت في لحظة ISO. الوقت الغائب يعني جلسة بلا توقيت معلن. */
function toInstant(session: ApiSession | undefined): string | null {
  if (!session?.date) return null;
  if (!session.time) return null;
  return new Date(`${session.date}T${session.time.replace('Z', '')}Z`).toISOString();
}

/**
 * روزنامة موسم كاملة بكل جلساتها.
 *
 * الواجهة تعطي التجارب والتأهّل والسبرنت في نفس استجابة السباق، فجلسة كاملة
 * بطلب واحد. هذا ما يجعل تصدير ملف تقويم للهاتف ممكناً بلا مصدر إضافي.
 */
export async function getSeasonCalendar(season: number): Promise<CalendarRace[]> {
  const ttl = season >= CURRENT_SEASON ? CURRENT_TTL : HISTORY_TTL;

  const data = await get<{
    MRData: {
      RaceTable: {
        Races: (ApiRace & {
          FirstPractice?: ApiSession;
          SecondPractice?: ApiSession;
          ThirdPractice?: ApiSession;
          SprintQualifying?: ApiSession;
          SprintShootout?: ApiSession;
          Sprint?: ApiSession;
          Qualifying?: ApiSession;
        })[];
      };
    };
  }>(`${season}/races/?format=json&limit=100`, ttl);

  return data.MRData.RaceTable.Races.map((race) => {
    const location = country(race.Circuit.Location.country);

    const raw: { kind: RaceSession['kind']; session?: ApiSession }[] = [
      { kind: 'fp1', session: race.FirstPractice },
      { kind: 'fp2', session: race.SecondPractice },
      { kind: 'fp3', session: race.ThirdPractice },
      // الاسم تغيّر عبر المواسم: SprintShootout ثم SprintQualifying
      { kind: 'sprintQualifying', session: race.SprintQualifying ?? race.SprintShootout },
      { kind: 'sprint', session: race.Sprint },
      { kind: 'qualifying', session: race.Qualifying },
      { kind: 'race', session: { date: race.date, time: race.time } },
    ];

    const sessions = raw
      .filter((entry): entry is { kind: RaceSession['kind']; session: ApiSession } =>
        Boolean(entry.session?.date),
      )
      .map((entry) => ({
        kind: entry.kind,
        date: entry.session.date,
        startsAt: toInstant(entry.session),
      }))
      .sort((a, b) => a.date.localeCompare(b.date) || (a.startsAt ?? '').localeCompare(b.startsAt ?? ''));

    return {
      season: Number(race.season),
      round: Number(race.round),
      name: raceNameAr(race.raceName),
      nameEn: race.raceName,
      circuitId: race.Circuit.circuitId,
      circuitName: circuitNameAr(race.Circuit.circuitId, race.Circuit.circuitName),
      locality: localityAr(race.Circuit.Location.locality),
      country: location.ar,
      countryCode: location.code,
      wikipediaUrl: race.url ?? null,
      date: race.date,
      sessions,
      hasSprint: sessions.some((session) => session.kind === 'sprint'),
    };
  }).sort((a, b) => a.round - b.round);
}

// ── تحليل السباق الأخير ──────────────────────────────────────

export interface RaceResultRow {
  position: number | null;
  positionText: string;
  driverId: string;
  driverName: string;
  code: string | null;
  constructorId: string;
  constructorName: string;
  grid: number | null;
  /** المراكز المكسوبة من الانطلاق حتى النهاية. سالب يعني خسارة. */
  gained: number | null;
  laps: number;
  status: string | null;
  time: string | null;
  /** الفارق عن الفائز بالمللي ثانية — null للفائز ولمن لم يُنهِ. */
  gapMillis: number | null;
  points: number;
  fastestLapTime: string | null;
  fastestLapRank: number | null;
}

export interface PitStop {
  driverId: string;
  lap: number;
  stop: number;
  durationSeconds: number | null;
}

export interface RaceAnalysis {
  season: number;
  round: number;
  name: string;
  circuitId: string;
  circuitName: string;
  countryCode: string;
  date: string;
  totalLaps: number;
  results: RaceResultRow[];
  pitStops: PitStop[];
}

/** «1:23.456» → مللي ثانية. */
function lapMillis(time: string | null | undefined): number | null {
  if (!time) return null;
  const match = time.match(/^(?:(\d+):)?(\d+)\.(\d+)$/);
  if (!match) return null;
  const [, minutes, seconds, fraction] = match;
  return (
    (Number(minutes ?? 0) * 60 + Number(seconds)) * 1000 + Number(fraction.padEnd(3, '0').slice(0, 3))
  );
}

/**
 * تحليل سباق بعينه — النتيجة والفوارق والتوقّفات.
 *
 * ⚠️ لا نجلب توقيت كل لفّة عمداً. سباق واحد فيه ~1,370 توقيتاً والواجهة تحدّ
 * الصفحة بمئة، أي أربعة عشر طلباً متسلسلاً لصفحة واحدة. الفوارق والتوقّفات
 * وأسرع اللفّات تعطي معظم القصة بثلاثة طلبات — والمقايضة في صالح القارئ.
 */
export async function getRaceAnalysis(
  season: number,
  round: number | 'last' = 'last',
): Promise<RaceAnalysis | null> {
  const ttl = season >= CURRENT_SEASON ? CURRENT_TTL : HISTORY_TTL;

  const data = await get<{ MRData: { RaceTable: { Races: ApiRace[] } } }>(
    `${season}/${round}/results/?format=json&limit=100`,
    ttl,
  ).catch(() => null);

  const race = data?.MRData.RaceTable.Races?.[0];
  if (!race?.Results?.length) return null;

  const location = country(race.Circuit.Location.country);
  const winnerMillis = Number(race.Results[0]?.Time?.millis ?? 0) || null;

  const results: RaceResultRow[] = race.Results.map((result) => {
    const position = /^\d+$/.test(result.positionText ?? '') ? Number(result.position) : null;
    const grid = result.grid !== undefined && result.grid !== null ? Number(result.grid) : null;
    const millis = Number(result.Time?.millis ?? 0) || null;

    return {
      position,
      positionText: result.positionText ?? String(result.position),
      driverId: result.Driver.driverId,
      driverName: driverNameAr(
        result.Driver.driverId,
        `${result.Driver.givenName} ${result.Driver.familyName}`,
      ),
      code: result.Driver.code ?? null,
      constructorId: result.Constructor.constructorId,
      constructorName: result.Constructor.name,
      grid,
      // الانطلاق من حارة الصيانة يُسجَّل 0 — ليس مركزاً، فلا يُحسب منه فارق
      gained: position !== null && grid !== null && grid > 0 ? grid - position : null,
      laps: Number(result.laps ?? 0),
      status: result.status ?? null,
      time: result.Time?.time ?? null,
      gapMillis: millis && winnerMillis && millis > winnerMillis ? millis - winnerMillis : null,
      points: Number(result.points) || 0,
      fastestLapTime: result.FastestLap?.Time?.time ?? null,
      fastestLapRank: result.FastestLap?.rank ? Number(result.FastestLap.rank) : null,
    };
  });

  const stopsData = await get<{
    MRData: {
      RaceTable: {
        Races: { PitStops?: { driverId: string; lap: string; stop: string; duration?: string }[] }[];
      };
    };
  }>(`${season}/${round}/pitstops/?format=json&limit=100`, ttl).catch(() => null);

  const pitStops: PitStop[] = (stopsData?.MRData.RaceTable.Races?.[0]?.PitStops ?? []).map(
    (stop) => ({
      driverId: stop.driverId,
      lap: Number(stop.lap),
      stop: Number(stop.stop),
      durationSeconds: stop.duration ? Number(stop.duration.replace(/^0?:?/, '')) || null : null,
    }),
  );

  return {
    season: Number(race.season),
    round: Number(race.round),
    name: raceNameAr(race.raceName),
    circuitId: race.Circuit.circuitId,
    circuitName: circuitNameAr(race.Circuit.circuitId, race.Circuit.circuitName),
    countryCode: location.code,
    date: race.date,
    totalLaps: Math.max(...results.map((row) => row.laps), 0),
    results,
    pitStops,
  };
}

export { lapMillis };
