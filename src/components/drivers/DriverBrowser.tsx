'use client';

import { useMemo, useState } from 'react';

import { t } from '@/lib/i18n';

import { DriverTile, type TileDriver } from './DriverTile';

/**
 * تصفّح كل من قاد في الفورمولا 1 — 881 سائقاً.
 *
 * لماذا بحث في المتصفّح لا صفحات على الخادم؟ لأن القائمة **ثابتة**: من قاد في
 * 1954 لن يتغيّر. فتُرسَل مرة (نحو 90 كيلوبايت مضغوطة) ويصير البحث فورياً بلا
 * أي نداء — وهذا أهمّ ما يريده القارئ هنا: أن يكتب اسماً فيجده، لا أن يتنقّل
 * بين ثلاثين صفحة.
 *
 * العرض التدريجي (48 في كل مرة) يمنع تصيير 881 صورة دفعة واحدة على الجوال.
 */

export interface BrowsableDriver extends TileDriver {
  nameEn: string;
  image: string | null;
  imageTeam: string | null;
  titles: number;
}

const PAGE = 48;

/** يزيل التشكيل والهمزات المتغيّرة ليطابق البحث ما يكتبه الناس فعلاً. */
function fold(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f\u064b-\u0652]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

export function DriverBrowser({ drivers }: { drivers: BrowsableDriver[] }) {
  const [query, setQuery] = useState('');
  const [shown, setShown] = useState(PAGE);

  // الفهرس يُبنى مرة لا مع كل ضغطة مفتاح
  const index = useMemo(
    () => drivers.map((driver) => ({ driver, haystack: `${fold(driver.name)} ${fold(driver.nameEn)}` })),
    [drivers],
  );

  const matches = useMemo(() => {
    const needle = fold(query);
    if (!needle) return drivers;
    return index.filter((entry) => entry.haystack.includes(needle)).map((entry) => entry.driver);
  }, [drivers, index, query]);

  const visible = matches.slice(0, shown);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <label className="relative flex-1 sm:max-w-sm">
          <span className="sr-only">{t('drivers.searchLabel')}</span>
          <input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setShown(PAGE); // بحث جديد يبدأ من أوّله
            }}
            placeholder={t('drivers.searchPlaceholder')}
            className="w-full rounded-xl border border-line bg-surface px-4 py-2.5 text-sm outline-none transition-colors focus:border-red"
          />
        </label>

        <p className="tnum text-sm text-subtle">
          {matches.length} سائقاً
          {query && matches.length !== drivers.length && ` من ${drivers.length}`}
        </p>
      </div>

      {matches.length === 0 ? (
        <p className="rounded-[var(--radius-card)] border border-dashed border-line px-6 py-12 text-center text-muted">
          {t('drivers.searchEmpty')}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {visible.map((driver) => (
              <DriverTile
                key={driver.id}
                driver={driver}
                image={driver.image}
                imageTeam={driver.imageTeam}
                titles={driver.titles}
              />
            ))}
          </div>

          {shown < matches.length && (
            <div className="mt-8 text-center">
              <button
                type="button"
                onClick={() => setShown((value) => value + PAGE * 2)}
                className="rounded-xl border border-line bg-surface px-6 py-2.5 text-sm font-semibold transition-colors hover:border-red hover:text-red"
              >
                {t('chrome.showMore')}
                <span className="tnum me-2 text-subtle">({matches.length - shown})</span>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
