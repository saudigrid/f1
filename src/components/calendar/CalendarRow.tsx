import Link from 'next/link';

import { Flag } from '@/components/site/Flag';
import type { CalendarRace } from '@/lib/data/history';
import { sessionLabel } from '@/lib/data/ics';

import { LocalTime } from './LocalTime';

/**
 * جولة واحدة في الروزنامة، بكل جلساتها.
 *
 * الأوقات تُعرض **بتوقيت الزائر المحلّي** لا بتوقيت الحلبة: من يفتح الصفحة
 * يريد أن يعرف متى يجلس أمام الشاشة، لا كم الساعة في ملبورن. والتحويل يجري
 * في المتصفّح عبر `toLocaleTimeString`، فيصحّ لكل زائر بلا إعداد.
 */

const DAY = new Intl.DateTimeFormat('ar', { day: 'numeric', month: 'short', numberingSystem: 'latn' });

function formatDay(iso: string): string {
  return DAY.format(new Date(`${iso}T12:00:00Z`));
}

export function CalendarRow({ race, past }: { race: CalendarRace; past: boolean }) {
  const raceSession = race.sessions.find((session) => session.kind === 'race');
  const weekendStart = race.sessions[0]?.date ?? race.date;

  return (
    <li
      className={`overflow-hidden rounded-[var(--radius-card)] border bg-surface transition-colors ${
        past ? 'border-line opacity-70 hover:opacity-100' : 'border-line hover:border-line-strong'
      }`}
    >
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
        <span className="tnum grid size-11 shrink-0 place-items-center rounded-xl border border-line bg-bg font-display text-lg font-bold text-muted">
          {race.round}
        </span>

        <div className="min-w-0 flex-1">
          <h3 className="flex items-center gap-2 font-bold">
            <Flag code={race.countryCode} name={race.country} />
            <span className="truncate">{race.name}</span>
            {race.hasSprint && (
              <span className="shrink-0 rounded bg-red/15 px-1.5 py-0.5 text-[0.6rem] font-bold text-red">
                سبرنت
              </span>
            )}
          </h3>
          <p className="mt-0.5 truncate text-xs text-subtle">
            <Link href={`/circuits/${race.circuitId}`} className="hover:text-red">
              {race.circuitName}
            </Link>
            <span className="mx-1.5">·</span>
            {race.locality}
          </p>
        </div>

        <p className="tnum shrink-0 text-sm text-muted sm:text-end">
          {formatDay(weekendStart)}
          {weekendStart !== race.date && <> – {formatDay(race.date)}</>}
        </p>
      </div>

      {/* الجلسات: أوقات محلية يحسبها المتصفّح */}
      {race.sessions.length > 1 && (
        <ol className="flex flex-wrap gap-x-5 gap-y-1.5 border-t border-line bg-bg/40 px-4 py-2.5 text-xs">
          {race.sessions.map((session) => (
            <li key={session.kind} className="flex items-center gap-1.5">
              <span
                className={
                  session.kind === 'race' || session.kind === 'sprint'
                    ? 'font-semibold text-fg'
                    : 'text-subtle'
                }
              >
                {sessionLabel(session.kind)}
              </span>
              {session.startsAt ? (
                <LocalTime iso={session.startsAt} />
              ) : (
                <span className="text-subtle">—</span>
              )}
            </li>
          ))}
        </ol>
      )}

      {raceSession?.startsAt && !past && (
        <div className="border-t border-line px-4 py-2 text-[0.68rem] text-subtle">
          الأوقات بتوقيتك المحلّي
        </div>
      )}
    </li>
  );
}
