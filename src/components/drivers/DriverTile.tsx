import Image from 'next/image';
import Link from 'next/link';

import { Flag } from '@/components/site/Flag';
import { t } from '@/lib/i18n';

/**
 * أقلّ ما تحتاجه البطاقة.
 *
 * ليس `DriverSummary` كاملاً عمداً: قائمة التصفّح تُرسَل إلى المتصفّح، و881
 * سائقاً بحقول لا تُعرض (الرقم، تاريخ الميلاد، رابط ويكيبيديا) تضخّم الحمولة
 * بلا مقابل. و`DriverSummary` يحقّق هذا الشكل بنيوياً فيمرّ كما هو.
 */
export interface TileDriver {
  id: string;
  name: string;
  nationality: string;
  countryCode: string;
  active: boolean;
}

/**
 * مربّع سائق في الشبكة — نظير `CircuitTile`.
 *
 * مقاس 3:4 رأسي لأن صور الأشخاص رأسية غالباً، وقصّها أفقياً يقطع الرؤوس.
 * حين تكون الصورة صورة **فريق** لا صورة سائق نقولها للقارئ صراحة: الإيهام
 * بأنها صورته أسوأ من غيابها.
 */
export function DriverTile({
  driver,
  image,
  imageTeam,
  titles = 0,
}: {
  driver: TileDriver;
  image: string | null;
  imageTeam?: string | null;
  titles?: number;
}) {
  return (
    <Link
      href={`/drivers/${driver.id}`}
      className="group relative flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface transition-all duration-300 hover:border-line-strong hover:shadow-[var(--shadow-card)]"
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-surface-2">
        {image ? (
          <Image
            src={image}
            alt={driver.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 220px"
            className="object-cover object-top transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <span className="grid-bg absolute inset-0 opacity-50" />
        )}

        {driver.active && (
          <span className="absolute end-2 top-2 rounded-md bg-red px-2 py-0.5 text-[0.62rem] font-bold text-white">
            {t('drivers.thisSeason')}
          </span>
        )}

        {titles > 0 && (
          <span className="tnum absolute start-2 top-2 rounded-md bg-bg/85 px-2 py-0.5 text-[0.62rem] font-bold backdrop-blur-sm">
            {titles > 1 ? `${titles} ${t('drivers.titlesPlural')}` : t('drivers.worldChampion')}
          </span>
        )}

        {imageTeam && (
          <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-2 pt-6 pb-1.5 text-[0.6rem] text-white/85">
            {t('drivers.teamPhotoShort')} {imageTeam}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-3">
        <h3 className="text-sm leading-snug font-bold transition-colors group-hover:text-red">
          {driver.name}
        </h3>

        <p className="mt-1.5 flex items-center gap-1.5 text-xs text-subtle">
          <Flag code={driver.countryCode} />
          <span className="truncate">{driver.nationality}</span>
        </p>
      </div>
    </Link>
  );
}
