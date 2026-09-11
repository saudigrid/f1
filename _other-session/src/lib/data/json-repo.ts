import { promises as fs } from "node:fs";
import path from "node:path";
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

const DATA_DIR = path.join(process.cwd(), "src", "data");

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(path.join(DATA_DIR, file), "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(file: string, value: unknown): Promise<void> {
  try {
    await fs.writeFile(path.join(DATA_DIR, file), JSON.stringify(value, null, 2) + "\n", "utf8");
  } catch (err) {
    // نظام الملفات للقراءة فقط في بيئات النشر — الكتابة تتطلب Supabase.
    console.warn("[json-repo] تعذّرت الكتابة، فعّل Supabase للنشر:", err);
  }
}

/**
 * مصدر بيانات محلي للتطوير والمعاينة.
 * القراءة تعمل في كل البيئات؛ الكتابة تعمل محلياً فقط.
 */
export class JsonRepo implements ContentRepo {
  private async articles(): Promise<Article[]> {
    return readJson<Article[]>("articles.json", []);
  }

  async listArticles(opts: {
    category?: string;
    limit?: number;
    offset?: number;
    status?: ArticleStatus;
    featuredOnly?: boolean;
  } = {}): Promise<Article[]> {
    const { category, limit, offset = 0, status = "published", featuredOnly } = opts;
    let rows = (await this.articles()).filter((a) => a.status === status);
    if (category) rows = rows.filter((a) => a.category === category);
    if (featuredOnly) rows = rows.filter((a) => a.featured);
    rows.sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
    return rows.slice(offset, limit ? offset + limit : undefined);
  }

  async getArticle(slug: string): Promise<Article | null> {
    return (await this.articles()).find((a) => a.slug === slug) ?? null;
  }

  async countArticles(opts: { category?: string; status?: ArticleStatus } = {}): Promise<number> {
    const { category, status = "published" } = opts;
    return (await this.articles()).filter(
      (a) => a.status === status && (!category || a.category === category),
    ).length;
  }

  async saveArticle(article: Article): Promise<void> {
    const rows = await this.articles();
    const i = rows.findIndex((a) => a.id === article.id);
    if (i >= 0) rows[i] = article;
    else rows.unshift(article);
    await writeJson("articles.json", rows);
  }

  async setArticleStatus(id: string, status: ArticleStatus): Promise<void> {
    const rows = await this.articles();
    const row = rows.find((a) => a.id === id);
    if (!row) return;
    row.status = status;
    row.updatedAt = new Date().toISOString();
    if (status === "published" && !row.publishedAt) row.publishedAt = row.updatedAt;
    await writeJson("articles.json", rows);
  }

  async listReviewQueue(): Promise<Article[]> {
    const rows = (await this.articles()).filter((a) => a.status === "pending_review");
    rows.sort(
      (a, b) =>
        (b.internal?.factCheck?.confidence ?? 0) - (a.internal?.factCheck?.confidence ?? 0),
    );
    return rows;
  }

  async listIngestFingerprints(): Promise<string[]> {
    return (await this.articles())
      .map((a) => a.internal?.ingestId)
      .filter((v): v is string => !!v);
  }

  async listRaces(season?: number): Promise<Race[]> {
    const rows = await readJson<Race[]>("races.json", []);
    const filtered = season ? rows.filter((r) => r.season === season) : rows;
    return filtered.sort((a, b) => a.round - b.round);
  }

  async getRace(slug: string): Promise<Race | null> {
    return (await this.listRaces()).find((r) => r.slug === slug) ?? null;
  }

  async getNextRace(): Promise<Race | null> {
    const now = Date.now();
    const upcoming = (await this.listRaces())
      .filter((r) => Date.parse(r.startsAt) > now)
      .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
    return upcoming[0] ?? null;
  }

  async getStandings(season?: number): Promise<Standings | null> {
    const s = await readJson<Standings | null>("standings.json", null);
    if (!s) return null;
    if (season && s.season !== season) return null;
    return s;
  }

  async listDrivers(): Promise<Driver[]> {
    return readJson<Driver[]>("drivers.json", []);
  }

  async listTeams(): Promise<Team[]> {
    return readJson<Team[]>("teams.json", []);
  }

  async getTeam(slug: string): Promise<Team | null> {
    return (await this.listTeams()).find((t) => t.slug === slug) ?? null;
  }

  async listDirectAds(): Promise<DirectAd[]> {
    const now = Date.now();
    return (await readJson<DirectAd[]>("ads.json", [])).filter(
      (ad) =>
        ad.active && Date.parse(ad.startsAt) <= now && Date.parse(ad.endsAt) >= now,
    );
  }
}
