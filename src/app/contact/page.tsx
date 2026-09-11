import type { Metadata } from 'next';
import Link from 'next/link';

import { PageHeader } from '@/components/site/PageHeader';

export const metadata: Metadata = {
  title: 'اتصل بنا',
  description: 'للتبليغ عن خطأ في خبر، أو للاستفسارات الإعلانية والتحريرية.',
  alternates: { canonical: '/contact' },
};

/** ضع بريدك الفعلي هنا قبل الإطلاق. */
const CONTACT = {
  editorial: 'editorial@example.com',
  ads: 'ads@example.com',
} as const;

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <PageHeader
        title="اتصل بنا"
        lead="نرحّب بالتصحيحات والملاحظات والاستفسارات الإعلانية."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="speed-edge rounded-[var(--radius-card)] border border-line bg-surface p-5">
          <h2 className="font-bold">تحريري وتصحيحات</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            لاحظت خطأً في خبر منشور؟ أرسل لنا رابط الخبر وما تراه غير دقيق، وسنراجعه ونصحّحه.
          </p>
          <a
            href={`mailto:${CONTACT.editorial}`}
            className="mt-4 inline-block text-sm font-semibold text-red hover:underline"
            dir="ltr"
          >
            {CONTACT.editorial}
          </a>
        </section>

        <section className="speed-edge rounded-[var(--radius-card)] border border-line bg-surface p-5">
          <h2 className="font-bold">إعلانات ورعاية</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            للاستفسار عن المساحات الإعلانية المتاحة وأسعارها والحملات المباشرة.
          </p>
          <a
            href={`mailto:${CONTACT.ads}`}
            className="mt-4 inline-block text-sm font-semibold text-red hover:underline"
            dir="ltr"
          >
            {CONTACT.ads}
          </a>
        </section>
      </div>

      <p className="mt-8 text-sm text-subtle">
        قبل المراسلة بشأن دقة خبر، اطّلع على{' '}
        <Link href="/editorial-policy" className="text-red hover:underline">
          سياستنا التحريرية
        </Link>{' '}
        — تشرح كيف نتحقق وكيف نصحّح.
      </p>
    </div>
  );
}
