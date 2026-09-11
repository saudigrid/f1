import type { Metadata } from 'next';

import { PageHero } from '@/components/hero/PageHero';
import { FormerTeamsGrid, type FormerTeamCard } from '@/components/teams/FormerTeamsGrid';
import { listFormerTeams } from '@/lib/data/teams';

/**
 * الفرق السابقة.
 *
 * ⚠️ لا نداء شبكة هنا إطلاقاً: كل شيء من `constructors.json` و
 * `team-history.json` على القرص. تاريخ فريق انتهى سنة 1994 لا يتغيّر، فسؤال
 * الواجهة عنه في كل بناء يهدر حدّ التزامن — وهو ما أسقط البناء ثلاث مرات
 * سابقاً.
 */
export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'الفرق السابقة',
  description:
    'كل فريق غادر الفورمولا 1 منذ 1950 — لوتس وبرابهام وتايرل وبينيتون وغيرهم، بمواسمهم وانتصاراتهم وسائقيهم.',
  alternates: { canonical: '/teams/former' },
};

export default function FormerTeamsPage() {
  const teams = listFormerTeams();

  const cards: FormerTeamCard[] = teams.map((team) => ({
    id: team.id,
    name: team.name,
    nameEn: team.nameEn,
    nationality: team.nationality,
    firstSeason: team.firstSeason,
    lastSeason: team.lastSeason,
    seasonCount: team.seasonCount,
    wins: team.wins,
    titles: team.titles.length,
    logo: team.logo,
    logoIsCustom: team.logoIsCustom,
    color: team.color,
  }));

  const champions = cards.filter((team) => team.titles > 0).length;
  const winners = cards.filter((team) => team.wins > 0).length;

  return (
    <>
      <PageHero
        scene="strata"
        compact
        eyebrow={
          <>
            <span className="size-1.5 rounded-full bg-red" />
            <span className="tnum">{cards.length}</span> فريقاً غادروا
          </>
        }
        title="الفرق السابقة"
        description="من صنع تاريخ هذه الرياضة ثم انصرف — لوتس وبرابهام وتايرل وبينيتون وويليامز القديمة، وعشرات الصانعين الذين دخلوا سباقاً واحداً ولم يعودوا."
      >
        <dl className="rise mt-8 flex flex-wrap gap-x-8 gap-y-4">
          {[
            ['فريقاً', cards.length],
            ['بطل صانعين', champions],
            ['صاحب انتصار', winners],
          ].map(([label, value]) => (
            <div key={label as string}>
              <dd className="tnum font-display text-2xl font-bold">{value}</dd>
              <dt className="mt-0.5 text-xs text-subtle">{label}</dt>
            </div>
          ))}
        </dl>
      </PageHero>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <FormerTeamsGrid teams={cards} />
      </div>
    </>
  );
}
