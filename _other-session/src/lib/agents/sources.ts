import { XMLParser } from "fast-xml-parser";

/**
 * مصادر الأخبار. كلها خلاصات RSS عامة.
 *
 * ملاحظة تحريرية مهمة: نستخدم هذه الخلاصات كإشارة على الحدث ونقطة انطلاق،
 * ولا نعيد نشر نص المصدر مترجماً حرفياً. وكيل الترجمة مُوجَّه لإعادة صياغة
 * الخبر بصياغة أصلية مع الإسناد والرابط — هذا ما يبقينا داخل حدود
 * الاستخدام المشروع للخبر بدل انتهاك حقوق النشر.
 */

export interface NewsSource {
  id: string;
  outlet: string;
  url: string;
  lang: string;
  /** وزن الثقة 1-5، يدخل في حساب استقلالية المصادر لدى وكيل التدقيق */
  trust: number;
}

export const newsSources: NewsSource[] = [
  { id: "fia", outlet: "FIA", url: "https://www.fia.com/rss/news", lang: "en", trust: 5 },
  {
    id: "motorsport",
    outlet: "Motorsport.com",
    url: "https://www.motorsport.com/rss/f1/news/",
    lang: "en",
    trust: 4,
  },
  {
    id: "autosport",
    outlet: "Autosport",
    url: "https://www.autosport.com/rss/f1/news/",
    lang: "en",
    trust: 4,
  },
  {
    id: "the-race",
    outlet: "The Race",
    url: "https://www.the-race.com/formula-1/feed/",
    lang: "en",
    trust: 4,
  },
  {
    id: "racefans",
    outlet: "RaceFans",
    url: "https://www.racefans.net/feed/",
    lang: "en",
    trust: 3,
  },
];

export interface RawItem {
  sourceId: string;
  outlet: string;
  lang: string;
  trust: number;
  title: string;
  summary: string;
  link: string;
  publishedAt: string;
}

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });

function stripHtml(s: string): string {
  return s
    .replace(/<[^>]*>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** يجلب خلاصة واحدة ويحوّلها لعناصر موحّدة. الأخطاء لا توقف بقية المصادر. */
export async function fetchSource(source: NewsSource, timeoutMs = 12_000): Promise<RawItem[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(source.url, {
      signal: controller.signal,
      headers: { "user-agent": "SaudiF1Grid/1.0 (+https://saudif1grid.com)" },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();
    const doc = parser.parse(xml);

    // يدعم RSS 2.0 و Atom
    const rssItems = doc?.rss?.channel?.item;
    const atomItems = doc?.feed?.entry;
    const raw = rssItems ?? atomItems ?? [];
    const list = Array.isArray(raw) ? raw : [raw];

    return list.slice(0, 25).map((it: Record<string, unknown>) => {
      const link =
        typeof it.link === "string"
          ? it.link
          : ((it.link as Record<string, string>)?.["@_href"] ?? "");
      const date =
        (it.pubDate as string) ?? (it.published as string) ?? (it.updated as string) ?? "";
      return {
        sourceId: source.id,
        outlet: source.outlet,
        lang: source.lang,
        trust: source.trust,
        title: stripHtml(String(it.title ?? "")),
        summary: stripHtml(
          String(it.description ?? it.summary ?? (it.content as Record<string, string>)?.["#text"] ?? ""),
        ).slice(0, 1500),
        link,
        publishedAt: date ? new Date(date).toISOString() : new Date().toISOString(),
      };
    });
  } catch (err) {
    console.warn(`[sources] فشل جلب ${source.outlet}:`, (err as Error).message);
    return [];
  } finally {
    clearTimeout(timer);
  }
}

/** يجلب كل المصادر بالتوازي. */
export async function fetchAllSources(sources = newsSources): Promise<RawItem[]> {
  const batches = await Promise.all(sources.map((s) => fetchSource(s)));
  return batches.flat();
}
