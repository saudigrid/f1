import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

import { PageHero } from '@/components/hero/PageHero';
import { AdSlot } from '@/components/ads/AdSlot';
import { ImageCreditLine } from '@/components/news/ImageCreditLine';
import { Flag } from '@/components/site/Flag';
import driverCards from '@/data/driver-cards.json';
import eraImages from '@/data/era-images.json';
import { ERAS, type Era } from '@/data/eras';
import { allSeasonChampions } from '@/lib/data/champions';
import type { ImageCredit } from '@/lib/types';
import { driverNameAr, nationality } from '@/lib/data/i18n';
import { t } from '@/lib/i18n';

export const revalidate = 86_400;

export const metadata: Metadata = {
  title: 'تاريخ الرياضة',
  description:
    'تاريخ الفورمولا 1 من 1950 إلى اليوم — حقبة حقبة: التغييرات الجذرية، وأبطالها، والقواعد التي أعادت تشكيل الرياضة.',
  alternates: { canonical: '/eras' },
};

interface Card {
  id: string;
  image: string | null;
}

/** أبطال حقبة بعينها، بترتيب زمني، مع عدد ألقاب كل واحد داخلها. */
function championsOf(era: Era) {
  const to = era.to ?? Number.POSITIVE_INFINITY;
  const rows = allSeasonChampions().filter(
    (row) => row.complete && row.driverId && row.season >= era.from && row.season <= to,
  );

  const byDriver = new Map<string, { id: string; name: string; code: string; seasons: number[] }>();

  for (const row of rows) {
    const existing = byDriver.get(row.driverId!);
    if (existing) {
      existing.seasons.push(row.season);
      continue;
    }
    byDriver.set(row.driverId!, {
      id: row.driverId!,
      name: driverNameAr(row.driverId!, row.driverName!),
      code: row.driverNationality ? nationality(row.driverNationality).code : '',
      seasons: [row.season],
    });
  }

  return [...byDriver.values()].sort((a, b) => a.seasons[0] - b.seasons[0]);
}

/** ألقاب الصانعين داخل الحقبة، الأكثر أولاً. */
function constructorsOf(era: Era) {
  const to = era.to ?? Number.POSITIVE_INFINITY;
  const tally = new Map<string, number>();

  for (const row of allSeasonChampions()) {
    if (!row.complete || !row.constructorName) continue;
    if (row.season < era.from || row.season > to) continue;
    tally.set(row.constructorName, (tally.get(row.constructorName) ?? 0) + 1);
  }

  return [...tally.entries()].sort((a, b) => b[1] - a[1]);
}

