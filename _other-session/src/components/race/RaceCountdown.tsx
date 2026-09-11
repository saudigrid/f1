"use client";

import { useEffect, useState } from "react";

interface Parts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function partsUntil(target: number): Parts | null {
  const diff = target - Date.now();
  if (diff <= 0) return null;
  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff / 3_600_000) % 24),
    minutes: Math.floor((diff / 60_000) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

const UNITS: Array<[keyof Parts, string]> = [
  ["days", "يوم"],
  ["hours", "ساعة"],
  ["minutes", "دقيقة"],
  ["seconds", "ثانية"],
];

/**
 * عدّاد تنازلي حتى انطلاق السباق.
 *
 * لا يُحسب شيء أثناء التصيير على الخادم — القيمة تعتمد على ساعة الزائر،
 * وحسابها مسبقاً يسبب اختلافاً بين HTML الخادم والمتصفح.
 */
export default function RaceCountdown({ startsAt }: { startsAt: string }) {
  const [parts, setParts] = useState<Parts | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const target = Date.parse(startsAt);
    setMounted(true);
    setParts(partsUntil(target));
    const id = setInterval(() => setParts(partsUntil(target)), 1000);
    return () => clearInterval(id);
  }, [startsAt]);

  if (!mounted) {
    return <div className="h-[52px]" aria-hidden />;
  }

  if (!parts) {
    return (
      <div className="flex items-center gap-2 text-sm font-bold text-accent">
        <span className="live-dot" />
        انطلق السباق
      </div>
    );
  }

  return (
    <div className="flex gap-2" role="timer" aria-live="off">
      {UNITS.map(([key, label]) => (
        <div
          key={key}
          className="min-w-[52px] rounded border border-border bg-surface px-2 py-1.5 text-center"
        >
          <div className="numeric text-xl font-bold leading-none text-text">
            {String(parts[key]).padStart(2, "0")}
          </div>
          <div className="mt-1 text-[10px] text-text-faint">{label}</div>
        </div>
      ))}
    </div>
  );
}
