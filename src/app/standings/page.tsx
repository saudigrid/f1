import type { Metadata } from 'next';

import { PageHero } from '@/components/hero/PageHero';
import { AdSlot } from '@/components/ads/AdSlot';
import { SectionHeading } from '@/components/site/SectionHeading';
import { StandingsTable } from '@/components/standings/StandingsTable';
import { formatDate } from '@/lib/format';
import { getRepository } from '@/lib/data/repository';

export const revalidate = 600;

export const metadata: Metadata = {
  title: 'ترتيب البطولة',
  description: 'ترتيب السائقين والصانعين في بطولة العالم للفورمولا 1.',
};

export default async function StandingsPage() {
  const repo = await getRepository();
  const [standings, drivers, teams] = await Promise.all([
    repo.getStandings(),
    repo.listDrivers(),
    repo.listTeams(),
  ]);

  return (
    <>
      <PageHero
        scene="podium"
        compact
        eyebrow={<><span className="size-1.5 rounded-full bg-red" />موسم <span className="tnum">{standings.season}</span></>}
        title="ترتيب البطولة"
        description={`سباق السائقين والصانعين على اللقب — آخر تحديث ${formatDate(standings.updatedAt)}.`}
      />

      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <StandingsTable standings={standings} drivers={drivers} teams={teams} />

      <AdSlot placement="header-leaderboard" className="mt-10" />
    </div>
    </>
  );
}
