'use client';

import { useMemo, useState } from 'react';

import type { LapGrid } from '@/lib/data/openf1';

/**
 * مقارنة أزمنة اللفّات بين السائقين.
 *
 * القارئ يختار **مدى لفّات** وسائقين، فيرى من كان أسرع في كل لفّة والفارق
 * بينهم. الأرقام كلها في المتصفّح أصلاً (أُرسلت مرة واحدة)، فالتبديل فوري بلا
 * أي نداء شبكة.
 *
 * ⚠️ المقارنة على **الفارق** لا على الزمن الخام. زمن اللفّة يتأثّر بالوقود
 * والإطارات والحركة المرورية، فرقمان متجاوران بلا مرجع لا يقولان شيئاً. أما
 * الفارق عن أسرع لفّة في تلك اللفّة نفسها فيقول من كان أسرع **في تلك اللحظة**
 * بظروفها.
 */

function formatLap(value: number | null): string {
  if (value === null) return '—';
  const minutes = Math.floor(value / 60);
  const rest = (value % 60).toFixed(3).padStart(6, '0');
  return minutes > 0 ? `${minutes}:${rest}` : rest;
}

const WINDOW = 15;

export function LapCompare({ grid }: { grid: LapGrid }) {
  const runners = grid.drivers.filter((driver) => driver.best !== null);

  const [selected, setSelected] = useState<number[]>(() =>
    runners.slice(0, 4).map((driver) => driver.number),
  );
  const [from, setFrom] = useState(1);

  const to = Math.min(from + WINDOW - 1, grid.totalLaps);
  const laps = useMemo(
    () => Array.from({ length: Math.max(0, to - from + 1) }, (_, index) => from + index),
    [from, to],
  );

  const rows = runners.filter((driver) => selected.includes(driver.number));

  /** أسرع زمن في كل لفّة عبر كل السائقين — مرجع الفارق. */
  const bestPerLap = useMemo(() => {
    const map = new Map<number, number>();
    for (const lap of laps) {
      const times = grid.drivers
        .map((driver) => driver.laps[lap - 1])
        .filter((value): value is number => value !== null);
      if (times.length > 0) map.set(lap, Math.min(...times));
    }
    return map;
  }, [laps, grid.drivers]);

  const toggle = (number: number) =>
    setSelected((current) =>
      current.includes(number)
        ? current.filter((value) => value !== number)
        : [...current, number].slice(-6), // ستّة سائقين حدّ ما يُقرأ في جدول
    );

  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-surface p-4">
      {/* اختيار السائقين */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        {runners.map((driver) => {
          const on = selected.includes(driver.number);
          return (
            <button
              key={driver.number}
              type="button"
              onClick={() => toggle(driver.number)}
              aria-pressed={on}
              className={`rounded-lg border px-2 py-1 text-xs font-bold transition-colors ${
                on ? 'border-transparent text-black' : 'border-line text-muted hover:text-fg'
              }`}
              style={on ? { background: driver.colour ?? 'var(--fg)' } : undefined}
              dir="ltr"
            >
              {driver.acronym}
            </button>
          );
        })}
      </div>

      {/* مدى اللفّات */}
      <div className="mb-4 flex items-center gap-3">
        <label className="flex flex-1 items-center gap-2 text-xs">
          <span className="shrink-0 text-subtle">من اللفّة</span>
          <input
            type="range"
            min={1}
            max={Math.max(1, grid.totalLaps - WINDOW + 1)}
            value={from}
            onChange={(event) => setFrom(Number(event.target.value))}
            className="flex-1 accent-[var(--red)]"
          />
        </label>
        <span className="tnum shrink-0 text-xs font-bold">
          {from}–{to}
        </span>
      </div>

      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">اختر سائقاً أو أكثر للمقارنة.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-line text-[0.66rem] text-subtle">
                <th className="px-2 py-2 text-start font-medium">لفّة</th>
                {rows.map((driver) => (
                  <th key={driver.number} className="px-2 py-2 text-end font-medium" dir="ltr">
                    <span className="flex items-center justify-end gap-1.5">
                      <span
                        className="size-2 rounded-full"
                        style={{ background: driver.colour ?? 'var(--fg-subtle)' }}
                      />
                      {driver.acronym}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {laps.map((lap) => {
                const reference = bestPerLap.get(lap) ?? null;
                return (
                  <tr key={lap} className="border-b border-line/50 last:border-0">
                    <td className="tnum px-2 py-1.5 text-subtle">{lap}</td>
                    {rows.map((driver) => {
                      const time = driver.laps[lap - 1];
                      const isBest = time !== null && reference !== null && time === reference;
                      const gap = time !== null && reference !== null ? time - reference : null;

                      return (
                        <td key={driver.number} className="px-2 py-1.5 text-end" dir="ltr">
                          {time === null ? (
                            <span className="text-subtle">—</span>
                          ) : (
                            <span className="tnum flex flex-col items-end leading-tight">
                              <span className={isBest ? 'font-bold text-fuchsia-400' : ''}>
                                {formatLap(time)}
                              </span>
                              {gap !== null && gap > 0 && (
                                <span className="text-[0.6rem] text-subtle">
                                  +{gap.toFixed(3)}
                                </span>
                              )}
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-3 text-[0.68rem] text-subtle">
        <span className="text-fuchsia-400">■</span> الأسرع في تلك اللفّة · الرقم الصغير هو الفارق
        عنه.
      </p>
    </div>
  );
}
