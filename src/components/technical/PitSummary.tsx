import { compound } from '@/lib/data/compounds';
import type { PitStopRow } from '@/lib/data/openf1';

/**
 * ملخّص التوقّفات — من توقّف، متى، وعلى أي مركّب خرج.
 *
 * ⚠️ عدد التوقّفات مشتقّ من حدود الستنتات لا من سجلّ حارة الصيانة، لأن زمن
 * الحارة في بيانات المصدر غير موثوق (قيم تتجاوز النصف ساعة). فحين يغيب الزمن
 * المعقول يُعرض «—» بدل رقم مخترع: الفراغ يقول الحقيقة، والرقم الخاطئ لا.
 */
export function PitSummary({ rows }: { rows: PitStopRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="rounded-[var(--radius-card)] border border-dashed border-line px-6 py-10 text-center text-sm text-muted">
        لا توقّفات مسجّلة لهذا السباق.
      </p>
    );
  }

  const withLane = rows.filter((row) => row.bestLaneSeconds !== null);
  const quickest =
    withLane.length > 0
      ? Math.min(...withLane.map((row) => row.bestLaneSeconds as number))
      : null;

  return (
    <div className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-bg/40 px-4 py-2.5 text-xs">
        <span className="text-subtle">
          <span className="tnum font-semibold text-fg">{rows.length}</span> سائقاً توقّفوا ·{' '}
          <span className="tnum font-semibold text-fg">
            {rows.reduce((sum, row) => sum + row.stops.length, 0)}
          </span>{' '}
          توقّفاً
        </span>
        {quickest !== null && (
          <span className="text-subtle">
            أسرع مرور في الحارة{' '}
            <span className="tnum font-bold text-red">{quickest.toFixed(1)}s</span>
          </span>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="border-b border-line text-[0.68rem] text-subtle">
              <th className="px-3 py-2 text-start font-medium">السائق</th>
              <th className="px-3 py-2 text-start font-medium">التوقّفات</th>
              <th className="px-3 py-2 text-end font-medium">العدد</th>
              <th className="px-3 py-2 text-end font-medium">أسرع مرور</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.driverNumber} className="border-b border-line/60 last:border-0">
                <td className="px-3 py-2">
                  <span className="flex items-center gap-2">
                    <span
                      className="h-4 w-1 shrink-0 rounded-full"
                      style={{ background: row.colour ?? 'var(--fg-subtle)' }}
                    />
                    <span className="font-bold" dir="ltr">
                      {row.acronym}
                    </span>
                  </span>
                </td>

                <td className="px-3 py-2">
                  <span className="flex flex-wrap gap-1.5">
                    {row.stops.map((stop, index) => {
                      const tyre = compound(stop.compound);
                      return (
                        <span
                          key={`${stop.lap}-${index}`}
                          className="inline-flex items-center gap-1 rounded-md border border-line bg-bg px-1.5 py-0.5 text-[0.62rem]"
                          title={`اللفّة ${stop.lap} — خرج على ${tyre.label}`}
                        >
                          <span className="tnum text-subtle">ل{stop.lap}</span>
                          <span
                            className="inline-grid size-3.5 place-items-center rounded-full border text-[0.45rem] font-bold"
                            style={{ borderColor: tyre.colour, color: tyre.colour }}
                          >
                            {tyre.short}
                          </span>
                          {stop.laneSeconds !== null && (
                            <span className="tnum text-muted">{stop.laneSeconds.toFixed(1)}s</span>
                          )}
                        </span>
                      );
                    })}
                  </span>
                </td>

                <td className="tnum px-3 py-2 text-end font-display font-bold">
                  {row.stops.length}
                </td>

                <td className="tnum px-3 py-2 text-end text-xs text-muted" dir="ltr">
                  {row.bestLaneSeconds !== null ? `${row.bestLaneSeconds.toFixed(1)}s` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
