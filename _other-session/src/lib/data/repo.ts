import type {
  Article,
  ArticleStatus,
  DirectAd,
  Driver,
  Race,
  Standings,
  Team,
} from "./types";

/**
 * عقد واحد لكل قراءات وكتابات المحتوى.
 *
 * التطبيق الافتراضي يقرأ من ملفات JSON في src/data — يشتغل بلا أي مفاتيح.
 * عند ضبط متغيرات Supabase في البيئة يتبدّل التطبيق تلقائياً بدون تغيير
 * أي سطر في صفحات العرض.
 */
export interface ContentRepo {
  listArticles(opts?: {
    category?: string;
    limit?: number;
    offset?: number;
    status?: ArticleStatus;
    featuredOnly?: boolean;
  }): Promise<Article[]>;
  getArticle(slug: string): Promise<Article | null>;
  countArticles(opts?: { category?: string; status?: ArticleStatus }): Promise<number>;
  saveArticle(article: Article): Promise<void>;
  setArticleStatus(id: string, status: ArticleStatus): Promise<void>;
  /** المقالات المعلّقة في طابور المراجعة — لوحة التحكم فقط */
  listReviewQueue(): Promise<Article[]>;
  /** بصمات المقالات المستوردة سابقاً، لمنع التكرار في كل دورة أتمتة */
  listIngestFingerprints(): Promise<string[]>;

  listRaces(season?: number): Promise<Race[]>;
  getRace(slug: string): Promise<Race | null>;
  getNextRace(): Promise<Race | null>;

  getStandings(season?: number): Promise<Standings | null>;
  listDrivers(): Promise<Driver[]>;
  listTeams(): Promise<Team[]>;
  getTeam(slug: string): Promise<Team | null>;

  listDirectAds(): Promise<DirectAd[]>;
}

let cached: ContentRepo | null = null;

/** يختار مصدر البيانات حسب البيئة. استدعِه داخل مكوّنات الخادم فقط. */
export async function getRepo(): Promise<ContentRepo> {
  if (cached) return cached;

  const hasSupabase =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (hasSupabase) {
    const { SupabaseRepo } = await import("./supabase-repo");
    cached = new SupabaseRepo();
  } else {
    const { JsonRepo } = await import("./json-repo");
    cached = new JsonRepo();
  }
  return cached;
}

/** يحذف الحقول الداخلية (تقارير الوكلاء) قبل أي إرسال للمتصفح. */
export function publicArticle(article: Article): Article {
  const { internal: _internal, ...rest } = article;
  return rest;
}
