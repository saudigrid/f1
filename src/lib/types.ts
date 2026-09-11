/**
 * الأنواع المشتركة عبر الموقع وخط الأتمتة.
 * كل حقل نصّي موجّه للقارئ مخزّن بالعربية؛ الحقول المنتهية بـ `En` تبقى بالإنجليزية
 * لأنها أسماء علم (سائقين، فرق، حلبات) وتُستخدم أيضاً في نسخة الموقع الإنجليزية لاحقاً.
 */

/** أقسام الموقع — تغطية عالمية بلا قسم جغرافي خاص. */
export type Category =
  | 'breaking'    // عاجل
  | 'news'        // أخبار عامة
  | 'transfers'   // انتقالات وعقود
  | 'technical'   // تحليل تقني
  | 'race-report' // تقارير السباقات
  | 'regulations'; // لوائح FIA

export const CATEGORY_LABELS: Record<Category, string> = {
  breaking: 'عاجل',
  news: 'أخبار',
  transfers: 'انتقالات',
  technical: 'تحليل تقني',
  'race-report': 'تقارير السباقات',
  regulations: 'لوائح',
};

/** حالة الخبر في خط الإنتاج. الزائر لا يرى إلا `published`. */
export type ArticleStatus =
  | 'ingested'   // مسحوب من المصدر، لم يُترجم بعد
  | 'translated' // مرّ على وكيل الترجمة
  | 'review'     // وكيل التدقيق طلب مراجعة بشرية
  | 'published'  // منشور للزوار
  | 'rejected';  // مرفوض — لا يُنشر

/** مصدر خارجي استُخرج منه الخبر. يُعرض للقارئ كإسناد. */
export interface SourceRef {
  name: string;
  url: string;
  publishedAt: string; // ISO
}

/** نتيجة وكيل التدقيق — داخلية بالكامل، لا تظهر للزوار إطلاقاً. */
export interface FactCheckReport {
  /** 0–100. الحد الأدنى للنشر التلقائي معرّف في lib/config/pipeline.ts */
  confidence: number;
  /** عدد المصادر المستقلة التي أكّدت الخبر. */
  corroboratingSources: number;
  /** ادعاءات لم يستطع الوكيل تأكيدها — تُعرض لك في لوحة المراجعة. */
  unverifiedClaims: string[];
  /** ملاحظات محرّرية موجّهة لك أنت، لا للقارئ. */
  editorNotes: string;
  /** هل الخبر إشاعة/تكهنات؟ يُجبر على المراجعة اليدوية مهما كانت الثقة. */
  isSpeculation: boolean;
  checkedAt: string; // ISO
}

/**
 * نسبة الصورة إلى صاحبها.
 *
 * إلزامية مع كل صورة. مصدرها إما ترخيص مفتوح (ويكيميديا: مصوّر + ترخيص)،
 * أو اتفاقية مع ناشر (اسم الناشر وحده). وجودها شرط لعرض الصورة أصلاً.
 */
export interface ImageCredit {
  /** المصوّر أو الوكالة. */
  author: string;
  /** الجهة المعروضة للقارئ. */
  source: string;
  /** رمز الترخيص مثل CC BY-SA 4.0 — null للصور المرخّصة باتفاقية خاصة. */
  license: string | null;
  /** رابط صفحة الأصل للتحقق. */
  sourceUrl: string | null;
}

export interface Article {
  id: string;
  slug: string;
  title: string;
  /** ملخّص من سطرين يظهر في البطاقات وفي وصف الصفحة للسيو. */
  excerpt: string;
  /** المتن بصيغة Markdown مبسّطة (فقرات + عناوين فرعية). */
  body: string;
  category: Category;
  tags: string[];
  heroImage: string | null;
  heroImageAlt: string;
  /** نسبة الصورة — null حين لا توجد صورة. */
  heroImageCredit: ImageCredit | null;
  publishedAt: string; // ISO
  updatedAt: string | null;
  readingMinutes: number;
  status: ArticleStatus;
  /** المصادر الأصلية — إلزامية للنشر، وتُعرض أسفل كل خبر. */
  sources: SourceRef[];
  /** تقرير التدقيق — يُحذف من الاستجابة العامة قبل وصولها للمتصفح. */
  factCheck: FactCheckReport | null;
  /** هل مرّ الخبر بمراجعة بشرية؟ */
  humanReviewed: boolean;
}

/** الشكل الآمن للعرض العام — بلا أي أثر لخط الأتمتة. */
export type PublicArticle = Omit<Article, 'factCheck' | 'status' | 'humanReviewed'>;

export interface Driver {
  id: string;
  name: string;      // بالعربية
  nameEn: string;
  number: number;
  teamId: string;
  countryCode: string; // ISO 3166-1 alpha-2 للعلم
}

export interface Team {
  id: string;
  name: string;
  nameEn: string;
  /** لون الفريق الرسمي — يُستخدم كشريط تمييز فقط، لا كخلفية. */
  color: string;
  base: string;
  powerUnit: string;
}

export interface Race {
  id: string;
  round: number;
  name: string;        // «جائزة السعودية الكبرى»
  nameEn: string;
  circuit: string;     // «حلبة كورنيش جدة»
  country: string;
  countryCode: string;
  /** بداية السباق بتوقيت UTC — العدّاد يحوّلها لتوقيت جهاز الزائر. */
  startsAt: string;    // ISO
  laps: number;
  status: 'upcoming' | 'live' | 'completed';
  /** ترتيب أول ثلاثة بعد انتهاء السباق. */
  podium: { position: number; driverId: string }[] | null;
}

export interface StandingRow {
  position: number;
  /** معرّف سائق أو فريق حسب نوع الجدول. */
  entityId: string;
  points: number;
  wins: number;
  /** الفارق عن المتصدّر — محسوب مسبقاً لتفادي حسابه في المتصفح. */
  gapToLeader: number;
}

export interface Standings {
  season: number;
  updatedAt: string;
  drivers: StandingRow[];
  constructors: StandingRow[];
}
