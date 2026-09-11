/** أنواع البيانات المشتركة بين طبقة العرض وطبقة الأتمتة. */

export type Locale = "ar" | "en";

/** حالة المقال في دورة النشر. */
export type ArticleStatus = "draft" | "pending_review" | "published" | "rejected";

/** مصدر خارجي استُند إليه في الخبر. */
export interface SourceRef {
  outlet: string;
  url: string;
  publishedAt: string;
  /** لغة المصدر الأصلية */
  lang: string;
}

/** تقرير وكيل التدقيق — لا يظهر للزوار إطلاقاً. */
export interface FactCheckReport {
  /** 0-100. الحد الأدنى للنشر التلقائي في lib/agents/policy.ts */
  confidence: number;
  verdict: "verified" | "partially_verified" | "unverified" | "contradicted";
  /** ادعاءات مفردة مع حكم كل واحد */
  claims: Array<{
    claim: string;
    status: "supported" | "unsupported" | "contradicted";
    note: string;
  }>;
  /** ما يجب على المحرر البشري الانتباه له */
  editorNotes: string[];
  independentSourceCount: number;
  checkedAt: string;
  model: string;
}

export interface Article {
  id: string;
  slug: string;
  locale: Locale;
  title: string;
  /** جملة واحدة تظهر تحت العنوان وفي بطاقة الخبر */
  excerpt: string;
  /** المتن بصيغة Markdown مبسّطة (فقرات + عناوين فرعية) */
  body: string;
  category: string;
  tags: string[];
  heroImage?: { url: string; alt: string; credit?: string };
  publishedAt: string;
  updatedAt?: string;
  readingMinutes: number;
  featured: boolean;
  status: ArticleStatus;
  sources: SourceRef[];
  /** حقول داخلية — تُحجب عن أي استجابة عامة */
  internal?: {
    ingestId: string;
    factCheck?: FactCheckReport;
    translatorModel?: string;
    autoPublished?: boolean;
  };
}

export interface Driver {
  id: string;
  slug: string;
  name: string;
  nameEn: string;
  number: number;
  code: string;
  nationality: string;
  countryCode: string;
  teamId: string;
  headshot?: string;
}

export interface Team {
  id: string;
  slug: string;
  name: string;
  nameEn: string;
  base: string;
  powerUnit: string;
  /** لون الفريق الرسمي — يُستخدم في الشارات وأشرطة الترتيب */
  color: string;
  logo?: string;
}

export interface Race {
  id: string;
  slug: string;
  round: number;
  season: number;
  name: string;
  circuit: string;
  country: string;
  countryCode: string;
  /** توقيت بداية السباق بصيغة ISO 8601 مع المنطقة الزمنية */
  startsAt: string;
  status: "upcoming" | "live" | "completed";
  isSprint: boolean;
  results?: Array<{
    position: number;
    driverId: string;
    teamId: string;
    points: number;
    time?: string;
    status?: string;
  }>;
}

export interface StandingRow {
  position: number;
  points: number;
  wins: number;
  /** driverId أو teamId حسب نوع الجدول */
  entityId: string;
}

export interface Standings {
  season: number;
  updatedAt: string;
  drivers: StandingRow[];
  constructors: StandingRow[];
}

/** إعلان مباشر تديره بنفسك (البديل عن AdSense في نفس الموضع). */
export interface DirectAd {
  placementId: string;
  advertiser: string;
  imageUrl: string;
  imageUrlMobile?: string;
  targetUrl: string;
  alt: string;
  startsAt: string;
  endsAt: string;
  active: boolean;
}
