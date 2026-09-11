import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { AdSlot } from '@/components/ads/AdSlot';
import { ArticleCard } from '@/components/news/ArticleCard';
import { ImageCreditLine } from '@/components/news/ImageCreditLine';
import { SectionHeading } from '@/components/site/SectionHeading';
import { formatDate, formatRelative, parseBody } from '@/lib/format';
import { getRepository } from '@/lib/data/repository';
import { CATEGORY_LABELS } from '@/lib/types';

export const revalidate = 600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const repo = await getRepository();
  const article = await repo.getBySlug(slug);

  if (!article) return { title: 'الخبر غير موجود' };

  return {
    title: article.title,
    description: article.excerpt,
    alternates: { canonical: `/news/${article.slug}` },
    openGraph: {
      type: 'article',
      title: article.title,
      description: article.excerpt,
      publishedTime: article.publishedAt,
      tags: article.tags,
    },
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const repo = await getRepository();
  const article = await repo.getBySlug(slug);

  if (!article) notFound();

  const related = await repo.listPublished({
    category: article.category,
    limit: 3,
    excludeId: article.id,
  });

  const blocks = parseBody(article.body);
  // الإعلان يدخل بعد الفقرة الثالثة — بعد أن يكون القارئ قد دخل في الموضوع
  const adAfter = Math.min(3, Math.max(1, blocks.length - 1));

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <article className="min-w-0">
          <nav aria-label="مسار التنقّل" className="mb-5 text-xs text-subtle">
            <Link href="/news" className="hover:text-red">
              الأخبار
            </Link>
            <span className="mx-2" aria-hidden="true">/</span>
            <Link href={`/news?category=${article.category}`} className="hover:text-red">
              {CATEGORY_LABELS[article.category]}
            </Link>
          </nav>

          <h1 className="text-3xl leading-tight font-bold text-balance sm:text-4xl">
            {article.title}
          </h1>

          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-subtle">
            <time dateTime={article.publishedAt}>{formatDate(article.publishedAt)}</time>
            <span aria-hidden="true">•</span>
            <span>{formatRelative(article.publishedAt)}</span>
            <span aria-hidden="true">•</span>
            <span>{article.readingMinutes} دقائق قراءة</span>
          </div>

          <p className="mt-6 border-s-2 border-red ps-4 text-lg leading-relaxed text-muted">
            {article.excerpt}
          </p>

          {article.heroImage && (
            <figure className="mt-8">
            <div className="relative aspect-[16/9] w-full overflow-hidden rounded-[var(--radius-card)] bg-surface-2">
              <Image
                src={article.heroImage}
                alt={article.heroImageAlt}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 760px"
                className="object-cover"
              />
            </div>
            {article.heroImageCredit && (
              <figcaption className="mt-2">
                <ImageCreditLine credit={article.heroImageCredit} />
              </figcaption>
            )}
            </figure>
          )}

          <div className="mt-8 space-y-5">
            {blocks.map((block, index) => (
              <div key={index}>
                {block.type === 'heading' ? (
                  <h2 className="pt-3 text-xl font-bold sm:text-2xl">{block.text}</h2>
                ) : (
                  <p className="text-[1.05rem] leading-[1.9] text-fg/90">{block.text}</p>
                )}

                {index === adAfter - 1 && (
                  <AdSlot
                    placement="in-article"
                    className="my-8 rounded-[var(--radius-card)] border border-line bg-surface"
                  />
                )}
              </div>
            ))}
          </div>

          {article.tags.length > 0 && (
            <ul className="mt-10 flex flex-wrap gap-2">
              {article.tags.map((tag) => (
                <li
                  key={tag}
                  className="rounded-lg border border-line px-3 py-1 text-xs text-muted"
                >
                  {tag}
                </li>
              ))}
            </ul>
          )}

          {/* الإسناد: شرط ثابت للنشر، وهو ما يفصل النقل المشروع عن غيره */}
          <section className="mt-10 rounded-[var(--radius-card)] border border-line bg-surface p-5">
            <h2 className="text-sm font-bold">المصادر</h2>
            <ul className="mt-3 space-y-2">
              {article.sources.map((source) => (
                <li key={source.url} className="text-sm">
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted transition-colors hover:text-red"
                  >
                    {source.name}
                    <span className="mx-1.5 text-subtle" aria-hidden="true">↗</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        </article>

        <aside>
          <AdSlot
            placement="sidebar-sticky"
            className="sticky top-24 rounded-[var(--radius-card)] border border-line bg-surface"
          />
        </aside>
      </div>

      {related.length > 0 && (
        <section className="mt-16">
          <SectionHeading title="اقرأ أيضاً" />
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((item) => (
              <ArticleCard key={item.id} article={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
