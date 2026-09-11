import type { Metadata } from 'next';
import Link from 'next/link';

import { PageHero } from '@/components/hero/PageHero';
import { AdSlot } from '@/components/ads/AdSlot';
import { NewsGrid } from '@/components/news/NewsGrid';
import { SectionHeading } from '@/components/site/SectionHeading';
import { getRepository } from '@/lib/data/repository';
import { CATEGORY_LABELS, type Category } from '@/lib/types';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'الأخبار',
  description: 'آخر أخبار الفورمولا 1 بالعربية — كل الفرق وكل الجولات.',
};

const PAGE_SIZE = 12;

/** التصنيفات المعروضة كمرشّحات، بالترتيب الذي يهمّ القارئ. */
const FILTERS: (Category | 'all')[] = [
  'all',
  'breaking',
  'race-report',
  'technical',
  'transfers',
  'regulations',
];

export default async function NewsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; page?: string }>;
}) {
  const params = await searchParams;

  const category = FILTERS.includes(params.category as Category)
    ? (params.category as Category)
    : undefined;
  const page = Math.max(1, Number(params.page) || 1);

  const repo = await getRepository();
  const [articles, total] = await Promise.all([
    repo.listPublished({ category, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
    repo.countPublished(category),
  ]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const linkFor = (c: Category | 'all') => (c === 'all' ? '/news' : `/news?category=${c}`);

  return (
    <>
      <PageHero
        scene="wire"
        compact
        eyebrow={<><span className="size-1.5 animate-pulse rounded-full bg-red" />تُحدَّث تلقائياً</>}
        title="الأخبار"
        description="كل ما يحدث في عالم الفورمولا 1."
      />

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <nav aria-label="تصفية حسب القسم" className="mb-8 flex flex-wrap gap-2">
        {FILTERS.map((filter) => {
          const active = filter === 'all' ? !category : category === filter;
          return (
            <Link
              key={filter}
              href={linkFor(filter)}
              aria-current={active ? 'page' : undefined}
              className={`rounded-lg border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                active
                  ? 'border-red bg-red text-white'
                  : 'border-line text-muted hover:border-line-strong hover:text-fg'
              }`}
            >
              {filter === 'all' ? 'الكل' : CATEGORY_LABELS[filter]}
            </Link>
          );
        })}
      </nav>

      <AdSlot placement="header-leaderboard" className="mb-8" />

      <NewsGrid articles={articles} />

      {pages > 1 && (
        <nav aria-label="تصفّح الصفحات" className="mt-10 flex items-center justify-center gap-2">
          {Array.from({ length: pages }, (_, i) => i + 1).map((n) => {
            const query = new URLSearchParams();
            if (category) query.set('category', category);
            if (n > 1) query.set('page', String(n));
            const href = query.size ? `/news?${query}` : '/news';

            return (
              <Link
                key={n}
                href={href}
                aria-current={n === page ? 'page' : undefined}
                className={`tnum grid size-9 place-items-center rounded-lg border text-sm font-semibold transition-colors ${
                  n === page
                    ? 'border-red bg-red text-white'
                    : 'border-line text-muted hover:text-fg'
                }`}
              >
                {n}
              </Link>
            );
          })}
        </nav>
      )}
    </div>
    </>
  );
}
