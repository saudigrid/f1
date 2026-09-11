import { Fragment } from 'react';

import { AdSlot } from '@/components/ads/AdSlot';
import { IN_FEED_INTERVAL } from '@/lib/config/ads';
import type { PublicArticle } from '@/lib/types';

import { ArticleCard } from './ArticleCard';

/**
 * شبكة الأخبار مع إعلانات مدمجة.
 *
 * الإعلان يأخذ حجم بطاقة عادية ويقع بعد كل ست بطاقات — يقرأه العين كجزء من
 * الإيقاع بدل أن يقطعه. ولا يظهر إعلان في الذيل بعد آخر بطاقة.
 */
export function NewsGrid({
  articles,
  withAds = true,
  featureFirst = false,
}: {
  articles: PublicArticle[];
  withAds?: boolean;
  featureFirst?: boolean;
}) {
  if (articles.length === 0) {
    return (
      <p className="rounded-[var(--radius-card)] border border-dashed border-line px-6 py-16 text-center text-muted">
        لا توجد أخبار في هذا القسم بعد.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {articles.map((article, index) => {
        const isLast = index === articles.length - 1;
        const showAdAfter =
          withAds && !isLast && (index + 1) % IN_FEED_INTERVAL === 0;

        return (
          <Fragment key={article.id}>
            <ArticleCard
              article={article}
              featured={featureFirst && index === 0}
              priority={index === 0}
            />
            {showAdAfter && (
              <AdSlot
                placement="in-feed"
                className="rounded-[var(--radius-card)] border border-line bg-surface"
              />
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
