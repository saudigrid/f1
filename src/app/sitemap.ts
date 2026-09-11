import type { MetadataRoute } from 'next';

import circuitCards from '@/data/circuits.json';
import driverCards from '@/data/driver-cards.json';
import { getRepository } from '@/lib/data/repository';
import { listFormerTeams } from '@/lib/data/teams';
import { NAV_LINKS, SECONDARY_LINKS } from '@/lib/nav';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const repo = await getRepository();
  const articles = await repo.listPublished({ limit: 1000 });

  const pages: MetadataRoute.Sitemap = [...NAV_LINKS, ...SECONDARY_LINKS].map((link) => ({
    url: `${siteUrl}${link.href}`,
    changeFrequency: link.href === '/' ? 'hourly' : 'daily',
    priority: link.href === '/' ? 1 : 0.7,
  }));

  const news: MetadataRoute.Sitemap = articles.map((article) => ({
    url: `${siteUrl}/news/${article.slug}`,
    lastModified: article.updatedAt ?? article.publishedAt,
    changeFrequency: 'weekly',
    priority: 0.6,
  }));

  /**
   * صفحات الأرشيف تُقرأ من الملفات المزامَنة لا من الواجهة.
   *
   * خريطة الموقع تُبنى مع كل نشر، ونداءٌ لجلب 881 سائقاً هنا يعني تسع صفحات
   * ترقيم إضافية على واجهة سبق أن ردّت 429 أثناء البناء. الملفات تحمل نفس
   * المعرّفات مجاناً.
   */
  const archive: MetadataRoute.Sitemap = [
    ...(circuitCards as { id: string }[]).map((card) => `/circuits/${card.id}`),
    // الصياغة صريحة النوع لأن الملف قد يكون فارغاً قبل أول مزامنة
    ...(driverCards as { id: string }[]).map((card) => `/drivers/${card.id}`),
    '/teams/former',
    ...listFormerTeams().map((team) => `/teams/former/${team.id}`),
  ].map((href) => ({
    url: `${siteUrl}${href}`,
    changeFrequency: 'monthly' as const,
    priority: 0.5,
  }));

  return [...pages, ...news, ...archive];
}
