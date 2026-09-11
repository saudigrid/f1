import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import AdSlot from "@/components/ads/AdSlot";
import NewsCard from "@/components/news/NewsCard";
import { categoryLabel, site } from "@/lib/config/site";
import { getRepo } from "@/lib/data/repo";
import { formatDate, relativeTime } from "@/lib/format";
import type { Article } from "@/lib/data/types";

export const revalidate = 600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const repo = await getRepo();
  const article = await repo.getArticle(slug);
  if (!article) return { title: "الخبر غير موجود" };

  return {
    title: article.title,
    description: article.excerpt,
    alternates: { canonical: `/a/${article.slug}` },
    openGraph: {
      type: "article",
      title: article.title,
      description: article.excerpt,
      publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt,
      images: article.heroImage ? [article.heroImage.url] : undefined,
    },
  };
}

/**
 * عارض متن بسيط: فقرات وعناوين فرعية واقتباسات فقط.
 * متن المقال يأتي من وكيل التحرير ولا يحتوي HTML — لذا لا حاجة لمكتبة
 * Markdown كاملة ولا لتعقيم HTML.
 */
function ArticleBody({ body, adAfterParagraph = 3 }: { body: string; adAfterParagraph?: number }) {
  const blocks = body
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);

  return (
    <div className="prose-ar max-w-none">
      {blocks.map((block, i) => (
        <div key={i}>
          {block.startsWith("## ") ? (
            <h2>{block.slice(3)}</h2>
          ) : block.startsWith("> ") ? (
            <blockquote>{block.slice(2)}</blockquote>
          ) : (
            <p>{block}</p>
          )}
          {i + 1 === adAfterParagraph && blocks.length > adAfterParagraph + 1 && (
            <AdSlot placement="article-inline" className="my-8" />
          )}
        </div>
      ))}
    </div>
  );
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const repo = await getRepo();
  const article = await repo.getArticle(slug);

  if (!article || article.status !== "published") notFound();

  const related = (await repo.listArticles({ category: article.category, limit: 4 })).filter(
    (a: Article) => a.id !== article.id,
  );

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title,
    description: article.excerpt,
    datePublished: article.publishedAt,
    dateModified: article.updatedAt ?? article.publishedAt,
    inLanguage: "ar",
    publisher: { "@type": "Organization", name: site.name },
    articleSection: categoryLabel(article.category),
    keywords: article.tags.join("، "),
  };

  return (
    <div className="page grid gap-10 py-10 lg:grid-cols-[minmax(0,1fr)_320px]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <article className="min-w-0">
        <nav className="mb-4 text-sm text-text-faint" aria-label="مسار التصفح">
          <Link href="/" className="hover:text-text">
            الرئيسية
          </Link>
          <span className="mx-2" aria-hidden>
            /
          </span>
          <Link href={`/c/${article.category}`} className="hover:text-text">
            {categoryLabel(article.category)}
          </Link>
        </nav>

        <h1 className="font-display text-[clamp(1.75rem,4.5vw,2.6rem)] font-black leading-[1.2]">
          {article.title}
        </h1>

        <p className="mt-4 text-lg leading-relaxed text-text-dim">{article.excerpt}</p>

        <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 border-y border-border py-3 text-sm text-text-faint">
          <time dateTime={article.publishedAt}>{formatDate(article.publishedAt)}</time>
          <span aria-hidden>·</span>
          <span>{relativeTime(article.publishedAt)}</span>
          <span aria-hidden>·</span>
          <span>
            <span className="numeric">{article.readingMinutes}</span> دقائق قراءة
          </span>
        </div>

        {article.heroImage && (
          <figure className="mt-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={article.heroImage.url}
              alt={article.heroImage.alt}
              className="w-full rounded-lg border border-border"
            />
            {article.heroImage.credit && (
              <figcaption className="mt-2 text-xs text-text-faint">
                {article.heroImage.credit}
              </figcaption>
            )}
          </figure>
        )}

        <div className="mt-8">
          <ArticleBody body={article.body} />
        </div>

        {article.tags.length > 0 && (
          <div className="mt-10 flex flex-wrap gap-2">
            {article.tags.map((tag) => (
              <span
                key={tag}
                className="rounded border border-border px-2.5 py-1 text-xs text-text-dim"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* الإسناد — شرط تحريري وقانوني، يظهر في كل خبر مستمد من مصادر */}
        {article.sources.length > 0 && (
          <section className="mt-10 rounded-lg border border-border bg-surface p-4">
            <h2 className="mb-3 font-display text-sm font-bold text-text-dim">المصادر المعتمدة</h2>
            <ul className="space-y-2 text-sm">
              {article.sources.map((s) => (
                <li key={s.url}>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent-soft underline underline-offset-4"
                  >
                    {s.outlet}
                  </a>
                  <span className="text-text-faint"> · {formatDate(s.publishedAt)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </article>

      <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
        {related.length > 0 && (
          <section className="card p-4">
            <h2 className="mb-4 font-display text-base font-bold">
              <span className="speedbar" aria-hidden />
              أخبار ذات صلة
            </h2>
            <div className="space-y-3">
              {related.map((a) => (
                <NewsCard key={a.id} article={a} variant="compact" />
              ))}
            </div>
          </section>
        )}
        <AdSlot placement="sidebar-sticky" />
      </aside>
    </div>
  );
}
