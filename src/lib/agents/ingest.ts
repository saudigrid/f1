import 'server-only';

import Parser from 'rss-parser';

import { NEWS_SOURCES, type NewsSource } from '@/lib/config/sources';
import { PIPELINE_CONFIG } from '@/lib/config/pipeline';

/**
 * الوكيل الأول: الجمع.
 *
 * لا يستخدم الذكاء الاصطناعي إطلاقاً — مجرّد سحب RSS وتجميع الأخبار المتطابقة
 * من مصادر مختلفة في «عنقود» واحد. هذا التجميع هو ما يعطينا لاحقاً عدد
 * المصادر المستقلة، وهو نصف قرار النشر التلقائي.
 */

export interface RawItem {
  sourceId: string;
  sourceName: string;
  trust: NewsSource['trust'];
  title: string;
  summary: string;
  url: string;
  publishedAt: string;
  /** صورة جاءت مع الخبر في الخلاصة. استخدامها تحكمه طبقة الصور، لا هذا الملف. */
  imageUrl: string | null;
}

/** خبر واحد كما ورد من عدة مصادر. */
export interface StoryCluster {
  /** معرّف ثابت مشتق من العنوان — يمنع إعادة معالجة نفس الخبر. */
  key: string;
  items: RawItem[];
  /** أعلى درجة ثقة بين مصادر العنقود. */
  maxTrust: NewsSource['trust'];
}

/**
 * حقول الصور تختلف بين الخلاصات: بعضها enclosure وبعضها Media RSS.
 * نطلبها كلها ونأخذ أولها وجوداً.
 */
const parser = new Parser<unknown, { 'media:content'?: { $?: { url?: string } }; 'media:thumbnail'?: { $?: { url?: string } } }>({
  timeout: 15_000,
  customFields: {
    item: [
      ['media:content', 'media:content'],
      ['media:thumbnail', 'media:thumbnail'],
    ],
  },
});

/** يلتقط أول رابط صورة صالح من عنصر الخلاصة. */
function imageFrom(item: {
  enclosure?: { url?: string; type?: string };
  'media:content'?: { $?: { url?: string } };
  'media:thumbnail'?: { $?: { url?: string } };
}): string | null {
  const candidates = [
    item.enclosure?.type?.startsWith('image/') ? item.enclosure.url : undefined,
    item['media:content']?.$?.url,
    item['media:thumbnail']?.$?.url,
  ];

  for (const url of candidates) {
    // https فقط: رابط http يكسر الصفحة بتحذير محتوى مختلط
    if (url && url.startsWith('https://') && /\.(jpe?g|png|webp)/i.test(url)) return url;
  }
  return null;
}

/** كلمات لا تحمل معنى مميّزاً — تُستبعد قبل المقارنة. */
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'on', 'for', 'with',
  'at', 'by', 'from', 'as', 'is', 'was', 'be', 'his', 'her', 'its', 'it',
  'after', 'before', 'says', 'said', 'f1', 'formula',
]);

function tokenize(title: string): Set<string> {
  return new Set(
    title
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP_WORDS.has(w)),
  );
}

/** تشابه جاكارد: حجم التقاطع ÷ حجم الاتحاد. */
function similarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let shared = 0;
  for (const token of a) if (b.has(token)) shared += 1;
  return shared / (a.size + b.size - shared);
}

const SAME_STORY_THRESHOLD = 0.42;

export async function fetchAllSources(): Promise<RawItem[]> {
  const cutoff = Date.now() - PIPELINE_CONFIG.lookbackHours * 3600_000;
  const active = NEWS_SOURCES.filter((s) => s.enabled);

  const perSource = await Promise.allSettled(
    active.map(async (source): Promise<RawItem[]> => {
      const feed = await parser.parseURL(source.rss);
      return (feed.items ?? []).flatMap((item): RawItem[] => {
        const title = item.title?.trim();
        const url = item.link?.trim();
        if (!title || !url) return [];

        const published = item.isoDate ?? item.pubDate;
        const publishedAt = published ? new Date(published) : new Date();
        if (Number.isNaN(publishedAt.getTime()) || publishedAt.getTime() < cutoff) return [];

        return [{
          sourceId: source.id,
          sourceName: source.name,
          trust: source.trust,
          title,
          summary: (item.contentSnippet ?? item.content ?? '').slice(0, 1200),
          url,
          publishedAt: publishedAt.toISOString(),
          imageUrl: imageFrom(item),
        }];
      });
    }),
  );

  return perSource.flatMap((result, i) => {
    if (result.status === 'fulfilled') return result.value;
    console.warn(`[ingest] تعذّر سحب ${active[i].name}: ${result.reason}`);
    return [];
  });
}

/** يجمع الأخبار المتشابهة عبر المصادر في عناقيد. */
export function clusterStories(items: RawItem[]): StoryCluster[] {
  const clusters: { tokens: Set<string>; items: RawItem[] }[] = [];

  const newestFirst = [...items].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );

  for (const item of newestFirst) {
    const tokens = tokenize(item.title);
    const match = clusters.find((c) => similarity(c.tokens, tokens) >= SAME_STORY_THRESHOLD);

    if (match) {
      // لا نضيف نفس المصدر مرتين — وإلا لتضخّم عدّاد «المصادر المستقلة» زوراً
      if (!match.items.some((existing) => existing.sourceId === item.sourceId)) {
        match.items.push(item);
        for (const token of tokens) match.tokens.add(token);
      }
    } else {
      clusters.push({ tokens, items: [item] });
    }
  }

  return clusters
    .map((c) => ({
      key: slugKey(c.items[0].title),
      items: c.items.sort((a, b) => b.trust - a.trust),
      maxTrust: Math.max(...c.items.map((i) => i.trust)) as NewsSource['trust'],
    }))
    // العنقود الأكبر والأعلى ثقة أولاً — نعالج الأهم ضمن حد التشغيلة
    .sort((a, b) => b.items.length - a.items.length || b.maxTrust - a.maxTrust);
}

function slugKey(title: string): string {
  return [...tokenize(title)].sort().slice(0, 6).join('-') || 'story';
}