export default function ErasPage() {
  const cards = new Map((driverCards as Card[]).map((card) => [card.id, card.image]));
  const images = new Map(
    (eraImages as { id: string; image: string | null; credit: ImageCredit | null }[]).map(
      (row) => [row.id, row],
    ),
  );

  return (
    <>
      <PageHero
        scene="strata"
        compact
        eyebrow={<><span className="size-1.5 rounded-full bg-red" />من <span className="tnum">1950</span> إلى اليوم</>}
        title={t('eras.title')}
        description="ما الذي تغيّر جذرياً في هذه الرياضة، ومتى، ولماذا — حقبة حقبة."
      />

      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      {/* الأمانة التحريرية: التقسيم اجتهاد، والوقائع داخله موثّقة */}
      <p className="mb-10 rounded-xl border border-line bg-surface px-4 py-3 text-xs leading-relaxed text-subtle">
        تقسيم الحقب اجتهاد شخصي لا تصنيف رسمي — أما الوقائع والسنوات داخل كل حقبة فموثّقة.
      </p>

      <ol className="space-y-14">
        {ERAS.map((era, index) => {
          const eraImage = images.get(era.id);
          const champions = championsOf(era);
          const constructors = constructorsOf(era);

          return (
            // ⚠️ المعرّف هنا — فهرس البحث يقود إلى `/eras#<id>` لكل حقبة
            <li key={era.id} id={era.id} className="relative scroll-mt-24">
              {/* ── صورة الحقبة ───────────────────────── */}
              {eraImage?.image && (
                <figure className="mb-6 overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface-2">
                  <div className="relative aspect-[21/9]">
                    <Image
                      src={eraImage.image}
                      alt={`من حقبة ${era.title}`}
                      fill
                      sizes="(max-width: 768px) 100vw, 800px"
                      className="object-cover"
                    />
                    {/* تدرّج يربط الصورة بالخلفية بدل أن تُقطع فجأة */}
                    <span className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-bg to-transparent" />
                    <span className="tnum absolute bottom-3 start-4 font-display text-2xl font-bold text-white drop-shadow-lg sm:text-3xl">
                      {era.from}
                      <span className="mx-1 opacity-60">–</span>
                      {era.to ?? 'الآن'}
                    </span>
                  </div>
                  {eraImage.credit && (
                    <figcaption className="border-t border-line px-4 py-2">
                      <ImageCreditLine credit={eraImage.credit} />
                    </figcaption>
                  )}
                </figure>
              )}

              {/* ── ترويسة الحقبة ─────────────────────── */}
              <header className="mb-5 border-b border-line pb-4">
                {!eraImage?.image && (
                  <p className="tnum font-display text-3xl font-bold text-red sm:text-4xl">
                    {era.from}
                    <span className="mx-1.5 text-subtle">–</span>
                    {era.to ?? 'الآن'}
                  </p>
                )}
                <h2 className="mt-2 text-xl leading-tight font-bold text-balance sm:text-2xl">
                  {era.title}
                </h2>
                <p className="mt-1 text-sm text-muted">{era.tagline}</p>
              </header>

              <p className="prose-ar leading-[1.9]">{era.summary}</p>

              {/* ── التغييرات الجذرية ─────────────────── */}
              <ul className="mt-6 space-y-3">
                {era.changes.map((change) => (
                  <li
                    key={`${change.year}-${change.label}`}
                    className="flex gap-3.5 rounded-[var(--radius-card)] border border-line bg-surface p-4"
                  >
                    <span className="tnum shrink-0 font-display text-sm font-bold text-red">
                      {change.year}
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold">{change.label}</p>
                      <p className="mt-1 text-sm leading-relaxed text-muted">{change.detail}</p>
                    </div>
                  </li>
                ))}
              </ul>

              {/* ── أبطال الحقبة ──────────────────────── */}
              {champions.length > 0 && (
                <div className="mt-6">
                  <p className="text-[0.7rem] font-semibold text-subtle">
                    أبطال العالم في هذه الحقبة
                  </p>
                  <ul className="mt-2.5 flex flex-wrap gap-2">
                    {champions.map((champion) => {
                      const image = cards.get(champion.id) ?? null;
                      return (
                        <li key={champion.id}>
                          <Link
                            href={`/drivers/${champion.id}`}
                            className="flex items-center gap-2 rounded-full border border-line bg-surface py-1 pe-3 ps-1 text-xs transition-colors hover:border-red"
                          >
                            <span className="relative size-7 shrink-0 overflow-hidden rounded-full bg-surface-2">
                              {image && (
                                <Image
                                  src={image}
                                  alt=""
                                  fill
                                  sizes="28px"
                                  className="object-cover object-top"
                                />
                              )}
                            </span>
                            <Flag code={champion.code} />
                            <span className="font-semibold">{champion.name}</span>
                            <span className="tnum text-subtle">
                              {champion.seasons.length > 1
                                ? `× ${champion.seasons.length}`
                                : champion.seasons[0]}
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {/* ── ألقاب الصانعين ────────────────────── */}
              {constructors.length > 0 && (
                <div className="mt-5">
                  <p className="text-[0.7rem] font-semibold text-subtle">ألقاب الصانعين</p>
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {constructors.map(([name, count]) => (
                      <li
                        key={name}
                        className="rounded-lg border border-line bg-bg/50 px-2.5 py-1 text-xs"
                      >
                        <span dir="ltr" className="font-semibold">
                          {name}
                        </span>
                        {count > 1 && <span className="tnum ms-1.5 text-subtle">× {count}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* إعلان واحد في منتصف الصفحة لا بين كل حقبتين */}
              {index === Math.floor(ERAS.length / 2) && <AdSlot placement="in-feed" className="mt-12" />}
            </li>
          );
        })}
      </ol>
    </div>
    </>
  );
}
