'use client';

import { useEffect, useState } from 'react';

import { TyreSpinner } from '@/components/site/TyreSpinner';
import type { LapGrid, TelemetryPoint } from '@/lib/data/openf1';

/**
 * مقارنة تيليمتري بين سائقين في لفّة يختارها القارئ.
 *
 * ثلاثة منحنيات فوق بعضها بمحور زمني مشترك: **السرعة** و**دوّاسة الوقود**
 * و**الفرامل**. هذا التراص مقصود — نقطة الكبح تُقرأ من تقاطع الثلاثة معاً:
 * السرعة تهبط، والدوّاسة تُرفع، والفرامل تُضغط في اللحظة نفسها. فصلُها في
 * ثلاثة رسوم منفصلة يُخفي بالضبط ما جئنا نراه.
 *
 * الرسم SVG خام بلا مكتبة: منحنى من نقاط هو `<path>` واحد، وإضافة مكتبة رسوم
 * لأجله تزيد الحزمة عشرات الكيلوبايتات بلا مقابل.
 */

const COLOURS = ['#e10600', '#00d2be'] as const;

interface Trace {
  driver: number;
  acronym: string;
  points: TelemetryPoint[];
}

function polyline(
  points: TelemetryPoint[],
  pick: (point: TelemetryPoint) => number,
  width: number,
  height: number,
  max: number,
): string {
  if (points.length < 2) return '';
  const span = points[points.length - 1].t - points[0].t || 1;
  const base = points[0].t;

  return points
    .map((point, index) => {
      const x = ((point.t - base) / span) * width;
      const y = height - (Math.min(pick(point), max) / max) * height;
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
}

function Chart({
  title,
  unit,
  max,
  traces,
  pick,
}: {
  title: string;
  unit: string;
  max: number;
  traces: Trace[];
  pick: (point: TelemetryPoint) => number;
}) {
  const W = 800;
  const H = 120;

  return (
    <figure className="rounded-xl border border-line bg-bg/40 p-3">
      <figcaption className="mb-2 flex items-baseline justify-between text-xs">
        <span className="font-semibold">{title}</span>
        <span className="tnum text-subtle">
          0–{max} {unit}
        </span>
      </figcaption>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none" role="img">
        {/* خطوط قياس أفقية — مرجع بصري بلا محور كامل */}
        {[0.25, 0.5, 0.75].map((fraction) => (
          <line
            key={fraction}
            x1="0"
            x2={W}
            y1={H * fraction}
            y2={H * fraction}
            stroke="var(--fg-subtle)"
            strokeWidth="0.5"
            opacity="0.2"
          />
        ))}

        {traces.map((trace, index) => (
          <path
            key={trace.driver}
            d={polyline(trace.points, pick, W, H, max)}
            fill="none"
            stroke={COLOURS[index] ?? 'var(--fg-subtle)'}
            strokeWidth="1.6"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
    </figure>
  );
}

export function TelemetryCompare({
  sessionKey,
  grid,
}: {
  sessionKey: number;
  grid: LapGrid;
}) {
  const top = grid.drivers.filter((driver) => driver.best !== null);

  const [a, setA] = useState(top[0]?.number ?? 0);
  const [b, setB] = useState(top[1]?.number ?? 0);
  const [lap, setLap] = useState(grid.fastest?.lap ?? 1);
  const [traces, setTraces] = useState<Trace[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const chosen = [a, b].filter(Boolean);
    if (chosen.length === 0) return;

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const results = await Promise.all(
          chosen.map(async (number) => {
            const driver = grid.drivers.find((row) => row.number === number);
            const from = driver?.starts[lap - 1];
            if (!driver || !from) return null;

            const response = await fetch(
              `/api/telemetry?session=${sessionKey}&driver=${number}&from=${encodeURIComponent(from)}`,
              { signal: controller.signal },
            );
            if (!response.ok) return null;

            const data = (await response.json()) as { points: TelemetryPoint[] };
            return { driver: number, acronym: driver.acronym, points: data.points };
          }),
        );

        const usable = results.filter((row): row is Trace => row !== null && row.points.length > 1);
        setTraces(usable);
        if (usable.length === 0) setError('لا بيانات تيليمتري لهذه اللفّة.');
      } catch (caught) {
        if ((caught as Error).name !== 'AbortError') setError('تعذّر جلب البيانات.');
      } finally {
        setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [a, b, lap, sessionKey, grid.drivers]);

  const laps = Array.from({ length: grid.totalLaps }, (_, index) => index + 1);

  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-surface p-4">
      {/* أدوات الاختيار */}
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        {[
          { value: a, set: setA, label: 'السائق الأول', colour: COLOURS[0] },
          { value: b, set: setB, label: 'السائق الثاني', colour: COLOURS[1] },
        ].map((control) => (
          <label key={control.label} className="text-xs">
            <span className="mb-1 flex items-center gap-1.5 text-subtle">
              <span className="size-2 rounded-full" style={{ background: control.colour }} />
              {control.label}
            </span>
            <select
              value={control.value}
              onChange={(event) => control.set(Number(event.target.value))}
              className="w-full rounded-lg border border-line bg-bg px-2.5 py-2 text-sm outline-none focus:border-red"
            >
              <option value={0}>— بلا —</option>
              {top.map((driver) => (
                <option key={driver.number} value={driver.number}>
                  {driver.acronym} · {driver.team}
                </option>
              ))}
            </select>
          </label>
        ))}

        <label className="text-xs">
          <span className="mb-1 block text-subtle">اللفّة</span>
          <select
            value={lap}
            onChange={(event) => setLap(Number(event.target.value))}
            className="tnum w-full rounded-lg border border-line bg-bg px-2.5 py-2 text-sm outline-none focus:border-red"
          >
            {laps.map((number) => (
              <option key={number} value={number}>
                {number}
                {grid.fastest?.lap === number ? ' — الأسرع' : ''}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading && (
        <div className="grid place-items-center py-10">
          <TyreSpinner size={40} label="جارٍ جلب التيليمتري" />
        </div>
      )}

      {!loading && error && <p className="py-8 text-center text-sm text-muted">{error}</p>}

      {!loading && !error && traces.length > 0 && (
        <>
          <div className="mb-3 flex flex-wrap gap-4 text-xs">
            {traces.map((trace, index) => (
              <span key={trace.driver} className="flex items-center gap-1.5">
                <span className="h-0.5 w-4" style={{ background: COLOURS[index] }} />
                <span className="font-bold" dir="ltr">
                  {trace.acronym}
                </span>
              </span>
            ))}
          </div>

          <div className="space-y-3">
            <Chart title="السرعة" unit="كم/س" max={360} traces={traces} pick={(p) => p.speed} />
            <Chart title="دوّاسة الوقود" unit="%" max={100} traces={traces} pick={(p) => p.throttle} />
            <Chart title="الفرامل" unit="%" max={100} traces={traces} pick={(p) => p.brake} />
          </div>

          <p className="mt-3 text-[0.68rem] leading-relaxed text-subtle">
            نقطة الكبح تُقرأ من المنحنيات الثلاثة معاً: السرعة تهبط، والدوّاسة تُرفع، والفرامل
            تُضغط في اللحظة نفسها.
          </p>
        </>
      )}
    </div>
  );
}
