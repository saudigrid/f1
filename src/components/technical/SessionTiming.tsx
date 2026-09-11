'use client';

import { useState } from 'react';

import { compound } from '@/lib/data/compounds';
import type { TimingRow, WeekendSession } from '@/lib/data/openf1';

/**
 * أداء السائقين في كل جلسة من جلسات العطلة.
 *
 * الجلسات معروضة **بترتيب وقوعها**: تجربة أولى ثم ثانية ثم ثالثة، ثم التأهّل
 * أو السبرنت حسب صيغة العطلة، ثم السباق. القارئ يتتبّع تطوّر الإيقاع عبر
 * نهاية الأسبوع لا نتيجة واحدة معزولة.
 *
 * ألوان القطاعات هي لغة الرياضة نفسها: **بنفسجي** أسرع زمن في الجلسة كلها،
 * **أخضر** أفضل زمن شخصي للسائق. من يقرأ التوقيت الرسمي يفهمها بلا شرح.
 */

function formatLap(value: number | null): string {
  if (value === null) return '—';
  const minutes = Math.floor(value / 60);
  const rest = (value % 60).toFixed(3).padStart(6, '0');
  return minutes > 0 ? `${minutes}:${rest}` : rest;
}

function formatGap(value: number | null): string {
  if (value === null || value === 0) return '';
  return `+${value.toFixed(3)}`;
}

const SECTOR_CLASS: Record<string, string> = {
  purple: 'text-fuchsia-400',
  green: 'text-emerald-400',
  plain: 'text-muted',
};

export function SessionTiming({
  sessions,
  timings,
}: {
  sessions: WeekendSession[];
  /** لوحة كل جلسة، مفهرسة بمفتاح الجلسة. */
  timings: Record<number, TimingRow[]>;
}) {
  // آخر جلسة (السباق عادةً) هي الافتراضية — هي ما يبحث عنه القارئ أولاً
  const [active, setActive] = useState(sessions[sessions.length - 1]?.key ?? 0);
  const rows = timings[active] ?? [];

  return (
    <div className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface">
      <div className="flex flex-wrap border-b border-line" role="tablist">
        {sessions.map((session) => {
          const on = session.key === active;
          return (
            <button
              key={session.key}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setActive(session.key)}
              className={`relative flex-1 px-3 py-3 text-xs font-semibold whitespace-nowrap transition-colors sm:text-sm ${
                on ? 'text-fg' : 'text-muted hover:text-fg'
              }`}
            >
              {session.label}
              {on && <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-red" />}
            </button>
          );
        })}
      </div>

      {/* مفتاح ألوان القطاعات */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-b border-line bg-bg/40 px-4 py-2 text-[0.68rem]">
        <span className="text-subtle">القطاعات:</span>
        <span className="text-fuchsia-400">■ الأسرع في الجلسة</span>
        <span className="text-emerald-400">■ أفضل زمن شخصي</span>
      </div>

      {rows.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-muted">
          لا بيانات توقيت منشورة لهذه الجلسة.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-line text-[0.68rem] text-subtle">
                <th className="px-3 py-2 text-start font-medium">#</th>
                <th className="px-3 py-2 text-start font-medium">السائق</th>
                <th className="px-3 py-2 text-end font-medium">أفضل لفة</th>
                <th className="px-3 py-2 text-end font-medium">الفارق</th>
                <th className="px-3 py-2 text-end font-medium">ق1</th>
                <th className="px-3 py-2 text-end font-medium">ق2</th>
                <th className="px-3 py-2 text-end font-medium">ق3</th>
                <th className="px-3 py-2 text-end font-medium">سرعة</th>
                <th className="px-3 py-2 text-end font-medium">الإطار</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const tyre = compound(row.compound);
                return (
                  <tr key={row.number} className="border-b border-line/60 last:border-0">
                    <td className="tnum px-3 py-2 text-subtle">{row.position}</td>
                    <td className="px-3 py-2">
                      <span className="flex items-center gap-2">
                        {/* شريط لون الفريق — يجمع زميلَي الفريق بصرياً */}
                        <span
                          className="h-4 w-1 shrink-0 rounded-full"
                          style={{ background: row.colour ?? 'var(--fg-subtle)' }}
                        />
                        <span className="font-bold" dir="ltr">
                          {row.acronym}
                        </span>
                        <span className="hidden text-xs text-subtle sm:inline" dir="ltr">
                          {row.team}
                        </span>
                      </span>
                    </td>
                    <td className="tnum px-3 py-2 text-end font-display" dir="ltr">
                      {formatLap(row.bestLap)}
                    </td>
                    <td className="tnum px-3 py-2 text-end text-xs text-muted" dir="ltr">
                      {formatGap(row.gap)}
                    </td>
                    {row.sectors.map((sector, index) => (
                      <td
                        key={index}
                        className={`tnum px-3 py-2 text-end text-xs ${SECTOR_CLASS[sector.rank]}`}
                        dir="ltr"
                      >
                        {sector.seconds === null ? '—' : sector.seconds.toFixed(3)}
                      </td>
                    ))}
                    <td className="tnum px-3 py-2 text-end text-xs text-muted" dir="ltr">
                      {row.speedTrap ? `${row.speedTrap}` : '—'}
                    </td>
                    <td className="px-3 py-2 text-end">
                      <span
                        className="inline-grid size-6 place-items-center rounded-full border-2 text-[0.6rem] font-bold"
                        style={{ borderColor: tyre.colour, color: tyre.colour }}
                        title={tyre.label}
                      >
                        {tyre.short}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
