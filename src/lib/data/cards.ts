import circuitData from '@/data/circuits.json';
import customIndex from '@/data/driver-photos.json';
import driverData from '@/data/driver-cards.json';
import type { ImageCredit } from '@/lib/types';

/**
 * بطاقات جاهزة تُقرأ من القرص — لا نداء شبكة.
 *
 * ⚠️ هذه الطبقة وُلدت من عطل حقيقي. صفحتا `/circuits` و`/drivers` كانتا
 * تنادِيان Jolpica وقت البناء، ومع أحد عشر عاملاً متوازياً صار ذلك انفجار
 * طلبات متطابقة فردّت **429** وسقط البناء مرّتين. ولم تنفع إعادة المحاولة
 * الأذكى: الحدّ حدُّ **تزامن** لا حدُّ يوم — الطلب الفردي يعود 200 دائماً.
 *
 * القاعدة المستخلَصة: **ما لا يتغيّر لا يُطلَب وقت البناء.** اسم مونزا وجنسية
 * فانخيو ثابتان، فيُكتبان في الملفات مرة (`npm run backfill`) ويُقرآن من هنا.
 * ويبقى النداء الحيّ لما يتغيّر فعلاً — نتائج السباقات وترتيب الموسم — في
 * صفحات تُصيَّر عند الطلب لا وقت البناء.
 */

export interface CircuitCardData {
  id: string;
  image: string | null;
  imageCredit: ImageCredit | null;
  summaryEn: string | null;
  summaryAr: string | null;
  lengthMeters: number | null;
  turns: number | null;
  openedYear: number | null;
  wikipediaUrl: string;
  /** مخطّط SVG موحّد مولَّد من OSM — الخيار الأول للعرض. */
  layout?: string | null;
  layoutClosed?: boolean;
  /** حقول العرض — يملؤها `npm run backfill`. */
  name?: string;
  nameEn?: string;
  locality?: string;
  country?: string;
  countryCode?: string;
  active?: boolean;
}

export interface DriverCardData {
  id: string;
  image: string | null;
  imageCredit: ImageCredit | null;
  imageTeam: string | null;
  /** حقول العرض — يملؤها `npm run backfill`. */
  name?: string;
  nameEn?: string;
  nationality?: string;
  countryCode?: string;
  active?: boolean;
}

const circuitCards = circuitData as CircuitCardData[];
const driverCards = driverData as DriverCardData[];

export function allCircuitCards(): CircuitCardData[] {
  return circuitCards;
}

export function circuitCard(id: string): CircuitCardData | null {
  return circuitCards.find((card) => card.id === id) ?? null;
}

/**
 * صور يضيفها المحرّر بيده — تسبق كل ما تجده المزامنة.
 *
 * ## كيف تعمل
 *
 * يضع المحرّر `public/drivers-custom/<المعرّف>.jpg`، فيقرأ `npm run photos:sync`
 * المجلد ويكتب الفهرس هنا. لا تعديل كود ولا إعادة بحث في كومنز.
 *
 * ## لماذا الأولوية المطلقة
 *
 * البحث الآلي يصيب في معظم الحالات ويخطئ في بعضها — 197 سائقاً حصلوا على
 * صورة **فريقهم** لأنه لا صورة حرّة لهم. حين يتعب إنسان ويجد الصورة الصحيحة،
 * لا معنى لأن تنافسها خوارزمية. الحكم اليدوي نهائي.
 */
const customPhotos = customIndex as Record<string, string>;

export function customDriverPhoto(id: string): string | null {
  return customPhotos[id] ?? null;
}

export function driverCard(id: string): DriverCardData | null {
  const card = driverCards.find((entry) => entry.id === id) ?? null;
  if (!card) return null;

  const custom = customDriverPhoto(id);
  // الصورة اليدوية تُلغي أيضاً وسم «صورة فريق» — لم تعد صورة فريق
  return custom ? { ...card, image: custom, imageTeam: null } : card;
}

/**
 * البطاقات الصالحة للعرض في شبكة.
 *
 * بطاقة بلا `name` لم تمرّ على `backfill` بعد. نتجاهلها بدل عرض معرّف خام
 * مثل «max_verstappen» للقارئ — والعدّاد في السكربت يخبرنا كم بقي.
 */
export function listableDriverCards(): (DriverCardData & { name: string; nameEn: string })[] {
  return driverCards
    .map((card) => {
      const custom = customDriverPhoto(card.id);
      return custom ? { ...card, image: custom, imageTeam: null } : card;
    })
    .filter(
    (card): card is DriverCardData & { name: string; nameEn: string } =>
      typeof card.name === 'string' && typeof card.nameEn === 'string',
  );
}

export function listableCircuitCards(): (CircuitCardData & { name: string })[] {
  return circuitCards.filter(
    (card): card is CircuitCardData & { name: string } => typeof card.name === 'string',
  );
}
