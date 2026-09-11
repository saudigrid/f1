/* eslint-disable @next/next/no-img-element */
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { PageHero } from '@/components/hero/PageHero';
import { Flag } from '@/components/site/Flag';
import { SectionHeading } from '@/components/site/SectionHeading';
import { TeamCrest } from '@/components/teams/TeamCrest';
import { raceArticle } from '@/lib/data/race-articles';
import { listFormerTeams, teamProfile, type TeamProfile } from '@/lib/data/teams';

/**
 * اسم السباق بالعربية.
 *
 * `team-history.json` يخزّن اسم Ergast الإنجليزي («Monaco Grand Prix»)، لكنه
 * يخزّن معه الموسم والجولة — وهما مفتاح `race-articles.json` الذي فيه العنوان
 * العربي. فالترجمة هنا **بحث لا تخمين**.
 *
 * ⚠️ يُقصّ من العنوان: بادئة «سباق» وسنةٌ في آخره. عنوان المقالة يحمل السنة
 * («جائزة موناكو الكبرى 1960») ونحن نعرض الموسم بجانبه أصلاً، فتركها يعني
 * تكرارها مرّتين في سطر واحد.
 */
function raceNameAr(stamp: { season: number; round: number; race: string }): string {
  const title = raceArticle(stamp.season, stamp.round)?.title;
  if (!title) return stamp.race;
  return title.replace(/^سباق\s+/, '').replace(/\s+\d{4}$/, '').trim() || stamp.race;
}

export const dynamic = 'force-static';

/**
 * لا معرّف خارج القائمة.
 *
 * ⚠️ هذا ما يجعل `/teams/former/ferrari` يردّ **404 حقيقية**. بدونها يبدأ
 * التصيير، فتُرسَل ترويسة 200 مع أول جزء من الصفحة قبل أن يصل `notFound()` —
 * فيرى القارئ صفحة «غير موجود» بينما تقرأ محرّكات البحث حالة نجاح. الفرق لا
 * يظهر في المتصفّح، ويظهر في الفهرسة.
 *
 * والقائمة معروفة كاملة على القرص، فلا شيء نخسره بإغلاقها.
 */
export const dynamicParams = false;

/**
 * كل الفرق السابقة تُبنى مسبقاً.
 *
 * البيانات كلها على القرص، فبناء مئتي صفحة هنا لا يكلّف طلباً واحداً — بخلاف
 * صفحات السباقات التي تنادي Jolpica ولذلك تُصيَّر عند الطلب.
 */
