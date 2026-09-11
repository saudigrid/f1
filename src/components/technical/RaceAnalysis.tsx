'use client';

import { useMemo, useState } from 'react';

import type { RaceAnalysis } from '@/lib/data/history';

/**
 * تحليل السباق الأخير — ثلاث قراءات للنتيجة نفسها.
 *
 * ## لماذا ثلاث لوحات لا جدول واحد
 *
 * الجدول الخام يجيب سؤالاً واحداً: «من فاز؟». أما الأسئلة التي تصنع التحليل
 * فمختلفة: **من ربح مراكز؟** و**متى دخل الجميع للإطارات؟** و**من كان أسرع
 * فعلاً بغضّ النظر عن ترتيبه؟**. كل لوحة تجيب واحداً منها بنفس البيانات.
 *
 * الحساب كله في المتصفّح من بيانات مُرسَلة مرة واحدة — التبديل بين اللوحات
 * فوري بلا أي نداء.
 */

type Panel = 'result' | 'strategy' | 'pace';

const PANELS: { id: Panel; label: string; hint: string }[] = [
  { id: 'result', label: 'النتيجة', hint: 'الترتيب والفوارق والمراكز المكسوبة' },
  { id: 'strategy', label: 'الاستراتيجية', hint: 'متى توقّف كل سائق، وكم مرة' },
  { id: 'pace', label: 'الإيقاع', hint: 'أسرع لفة لكل سائق' },
];

function formatGap(millis: number | null): string {
  if (millis === null) return '';
  const seconds = millis / 1000;
  if (seconds < 60) return `+${seconds.toFixed(3)}`;
  const minutes = Math.floor(seconds / 60);
  return `+${minutes}:${(seconds % 60).toFixed(3).padStart(6, '0')}`;
}

export function RaceAnalysisPanels({ race }: { race: RaceAnalysis }) {
  const [panel, setPanel] = useState<Panel>('result');

  const byDriver = useMemo(() => {
    const map = new Map<string, { name: string; code: string | null; stops: number[] }>();
    for (const row of race.results) {
      map.set(row.driverId, { name: row.driverName, code: row.code, stops: [] });
    }
    for (const stop of race.pitStops) {
      map.get(stop.driverId)?.stops.push(stop.lap);
    }
    for (const entry of map.values()) entry.stops.sort((a, b) => a - b);
    return map;
  }, [race]);

  /** ترتيب الإيقاع: الأسرع لفةً أولاً، ومن بلا لفّة مسجّلة في الآخر. */
  const byPace = useMemo(
    () =>
      [...race.results]
        .filter((row) => row.fastestLapTime)
        .sort((a, b) => (a.fastestLapRank ?? 99) - (b.fastestLapRank ?? 99)),
    [race],
  );

  const maxStops = Math.max(1, ...[...byDriver.values()].map((entry) => entry.stops.length));

  return (
    <div className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface">
      {/* أزرار التبديل */}
      <div className="flex border-b border-line" role="tablist" aria-label="لوحات التحليل">
        {PANELS.map((item) => {
          const active = panel === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setPanel(item.id)}
              className={`relative flex-1 px-3 py-3 text-sm font-semibold transition-colors ${
                active ? 'text-fg' : 'text-muted hover:text-fg'
              }`}
            >
              {item.label}
              {active && <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-red" />}
            </button>
          );
        })}
      </div>

      <p className="border-b border-line bg-bg/40 px-4 py-2 text-xs text-subtle">
        {PANELS.find((item) => item.id === panel)?.hint}
      </p>

      {/* ── النتيجة ─────────────────────────────── */}
      {panel === 'result' && (
        <ol className="divide-y divide-line">
          {race.results.map((row) => (
            <li key={row.driverId} className="flex items-center gap-3 px-4 py-2.5 text-sm">
              <span
                className={`tnum grid size-7 shrink-0 place-items-center rounded-lg font-display text-xs font-bold ${
                  row.position === 1
                    ? 'bg-red text-white'
                    : row.position !== null && row.position <= 3
                      ? 'bg-surface-2 text-fg'
                      : 'bg-bg text-muted'
                }`}
              >
                {row.position ?? '—'}
              </span>

              <span className="min-w-0 flex-1 truncate font-semibold">{row.driverName}</span>

              <span className="hidden shrink-0 text-xs text-subtle sm:inline" dir="ltr">
                {row.constructorName}
              </span>

              {/* المراكز المكسوبة — أوضح رقم في الجدول */}
              {row.gained !== null && row.gained !== 0 && (
                <span
                  className={`tnum shrink-0 text-xs font-bold ${
                    row.gained > 0 ? 'text-emerald-400' : 'text-red'
                  }`}
                  title={row.gained > 0 ? 'مراكز مكسوبة' : 'مراكز مفقودة'}
                >
                  {row.gained > 0 ? `▲${row.gained}` : `▼${Math.abs(row.gained)}`}
                </span>
              )}

              <span className="tnum w-24 shrink-0 text-end text-xs text-muted" dir="ltr">
                {row.position === 1
                  ? row.time
                  : row.gapMillis !== null
                    ? formatGap(row.gapMillis)
                    : row.status}
              </span>
            </li>
          ))}
        </ol>
      )}

      {/* ── الاستراتيجية ────────────────────────── */}
      {panel === 'strategy' &&
        (race.pitStops.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted">
            لا بيانات توقّفات منشورة لهذا السباق.
          </p>
        ) : (
          <ol className="divide-y divide-line">
            {race.results.map((row) => {
              const entry = byDriver.get(row.driverId);
              if (!entry) return null;

              return (
                <li key={row.driverId} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="w-11 shrink-0 truncate text-xs font-bold" dir="ltr">
                    {row.code ?? row.driverId.slice(0, 3).toUpperCase()}
                  </span>

                  {/* شريط اللفّات مع علامات التوقّف في مواضعها الحقيقية */}
                  <span className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-bg">
                    <span className="absolute inset-y-0 start-0 w-full bg-surface-2" />
                    {entry.stops.map((lap, index) => (
                      <span
                        key={`${lap}-${index}`}
                        className="absolute top-1/2 size-2.5 -translate-y-1/2 rounded-full bg-red ring-2 ring-surface"
                        style={{ insetInlineStart: `${(lap / Math.max(race.totalLaps, 1)) * 100}%` }}
                        title={`توقّف ${index + 1} — اللفة ${lap}`}
                      />
                    ))}
                  </span>

                  <span className="tnum w-16 shrink-0 text-end text-xs text-muted">
                    {entry.stops.length === 0
                      ? 'بلا توقّف'
                      : `${entry.stops.length} من ${maxStops}`}
                  </span>
                </li>
              );
            })}
          </ol>
        ))}

      {/* ── الإيقاع ─────────────────────────────── */}
      {panel === 'pace' &&
        (byPace.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted">
            لا بيانات أسرع لفة لهذا السباق.
          </p>
        ) : (
          <ol className="divide-y divide-line">
            {byPace.map((row, index) => (
              <li key={row.driverId} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <span className="tnum w-6 shrink-0 text-xs text-subtle">{index + 1}</span>
                <span className="min-w-0 flex-1 truncate font-semibold">{row.driverName}</span>
                <span
                  className={`tnum shrink-0 font-display text-sm ${
                    index === 0 ? 'font-bold text-red' : 'text-muted'
                  }`}
                  dir="ltr"
                >
                  {row.fastestLapTime}
                </span>
              </li>
            ))}
          </ol>
        ))}
    </div>
  );
}
