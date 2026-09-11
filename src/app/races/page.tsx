import type { Metadata } from 'next';

import { AdSlot } from '@/components/ads/AdSlot';
import { PageHero } from '@/components/hero/PageHero';
import { NextRaceCountdown } from '@/components/race/NextRaceCountdown';
import { RaceRow } from '@/components/races/RaceRow';
import { SeasonPicker } from '@/components/races/SeasonPicker';
import { SectionHeading } from '@/components/site/SectionHeading';
import { CURRENT_SEASON, getSeasonRaces, listSeasons } from '@/lib/data/history';
import { getRepository } from '@/lib/data/repository';

export const revalidate = 21_600;

export const metadata: Metadata = {
  title: 'السباقات',
  description:
    'كل سباقات الفورمولا 1 منذ 1950 — الروزنامة الحالية ونتائج كل موسم مع منصات التتويج.',
  alternates: { canonical: '/races' },
};

export default async function RacesPage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string }>;
}) {
  const params = await searchParams;
  const seasons = await listSeasons();

  const requested = Number(params.season);
  const season = seasons.includes(requested) ? requested : CURRENT_SEASON;
  const isCurrent = season === CURRENT_SEASON;

  const [races, repoRaces] = await Promise.all([
    getSeasonRaces(season),
    // عدّاد السباق القادم يقرأ من بياناتنا المزامَنة، لا من التاريخ
    isCurrent ? getRepository().then((repo) => repo.listRaces()) : Promise.resolve([]),
  ]);

  const now = Date.now();
  const nextRace =
    repoRaces
      .filter((race) => new Date(race.startsAt).getTime() > now)
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())[0] ?? null;

  const upcoming = races.filter((race) => new Date(race.date).getTime() > now);
  const completed = races.filter((race) => new Date(race.date).getTime() <= now);

  return (
    <>
      <PageHero
        scene="flag"
        compact
        eyebrow={
          <>
            <span className="size-1.5 rounded-full bg-red" />
            <span className="tnum">{seasons.length}</span> موسماً منذ{' '}
            <span className="tnum">1950</span>
          </>
        }
        title={
          <>
            سباقات موسم <span className="tnum font-display text-red">{season}</span>
          </>
        }
        description={
          <>
            <span className="tnum">{races.length}</span> جولة
            {completed.length > 0 && (
              <>
                {' · '}
                <span className="tnum">{completed.length}</span> انتهت
              </>
            )}
          </>
        }
      >
        <SeasonPicker seasons={seasons} current={season} />
      </PageHero>

      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      {isCurrent && nextRace && (
        <div className="mb-10">
          <NextRaceCountdown race={nextRace} />
        </div>
      )}

      <AdSlot placement="header-leaderboard" className="mb-10" />

      {upcoming.length > 0 && (
        <section className="mb-12">
          <SectionHeading title="القادمة" description={`${upcoming.length} جولة متبقية`} />
          <ol className="space-y-3">
            {upcoming.map((race, index) => (
              <RaceRow
                key={`${race.season}-${race.round}`}
                race={race}
                upcoming={index === 0}
              />
            ))}
          </ol>
        </section>
      )}

      <section>
        <SectionHeading
          title={isCurrent ? 'التي أُقيمت' : 'نتائج الموسم'}
          description={completed.length === 0 ? 'لم تُقَم أي جولة بعد' : undefined}
        />

        {completed.length === 0 ? (
          <p className="rounded-[var(--radius-card)] border border-dashed border-line px-6 py-12 text-center text-muted">
            لا نتائج منشورة لهذا الموسم بعد.
          </p>
        ) : (
          <ol className="space-y-3">
            {/* الأحدث أولاً في المواسم المنتهية — آخر ما حدث هو ما يُبحث عنه */}
            {[...completed].reverse().map((race) => (
              <RaceRow key={`${race.season}-${race.round}`} race={race} />
            ))}
          </ol>
        )}
      </section>
    </div>
    </>
  );
}
