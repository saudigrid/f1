import { COMPOUNDS, LEGEND_COMPOUNDS, compound } from '@/lib/data/compounds';
import type { TimingRow } from '@/lib/data/openf1';

/**
 * استراتيجية الإطارات — شريط لكل سائق مقسوم بالمركّبات التي استخدمها.
 *
 * عرض كل قطعة **يتناسب مع عدد لفّاتها**، فيُقرأ الشريط كخطّ زمني للسباق لا
 * كقائمة. من مرّ على ثلاثة مركّبات يظهر شريطه ثلاثي الألوان بمقاسات مختلفة،
 * وتُرى الاستراتيجية المختلفة عن الآخرين فوراً بلا قراءة أرقام.
 *
 * مفتاح الألوان فوق اللوحة لا تحتها: القارئ يحتاج معنى اللون **قبل** أن يرى
 * الأشرطة، لا بعدها.
 */
export function TyreStrategy({ rows, totalLaps }: { rows: TimingRow[]; totalLaps: number }) {
  const withStints = rows.filter((row) => row.stints.length > 0);

  if (withStints.length === 0) {
    return (
      <p className="rounded-[var(--radius-card)] border border-dashed border-line px-6 py-10 text-center text-sm text-muted">
        لا بيانات إطارات منشورة لهذا السباق.
      </p>
    );
  }

  const laps = Math.max(totalLaps, 1);

  return (
    <div className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface">
      {/* المفتاح أولاً — معنى اللون قبل رؤية الأشرطة */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-line bg-bg/40 px-4 py-3">
        {LEGEND_COMPOUNDS.map((key) => {
          const item = COMPOUNDS[key];
          return (
            <span key={key} className="flex items-center gap-2 text-xs">
              <span
                className="inline-grid size-5 place-items-center rounded-full border-2 text-[0.55rem] font-bold"
                style={{ borderColor: item.colour, color: item.colour }}
              >
                {item.short}
              </span>
              <span className="font-semibold">{item.label}</span>
              <span className="hidden text-subtle sm:inline">— {item.note}</span>
            </span>
          );
        })}
      </div>

      <ol className="divide-y divide-line/60">
        {withStints.map((row) => (
          <li key={row.number} className="flex items-center gap-3 px-4 py-2.5">
            <span className="flex w-16 shrink-0 items-center gap-2">
              <span
                className="h-4 w-1 shrink-0 rounded-full"
                style={{ background: row.colour ?? 'var(--fg-subtle)' }}
              />
              <span className="text-xs font-bold" dir="ltr">
                {row.acronym}
              </span>
            </span>

            <span className="flex h-5 flex-1 overflow-hidden rounded-md bg-bg" dir="ltr">
              {row.stints.map((stint, index) => {
                const tyre = compound(stint.compound);
                const length = Math.max(1, stint.to - stint.from + 1);
                return (
                  <span
                    key={`${stint.from}-${index}`}
                    className="grid place-items-center text-[0.55rem] font-bold text-black/70"
                    style={{
                      background: tyre.colour,
                      // النسبة من طول السباق — الشريط يصير خطّاً زمنياً
                      width: `${(length / laps) * 100}%`,
                    }}
                    title={`${tyre.label} · اللفّات ${stint.from}–${stint.to}`}
                  >
                    {length / laps > 0.08 ? length : ''}
                  </span>
                );
              })}
            </span>

            <span className="tnum w-14 shrink-0 text-end text-[0.68rem] text-subtle">
              {row.stints.length} {row.stints.length === 1 ? 'ستنت' : 'ستنتات'}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
