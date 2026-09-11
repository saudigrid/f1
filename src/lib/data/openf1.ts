/**
 * طبقة OpenF1 — التوقيت والتيليمتري الحقيقيان.
 *
 * ## لماذا مصدر ثانٍ إلى جانب Jolpica
 *
 * Jolpica تعطي **النتائج**: من فاز، بكم، وبأي فريق. ولا تعطي شيئاً ممّا يصنع
 * لوحة توقيت: أزمنة القطاعات، ومركّبات الإطارات، وفخّ السرعة، ولا التيليمتري
 * (دوّاسة الوقود، الفرامل، التروس). OpenF1 تعطي هذا كله مجاناً وبلا مفتاح.
 *
 * ⚠️ الفرق مهمّ تحريرياً: لوحة توقيت مبنية على أرقام **مخترعة** تبدو مقنعة
 * وهي كذب. كل رقم هنا مقروء من الجلسة الحقيقية — وإن غاب، عُرض الغياب.
 *
 * ## الحجم
 *
 * `intervals` وحدها ~22 ألف سجلّ للسباق، و`car_data` تصل لملايين. لذلك لا
 * نجلب إلا ما يُعرض: أفضل لفة لكل سائق، والستنتات، وتيليمتري لفة واحدة عند
 * الطلب. الجلسة المنتهية بياناتها ثابتة، فنخزّنها طويلاً.
 */

const BASE = 'https://api.openf1.org/v1';

/** الجلسة المنتهية لا تتغيّر أبداً — شهر. */
const FINISHED_TTL = 60 * 60 * 24 * 30;
/** قائمة الجلسات تتغيّر مع الروزنامة — ست ساعات. */
const INDEX_TTL = 60 * 60 * 6;

/**
 * طلب واحد مع تراجع تصاعدي.
 *
 * ⚠️ OpenF1 يحدّ **التزامن** بحزم. قياس مباشر: خمسة عشر طلباً متوازياً على
 * المسار نفسه ردّ تسعة منها بـ429. وصفحة التحليل تحتاج خمس جلسات × ثلاثة
 * مسارات = خمسة عشر طلباً بالضبط — فبلا هذا التراجع تظهر اللوحات فارغة بلا
 * أي رسالة خطأ، وهو أسوأ شكل للعطل: يبدو أن لا بيانات أصلاً.
 *
 * التشويش العشوائي ضروري: الطلبات التي بدأت معاً تتراجع معاً وتصطدم ثانيةً
 * في اللحظة نفسها لولاه.
 */
async function get<T>(path: string, ttl: number): Promise<T[]> {
  let status = 0;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    if (attempt > 0) {
      const base = Math.min(1_000 * 2 ** (attempt - 1), 12_000);
      await new Promise((resolve) => setTimeout(resolve, base + Math.random() * base));
    }

    const response = await fetch(`${BASE}/${path}`, {
      headers: { accept: 'application/json' },
      next: { revalidate: ttl },
    });

    if (response.ok) {
      const data = await response.json();
      return Array.isArray(data) ? (data as T[]) : [];
    }

    status = response.status;
    if (status !== 429 && status < 500) break;
  }

  throw new Error(`OpenF1 ${status} — ${path}`);
}

// ── الأنواع الخام ─────────────────────────────────────────────

interface ApiSession {
  session_key: number;
  meeting_key: number;
  session_name: string;
  session_type: string;
  location: string;
  country_name: string;
  circuit_short_name: string;
  date_start: string;
  year: number;
}

interface ApiDriver {
  driver_number: number;
  full_name: string;
  name_acronym: string;
  team_name: string;
  team_colour: string | null;
}

interface ApiLap {
  driver_number: number;
  lap_number: number;
  lap_duration: number | null;
  duration_sector_1: number | null;
  duration_sector_2: number | null;
  duration_sector_3: number | null;
  st_speed: number | null;
  is_pit_out_lap: boolean;
}

type ApiLapWithStart = ApiLap & { date_start: string | null };

interface ApiStint {
  driver_number: number;
  stint_number: number;
  compound: string | null;
  lap_start: number;
  lap_end: number;
  tyre_age_at_start: number | null;
}

