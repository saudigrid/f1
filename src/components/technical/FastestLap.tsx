/* eslint-disable @next/next/no-img-element */
import type { LapGrid } from '@/lib/data/openf1';

/**
 * جائزة أسرع لفة — DHL Fastest Lap Award.
 *
 * ⚠️ الشعار علامة تجارية لـDHL، والاسم اسم الجائزة الرسمي. استعماله هنا
 * **وصفيّ**: يسمّي الجائزة التي تحمل اسمه فعلاً، وهو ما تفعله كل تغطية لهذه
 * الرياضة. والملف نفسه من ويكيميديا كومنز في **الملك العام** — الشعارات
 * النصّية البسيطة لا تُحمى بحقّ المؤلف — فلا مشكلة في استضافته.
 *
 * لا نعيد تلوين الشعار ولا نشوّهه ولا نوحي برعاية: يُعرض كما هو، بجانب الاسم.
 */
function formatLap(value: number): string {
  const minutes = Math.floor(value / 60);
  const rest = (value % 60).toFixed(3).padStart(6, '0');
  return minutes > 0 ? `${minutes}:${rest}` : rest;
}

export function FastestLap({ grid }: { grid: LapGrid }) {
  const fastest = grid.fastest;
  if (!fastest) return null;

  const driver = grid.drivers.find((row) => row.number === fastest.number);

  return (
    <div className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface">
      <div className="flex items-center gap-3 border-b border-line bg-[#ffcc00] px-4 py-2">
        <img src="/brand/dhl.svg" alt="DHL" className="h-4 w-auto" />
        <span className="text-xs font-bold text-[#d40511]">جائزة أسرع لفة</span>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 p-5">
        <span
          className="h-12 w-1.5 shrink-0 rounded-full"
          style={{ background: driver?.colour ?? 'var(--red)' }}
        />

        <div className="min-w-0">
          <p className="text-xl font-bold" dir="ltr">
            {driver?.name ?? fastest.acronym}
          </p>
          <p className="mt-0.5 text-sm text-muted" dir="ltr">
            {driver?.team ?? ''}
          </p>
        </div>

        <div className="ms-auto text-end">
          <p className="tnum font-display text-3xl font-bold text-red" dir="ltr">
            {formatLap(fastest.seconds)}
          </p>
          <p className="tnum mt-0.5 text-xs text-subtle">اللفّة {fastest.lap}</p>
        </div>
      </div>
    </div>
  );
}
