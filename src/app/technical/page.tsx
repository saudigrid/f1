import type { Metadata } from 'next';

import { AdSlot } from '@/components/ads/AdSlot';
import { PageHero } from '@/components/hero/PageHero';
import { NewsGrid } from '@/components/news/NewsGrid';
import { Flag } from '@/components/site/Flag';
import { SectionHeading } from '@/components/site/SectionHeading';
import { FastestLap } from '@/components/technical/FastestLap';
import { LapCompare } from '@/components/technical/LapCompare';
import { PitSummary } from '@/components/technical/PitSummary';
import { SessionTiming } from '@/components/technical/SessionTiming';
import { TelemetryCompare } from '@/components/technical/TelemetryCompare';
import { TyreStrategy } from '@/components/technical/TyreStrategy';
import {
  getLapGrid,
  getLatestWeekend,
  getPitSummary,
  getSessionTiming,
  type TimingRow,
} from '@/lib/data/openf1';
import { formatDate } from '@/lib/format';

/**
 * ⚠️ ساعة واحدة، لا أكثر.
 *
 * الصفحة كلها مشتقّة من **آخر عطلة نهاية أسبوع**، فما إن يُقام سباق جديد حتى
 * يتبدّل كل قسم فيها إليه تلقائياً — لا تصفير يدوي ولا إعداد. والمدّة القصيرة
 * هي ما يجعل التبدّل يحدث خلال ساعة من انتهاء السباق لا في اليوم التالي.
 */
export const revalidate = 3_600;

export const metadata: Metadata = {
  title: 'التحليل الفني',
  description:
    'تحليل تفاعلي لآخر عطلة سباق — أداء كل جلسة، استراتيجيات الإطارات، التوقّفات، ومقارنة التيليمتري وأزمنة اللفّات بين السائقين.',
  alternates: { canonical: '/technical' },
};

export default async function TechnicalPage() {
  const year = new Date().getUTCFullYear();
  const weekend = await getLatestWeekend(year).catch(() => null);

  /**
   * لوحات كل الجلسات — **متسلسلة**.
   *
   * ⚠️ كانت `Promise.all`، فصارت خمس جلسات × ثلاثة مسارات = خمسة عشر طلباً
   * متزامناً على OpenF1، وهو يحدّ التزامن بحزم: قياس مباشر ردّ **تسعة من
   * خمسة عشر** بـ429. والنتيجة أن كل لوحة تظهر فارغة بلا رسالة خطأ — يبدو
   * للقارئ أن لا بيانات أصلاً.
   *
   * التسلسل أبطأ بثوانٍ عند أول زيارة، ثم تُخدَم الصفحة من التخزين ساعةً
   * كاملة. الثمن يدفعه زائر واحد، والعطل كان يدفعه كل زائر.
   */
  const timings: Record<number, TimingRow[]> = {};
  if (weekend) {
    for (const session of weekend.sessions) {
      timings[session.key] = await getSessionTiming(session.key).catch(() => []);
    }
  }

  const raceSession = weekend?.sessions.find((session) => session.name === 'Race') ?? null;

  const pits = raceSession ? await getPitSummary(raceSession.key).catch(() => []) : [];
  const grid = raceSession ? await getLapGrid(raceSession.key).catch(() => null) : null;

  const raceRows = raceSession ? (timings[raceSession.key] ?? []) : [];
  const totalLaps = Math.max(0, ...raceRows.map((row) => row.stints.at(-1)?.to ?? 0));

  const articles = await (await import('@/lib/data/repository'))
    .getRepository()
    .then((repo) => repo.listPublished({ category: 'technical', limit: 9 }))
    .catch(() => []);

  return (
    <>
      <PageHero
        scene="telemetry"
        compact
        eyebrow={
          <>
            <span className="size-1.5 animate-pulse rounded-full bg-red" />
            {weekend ? weekend.officialName.slice(0, 46) : 'التحليل الفني'}
          </>
        }
        title="ما وراء النتيجة"
        description="أداء كل جلسة، واستراتيجيات الإطارات، والتوقّفات، والتيليمتري — مقروءة من بيانات السباق نفسه، لا من ملخّصه."
      />

      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        {!weekend ? (
          <p className="rounded-[var(--radius-card)] border border-dashed border-line px-6 py-14 text-center text-muted">
            لا بيانات جلسات منشورة بعد لهذا الموسم.
          </p>
        ) : (
          <>
            {/* ترويسة العطلة */}
            <div className="mb-10 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[var(--radius-card)] border border-line bg-surface px-4 py-3">
              <Flag code={weekend.countryCode.slice(0, 2)} name={weekend.country} />
              <span className="font-bold">{weekend.name}</span>
              <span className="text-sm text-muted">{weekend.location}</span>
              <span className="tnum ms-auto text-xs text-subtle">
                {formatDate(weekend.startedAt)}
              </span>
              {weekend.hasSprint && (
                <span className="rounded bg-red/15 px-2 py-0.5 text-[0.62rem] font-bold text-red">
                  عطلة سبرنت
                </span>
              )}
            </div>

            {/* ١ — أداء الجلسات بالترتيب */}
            <section className="mb-14">
              <SectionHeading
                title="أداء السائقين في كل جلسة"
                description="بترتيب وقوعها — من التجربة الأولى إلى السباق"
              />
              <SessionTiming sessions={weekend.sessions} timings={timings} />
            </section>

            {/* ٢ — استراتيجية الإطارات */}
            <section className="mb-14">
              <SectionHeading
                title="استراتيجية الإطارات"
                description="المركّبات التي استخدمها كل سائق، وطول كل ستنت"
              />
              <TyreStrategy rows={raceRows} totalLaps={totalLaps} />
            </section>

            {/* ٣ — ملخّص التوقّفات */}
            <section className="mb-14">
              <SectionHeading title="ملخّص التوقّفات" description="PIT STOP SUMMARY" />
              <PitSummary rows={pits} />
            </section>

            <AdSlot placement="in-feed" className="mb-14" />

            {/* ٤ — التيليمتري */}
            {grid && grid.totalLaps > 0 && (
              <section className="mb-14">
                <SectionHeading
                  title="مقارنة التيليمتري"
                  description="السرعة ودوّاسة الوقود والفرامل — اختر سائقَين ولفّة"
                />
                <TelemetryCompare sessionKey={raceSession!.key} grid={grid} />
              </section>
            )}

            {/* ٥ — مقارنة أزمنة اللفّات */}
            {grid && grid.totalLaps > 0 && (
              <section className="mb-14">
                <SectionHeading
                  title="مقارنة أزمنة اللفّات"
                  description="اختر السائقين ومدى اللفّات لترى من كان أسرع في كل لفّة"
                />
                <LapCompare grid={grid} />
              </section>
            )}

            {/* ٦ — أسرع لفة */}
            {grid?.fastest && (
              <section className="mb-14">
                <FastestLap grid={grid} />
              </section>
            )}
          </>
        )}

        {articles.length > 0 && (
          <section>
            <SectionHeading
              title="مقالات تقنية"
              description="الأجنحة، وحدات الطاقة، الإطارات، والاستراتيجية"
            />
            <NewsGrid articles={articles} />
          </section>
        )}
      </div>
    </>
  );
}
