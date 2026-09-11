'use client';

import { useRouter } from 'next/navigation';

/**
 * قائمة منسدلة لاختيار الموسم.
 *
 * 77 موسماً لا تُعرض كأزرار — القائمة المنسدلة أسرع للوصول إلى سنة بعينها،
 * وأخفّ على الجوال. التنقّل يغيّر الرابط فتُصيَّر الصفحة على الخادم، فتبقى
 * قابلة للمشاركة والفهرسة.
 */
export function SeasonPicker({ seasons, current }: { seasons: number[]; current: number }) {
  const router = useRouter();

  return (
    <label className="flex items-center gap-2.5 text-sm">
      <span className="text-subtle">الموسم</span>
      <select
        value={current}
        onChange={(event) => router.push(`/races?season=${event.target.value}`)}
        className="tnum rounded-lg border border-line bg-surface px-3 py-2 font-display text-base font-bold outline-none focus:border-red"
      >
        {seasons.map((season) => (
          <option key={season} value={season}>
            {season}
          </option>
        ))}
      </select>
    </label>
  );
}
