import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { CareerResults } from '@/components/drivers/CareerResults';
import { ImageCreditLine } from '@/components/news/ImageCreditLine';
import { Flag } from '@/components/site/Flag';
import { SectionHeading } from '@/components/site/SectionHeading';
import driverCards from '@/data/driver-cards.json';
import { getDriverCareer } from '@/lib/data/history';
import type { ImageCredit } from '@/lib/types';

export const revalidate = 604_800;

interface Card {
  id: string;
  image: string | null;
  imageCredit: ImageCredit | null;
  imageTeam: string | null;
}

/**
 * لا نولّد أي صفحة سائق مسبقاً — كلّها تُصيَّر عند أول زيارة ثم تُخزَّن أسبوعاً.
 *
 * ⚠️ كانت تشكيلة الموسم (23 سائقاً) تُولَّد هنا. مسيرة السائق الواحد تكلّف
 * نداءً للتعريف وحتى خمس صفحات نتائج مرقَّمة، فصارت ثلاثتها وعشرون مئةَ طلب
 * متزامن على واجهة مفتوحة تبرّعية — و**429** يسقط البناء كلّه.
 *
 * المقايضة رابحة: أول زائر لصفحة سائق ينتظر ثانية إضافية مرّة واحدة، ثم
 * تُخدَم من التخزين أسبوعاً كاملاً. مقابل ذلك يصير البناء مستقلّاً تماماً عن
 * توفّر الواجهة — وهذا ما ينفع يوم النشر.
 */
export function generateStaticParams(): { id: string }[] {
  return [];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const career = await getDriverCareer(id);
  if (!career) return { title: 'السائق غير موجود' };

  const { driver, wins, firstSeason, lastSeason } = career;
  const span = firstSeason ? `${firstSeason}–${lastSeason}` : '';

  return {
    title: driver.name,
    description: `${driver.name} — ${driver.nationality}${span ? ` · ${span}` : ''} · ${career.results.length} سباقاً و${wins.length} فوزاً.`,
    alternates: { canonical: `/drivers/${id}` },
  };
}

