import 'server-only';

import type {
  Article,
  ArticleStatus,
  Driver,
  PublicArticle,
  Race,
  Standings,
  Team,
  Category,
} from '@/lib/types';

/**
 * طبقة الوصول للبيانات.
 *
 * الموقع لا يعرف أبداً من أين تأتي البيانات — يستدعي هذه الدوال فقط.
 * إذا كانت متغيّرات Supabase موجودة في البيئة نقرأ منها، وإلا نعود لملفات
 * JSON المحلية في src/data. هذا يعني أن تركيب Supabase لاحقاً لا يتطلب
 * تعديل أي صفحة أو مكوّن.
 */

export interface ArticleQuery {
  category?: Category;
  limit?: number;
  offset?: number;
  /** استبعاد خبر بعينه — يُستخدم في قائمة «اقرأ أيضاً». */
  excludeId?: string;
}

export interface Repository {
  listPublished(query?: ArticleQuery): Promise<PublicArticle[]>;
  countPublished(category?: Category): Promise<number>;
  getBySlug(slug: string): Promise<PublicArticle | null>;
  /** طابور المراجعة — لوحة التحكم فقط، ويعيد الحقول الداخلية كاملة. */
  listForReview(): Promise<Article[]>;
  upsertArticles(articles: Article[]): Promise<void>;
  setStatus(id: string, status: ArticleStatus, humanReviewed: boolean): Promise<void>;

  listTeams(): Promise<Team[]>;
  listDrivers(): Promise<Driver[]>;
  listRaces(): Promise<Race[]>;
  getStandings(): Promise<Standings>;
}

/** يجرّد الحقول الداخلية قبل أن يصل الخبر للمتصفح. */
export function toPublic(article: Article): PublicArticle {
  const { factCheck: _fc, status: _s, humanReviewed: _hr, ...rest } = article;
  return rest;
}

export const usingSupabase =
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

let cached: Repository | null = null;

export async function getRepository(): Promise<Repository> {
  if (cached) return cached;
  cached = usingSupabase
    ? (await import('./supabase-store')).supabaseRepository
    : (await import('./local-store')).localRepository;
  return cached;
}
