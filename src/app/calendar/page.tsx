import type { Metadata } from 'next';

import { AdSlot } from '@/components/ads/AdSlot';
import { CalendarRow } from '@/components/calendar/CalendarRow';
import { PageHero } from '@/components/hero/PageHero';
import { SeasonPicker } from '@/components/races/SeasonPicker';
import { SectionHeading } from '@/components/site/SectionHeading';
import { CURRENT_SEASON, getSeasonCalendar, listSeasons } from '@/lib/data/history';

export const revalidate = 21_600;

export const metadata: Metadata = {
  title: 'روزنامة الموسم',
  description:
    'روزنامة الفورمولا 1 كاملة بمواعيد كل جلسة — التجارب والتأهّل والسبرنت والسباق، بتوقيتك المحلّي، مع تنزيلها إلى تقويم جوالك.',
  alternates: { canonical: '/calendar' },
};

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string }>;
}) {
  const params = await searchParams;
  const seasons = await listSeasons();

  const requested = Number(params.season);
  const season = seasons.includes(requested) ? requested : CURRENT_SEASON;

  const races = await getSeasonCalendar(season);

  const now = Date.now();
  const upcoming = races.filter((race) => new Date(`${race.date}T23:59:59Z`).getTime() >= now);
  const past = races.filter((race) => new Date(`${race.date}T23:59:59Z`).getTime() < now);

  const sessionCount = races.reduce((sum, race) => sum + race.sessions.length, 0);

  return (
    <>
      <PageHero
        scene="wire"
        compact
        eyebrow={
          <>
            <span className="size-1.5 rounded-full bg-red" />
            <span className="tnum">{races.length}</span> جولة ·{' '}
            <span className="tnum">{sessionCount}</span> جلسة
          </>
        }
        title={
          <>
            روزنامة <span className="tnum font-display text-red">{season}</span>
          </>
        }
        description="كل جلسة بموعدها — بتوقيتك المحلّي، لا بتوقيت الحلبة. نزّلها إلى تقويم جوالك بضغطة واحدة فتصلك تنبيهات قبل كل جلسة بساعة."
      >
        <div className="flex flex-wrap items-center gap-3">
          <a
            href={`/api/calendar/${season}`}
            download={`f1-${season}.ics`}
            className="inline-flex items-center gap-2 rounded-xl bg-red px-4 py-2.5 text-sm font-bold text-white transition-transform hover:scale-[1.03] active:scale-[0.99]"
          >
            <svg
              viewBox="0 0 24 24"
              className="size-[18px]"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 3v12" />
              <path d="m7 12 5 5 5-5" />
              <path d="M5 21h14" />
            </svg>
            أضفها إلى تقويمي
          </a>

          <SeasonPicker seasons={seasons} current={season} />
        </div>
      </PageHero>

      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <AdSlot placement="header-leaderboard" className="mb-10" />

        {upcoming.length > 0 && (
          <section className="mb-12">
            <SectionHeading
              title="الجولات القادمة"
              description={`${upcoming.length} جولة متبقية في الموسم`}
            />
            <ol className="space-y-3">
              {upcoming.map((race) => (
                <CalendarRow key={race.round} race={race} past={false} />
              ))}
            </ol>
          </section>
        )}

        {past.length > 0 && (
          <section>
            <SectionHeading
              title={upcoming.length > 0 ? 'التي أُقيمت' : 'جولات الموسم'}
              description={`${past.length} جولة انتهت`}
            />
            <ol className="space-y-3">
              {[...past].reverse().map((race) => (
                <CalendarRow key={race.round} race={race} past />
              ))}
            </ol>
          </section>
        )}

        {races.length === 0 && (
          <p className="rounded-[var(--radius-card)] border border-dashed border-line px-6 py-12 text-center text-muted">
            لا روزنامة منشورة لهذا الموسم.
          </p>
        )}

        <p className="mt-10 text-xs leading-relaxed text-subtle">
          ملف التقويم يعمل على iOS وأندرويد وتقويم غوغل وأوتلوك. المواعيد قد تتغيّر — أعد
          التنزيل إن عُدّلت الروزنامة.
        </p>
      </div>
    </>
  );
}
