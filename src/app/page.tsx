import Link from 'next/link';

import { AdSlot } from '@/components/ads/AdSlot';
import { Hero } from '@/components/hero/Hero';
import { NewsGrid } from '@/components/news/NewsGrid';
import { SectionHeading } from '@/components/site/SectionHeading';
import { StandingsTable } from '@/components/standings/StandingsTable';
import { formatDate } from '@/lib/format';
import { getRepository } from '@/lib/data/repository';

// الصفحة تُبنى مسبقاً ويُعاد توليدها كل خمس دقائق: القارئ يحصل على صفحة
// ثابتة سريعة، والأخبار تبقى طازجة بلا استدعاء قاعدة بيانات لكل زيارة.
export const revalidate = 300;

export default async function HomePage() {
  const repo = await getRepository();

  const [latest, standings, drivers, teams, races] = await Promise.all([
    repo.listPublished({ limit: 9 }),
    repo.getStandings(),
    repo.listDrivers(),
    repo.listTeams(),
    repo.listRaces(),
  ]);

  const nextRace =
    races
      .filter((r) => r.status === 'upcoming')
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())[0] ?? null;

  const lastResult =
    races
      .filter((r) => r.status === 'completed' && r.podium)
      .sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime())[0] ?? null;

  const driverById = new Map(drivers.map((d) => [d.id, d]));

  return (
    <>
      <Hero nextRace={nextRace} />

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <AdSlot placement="header-leaderboard" className="my-6" />

        <section className="py-6">
          <SectionHeading
            title="آخر الأخبار"
            description="تغطية كل الفرق وكل الجولات"
            href="/news"
          />
          <NewsGrid articles={latest} featureFirst />
        </section>

        <div className="grid gap-8 py-10 lg:grid-cols-[1fr_320px]">
          <section>
            <SectionHeading title="ترتيب البطولة" href="/standings" hrefLabel="الجدول الكامل" />
            <StandingsTable standings={standings} drivers={drivers} teams={teams} limit={8} />
            <p className="mt-3 text-xs text-subtle">
              آخر تحديث: {formatDate(standings.updatedAt)}
            </p>
          </section>

          <aside className="space-y-6">
            {lastResult && (
              <div className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface">
                <h2 className="border-b border-line px-4 py-3 text-sm font-bold">
                  نتيجة آخر سباق
                </h2>
                <div className="p-4">
                  <p className="text-sm font-semibold">{lastResult.name}</p>
                  <p className="mt-0.5 text-xs text-subtle">{lastResult.circuit}</p>
                  <ol className="mt-4 space-y-2">
                    {lastResult.podium?.map((slot) => (
                      <li key={slot.position} className="flex items-center gap-3 text-sm">
                        <span
                          className={`tnum grid size-6 shrink-0 place-items-center rounded-md font-display text-xs font-bold ${
                            slot.position === 1
                              ? 'bg-red text-white'
                              : 'bg-surface-2 text-muted'
                          }`}
                        >
                          {slot.position}
                        </span>
                        <span className="truncate">
                          {driverById.get(slot.driverId)?.name ?? slot.driverId}
                        </span>
                      </li>
                    ))}
                  </ol>
                  <Link
                    href="/races"
                    className="mt-4 block text-xs font-semibold text-red hover:underline"
                  >
                    كل نتائج الموسم ←
                  </Link>
                </div>
              </div>
            )}

            <AdSlot
              placement="sidebar-sticky"
              className="sticky top-24 rounded-[var(--radius-card)] border border-line bg-surface"
            />
          </aside>
        </div>
      </div>
    </>
  );
}