// ── الأنواع المعروضة ──────────────────────────────────────────

export type SectorRank = 'purple' | 'green' | 'plain';

export interface TimingSector {
  seconds: number | null;
  /** بنفسجي = الأسرع في الجلسة، أخضر = أفضل زمن شخصي. */
  rank: SectorRank;
}

export interface TimingRow {
  position: number;
  number: number;
  name: string;
  acronym: string;
  team: string;
  /** لون الفريق كما تنشره الجهة المنظِّمة — يميّز الصفوف بلا اختراع ألوان. */
  colour: string | null;
  bestLap: number | null;
  bestLapNumber: number | null;
  /** الفارق عن صاحب أسرع لفة بالثواني. */
  gap: number | null;
  sectors: TimingSector[];
  speedTrap: number | null;
  compound: string | null;
  tyreLaps: number | null;
  stints: { compound: string | null; from: number; to: number }[];
}

export interface LiveSession {
  key: number;
  name: string;
  location: string;
  country: string;
  circuit: string;
  startedAt: string;
  year: number;
  rows: TimingRow[];
  totalLaps: number;
}

/** أحدث جلسة سباق انتهت فعلاً. */
export async function latestRaceSession(year: number): Promise<ApiSession | null> {
  const sessions = await get<ApiSession>(
    `sessions?year=${year}&session_type=Race`,
    INDEX_TTL,
  ).catch(() => []);

  const now = Date.now();
  const past = sessions
    .filter((session) => new Date(session.date_start).getTime() < now)
    .sort((a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime());

  return past[past.length - 1] ?? null;
}

function seconds(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}

/**
 * لوحة توقيت الجلسة: أفضل لفة لكل سائق بقطاعاتها وإطاراتها.
 *
 * الترتيب بأفضل لفة لا بترتيب النهاية — هذه لوحة **إيقاع** لا نتيجة. من
 * انسحب مبكراً وسجّل لفة سريعة يظهر في مكانه الصحيح إيقاعياً، وهو ما تخفيه
 * قائمة النتائج.
 */
export async function getSessionTiming(sessionKey: number): Promise<TimingRow[]> {
  // متسلسل لا متوازٍ — OpenF1 يردّ 429 على الدفعات المتزامنة
  const drivers = await get<ApiDriver>(`drivers?session_key=${sessionKey}`, FINISHED_TTL);
  const laps = await get<ApiLap>(`laps?session_key=${sessionKey}`, FINISHED_TTL);
  const stints = await get<ApiStint>(`stints?session_key=${sessionKey}`, FINISHED_TTL).catch(
    () => [] as ApiStint[],
  );

  if (drivers.length === 0) return [];

  /** أفضل لفة لكل سائق، مع تجاهل لفات الخروج من الصيانة. */
  const best = new Map<number, ApiLap>();
  const bestSector = [Infinity, Infinity, Infinity];

  for (const lap of laps) {
    if (lap.is_pit_out_lap) continue;

    const duration = seconds(lap.lap_duration);
    if (duration !== null) {
      const current = best.get(lap.driver_number);
      if (!current || duration < (current.lap_duration ?? Infinity)) {
        best.set(lap.driver_number, lap);
      }
    }

    // أسرع زمن قطاع في الجلسة كلها — مرجع اللون البنفسجي
    const sectorValues = [lap.duration_sector_1, lap.duration_sector_2, lap.duration_sector_3];
    sectorValues.forEach((value, index) => {
      const parsed = seconds(value);
      if (parsed !== null && parsed < bestSector[index]) bestSector[index] = parsed;
    });
  }

  /** أفضل زمن قطاع شخصي — مرجع اللون الأخضر. */
  const personalBest = new Map<number, number[]>();
  for (const lap of laps) {
    if (lap.is_pit_out_lap) continue;
    const row = personalBest.get(lap.driver_number) ?? [Infinity, Infinity, Infinity];
    [lap.duration_sector_1, lap.duration_sector_2, lap.duration_sector_3].forEach(
      (value, index) => {
        const parsed = seconds(value);
        if (parsed !== null && parsed < row[index]) row[index] = parsed;
      },
    );
    personalBest.set(lap.driver_number, row);
  }

  const stintsByDriver = new Map<number, ApiStint[]>();
  for (const stint of stints) {
    stintsByDriver.set(stint.driver_number, [...(stintsByDriver.get(stint.driver_number) ?? []), stint]);
  }

  const fastest = Math.min(
    ...[...best.values()].map((lap) => lap.lap_duration ?? Infinity),
    Infinity,
  );

  const rows: TimingRow[] = drivers
    .map((driver) => {
      const lap = best.get(driver.driver_number) ?? null;
      const mine = personalBest.get(driver.driver_number) ?? [Infinity, Infinity, Infinity];

      const sectors: TimingSector[] = [
        lap?.duration_sector_1,
        lap?.duration_sector_2,
        lap?.duration_sector_3,
      ].map((value, index) => {
        const parsed = seconds(value);
        if (parsed === null) return { seconds: null, rank: 'plain' as const };

        // فرق ألف من الثانية يكفي للمساواة — الأرقام مقرَّبة أصلاً
        const isPurple = Math.abs(parsed - bestSector[index]) < 0.0005;
        const isGreen = Math.abs(parsed - mine[index]) < 0.0005;

        return { seconds: parsed, rank: isPurple ? 'purple' : isGreen ? 'green' : 'plain' };
      });

      const driverStints = (stintsByDriver.get(driver.driver_number) ?? []).sort(
        (a, b) => a.stint_number - b.stint_number,
      );
      const lastStint = driverStints[driverStints.length - 1];

      const bestLap = seconds(lap?.lap_duration);

      return {
        position: 0,
        number: driver.driver_number,
        name: driver.full_name,
        acronym: driver.name_acronym,
        team: driver.team_name,
        colour: driver.team_colour ? `#${driver.team_colour.replace('#', '')}` : null,
        bestLap,
        bestLapNumber: lap?.lap_number ?? null,
        gap: bestLap !== null && Number.isFinite(fastest) ? bestLap - fastest : null,
        sectors,
        speedTrap: lap?.st_speed ?? null,
        compound: lastStint?.compound ?? null,
        tyreLaps: lastStint ? lastStint.lap_end - lastStint.lap_start + 1 : null,
        stints: driverStints.map((stint) => ({
          compound: stint.compound,
          from: stint.lap_start,
          to: stint.lap_end,
        })),
      };
    })
    // من لا لفة له يذهب للآخر بدل أن يتصدّر بقيمة فارغة
    .sort((a, b) => (a.bestLap ?? Infinity) - (b.bestLap ?? Infinity))
    .map((row, index) => ({ ...row, position: index + 1 }));

  return rows;
}

/** أحدث جلسة سباق مع لوحة توقيتها جاهزة. */
export async function getLatestTiming(year: number): Promise<LiveSession | null> {
  const session = await latestRaceSession(year);
  if (!session) return null;

  const rows = await getSessionTiming(session.session_key).catch(() => []);
  if (rows.length === 0) return null;

  return {
    key: session.session_key,
    name: session.session_name,
    location: session.location,
    country: session.country_name,
    circuit: session.circuit_short_name,
    startedAt: session.date_start,
    year: session.year,
    rows,
    totalLaps: Math.max(0, ...rows.map((row) => row.stints.at(-1)?.to ?? 0)),
  };
}

// ── التيليمتري ────────────────────────────────────────────────

export interface TelemetryPoint {
  /** ثوانٍ منذ بداية العيّنة. */
  t: number;
  speed: number;
  throttle: number;
  brake: number;
  gear: number;
}

/**
 * تيليمتري سائق خلال نافذة زمنية قصيرة.
 *
 * ⚠️ النافذة محدودة عمداً. `car_data` تُعيّن نحو أربع مرات في الثانية لكل
 * سائق، فطلب سباق كامل يعني مئات الآلاف من النقاط — تُثقل الخادم والمتصفّح
 * معاً بلا أن تُقرأ. دقيقة واحدة تكفي لإظهار شكل اللفة.
 */
export async function getTelemetry(
  sessionKey: number,
  driverNumber: number,
  from: string,
  seconds_ = 75,
): Promise<TelemetryPoint[]> {
  const start = new Date(from);
  const end = new Date(start.getTime() + seconds_ * 1000);

  const rows = await get<{
    date: string;
    speed: number | null;
    throttle: number | null;
    brake: number | null;
    n_gear: number | null;
  }>(
    `car_data?session_key=${sessionKey}&driver_number=${driverNumber}` +
      `&date>=${start.toISOString()}&date<=${end.toISOString()}`,
    FINISHED_TTL,
  ).catch(() => []);

  const base = start.getTime();

  return rows
    .map((row) => ({
      t: Math.round(((new Date(row.date).getTime() - base) / 1000) * 10) / 10,
      speed: row.speed ?? 0,
      throttle: row.throttle ?? 0,
      brake: row.brake ?? 0,
      gear: row.n_gear ?? 0,
    }))
    .filter((point) => point.t >= 0)
    .sort((a, b) => a.t - b.t);
}

/** زمن بدء أسرع لفة لسائق — نقطة انطلاق عيّنة التيليمتري. */
export async function fastestLapStart(
  sessionKey: number,
  driverNumber: number,
): Promise<{ date: string; duration: number } | null> {
  const laps = await get<ApiLap & { date_start: string }>(
    `laps?session_key=${sessionKey}&driver_number=${driverNumber}`,
    FINISHED_TTL,
  ).catch(() => []);

  const best = laps
    .filter((lap) => !lap.is_pit_out_lap && seconds(lap.lap_duration) !== null && lap.date_start)
    .sort((a, b) => (a.lap_duration ?? 0) - (b.lap_duration ?? 0))[0];

  return best ? { date: best.date_start, duration: best.lap_duration ?? 0 } : null;
}

// ── عطلة نهاية الأسبوع كاملة ─────────────────────────────────

/**
 * ترتيب الجلسات كما تجري فعلاً.
 *
 * العطلة العادية: ثلاث تجارب ثم تأهّل ثم سباق. وعطلة السبرنت تستبدل التجربتين
 * الثانية والثالثة بتأهيلي سبرنت وسباق سبرنت. الترتيب هنا يغطّي الشكلين معاً،
 * فما لم يُقَم لا يظهر أصلاً.
 */
const SESSION_ORDER = [
  'Practice 1',
  'Practice 2',
  'Practice 3',
  'Sprint Qualifying',
  'Sprint Shootout',
  'Sprint',
  'Qualifying',
  'Race',
] as const;

const SESSION_LABELS: Record<string, string> = {
  'Practice 1': 'التجربة الحرة الأولى',
  'Practice 2': 'التجربة الحرة الثانية',
  'Practice 3': 'التجربة الحرة الثالثة',
  'Sprint Qualifying': 'تأهيلي السبرنت',
  'Sprint Shootout': 'تأهيلي السبرنت',
  Sprint: 'سباق السبرنت',
  Qualifying: 'التجارب التأهيلية',
  Race: 'السباق',
};

export interface WeekendSession {
  key: number;
  name: string;
  label: string;
  type: string;
  startedAt: string;
}

export interface Weekend {
  meetingKey: number;
  name: string;
  officialName: string;
  location: string;
  country: string;
  countryCode: string;
  year: number;
  startedAt: string;
  sessions: WeekendSession[];
  hasSprint: boolean;
}

interface ApiMeeting {
  meeting_key: number;
  meeting_name: string;
  meeting_official_name: string;
  location: string;
  country_name: string;
  country_code: string;
  year: number;
  date_start: string;
}

/**
 * آخر عطلة نهاية أسبوع أُقيمت.
 *
 * ⚠️ هذه هي نقطة «التصفير» التي تجعل التحليل يتبع السباق الجديد تلقائياً:
 * كل شيء في الصفحة مشتقّ من أحدث `meeting_key`، فما إن يبدأ سباق جديد حتى
 * تتبدّل الصفحة كلها إليه بلا تدخّل. ولهذا لا يُخزَّن الفهرس طويلاً.
 */
export async function getLatestWeekend(year: number): Promise<Weekend | null> {
  const meetings = await get<ApiMeeting>(`meetings?year=${year}`, INDEX_TTL).catch(() => []);

  const now = Date.now();
  const past = meetings
    .filter((meeting) => new Date(meeting.date_start).getTime() < now)
    .sort((a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime());

  const meeting = past[past.length - 1];
  if (!meeting) return null;

  const sessions = await get<ApiSession>(
    `sessions?meeting_key=${meeting.meeting_key}`,
    INDEX_TTL,
  ).catch(() => []);

  const ordered = sessions
    .filter((session) => new Date(session.date_start).getTime() < now)
    .map((session) => ({
      key: session.session_key,
      name: session.session_name,
      label: SESSION_LABELS[session.session_name] ?? session.session_name,
      type: session.session_type,
      startedAt: session.date_start,
    }))
    .sort((a, b) => {
      const ai = SESSION_ORDER.indexOf(a.name as (typeof SESSION_ORDER)[number]);
      const bi = SESSION_ORDER.indexOf(b.name as (typeof SESSION_ORDER)[number]);
      // ما ليس في القائمة يُرتَّب بالوقت — لا نفترض أننا نعرف كل الصيغ
      if (ai === -1 || bi === -1) return a.startedAt.localeCompare(b.startedAt);
      return ai - bi;
    });

  return {
    meetingKey: meeting.meeting_key,
    name: meeting.meeting_name,
    officialName: meeting.meeting_official_name,
    location: meeting.location,
    country: meeting.country_name,
    countryCode: meeting.country_code,
    year: meeting.year,
    startedAt: meeting.date_start,
    sessions: ordered,
    hasSprint: ordered.some((session) => session.name.startsWith('Sprint')),
  };
}

// ── التوقّفات ────────────────────────────────────────────────

export interface PitStopRow {
  driverNumber: number;
  acronym: string;
  team: string;
  colour: string | null;
  stops: { lap: number; compound: string | null; laneSeconds: number | null }[];
  bestLaneSeconds: number | null;
}

interface ApiPit {
  driver_number: number;
  lap_number: number;
  pit_duration: number | null;
}

/**
 * ملخّص التوقّفات.
 *
 * ⚠️ عدد التوقّفات مشتقّ من **حدود الستنتات** لا من سجلّ `pit`. السبب أن
 * `pit_duration` غير موثوق: في جائزة إيطاليا 2026 كان وسيط القيم 1842 ثانية —
 * أي نصف ساعة في حارة الصيانة، وهو مستحيل. حدود الستنتات تعطي رقم التوقّف
 * ولفّته بدقّة، ويُعرض زمن الحارة فقط حين يكون معقولاً.
 */
export async function getPitSummary(sessionKey: number): Promise<PitStopRow[]> {
  const drivers = await get<ApiDriver>(`drivers?session_key=${sessionKey}`, FINISHED_TTL);
  const stints = await get<ApiStint>(`stints?session_key=${sessionKey}`, FINISHED_TTL).catch(
    () => [] as ApiStint[],
  );
  const pits = await get<ApiPit>(`pit?session_key=${sessionKey}`, FINISHED_TTL).catch(
    () => [] as ApiPit[],
  );

  const laneByDriverLap = new Map<string, number>();
  for (const pit of pits) {
    const value = pit.pit_duration;
    // زمن حارة الصيانة المعقول بين 10 و120 ثانية — ما عداه خلل بيانات
    if (typeof value === 'number' && value > 10 && value < 120) {
      laneByDriverLap.set(`${pit.driver_number}-${pit.lap_number}`, value);
    }
  }

  const byDriver = new Map<number, ApiStint[]>();
  for (const stint of stints) {
    byDriver.set(stint.driver_number, [...(byDriver.get(stint.driver_number) ?? []), stint]);
  }

  return drivers
    .map((driver) => {
      const list = (byDriver.get(driver.driver_number) ?? []).sort(
        (a, b) => a.stint_number - b.stint_number,
      );

      /** كل ستنت بعد الأول يعني توقّفاً سبقه. */
      const stops = list.slice(1).map((stint) => ({
        lap: stint.lap_start,
        compound: stint.compound,
        laneSeconds:
          laneByDriverLap.get(`${driver.driver_number}-${stint.lap_start}`) ??
          laneByDriverLap.get(`${driver.driver_number}-${stint.lap_start - 1}`) ??
          null,
      }));

      const lanes = stops.map((stop) => stop.laneSeconds).filter((v): v is number => v !== null);

      return {
        driverNumber: driver.driver_number,
        acronym: driver.name_acronym,
        team: driver.team_name,
        colour: driver.team_colour ? `#${driver.team_colour.replace('#', '')}` : null,
        stops,
        bestLaneSeconds: lanes.length > 0 ? Math.min(...lanes) : null,
      };
    })
    .filter((row) => row.stops.length > 0)
    .sort((a, b) => a.stops.length - b.stops.length || a.acronym.localeCompare(b.acronym));
}

// ── شبكة اللفّات ─────────────────────────────────────────────

export interface LapGridDriver {
  number: number;
  acronym: string;
  name: string;
  team: string;
  colour: string | null;
  /** الفهرس = رقم اللفّة ناقص واحد. null يعني لا توقيت لتلك اللفّة. */
  laps: (number | null)[];
  /** بداية كل لفّة بتوقيت UTC — تلزم لجلب التيليمتري. */
  starts: (string | null)[];
  best: number | null;
  bestLap: number | null;
}

export interface LapGrid {
  totalLaps: number;
  drivers: LapGridDriver[];
  /** أسرع لفّة في الجلسة كلها. */
  fastest: { number: number; acronym: string; seconds: number; lap: number } | null;
}

/**
 * أزمنة كل لفّة لكل سائق — أساس المقارنة بين السائقين.
 *
 * تُجلب مرة وتُرسَل كاملة إلى المتصفّح: سباق نموذجي نحو 1,100 لفّة، وهو حجم
 * صغير مقابل ما يتيحه — تبديل اللفّة والسائق يصير فورياً بلا أي نداء.
 */
export async function getLapGrid(sessionKey: number): Promise<LapGrid> {
  const drivers = await get<ApiDriver>(`drivers?session_key=${sessionKey}`, FINISHED_TTL);
  const laps = await get<ApiLapWithStart>(`laps?session_key=${sessionKey}`, FINISHED_TTL);

  const totalLaps = Math.max(0, ...laps.map((lap) => lap.lap_number));

  let fastest: LapGrid['fastest'] = null;

  const rows: LapGridDriver[] = drivers.map((driver) => {
    const mine = laps.filter((lap) => lap.driver_number === driver.driver_number);

    const times: (number | null)[] = new Array(totalLaps).fill(null);
    const starts: (string | null)[] = new Array(totalLaps).fill(null);

    let best: number | null = null;
    let bestLap: number | null = null;

    for (const lap of mine) {
      const index = lap.lap_number - 1;
      if (index < 0 || index >= totalLaps) continue;

      const duration = seconds(lap.lap_duration);
      times[index] = duration;
      starts[index] = lap.date_start ?? null;

      // لفّة الخروج من الصيانة أبطأ بطبيعتها ولا تصلح «أفضل لفّة»
      if (duration !== null && !lap.is_pit_out_lap && (best === null || duration < best)) {
        best = duration;
        bestLap = lap.lap_number;
      }
    }

    if (best !== null && (fastest === null || best < fastest.seconds)) {
      fastest = {
        number: driver.driver_number,
        acronym: driver.name_acronym,
        seconds: best,
        lap: bestLap ?? 0,
      };
    }

    return {
      number: driver.driver_number,
      acronym: driver.name_acronym,
      name: driver.full_name,
      team: driver.team_name,
      colour: driver.team_colour ? `#${driver.team_colour.replace('#', '')}` : null,
      laps: times,
      starts,
      best,
      bestLap,
    };
  });

  return {
    totalLaps,
    drivers: rows.sort((a, b) => (a.best ?? Infinity) - (b.best ?? Infinity)),
    fastest,
  };
}
