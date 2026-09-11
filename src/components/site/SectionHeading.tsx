import Link from 'next/link';

import { t } from '@/lib/i18n';

/** ترويسة قسم موحّدة: عنوان + وصف اختياري + رابط «الكل». */
export function SectionHeading({
  title,
  description,
  href,
  hrefLabel = t('chrome.viewAll'),
}: {
  title: string;
  description?: string;
  href?: string;
  hrefLabel?: string;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="flex items-center gap-2.5 text-xl font-bold sm:text-2xl">
          <span className="h-5 w-1 rounded-full bg-red" aria-hidden="true" />
          {title}
        </h2>
        {description && <p className="mt-1.5 text-sm text-muted">{description}</p>}
      </div>

      {href && (
        <Link
          href={href}
          className="group text-sm font-semibold text-muted transition-colors hover:text-red"
        >
          {hrefLabel}
          <span className="inline-block transition-transform group-hover:-translate-x-1" aria-hidden="true">
            {' '}
            ←
          </span>
        </Link>
      )}
    </div>
  );
}
