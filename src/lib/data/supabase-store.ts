import 'server-only';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import type { Article, ArticleStatus, Driver, Race, Standings, Team, Category } from '@/lib/types';

import { toPublic, type ArticleQuery, type Repository } from './repository';

/**
 * مخزن الإنتاج. يُستخدم تلقائياً متى وُجدت متغيّرات Supabase في البيئة.
 *
 * نستعمل مفتاح service role لأن كل القراءات تحدث على الخادم فقط، ولا يصل
 * أي مفتاح إلى المتصفح. سياسات RLS في supabase/schema.sql تمنع القراءة
 * العامة لأي خبر غير منشور.
 */

let client: SupabaseClient | null = null;

function db(): SupabaseClient {
  if (client) return client;
  client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
  return client;
}

/** صفوف قاعدة البيانات snake_case ← أنواع التطبيق camelCase. */
type ArticleRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  category: Category;
  tags: string[] | null;
  hero_image: string | null;
  hero_image_alt: string | null;
  hero_image_credit: Article['heroImageCredit'];
  published_at: string;
  updated_at: string | null;
  reading_minutes: number;
  status: ArticleStatus;
  sources: Article['sources'] | null;
  fact_check: Article['factCheck'];
  human_reviewed: boolean;
};

function fromRow(row: ArticleRow): Article {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    body: row.body,
    category: row.category,
    tags: row.tags ?? [],
    heroImage: row.hero_image,
    heroImageAlt: row.hero_image_alt ?? '',
    heroImageCredit: row.hero_image_credit,
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
    readingMinutes: row.reading_minutes,
    status: row.status,
    sources: row.sources ?? [],
    factCheck: row.fact_check,
    humanReviewed: row.human_reviewed,
  };
}

function toRow(a: Article): ArticleRow {
  return {
    id: a.id,
    slug: a.slug,
    title: a.title,
    excerpt: a.excerpt,
    body: a.body,
    category: a.category,
    tags: a.tags,
    hero_image: a.heroImage,
    hero_image_alt: a.heroImageAlt,
    hero_image_credit: a.heroImageCredit,
    published_at: a.publishedAt,
    updated_at: a.updatedAt,
    reading_minutes: a.readingMinutes,
    status: a.status,
    sources: a.sources,
    fact_check: a.factCheck,
    human_reviewed: a.humanReviewed,
  };
}

export const supabaseRepository: Repository = {
  async listPublished(query: ArticleQuery = {}) {
    const { category, limit = 20, offset = 0, excludeId } = query;
    let q = db()
      .from('articles')
      .select('*')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (category) q = q.eq('category', category);
    if (excludeId) q = q.neq('id', excludeId);

    const { data, error } = await q;
    if (error) throw new Error(`فشل جلب الأخبار: ${error.message}`);
    return (data as ArticleRow[]).map((row) => toPublic(fromRow(row)));
  },

  async countPublished(category?: Category) {
    let q = db().from('articles').select('id', { count: 'exact', head: true }).eq('status', 'published');
    if (category) q = q.eq('category', category);
    const { count, error } = await q;
    if (error) throw new Error(`فشل عدّ الأخبار: ${error.message}`);
    return count ?? 0;
  },

  async getBySlug(slug: string) {
    const { data, error } = await db()
      .from('articles')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'published')
      .maybeSingle();
    if (error) throw new Error(`فشل جلب الخبر: ${error.message}`);
    return data ? toPublic(fromRow(data as ArticleRow)) : null;
  },

  async listForReview() {
    const { data, error } = await db()
      .from('articles')
      .select('*')
      .in('status', ['review', 'translated'])
      .order('published_at', { ascending: false });
    if (error) throw new Error(`فشل جلب طابور المراجعة: ${error.message}`);
    return (data as ArticleRow[])
      .map(fromRow)
      .sort((a, b) => (a.factCheck?.confidence ?? 0) - (b.factCheck?.confidence ?? 0));
  },

  async upsertArticles(articles: Article[]) {
    if (articles.length === 0) return;
    const { error } = await db().from('articles').upsert(articles.map(toRow), { onConflict: 'id' });
    if (error) throw new Error(`فشل حفظ الأخبار: ${error.message}`);
  },

  async setStatus(id: string, status: ArticleStatus, humanReviewed: boolean) {
    const { error } = await db()
      .from('articles')
      .update({ status, human_reviewed: humanReviewed, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw new Error(`فشل تحديث حالة الخبر: ${error.message}`);
  },

  async listTeams() {
    const { data, error } = await db().from('teams').select('*').order('name');
    if (error) throw new Error(`فشل جلب الفرق: ${error.message}`);
    return data as Team[];
  },

  async listDrivers() {
    const { data, error } = await db().from('drivers').select('*').order('number');
    if (error) throw new Error(`فشل جلب السائقين: ${error.message}`);
    return data as Driver[];
  },

  async listRaces() {
    const { data, error } = await db().from('races').select('*').order('round');
    if (error) throw new Error(`فشل جلب السباقات: ${error.message}`);
    return data as Race[];
  },

  async getStandings() {
    const { data, error } = await db()
      .from('standings')
      .select('*')
      .order('season', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(`فشل جلب الترتيب: ${error.message}`);
    return data as Standings;
  },
};
