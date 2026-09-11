import type { Metadata } from 'next';

import { CircuitTile } from '@/components/circuits/CircuitTile';
import { PageHero } from '@/components/hero/PageHero';
import { SectionHeading } from '@/components/site/SectionHeading';
import { listableCircuitCards } from '@/lib/data/cards';
import { t } from '@/lib/i18n';

export const revalidate = 86_400;

export const metadata: Metadata = {
  title: 'الحلبات',
  description:
    'كل حلبات الفورمولا 1 — الحالية في روزنامة الموسم، والسابقة التي استضافت سباقات عبر التاريخ.',
  alternates: { canonical: '/circuits' },
};

/**
 * تُبنى من `circuits.json` لا من نداء حيّ — انظر `src/lib/data/cards.ts`
 * لسبب ذلك (429 عند البناء المتوازي).
 */
export default function CircuitsPage() {
  const cards = listableCircuitCards();

  const current = cards.filter((card) => card.active);
  const former = cards.filter((card) => !card.active);

  const toTile = (card: (typeof cards)[number]) => ({
    id: card.id,
    name: card.name,
    nameEn: card.nameEn ?? card.name,
    country: card.country ?? '',
    countryCode: card.countryCode ?? '',
    active: card.active ?? false,
  });

  return (
    <>
      <PageHero
        scene="track"
        compact
        eyebrow={
          <>
            <span className="size-1.5 rounded-full bg-red" />
            <span className="tnum">{cards.length}</span> حلبة منذ 1950
          </>
        }
        title="الحلبات"
        description="كل حلبة استضافت سباق فورمولا 1 — حلبات الموسم الحالي، وكل حلبة سبقتها منذ 1950، بتاريخها ونتائجها وأسرع لفة سُجّلت عليها."
      />

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <SectionHeading
        title={t('circuits.current')}
        description={`${current.length} حلبة في روزنامة الموسم`}
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {current.map((card) => (
          <CircuitTile
              key={card.id}
              circuit={toTile(card)}
              image={card.image}
            />
        ))}
      </div>

      <div className="mt-20">
        <SectionHeading
          title={t('circuits.former')}
          description={`${former.length} حلبة استضافت سباقات ولم تعد في الروزنامة`}
        />

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {former.map((card) => (
            <CircuitTile
              key={card.id}
              circuit={toTile(card)}
              image={card.image}
            />
          ))}
        </div>
      </div>
      </div>
    </>
  );
}
