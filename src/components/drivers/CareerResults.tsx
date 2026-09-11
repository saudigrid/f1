import Link from 'next/link';

import { Flag } from '@/components/site/Flag';
import { isRetirement, positionLabel } from '@/lib/format';
import type { CareerResult } from '@/lib/data/history';

/**
 * ترتيب السائق في **كل** سباق قاده، مجمّعاً بالمواسم.
 *
 * لا اختصار ولا صفحات: هذا هو محتوى الصفحة نفسه، وقارئ يبحث عن نتيجة سباق
 * بعينه في 1998 لن يجدها خلف زرّ «عرض المزيد». المواسم الأحدث أولاً لأن
 * الأقرب زمنياً هو الأكثر طلباً.
 */

function medal(position: number | null): string {
  if (position === 1) return 'bg-red text-white';
  if (position === 2 || position === 3) return 'bg-surface-2 text-fg';
  return 'bg-bg text-muted';
}

export function CareerResults({ results }: { results: CareerResult[] }) {
  const seasons = new Map<number, CareerResult[]>();
  for (const result of results) {
    seasons.set(result.season, [...(seasons.get(result.season) ?? []), result]);
  }

  return (
    <div className="space-y-8">
      {[...seasons.entries()].map(([season, races]) => {
        const wins = races.filter((race) => race.position === 1).length;
        const best = races
          .map((race) => race.position)
          .filter((position): position is number => position !== null)
          .sort((a, b) => a - b)[0];

        return (
          <section key={season}>
            <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-line pb-2">
              <h3 className="tnum font-display text-xl font-bold text-red">{season}</h3>
              <p className="text-xs text-subtle">
                <span className="tnum">{races.length}</span> سباقاً
                {wins > 0 && (
                  <>
                    <span className="mx-1.5">·</span>
                    <span className="tnum font-semibold text-fg">{wins}</span> فوزاً
                  </>
                )}
                {wins === 0 && best !== undefined && (
                  <>
                    <span className="mx-1.5">·</span>
                    أفضل مركز <span className="tnum">{best}</span>
                  </>
                )}
              </p>
            </div>

            <ol className="space-y-1.5">
              {[...races]
                .sort((a, b) => a.round - b.round)
                .map((race) => (
                  <li
                    key={`${race.season}-${race.round}`}
                    className="flex items-center gap-3 rounded-lg border border-line/70 bg-surface px-3 py-2 text-sm"
                  >
                    <span
                      className={`tnum grid size-8 shrink-0 place-items-center rounded-lg font-display text-sm font-bold ${medal(race.position)}`}
                      title={isRetirement(race.positionText) ? positionLabel(race.positionText) : undefined}
                    >
                      {race.position ?? '—'}
                    </span>

                    <span className="flex min-w-0 items-center gap-2">
                      <Flag code={race.countryCode} />
                      <Link
                        href={`/circuits/${race.circuitId}`}
                        className="truncate transition-colors hover:text-red"
                      >
                        {race.raceName}
                      </Link>
                    </span>

                    <span className="ms-auto flex shrink-0 items-center gap-3 text-xs">
                      {isRetirement(race.positionText) ? (
                        <span className="text-subtle">{positionLabel(race.positionText)}</span>
                      ) : (
                        race.points > 0 && (
                          <span className="tnum text-subtle">{race.points} نقطة</span>
                        )
                      )}
                      <span className="hidden text-subtle sm:inline" dir="ltr">
                        {race.constructorName}
                      </span>
                    </span>
                  </li>
                ))}
            </ol>
          </section>
        );
      })}
    </div>
  );
}
