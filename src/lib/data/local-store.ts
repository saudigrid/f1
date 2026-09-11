import 'server-only';

import { promises as fs } from 'node:fs';
import path from 'node:path';

import articlesSeed from '@/data/articles.json';
import driversSeed from '@/data/drivers.json';
import racesSeed from '@/data/races.json';
import standingsSeed from '@/data/standings.json';
import teamsSeed from '@/data/teams.json';
import type { Article, ArticleStatus, Driver, Race, Standings, Team, Category } from '@/lib/types';

import { toPublic, type ArticleQuery, type Repository } from './repository';

/**
 * مخزن التطوير: يقرأ من src/data ويكتب فيه.
 *
 * ⚠️ للتطوير المحلي فقط. نظام ملفات Vercel للقراءة فقط، فأي نشر فعلي
 * يحتاج Supabase — أضف المتغيّرات في .env وسينتقل الموقع تلقائياً.
 */

const ARTICLES_PATH = path.join(process.cwd(), 'src', 'data', 'articles.json');

let memory: Article[] | null = null;

async function load(): Promise<Article[]> {
  if (memory) return memory;
  try {
    const raw = await fs.readFile(ARTICLES_PATH, 'utf8');
    memory = JSON.parse(raw) as Article[];
  } catch {
    memory = articlesSeed as Article[];
  }
  return memory;
}

async function persist(articles: Article[]): Promise<void> {
  memory = articles;
  try {
    await fs.writeFile(ARTICLES_PATH, `${JSON.stringify(articles, null, 2)}\n`, 'utf8');
  } catch {
    // نظام ملفات للقراءة فقط — نكتفي بالذاكرة ولا نُسقط الطلب
  }
}

const byNewest = (a: Article, b: Article) =>
  new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();

export const localRepository: Repository = {
  async listPublished(query: ArticleQuery = {}) {
    const { category, limit = 20, offset = 0, excludeId } = query;
    const all = await load();
    return all
      .filter((a) => a.status === 'published')
      .filter((a) => (category ? a.category === category : true))
      .filter((a) => (excludeId ? a.id !== excludeId : true))
      .sort(byNewest)
      .slice(offset, offset + limit)
      .map(toPublic);
  },

  async countPublished(category?: Category) {
    const all = await load();
    return all.filter(
      (a) => a.status === 'published' && (category ? a.category === category : true),
    ).length;
  },

  async getBySlug(slug: string) {
    const all = await load();
    const found = all.find((a) => a.slug === slug && a.status === 'published');
    return found ? toPublic(found) : null;
  },

  async listForReview() {
    const all = await load();
    return all
      .filter((a) => a.status === 'review' || a.status === 'translated')
      .sort((a, b) => (a.factCheck?.confidence ?? 0) - (b.factCheck?.confidence ?? 0));
  },

  async upsertArticles(incoming: Article[]) {
    const all = await load();
    const index = new Map(all.map((a) => [a.id, a]));
    for (const article of incoming) index.set(article.id, article);
    await persist([...index.values()]);
  },

  async setStatus(id: string, status: ArticleStatus, humanReviewed: boolean) {
    const all = await load();
    await persist(all.map((a) => (a.id === id ? { ...a, status, humanReviewed } : a)));
  },

  async listTeams() {
    return teamsSeed as Team[];
  },
  async listDrivers() {
    return driversSeed as Driver[];
  },
  async listRaces() {
    return racesSeed as Race[];
  },
  async getStandings() {
    return standingsSeed as Standings;
  },
};
