/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';

import { driverDisplayName } from '@/lib/data/driver-records';

/**
 * لوحة صدارة رقم قياسي واحد — أعلى عشرة سائقين بمقياس واحد.
 *
 * الصفّ الأول مُبرَز بخطّ أحمر جانبي ووزن أثقل: هو **حامل الرقم**، والباقي
 * سياق يوضّح المسافة بينه وبين من يليه. رقم مجرّد بلا مقارنة لا يعني شيئاً —
 * «103 انتصارات» يصير مفهوماً حين ترى أن التالي بعده بفارق 12.
 */

export interface LeaderboardRow {
  driverId: string;
  nameEn: string;
  value: number;
  /** سطر فرعي: الموسم لأرقام «في موسم واحد»، أو فترة النشاط. */
  sub?: string;
}

export function Leaderboard({
  title,
  unit,
  rows,
  decimals = 0,
}: {
  title: string;
  /** «انتصاراً»، «نقطة»، «موسماً» — يلحق الرقم مباشرة. */
  unit: string;
  rows: LeaderboardRow[];
  decimals?: number;
}) {
  if (rows.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface">
      <h3 className="border-b border-line px-4 py-3 text-sm font-bold">{title}</h3>

      <ol className="divide-y divide-line/60">
        {rows.map((row, index) => {
          const { name, image } = driverDisplayName(row.driverId, row.nameEn);
          const leader = index === 0;

          return (
            <li key={row.driverId} className="relative">
              {leader && <span className="absolute inset-y-0 start-0 w-0.5 bg-red" aria-hidden="true" />}
              <Link
                href={`/drivers/${row.driverId}`}
                className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-bg"
              >
                <span
                  className={`tnum w-5 shrink-0 text-center text-xs ${
                    leader ? 'font-bold text-red' : 'text-subtle'
                  }`}
                >
                  {index + 1}
                </span>

                {image ? (
                  <img src={image} alt="" className="size-8 shrink-0 rounded-full object-cover" />
                ) : (
                  <span className="size-8 shrink-0 rounded-full border border-line bg-bg" />
                )}

                <span className="min-w-0 flex-1">
                  <span className={`block truncate text-sm ${leader ? 'font-bold' : ''}`}>{name}</span>
                  {row.sub && <span className="block text-[0.68rem] text-subtle">{row.sub}</span>}
                </span>

                <span className={`tnum shrink-0 text-sm ${leader ? 'font-bold text-red' : 'text-muted'}`} dir="ltr">
                  {row.value.toFixed(decimals)} <span className="text-[0.68rem] text-subtle">{unit}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
