import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { ContentRepo } from "./repo";
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
 * تطبيق Supabase — يُفعَّل تلقائياً عند وجود متغيرات البيئة.
 * مخطط الجداول في supabase/schema.sql.
 *
 * الكتابات تستخدم مفتاح service role (خادم فقط) لأن سياسات RLS
 * تمنع الكتابة العامة؛ القراءات تستخدم المفتاح العام.
 */
export class SupabaseRepo implements ContentRepo {
  private read: SupabaseClient;
  private write: SupabaseClient;

  constructor() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
    this.read = createClient(url, anon, { auth: { persistSession: false } });
    this.write = service
      ? createClient(url, service, { auth: { persistSession: false } })
      : this.read;
  }

  async listArticles(opts: {
    category?: string;
    limit?: number;
    offset?: number;
    status?: ArticleStatus;
    featuredOnly?: boolean;
  } = {}): Promise<Article[]> {
    const { category, limit = 24, offset = 0, status = "published", featuredOnly } = opts;
    let q = this.read
      .from("articles")
      .select("*")
      .eq("status", status)
      .order("published_at", { ascending: false })
      .range(offset, offset + limit - 1);
    if (category) q = q.eq("category", category);
    if (featuredOnly) q = q.eq("featured", true);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []).map(fromRow);
  }

  async getArticle(slug: string): Promise<Article | null> {
    const { data, error } = await this.read
      .from("articles")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();
    if (error) throw error;
    return data ? fromRow(data) : null;
  }

  async countArticles(opts: { category?: string; status?: ArticleStatus } = {}): Promise<number> {
    let q = this.read
      .from("articles")
      .select("id", { count: "exact", head: true })
      .eq("status", opts.status ?? "published");
    if (opts.category) q = q.eq("category", opts.category);
    const { count, error } = await q;
    if (error) throw error;
    return count ?? 0;
  }

  async saveArticle(article: Article): Promise<void> {
    const { error } = await this.write.from("articles").upsert(toRow(article), { onConflict: "id" });
    if (error) throw error;
  }

  async setArticleStatus(id: string, status: ArticleStatus): Promise<void> {
    const { error } = await this.write
      .from("articles")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
  }

  async listReviewQueue(): Promise<Article[]> {
    const { data, error } = await this.write
      .from("articles")
      .select("*")
      .eq("status", "pending_review")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(fromRow);
  }

  async listIngestFingerprints(): Promise<string[]> {
    const { data, error } = await this.write.from("articles").select("ingest_id").limit(5000);
    if (error) throw error;
    return (data ?? []).map((r) => r.ingest_id).filter(Boolean);
  }

  async listRaces(season?: number): Promise<Race[]> {
    let q = this.read.from("races").select("*").order("round");
    if (season) q = q.eq("season", season);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as unknown as Race[];
  }

  async getRace(slug: string): Promise<Race | null> {
    const { data, error } = await this.read
      .from("races")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();
    if (error) throw error;
    return (data as unknown as Race) ?? null;
  }

  async getNextRace(): Promise<Race | null> {
    const { data, error } = await this.read
      .from("races")
      .select("*")
      .gt("starts_at", new Date().toISOString())
      .order("starts_at")
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return (data as unknown as Race) ?? null;
  }

  async getStandings(season?: number): Promise<Standings | null> {
    let q = this.read.from("standings").select("*").order("season", { ascending: false }).limit(1);
    if (season) q = q.eq("season", season);
    const { data, error } = await q.maybeSingle();
    if (error) throw error;
    return (data as unknown as Standings) ?? null;
  }

  async listDrivers(): Promise<Driver[]> {
    const { data, error } = await this.read.from("drivers").select("*").order("number");
    if (error) throw error;
    return (data ?? []) as unknown as Driver[];
  }

  async listTeams(): Promise<Team[]> {
    const { data, error } = await this.read.from("teams").select("*").order("name");
    if (error) throw error;
    return (data ?? []) as unknown as Team[];
  }

  async getTeam(slug: string): Promise<Team | null> {
    const { data, error } = await this.read
      .from("teams")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();
    if (error) throw error;
    return (data as unknown as Team) ?? null;
  }

  async listDirectAds(): Promise<DirectAd[]> {
    const now = new Date().toISOString();
    const { data, error } = await this.read
      .from("direct_ads")
      .select("*")
      .eq("active", true)
      .lte("starts_at", now)
      .gte("ends_at", now);
    if (error) throw error;
    return (data ?? []) as unknown as DirectAd[];
  }
}

/* ————— تحويل بين snake_case في قاعدة البيانات و camelCase في التطبيق ————— */

type Row = Record<string, unknown>;

function fromRow(r: Row): Article {
  return {
    id: r.id as string,
    slug: r.slug as string,
    locale: (r.locale as Article["locale"]) ?? "ar",
    title: r.title as string,
    excerpt: r.excerpt as string,
    body: r.body as string,
    category: r.category as string,
    tags: (r.tags as string[]) ?? [],
    heroImage: (r.hero_image as Article["heroImage"]) ?? undefined,
    publishedAt: r.published_at as string,
    updatedAt: (r.updated_at as string) ?? undefined,
    readingMinutes: (r.reading_minutes as number) ?? 3,
    featured: !!r.featured,
    status: r.status as ArticleStatus,
    sources: (r.sources as Article["sources"]) ?? [],
    internal: {
      ingestId: r.ingest_id as string,
      factCheck: (r.fact_check as Article["internal"] extends undefined
        ? never
        : NonNullable<Article["internal"]>["factCheck"]) ?? undefined,
      translatorModel: (r.translator_model as string) ?? undefined,
      autoPublished: !!r.auto_published,
    },
  };
}

function toRow(a: Article): Row {
  return {
    id: a.id,
    slug: a.slug,
    locale: a.locale,
    title: a.title,
    excerpt: a.excerpt,
    body: a.body,
    category: a.category,
    tags: a.tags,
    hero_image: a.heroImage ?? null,
    published_at: a.publishedAt,
    updated_at: a.updatedAt ?? null,
    reading_minutes: a.readingMinutes,
    featured: a.featured,
    status: a.status,
    sources: a.sources,
    ingest_id: a.internal?.ingestId ?? null,
    fact_check: a.internal?.factCheck ?? null,
    translator_model: a.internal?.translatorModel ?? null,
    auto_published: a.internal?.autoPublished ?? false,
  };
}