export default async function DriverPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const career = await getDriverCareer(id);
  if (!career) notFound();

  const { driver, results, teams, wins, podiums, poles, points, firstSeason, lastSeason, titles } =
    career;

  const card = (driverCards as Card[]).find((entry) => entry.id === id) ?? null;

  const facts = [
    { label: 'سباقات', value: results.length },
    { label: 'انتصارات', value: wins.length },
    { label: 'منصّات', value: podiums },
    { label: 'انطلاقات أولى', value: poles },
  ].filter((fact) => fact.value > 0);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <nav aria-label="مسار التنقّل" className="mb-5 text-xs text-subtle">
        <Link href="/drivers" className="hover:text-red">
          السائقون
        </Link>
        <span className="mx-2" aria-hidden="true">
          /
        </span>
        <span>{driver.active ? 'سائقو الموسم' : 'السابقون'}</span>
      </nav>

      {/* ── المربع العلوي: الصورة والاسم، وجنبهما الفرق والانتصارات ── */}
      <section className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface">
        <div className="grid md:grid-cols-[minmax(0,320px)_1fr]">
          {/* السقف يمنع الصورة من ابتلاع الشاشة الأولى كاملة على الجوال */}
          <div className="relative aspect-[3/4] max-h-[400px] bg-surface-2 md:max-h-none">
            {card?.image ? (
              <Image
                src={card.image}
                alt={driver.name}
                fill
                priority
                sizes="(max-width: 768px) 100vw, 320px"
                className="object-cover object-top"
              />
            ) : (
              <span className="grid-bg absolute inset-0 opacity-50" />
            )}

            {card?.imageTeam && (
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 pt-8 pb-2 text-[0.68rem] text-white/85">
                لا صورة حرّة للسائق — الصورة لفريق {card.imageTeam}
              </span>
            )}
          </div>

          <div className="speed-edge p-5 sm:p-6">
            <h1 className="text-3xl leading-tight font-bold text-balance sm:text-4xl">
              {driver.name}
            </h1>

            <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
              <Flag code={driver.countryCode} className="text-base" />
              <span>{driver.nationality}</span>
              {firstSeason && (
                <>
                  <span className="text-subtle">·</span>
                  <span className="tnum">
                    {firstSeason}
                    {lastSeason !== firstSeason && `–${lastSeason}`}
                  </span>
                </>
              )}
              {driver.number !== null && (
                <>
                  <span className="text-subtle">·</span>
                  <span className="tnum">الرقم {driver.number}</span>
                </>
              )}
            </p>

            {titles.length > 0 && (
              <p className="mt-3 inline-flex flex-wrap items-center gap-2 rounded-xl border border-red/40 bg-red/5 px-3 py-2 text-sm">
                <span className="font-bold text-red">
                  بطل العالم {titles.length > 1 && `× ${titles.length}`}
                </span>
                <span className="tnum text-muted">{titles.join(' · ')}</span>
              </p>
            )}

            {facts.length > 0 && (
              <dl className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {facts.map((fact) => (
                  <div key={fact.label} className="rounded-xl border border-line bg-bg/50 px-3 py-2">
                    <dt className="text-[0.66rem] text-subtle">{fact.label}</dt>
                    <dd className="tnum mt-0.5 font-display text-lg font-bold">{fact.value}</dd>
                  </div>
                ))}
              </dl>
            )}

            {/* الفرق التي قاد لها */}
            {teams.length > 0 && (
              <div className="mt-5">
                <p className="text-[0.7rem] font-semibold text-subtle">الفرق التي قاد لها</p>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {teams.map((team) => (
                    <li
                      key={team.id}
                      className="rounded-lg border border-line bg-bg/50 px-2.5 py-1.5 text-xs"
                    >
                      <span dir="ltr" className="font-semibold">
                        {team.name}
                      </span>
                      <span className="tnum ms-2 text-subtle">
                        {team.firstYear}
                        {team.lastYear !== team.firstYear && `–${team.lastYear}`}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {points > 0 && (
              <p className="tnum mt-4 text-sm text-muted">
                مجموع النقاط في المسيرة: <span className="font-bold text-fg">{points}</span>
              </p>
            )}
          </div>
        </div>

        {card?.imageCredit && (
          <div className="border-t border-line px-5 py-2">
            <ImageCreditLine credit={card.imageCredit} />
          </div>
        )}
      </section>

      {/* ── السباقات التي فاز فيها ─────────────────────── */}
      {wins.length > 0 && (
        <section className="mt-10">
          <SectionHeading
            title="السباقات التي فاز فيها"
            description={`${wins.length} انتصاراً`}
          />
          <ol className="grid gap-2 sm:grid-cols-2">
            {wins.map((win) => (
              <li
                key={`${win.season}-${win.round}`}
                className="flex items-center gap-2.5 rounded-lg border border-line bg-surface px-3 py-2 text-sm"
              >
                <span className="tnum font-display font-bold text-red">{win.season}</span>
                <Flag code={win.countryCode} />
                <span className="truncate">{win.raceName}</span>
                <span className="ms-auto hidden shrink-0 text-xs text-subtle sm:inline" dir="ltr">
                  {win.constructorName}
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* ── ترتيبه في كل سباق قاده ─────────────────────── */}
      <section className="mt-12">
        <SectionHeading
          title="ترتيبه في كل سباق"
          description={
            results.length > 0
              ? `${results.length} سباقاً منذ ${firstSeason}`
              : 'لا نتائج مسجّلة لهذا السائق'
          }
        />

        {results.length === 0 ? (
          <p className="rounded-[var(--radius-card)] border border-dashed border-line px-6 py-12 text-center text-muted">
            لا نتائج مسجّلة — قد يكون تأهّل لسباق ولم ينطلق فيه.
          </p>
        ) : (
          <CareerResults results={results} />
        )}
      </section>

      {driver.wikipediaUrl && (
        <p className="mt-10 text-xs text-subtle">
          سيرة السائق على{' '}
          <a
            href={driver.wikipediaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-red"
          >
            ويكيبيديا ↗
          </a>
        </p>
      )}
    </div>
  );
}
