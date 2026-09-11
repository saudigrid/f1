import type { Metadata } from 'next';
import Link from 'next/link';

import { PageHero } from '@/components/hero/PageHero';
import { SectionHeading } from '@/components/site/SectionHeading';
import { TeamCrest } from '@/components/teams/TeamCrest';
import { getRepository } from '@/lib/data/repository';
import { listFormerTeams, teamProfile } from '@/lib/data/teams';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'الفرق',
  description: 'كل فرق الفورمولا 1 وسائقوها — القواعد ووحدات الطاقة والألقاب، ومن غادر الجريد قبلهم.',
  alternates: { canonical: '/teams' },
};

export default async function TeamsPage() {
  const repo = await getRepository();
  const [teams, drivers, standings] = await Promise.all([
    repo.listTeams(),
    repo.listDrivers(),
    repo.getStandings(),
  ]);

  const pointsByTeam = new Map(standings.constructors.map((row) => [row.entityId, row]));

  const ordered = [...teams].sort(
    (a, b) =>
      (pointsByTeam.get(a.id)?.position ?? 99) - (pointsByTeam.get(b.id)?.position ?? 99),
  );

  /**
   * الفرق السابقة — تُقرأ من القرص، فلا تكلّف هذه الصفحة طلباً واحداً.
   * تُعرض هنا كبطاقات مختصرة تقود إلى صفحتها المستقلّة.
   */
  const former = listFormerTeams();
  const featured = former.slice(0, 6);

  return (
    <>
      <PageHero
        scene="podium"
        compact
        eyebrow={
          <>
            <span className="size-1.5 rounded-full bg-red" />
            <span className="tnum">{teams.length}</span> فرق على الجريد
          </>
        }
        title="الفرق"
        description="من يصنع السيارات، ومن يقودها — تشكيلة الموسم كاملة، ومن سبقهم إلى الجريد."
      />

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {ordered.map((team) => {
            const lineup = drivers.filter((driver) => driver.teamId === team.id);
            const row = pointsByTeam.get(team.id);
            const profile = teamProfile(team.id);

            return (
              <article
                key={team.id}
                className="relative overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface p-5 transition-colors hover:border-line-strong"
              >
                {/* شريط لون الفريق على الحافة الابتدائية */}
                <span
                  className="absolute inset-y-0 start-0 w-1"
                  style={{ background: team.color }}
                  aria-hidden="true"
                />

                <div className="flex items-start gap-3.5">
                  <TeamCrest
                    id={team.id}
                    nameEn={team.nameEn}
                    logo={profile?.logo}
                    custom={profile?.logoIsCustom}
                    color={team.color}
                    height="h-12"
                  />

                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-lg font-bold">{team.name}</h2>
                    <p className="mt-0.5 truncate text-xs text-subtle" dir="ltr">
                      {team.nameEn}
                    </p>
                  </div>

                  {row && (
                    <div className="shrink-0 text-end">
                      <div className="tnum font-display text-xl font-bold">{row.points}</div>
                      <div className="text-[0.68rem] text-subtle">نقطة</div>
                    </div>
                  )}
                </div>

                {/* الأثر التاريخي — ما لا تقوله نقاط الموسم */}
                {profile && (profile.wins > 0 || profile.titles.length > 0) && (
                  <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.7rem] text-subtle">
                    <span className="tnum">
                      منذ <span className="font-bold text-fg">{profile.firstSeason}</span>
                    </span>
                    {profile.wins > 0 && (
                      <span className="tnum">
                        <span className="font-bold text-fg">{profile.wins}</span> انتصاراً
                      </span>
                    )}
                    {profile.titles.length > 0 && (
                      <span className="tnum rounded bg-red/15 px-1.5 py-0.5 font-bold text-red">
                        {profile.titles.length} لقباً
                      </span>
                    )}
                  </div>
                )}

                <ul className="mt-5 space-y-2">
                  {lineup.map((driver) => (
                    <li key={driver.id} className="flex items-center gap-3 text-sm">
                      <span className="tnum grid size-7 shrink-0 place-items-center rounded-md border border-line bg-bg font-display text-xs font-bold text-muted">
                        {driver.number}
                      </span>
                      <span className="truncate">{driver.name}</span>
                    </li>
                  ))}
                </ul>

                <dl className="mt-5 space-y-1.5 border-t border-line pt-4 text-xs text-subtle">
                  <div className="flex justify-between gap-3">
                    <dt>وحدة الطاقة</dt>
                    <dd className="truncate text-muted" dir="ltr">
                      {team.powerUnit}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>القاعدة</dt>
                    <dd className="truncate text-muted">{team.base}</dd>
                  </div>
                </dl>
              </article>
            );
          })}
        </div>

        {/* ── الفرق السابقة ───────────────────────── */}
        <section className="mt-16">
          <SectionHeading
            title="الفرق السابقة"
            description={`${former.length} فريقاً غادروا الفورمولا 1 منذ 1950`}
            href="/teams/former"
            hrefLabel="كلّهم"
          />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((team) => (
              <Link
                key={team.id}
                href={`/teams/former/${team.id}`}
                className="group flex items-center gap-4 rounded-[var(--radius-card)] border border-line bg-surface p-4 transition-colors hover:border-line-strong"
              >
                <TeamCrest
                  id={team.id}
                  nameEn={team.nameEn}
                  logo={team.logo}
                  custom={team.logoIsCustom}
                  color={team.color}
                  height="h-12"
                />

                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-bold transition-colors group-hover:text-red">
                    {team.name}
                  </h3>
                  <p className="tnum mt-0.5 text-xs text-subtle" dir="ltr">
                    {team.firstSeason}–{team.lastSeason}
                  </p>
                </div>

                <div className="shrink-0 text-end">
                  <div className="tnum font-display text-lg font-bold">{team.wins}</div>
                  <div className="text-[0.62rem] text-subtle">انتصاراً</div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
