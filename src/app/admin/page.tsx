import type { Metadata } from 'next';

import { PIPELINE_CONFIG } from '@/lib/config/pipeline';
import { adminConfigured, isAdmin } from '@/lib/admin/auth';
import { formatRelative, parseBody } from '@/lib/format';
import { getRepository } from '@/lib/data/repository';
import { CATEGORY_LABELS } from '@/lib/types';

import { approveAction, logoutAction, rejectAction } from './actions';
import { LoginForm } from './LoginForm';

// لوحة المراجعة لا تُخزَّن ولا تُفهرس أبداً
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'لوحة المراجعة',
  robots: { index: false, follow: false, nocache: true },
};

export default async function AdminPage() {
  if (!adminConfigured) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <h1 className="text-xl font-bold">لوحة المراجعة غير مفعّلة</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          أضف <code className="rounded bg-surface px-1.5 py-0.5 text-xs">ADMIN_PASSWORD</code> إلى
          ملف <code className="rounded bg-surface px-1.5 py-0.5 text-xs">.env</code> ثم أعد تشغيل
          الخادم.
        </p>
      </div>
    );
  }

  if (!(await isAdmin())) return <LoginForm />;

  const repo = await getRepository();
  const queue = await repo.listForReview();

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">طابور المراجعة</h1>
          <p className="mt-1.5 text-sm text-muted">
            {queue.length === 0
              ? 'لا شيء ينتظر المراجعة.'
              : `${queue.length} خبراً محتجزاً — الأقل ثقة أولاً.`}
          </p>
        </div>

        <form action={logoutAction}>
          <button
            type="submit"
            className="rounded-lg border border-line px-3 py-2 text-sm text-muted transition-colors hover:text-fg"
          >
            خروج
          </button>
        </form>
      </header>

      <p className="mt-4 rounded-lg border border-line bg-surface px-4 py-3 text-xs leading-relaxed text-subtle">
        {PIPELINE_CONFIG.requireHumanReview ? (
          <>
            <span className="font-semibold text-fg">النشر التلقائي مقفل</span> —{' '}
            <code className="rounded bg-surface-2 px-1 py-0.5">requireHumanReview = true</code>.
            كل خبر يصل هنا مهما ارتفع تقييمه. وحين لا يتوفّر بحث خارجي، تُسقَّف الثقة تحت{' '}
            <span className="tnum">{PIPELINE_CONFIG.autoPublishConfidence}</span> ويُذكر ذلك في
            ملاحظات المدقّق.
          </>
        ) : (
          <>
            سياسة النشر التلقائي: ثقة ≥{' '}
            <span className="tnum">{PIPELINE_CONFIG.autoPublishConfidence}</span> و‏
            <span className="tnum">{PIPELINE_CONFIG.minCorroboratingSources}</span> مصادر مستقلة
            على الأقل. التكهّنات وتصنيفات{' '}
            {PIPELINE_CONFIG.alwaysReviewCategories.map((c) => CATEGORY_LABELS[c]).join(' و')} تصل
            هنا دائماً مهما ارتفعت الثقة.
          </>
        )}
      </p>

      <div className="mt-8 space-y-6">
        {queue.map((article) => {
          const check = article.factCheck;
          const confidence = check?.confidence ?? 0;

          return (
            <article
              key={article.id}
              className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface"
            >
              <div className="flex flex-wrap items-start gap-4 border-b border-line p-5">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-subtle">
                    {CATEGORY_LABELS[article.category]}
                    <span className="mx-2" aria-hidden="true">•</span>
                    {formatRelative(article.publishedAt)}
                  </p>
                  <h2 className="mt-1.5 text-lg font-bold">{article.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{article.excerpt}</p>
                </div>

                <div className="shrink-0 text-center">
                  <div
                    className={`tnum font-display text-3xl font-bold ${
                      confidence >= PIPELINE_CONFIG.autoPublishConfidence
                        ? 'text-fg'
                        : confidence >= 60
                          ? 'text-amber-500'
                          : 'text-red'
                    }`}
                  >
                    {confidence}
                  </div>
                  <div className="text-[0.68rem] text-subtle">درجة الثقة</div>
                </div>
              </div>

              {check && (
                <dl className="grid gap-4 border-b border-line bg-bg/40 p-5 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-semibold text-subtle">مصادر مستقلة</dt>
                    <dd className="tnum mt-1 font-display text-lg">{check.corroboratingSources}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold text-subtle">تكهّنات؟</dt>
                    <dd className="mt-1">{check.isSpeculation ? 'نعم' : 'لا'}</dd>
                  </div>

                  {check.unverifiedClaims.length > 0 && (
                    <div className="sm:col-span-2">
                      <dt className="text-xs font-semibold text-subtle">ادعاءات غير مؤكدة</dt>
                      <dd className="mt-1.5">
                        <ul className="list-inside list-disc space-y-1 text-muted">
                          {check.unverifiedClaims.map((claim) => (
                            <li key={claim}>{claim}</li>
                          ))}
                        </ul>
                      </dd>
                    </div>
                  )}

                  {check.editorNotes && (
                    <div className="sm:col-span-2">
                      <dt className="text-xs font-semibold text-subtle">ملاحظات المدقّق</dt>
                      <dd className="mt-1.5 whitespace-pre-line text-muted">{check.editorNotes}</dd>
                    </div>
                  )}
                </dl>
              )}

              <details className="border-b border-line">
                <summary className="cursor-pointer px-5 py-3 text-sm font-semibold text-muted hover:text-fg">
                  عرض المتن الكامل
                </summary>
                <div className="space-y-3 px-5 pb-5">
                  {parseBody(article.body).map((block, i) =>
                    block.type === 'heading' ? (
                      <h3 key={i} className="pt-2 font-bold">
                        {block.text}
                      </h3>
                    ) : (
                      <p key={i} className="text-sm leading-relaxed text-muted">
                        {block.text}
                      </p>
                    ),
                  )}
                </div>
              </details>

              <div className="flex flex-wrap items-center gap-3 p-5">
                <form action={approveAction}>
                  <input type="hidden" name="id" value={article.id} />
                  <button
                    type="submit"
                    className="rounded-lg bg-red px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-hover"
                  >
                    اعتماد ونشر
                  </button>
                </form>

                <form action={rejectAction}>
                  <input type="hidden" name="id" value={article.id} />
                  <button
                    type="submit"
                    className="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-muted transition-colors hover:border-line-strong hover:text-fg"
                  >
                    رفض
                  </button>
                </form>

                <span className="ms-auto text-xs text-subtle">
                  {article.sources.length} مصدر
                </span>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
