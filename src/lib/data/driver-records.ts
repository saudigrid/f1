import recordsData from '@/data/driver-records.json';
import { driverCard } from '@/lib/data/cards';

/**
 * الأرقام القياسية — تُقرأ من القرص، لا نداء شبكة.
 *
 * يبنيها `npm run sync:history` من نفس الزحف الذي يبني `team-history.json`،
 * فكل صفّ نتيجة قرأناه مرّة واحدة يُستثمر في الاثنين معاً.
 */

export interface DriverRecordRow {
  nameEn: string;
  nationality: string;
  dateOfBirth: string | null;
  seasons: number[];
  entries: number;
  wins: number;
  podiums: number;
  gridFirst: number;
  points: number;
  bestFinish: number | null;
  firstWin: { season: number; round: number; race: string; date: string } | null;
  lastWin: { season: number; round: number; race: string; date: string } | null;
  bestStreak: number;
  bestStreakFrom: { season: number; round: number; race: string } | null;
  bestStreakTo: { season: number; round: number; race: string } | null;
}

interface RecordHolder {
  driverId: string;
  value: number;
}

interface RecordsSummary {
  mostWins: RecordHolder[];
  mostPodiums: RecordHolder[];
  mostPoints: RecordHolder[];
  mostGridFirst: RecordHolder[];
  mostEntries: RecordHolder[];
  mostTitles: RecordHolder[];
  mostWinsSeason: (RecordHolder & { season: number })[];
  mostPointsSeason: (RecordHolder & { season: number })[];
  longestWinStreak: (RecordHolder & {
    from: { season: number; round: number; race: string } | null;
    to: { season: number; round: number; race: string } | null;
  })[];
  youngestWinner: { driverId: string; ageDays: number; season: number; round: number; race: string } | null;
  oldestWinner: { driverId: string; ageDays: number; season: number; round: number; race: string } | null;
  youngestChampion: { driverId: string; ageDays: number; season: number } | null;
  oldestChampion: { driverId: string; ageDays: number; season: number } | null;
}

interface RecordsFile {
  drivers: Record<string, DriverRecordRow>;
  records: RecordsSummary;
}

const data = recordsData as unknown as RecordsFile;

export function driverRecord(id: string): DriverRecordRow | null {
  return data.drivers[id] ?? null;
}

export function recordsSummary(): RecordsSummary {
  return data.records;
}

export interface RecordBadge {
  label: string;
  href: string;
}

/**
 * الأرقام القياسية التي يتصدّرها هذا السائق تحديداً — لا كل من ظهر في قائمة.
 *
 * ⚠️ الصدارة فقط (المركز الأول)، لا أي ظهور في أعلى عشرة. شارة «رقم قياسي»
 * يجب أن تعني شيئاً نادراً؛ لو ظهرت لعشرة سائقين في كل صفحة فقدت معناها.
 */
export function driverRecordBadges(id: string): RecordBadge[] {
  const records = recordsSummary();
  const badges: RecordBadge[] = [];

  const leads = (holders: { driverId: string }[]) => holders[0]?.driverId === id;

  if (leads(records.mostWins)) badges.push({ label: 'الأكثر انتصاراً في تاريخ الفورمولا 1', href: '/records' });
  if (leads(records.mostPodiums)) badges.push({ label: 'الأكثر صعوداً للمنصّة في التاريخ', href: '/records' });
  if (leads(records.mostPoints)) badges.push({ label: 'الأكثر جمعاً للنقاط في التاريخ', href: '/records' });
  if (leads(records.mostTitles)) badges.push({ label: 'الأكثر تتويجاً بالبطولة', href: '/records' });
  if (leads(records.mostEntries)) badges.push({ label: 'الأكثر مشاركة في التاريخ', href: '/records' });
  if (leads(records.longestWinStreak)) {
    badges.push({ label: `صاحب أطول سلسلة انتصارات متتالية (${records.longestWinStreak[0].value})`, href: '/records' });
  }
  if (records.youngestWinner?.driverId === id) badges.push({ label: 'أصغر فائز بسباق في التاريخ', href: '/records' });
  if (records.oldestWinner?.driverId === id) badges.push({ label: 'أكبر فائز بسباق في التاريخ', href: '/records' });
  if (records.youngestChampion?.driverId === id) badges.push({ label: 'أصغر بطل عالم في التاريخ', href: '/records' });
  if (records.oldestChampion?.driverId === id) badges.push({ label: 'أكبر بطل عالم في التاريخ', href: '/records' });

  return badges;
}

/** اسم عرض للسائق — العربي إن وُجدت بطاقته، وإلا الإنجليزي كما زُحف. */
export function driverDisplayName(id: string, fallbackEn: string): { name: string; image: string | null } {
  const card = driverCard(id);
  return { name: card?.name ?? fallbackEn, image: card?.image ?? null };
}

/**
 * «١٨ سنة و٦٩ يوماً» — العمر يُقرأ بالأيام لأن سنة عقدية وحدها لا تفرّق بين
 * أصغر فائزَين وُلدا في العام نفسه.
 */
export function formatAge(ageDays: number): string {
  const years = Math.floor(ageDays / 365.25);
  const days = Math.round(ageDays - years * 365.25);

  const yearWord = years === 1 ? 'سنة' : years === 2 ? 'سنتان' : years <= 10 ? 'سنوات' : 'سنة';
  const dayWord = days === 1 ? 'يوم' : days === 2 ? 'يومان' : days <= 10 ? 'أيام' : 'يوماً';

  if (days === 0) return `${years} ${yearWord}`;
  return `${years} ${yearWord} و${days} ${dayWord}`;
}
