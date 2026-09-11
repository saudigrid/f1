import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ImageCreditLine } from '@/components/news/ImageCreditLine';
import { Flag } from '@/components/site/Flag';
import { SectionHeading } from '@/components/site/SectionHeading';
import circuitCards from '@/data/circuits.json';
import { circuitCard } from '@/lib/data/cards';
import { formatDate } from '@/lib/format';
import { getCircuitFastestLap, getCircuitRaces } from '@/lib/data/history';
import { getRepository } from '@/lib/data/repository';

export const revalidate = 86_400;

/**
 * نولّد حلبات الموسم الجاري مسبقاً فقط.
 *
 * ⚠️ كانت هنا كل الـ78. كل صفحة تنادي الواجهة ثلاث مرات (النتائج، أسرع لفة،
 * قائمة الحلبات)، وأحد عشر عاملاً متوازياً حوّل ذلك إلى مئتَي طلب متزامن على
 * واجهة تبرّعية فردّت **429** وأسقطت البناء. الحلبات السابقة تُصيَّر عند أول
 * زيارة ثم تُخزَّن يوماً — وتاريخ 1976 لا يتغيّر، فلا يخسر القارئ شيئاً.
 */
export function generateStaticParams() {
  return circuitCards.filter((card) => card.active).map((card) => ({ id: card.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const circuit = circuitCard(id);
  if (!circuit?.name) return { title: 'الحلبة غير موجودة' };

  return {
    title: circuit.name,
    description: `${circuit.name} في ${circuit.country} — النتائج وأسرع لفة وتاريخ السباقات.`,
    alternates: { canonical: `/circuits/${id}` },
  };
}

export default async function CircuitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  /**
   * بيانات الحلبة من الملف لا من الواجهة.
   *
   * ⚠️ كان هنا `listCircuits()` — نداء متطابق يتكرّر مع **كل** صفحة حلبة، أي
   * 78 نسخة من الطلب نفسه موزّعة على عمّال البناء المتوازين. الاسم والدولة
   * ثابتان، فيُقرآن من `circuits.json` بعد `npm run backfill`.
   */
  const card = circuitCard(id);
  if (!card?.name) notFound();

  const circuit = {
    ...card,
    name: card.name,
    country: card.country ?? '',
    countryCode: card.countryCode ?? '',
    locality: card.locality ?? '',
    active: card.active ?? false,
  };

  const [races, fastestLap, seasonRaces] = await Promise.all([
    getCircuitRaces(id),
    getCircuitFastestLap(id),
    /**
     * روزنامة الموسم من الملف المزامَن لا من نداء حيّ.
     *
     * ⚠️ كان هنا `getSeasonRaces(CURRENT_SEASON)` — نداء **متطابق** يتكرّر مع
     * كل حلبة نشطة، أي ثلاثة وعشرون نسخة من الطلب نفسه موزّعة على عمّال
     * البناء المتوازين، فردّت الواجهة 429 وأسقطت البناء. الروزنامة تُزامَن
     * أصلاً بـ`npm run sync`، فلا سبب لسؤال الشبكة عنها في كل صفحة.
     */
    circuit.active ? getRepository().then((repo) => repo.listRaces()) : Promise.resolve([]),
  ]);

  /** الجولة القادمة على هذه الحلبة — لا تُعرض للحلبات السابقة أصلاً. */
  const upcoming =
    seasonRaces.find(
      (race) => race.id === id && new Date(race.startsAt).getTime() > Date.now(),
    ) ?? null;

  const lastThree = races.filter((race) => race.podium.length > 0).slice(0, 3);
  const kilometres = card?.lengthMeters ? (card.lengthMeters / 1000).toFixed(3) : null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <nav aria-label="مسار التنقّل" className="mb-5 text-xs text-subtle">
        <Link href="/circuits" className="hover:text-red">
          الحلبات
        </Link>
        <span className="mx-2" aria-hidden="true">/</span>
        <span>{circuit.active ? 'الحالية' : 'السابقة'}</span>
      </nav>

      {/* ── المربع العلوي ───────────────────────────────── */}
      <section className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface">
        <div className="grid md:grid-cols-2">
          <div className="relative aspect-[16/10] bg-surface-2 md:aspect-auto md:min-h-[280px]">
            {card?.image ? (
              <Image
                src={card.image}
                alt={circuit.name}
                fill
                priority
                sizes="(max-width: 768px) 100vw, 480px"
                className="object-cover"
              />
            ) : (
              <span className="grid-bg absolute inset-0 opacity-50" />
            )}
          </div>

          <div className="speed-edge p-5 sm:p-6">
            <h1 className="text-2xl leading-tight font-bold text-balance sm:text-3xl">
              {circuit.name}
            </h1>

            <p className="mt-2 flex items-center gap-2 text-sm text-muted">
              <Flag code={circuit.countryCode} className="text-base" />
              <span>
                {circuit.country}
                <span className="mx-1.5 text-subtle">·</span>
                {circuit.locality}
              </span>
            </p>

            {upcoming ? (
              <div className="mt-5 rounded-xl border border-red/40 bg-red/5 p-3.5">
                <p className="text-[0.7rem] font-semibold text-red">السباق القادم</p>
                <p className="mt-1 font-bold">{upcoming.name}</p>
                <p className="tnum mt-0.5 text-sm text-muted">{formatDate(upcoming.startsAt)}</p>
              </div>
            ) : (
              <div className="mt-5 rounded-xl border border-line bg-bg/50 p-3.5">
                <p className="text-sm text-subtle">
                  {circuit.active
                    ? 'انتهى سباق هذا الموسم على هذه الحلبة.'
                    : 'ليست ضمن روزنامة الموسم الحالي.'}
                </p>
              </div>
            )}

            {fastestLap && (
              <div className="mt-4">
                <p className="text-[0.7rem] font-semibold text-subtle">أسرع لفة في تاريخ الحلبة</p>
                <p className="tnum mt-1 font-display text-2xl font-bold">{fastestLap.time}</p>
                <p className="mt-0.5 text-sm text-muted">
                  {fastestLap.driverName}
                  <span className="tnum mx-1.5 text-subtle">{fastestLap.season}</span>
                </p>
              </div>
            )}
          </div>
        </div>

        {card?.imageCredit && (
          <div className="border-t border-line px-5 py-2">
            <ImageCreditLine credit={card.imageCredit} />
          </div>
        )}
      </section>

      {/* ── آخر ثلاثة فائزين ────────────────────────────── */}
      {lastThree.length > 0 && (
        <section className="mt-10">
          <SectionHeading title="آخر السباقات على هذه الحلبة" />
          <ol className="space-y-3">
            {lastThree.map((race) => (
              <li
                key={`${race.season}-${race.round}`}
                className="rounded-[var(--radius-card)] border border-line bg-surface p-4"
              >
                <div className="flex flex-wrap items-baseline gap-x-3">
                  <span className="tnum font-display text-xl font-bold text-red">
                    {race.season}
                  </span>
                  <span className="font-semibold">{race.name}</span>
                </div>

                <ol className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
                  {race.podium.map((slot) => (
                    <li key={slot.position} className="flex items-center gap-2">
                      <span
                        className={`tnum grid size-5 place-items-center rounded font-display text-[0.7rem] font-bold ${
                          slot.position === 1 ? 'bg-red text-white' : 'bg-surface-2 text-muted'
                        }`}
                      >
                        {slot.position}
                      </span>
                      <span className="text-muted">{slot.driverName}</span>
                      <span className="text-xs text-subtle" dir="ltr">
                        {slot.constructor}
                      </span>
                    </li>
                  ))}
                </ol>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* ── معلومات الحلبة ──────────────────────────────── */}
      <section className="mt-10">
        <SectionHeading title="عن الحلبة" />

        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'الطول', value: kilometres ? `${kilometres} كم` : null },
            { label: 'المنعطفات', value: card?.turns ? String(card.turns) : null },
            { label: 'الافتتاح', value: card?.openedYear ? String(card.openedYear) : null },
            { label: 'سباقات أُقيمت', value: races.length > 0 ? String(races.length) : null },
          ]
            .filter((fact) => fact.value)
            .map((fact) => (
              <div
                key={fact.label}
                className="rounded-xl border border-line bg-surface px-4 py-3"
              >
                <dt className="text-[0.68rem] text-subtle">{fact.label}</dt>
                <dd className="tnum mt-1 font-display text-lg font-bold">{fact.value}</dd>
              </div>
            ))}
        </dl>

        {(card?.summaryAr || card?.summaryEn) && (
          <div className="prose-ar mt-6 rounded-[var(--radius-card)] border border-line bg-surface p-5">
            {card.summaryAr ? (
              <p>{card.summaryAr}</p>
            ) : (
              <>
                {/* المقدّمة لم تُعرَّب بعد — نعرضها بلغتها ونقولها صراحة */}
                <p className="!mt-0 text-xs text-subtle">
                  المقدّمة بالإنجليزية — التعريب قيد الإضافة.
                </p>
                <p dir="ltr" className="text-start">
                  {card.summaryEn}
                </p>
              </>
            )}

            <p className="!mt-4 text-xs text-subtle">
              المصدر:{' '}
              <a href={circuit.wikipediaUrl} target="_blank" rel="noopener noreferrer">
                ويكيبيديا
              </a>
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