export function generateStaticParams() {
  return listFormerTeams().map((team) => ({ id: team.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const team = teamProfile(id);
  if (!team || team.active) return { title: 'فريق غير معروف' };

  const range = `${team.firstSeason ?? ''}–${team.lastSeason ?? ''}`;
  return {
    title: `${team.name} (${range})`,
    description: `تاريخ فريق ${team.name} في الفورمولا 1: ${team.seasonCount} موسماً، و${team.wins} انتصاراً، وسائقوه كاملين.`,
    alternates: { canonical: `/teams/former/${team.id}` },
  };
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-surface px-4 py-3">
      <dd className="tnum font-display text-2xl font-bold">{value}</dd>
      <dt className="mt-0.5 text-[0.7rem] text-subtle">{label}</dt>
    </div>
  );
}

/** «1977–1985 · 2002–2011 · 2016–2020» — الفجوة هي نصف القصّة. */
function spanText(team: TeamProfile): string {
  return team.spans
    .map(([from, to]) => (from === to ? `${from}` : `${from}–${to}`))
    .join(' · ');
}

export default async function FormerTeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const team = teamProfile(id);

  if (!team || team.active) notFound();

  const range =
    team.firstSeason === null
      ? '—'
      : team.firstSeason === team.lastSeason
        ? `${team.firstSeason}`
        : `${team.firstSeason} – ${team.lastSeason}`;

  return (
    <>
      <PageHero
        scene="strata"
        compact
        eyebrow={
          <>
            <Link href="/teams/former" className="transition-colors hover:text-red">
              الفرق السابقة
            </Link>
            <span className="text-subtle">/</span>
            <span dir="ltr">{team.nameEn}</span>
          </>
        }
        title={
          <span className="flex flex-wrap items-center gap-4">
            <TeamCrest
              id={team.id}
              nameEn={team.nameEn}
              logo={team.logo}
              custom={team.logoIsCustom}
              color={team.color}
              height="h-16"
            />
            {team.name}
          </span>
        }
        description={
          <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {team.countryCode && <Flag code={team.countryCode} name={team.nationality} />}
            <span>{team.nationality}</span>
            <span className="tnum font-display text-xl font-bold text-fg" dir="ltr">
              {range}
            </span>
          </span>
        }
      />

      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        {/* الأرقام */}
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="موسماً" value={team.seasonCount} />
          <Stat label="مشاركة" value={team.entries} />
          <Stat label="انتصاراً" value={team.wins} />
          <Stat label="منصّة تتويج" value={team.podiums} />
          <Stat label="انطلاقة أولى" value={team.poles} />
          <Stat label="نقطة" value={team.points} />
          <Stat label="أفضل مركز" value={team.bestFinish ?? '—'} />
          <Stat label="لقب صانعين" value={team.titles.length} />
        </dl>

        {/* التاريخ */}
        <section className="mt-12">
          <SectionHeading title="التاريخ" description="متى كان على الجريد، وماذا حقّق" />

          <dl className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface text-sm">
            <div className="flex flex-wrap gap-x-4 gap-y-1 px-4 py-3">
              <dt className="w-32 shrink-0 text-subtle">فترات النشاط</dt>
              <dd className="tnum font-medium" dir="ltr">
                {spanText(team) || `${team.firstSeason ?? '—'}–${team.lastSeason ?? '—'}`}
              </dd>
            </div>

            {/*
              فرق سجّلت في البطولة ولم تنطلق في سباق واحد — كانت تسقط في
              التصفية المسبقة كل مرة. «لايف» مثلاً حاول أربع عشرة مرة سنة 1990
              ولم يصل الشبكة قطّ. الصفر هنا ليس بياناً ناقصاً بل هو الخبر.
            */}
            {team.entries === 0 && (
              <div className="flex flex-wrap gap-x-4 gap-y-1 px-4 py-3">
                <dt className="w-32 shrink-0 text-subtle">مشاركات</dt>
                <dd className="font-medium text-muted">
                  سجّل في البطولة ولم ينطلق في أي سباق — كان يسقط في التصفية المسبقة.
                </dd>
              </div>
            )}

            {team.titles.length > 0 && (
              <div className="flex flex-wrap gap-x-4 gap-y-1 px-4 py-3">
                <dt className="w-32 shrink-0 text-subtle">ألقاب الصانعين</dt>
                <dd className="flex flex-wrap gap-1.5">
                  {team.titles.map((year) => (
                    <span
                      key={year}
                      className="tnum rounded bg-red/15 px-2 py-0.5 text-xs font-bold text-red"
                    >
                      {year}
                    </span>
                  ))}
                </dd>
              </div>
            )}

            {team.firstWin && (
              <div className="flex flex-wrap gap-x-4 gap-y-1 px-4 py-3">
                <dt className="w-32 shrink-0 text-subtle">أول انتصار</dt>
                <dd>
                  <span className="tnum font-bold">{team.firstWin.season}</span>{' '}
                  <span className="text-muted">{raceNameAr(team.firstWin)}</span>
                </dd>
              </div>
            )}

            {/* يُخفى فقط حين يكون الانتصاران **السباق نفسه** — لا حين يتشاركان الموسم */}
            {team.lastWin &&
              (team.lastWin.season !== team.firstWin?.season ||
                team.lastWin.round !== team.firstWin?.round) && (
              <div className="flex flex-wrap gap-x-4 gap-y-1 px-4 py-3">
                <dt className="w-32 shrink-0 text-subtle">آخر انتصار</dt>
                <dd>
                  <span className="tnum font-bold">{team.lastWin.season}</span>{' '}
                  <span className="text-muted">{raceNameAr(team.lastWin)}</span>
                </dd>
              </div>
            )}

            {team.engines && (
              <div className="flex flex-wrap gap-x-4 gap-y-1 px-4 py-3">
                <dt className="w-32 shrink-0 text-subtle">مورّد المحرّك</dt>
                <dd className="font-medium">{team.engines}</dd>
              </div>
            )}

            {/*
              ⚠️ يُعرض حين يوجد فقط. Ergast يسجّل «لوتس-كلايمكس» و«لوتس-فورد»
              صانعين مستقلّين عن «فريق لوتس»؛ دمجناهم هنا، والشفافية تقتضي
              قول ذلك بدل أن يتساءل القارئ من أين جاءت الأرقام.
            */}
            {team.merged.length > 0 && (
              <div className="flex flex-wrap gap-x-4 gap-y-1 px-4 py-3">
                <dt className="w-32 shrink-0 text-subtle">يشمل</dt>
                <dd className="text-xs text-muted" dir="ltr">
                  {team.merged.join(' · ')}
                </dd>
              </div>
            )}
          </dl>
        </section>

        {/* السائقون */}
        {team.drivers.length > 0 && (
          <section className="mt-12">
            <SectionHeading
              title="من قاد له"
              description={`${team.drivers.length} سائقاً — الأكثر أثراً أولاً`}
            />

            <div className="overflow-x-auto rounded-[var(--radius-card)] border border-line bg-surface">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-[0.68rem] text-subtle">
                    <th className="px-4 py-2.5 text-start font-medium">السائق</th>
                    <th className="px-3 py-2.5 text-start font-medium">السنوات</th>
                    <th className="px-3 py-2.5 text-end font-medium">سباقات</th>
                    <th className="px-3 py-2.5 text-end font-medium">انتصارات</th>
                    <th className="px-3 py-2.5 text-end font-medium">منصّات</th>
                  </tr>
                </thead>
                <tbody>
                  {team.drivers.map((driver) => (
                    <tr key={driver.id} className="border-b border-line/50 last:border-0">
                      <td className="px-4 py-2.5">
                        <Link
                          href={`/drivers/${driver.id}`}
                          className="flex items-center gap-2.5 transition-colors hover:text-red"
                        >
                          {driver.image ? (
                            <img
                              src={driver.image}
                              alt=""
                              loading="lazy"
                              decoding="async"
                              className="size-7 shrink-0 rounded-full object-cover"
                            />
                          ) : (
                            <span className="size-7 shrink-0 rounded-full border border-line bg-bg" />
                          )}
                          <span className="truncate font-medium">{driver.name}</span>
                        </Link>
                      </td>
                      <td className="tnum px-3 py-2.5 text-muted" dir="ltr">
                        {driver.firstSeason === driver.lastSeason
                          ? driver.firstSeason
                          : `${driver.firstSeason}–${driver.lastSeason}`}
                      </td>
                      <td className="tnum px-3 py-2.5 text-end text-muted">{driver.entries}</td>
                      <td className="tnum px-3 py-2.5 text-end">
                        {driver.wins > 0 ? (
                          <span className="font-bold text-red">{driver.wins}</span>
                        ) : (
                          <span className="text-subtle">—</span>
                        )}
                      </td>
                      <td className="tnum px-3 py-2.5 text-end text-muted">
                        {driver.podiums > 0 ? driver.podiums : <span className="text-subtle">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
          <Link href="/teams/former" className="text-sm text-muted transition-colors hover:text-red">
            ← كل الفرق السابقة
          </Link>

          <a
            href={team.wikipediaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-red transition-opacity hover:opacity-70"
          >
            (المصدر)
          </a>
        </div>
      </div>
    </>
  );
}
