'use client';

import { useEffect, useState } from 'react';

import type { Race } from '@/lib/types';

/**
 * عدّاد السباق القادم.
 *
 * الوقت يُحسب في المتصفح بتوقيت جهاز الزائر — لا نفترض أنه في السعودية.
 * قبل أول تشغيل للعدّاد نعرض شرطات بدل أرقام مؤقتة، فلا يظهر خطأ ترطيب
 * (hydration mismatch) ولا يومض رقم غلط أمام القارئ.
 */

const UNITS = [
  { key: 'days', label: 'يوم' },
  { key: 'hours', label: 'ساعة' },
  { key: 'minutes', label: 'دقيقة' },
  { key: 'seconds', label: 'ثانية' },
] as const;

type Remaining = Record<(typeof UNITS)[number]['key'], number>;

function remainingUntil(iso: string): Remaining | null {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return null;
  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff / 3_600_000) % 24),
    minutes: Math.floor((diff / 60_000) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

export function NextRaceCountdown({ race }: { race: Race }) {
  const [left, setLeft] = useState<Remaining | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setLeft(remainingUntil(race.startsAt));
    setReady(true);
    const timer = setInterval(() => setLeft(remainingUntil(race.startsAt)), 1000);
    return () => clearInterval(timer);
  }, [race.startsAt]);

  const localTime = ready
    ? new Intl.DateTimeFormat('ar', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(race.startsAt))
    : null;

  return (
    <div className="speed-edge overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface/70 backdrop-blur-md">
      <div className="flex flex-col gap-6 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium tracking-wide text-red">
            الجولة {race.round} — السباق القادم
          </p>
          <h2 className="mt-1.5 truncate text-xl font-bold sm:text-2xl">{race.name}</h2>
          <p className="mt-1 text-sm text-muted">
            {race.circuit}
            {localTime && (
              <>
                <span className="mx-2 text-subtle">•</span>
                <span>{localTime} بتوقيتك</span>
              </>
            )}
          </p>
        </div>

        <div className="grid shrink-0 grid-cols-4 gap-2 sm:gap-3" role="timer" aria-live="off">
          {UNITS.map((unit) => (
            <div
              key={unit.key}
              className="min-w-[3.75rem] rounded-xl border border-line bg-bg/60 px-2 py-3 text-center"
            >
              <div className="tnum font-display text-2xl leading-none font-bold text-fg sm:text-3xl">
                {left ? String(left[unit.key]).padStart(2, '0') : '––'}
              </div>
              <div className="mt-1.5 text-[0.68rem] text-subtle">{unit.label}</div>
            </div>
          ))}
        </div>
      </div>

      {ready && !left && (
        <p className="border-t border-line bg-red/10 px-5 py-2.5 text-sm font-medium text-red">
          السباق جارٍ الآن أو انتهى
        </p>
      )}
    </div>
  );
}
