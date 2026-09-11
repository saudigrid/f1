import type { Metadata } from 'next';

import { PageHero } from '@/components/hero/PageHero';
import { AdSlot } from '@/components/ads/AdSlot';
import { DriverBrowser, type BrowsableDriver } from '@/components/drivers/DriverBrowser';
import { DriverTile } from '@/components/drivers/DriverTile';
import { SectionHeading } from '@/components/site/SectionHeading';
import { listableDriverCards } from '@/lib/data/cards';
import { driverTitles } from '@/lib/data/champions';
import { t } from '@/lib/i18n';

export const revalidate = 86_400;

export const metadata: Metadata = {
  title: 'السائقون',
  description:
    'كل من قاد في الفورمولا 1 منذ 1950 — سائقو الموسم الحالي، وأبطال العالم، والسائقون السابقون بصورهم وسجلّاتهم.',
  alternates: { canonical: '/drivers' },
};

/**
 * القائمة تُبنى من الملفات المزامَنة، لا من نداء حيّ.
 *
 * ⚠️ لا تُعِد `listAllDrivers()` إلى هنا. كانت هنا، فانهالت تسعة طلبات ترقيم
 * من كل عامل بناء على واجهة مفتوحة تبرّعية وردّت 429، فسقط البناء. الأسماء
 * والجنسيات لا تتغيّر — تُحدَّث بـ`npm run backfill` لا بطلب في كل بناء.
 */
export default function DriversPage() {
  const all: BrowsableDriver[] = listableDriverCards().map((card) => ({
    id: card.id,
    name: card.name,
    nameEn: card.nameEn,
    nationality: card.nationality ?? '',
    countryCode: card.countryCode ?? '',
    active: card.active ?? false,
    image: card.image,
    imageTeam: card.imageTeam,
    titles: driverTitles(card.id).length,
  }));

  const current = all.filter((driver) => driver.active);

  /** الأبطال أولاً بعدد الألقاب — هذا الترتيب هو ما يبحث عنه القارئ. */
  const champions = all
    .filter((driver) => driver.titles > 0)
    .sort((a, b) => b.titles - a.titles || a.nameEn.localeCompare(b.nameEn));

  const former = all.filter((driver) => !driver.active);

  return (
    <>
      <PageHero
        scene="visor"
        compact
        eyebrow={<><span className="size-1.5 rounded-full bg-red" /><span className="tnum">{all.length}</span> سائقاً منذ <span className="tnum">1950</span></>}
        title={t('drivers.title')}
        description="كل من جلس خلف مقود فورمولا 1 — تشكيلة الموسم، وأبطال العالم، وكل سائق سبقهم."
      />

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      {current.length > 0 && (
        <section className="mb-16">
          <SectionHeading
            title={t('drivers.currentSeason')}
            description={`${current.length} سائقاً على الجريد هذا الموسم`}
          />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {current.map((driver) => (
              <DriverTile
                key={driver.id}
                driver={driver}
                image={driver.image}
                imageTeam={driver.imageTeam}
                titles={driver.titles}
              />
            ))}
          </div>
        </section>
      )}

      <AdSlot placement="in-feed" className="mb-16" />

      {champions.length > 0 && (
        <section className="mb-16">
          <SectionHeading
            title={t('drivers.champions')}
            description={`${champions.length} سائقاً رفعوا اللقب منذ انطلاق البطولة`}
          />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {champions.map((driver) => (
              <DriverTile
                key={driver.id}
                driver={driver}
                image={driver.image}
                imageTeam={driver.imageTeam}
                titles={driver.titles}
              />
            ))}
          </div>
        </section>
      )}

      <section>
        <SectionHeading
          title={t('drivers.former')}
          description={`${former.length} سائقاً لا يقودون هذا الموسم — ابحث بالاسم`}
        />
        <DriverBrowser drivers={former} />
      </section>
    </div>
    </>
  );
}
