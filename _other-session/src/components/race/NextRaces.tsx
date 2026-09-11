import Link from "next/link";
import { getRepo } from "@/lib/data/repo";
import { formatDate, formatTime } from "@/lib/format";

/** أقرب 4 سباقات قادمة — قائمة مضغوطة للعمود الجانبي. */
export default async function NextRaces() {
  const repo = await getRepo();
  const now = Date.now();
  const upcoming = (await repo.listRaces())
    .filter((r) => Date.parse(r.startsAt) > now)
    .slice(0, 4);

  if (upcoming.length === 0) return null;

  return (
    <section className="card p-4">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="font-display text-base font-bold">
          <span className="speedbar" aria-hidden />
          السباقات القادمة
        </h2>
        <Link href="/races" className="text-xs text-text-dim transition-colors hover:text-accent">
          التقويم ←
        </Link>
      </div>

      <ul className="space-y-3">
        {upcoming.map((race) => (
          <li key={race.id}>
            <Link href={`/races/${race.slug}`} className="group flex items-baseline gap-3">
              <span className="numeric shrink-0 rounded border border-border px-1.5 py-0.5 text-xs font-bold text-text-faint">
                {String(race.round).padStart(2, "0")}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium transition-colors group-hover:text-accent">
                  {race.name}
                </span>
                <span className="block text-xs text-text-faint">
                  {formatDate(race.startsAt, { year: undefined })} · {formatTime(race.startsAt)}
                </span>
              </span>
              {race.isSprint && (
                <span className="shrink-0 rounded bg-accent-soft/15 px-1.5 py-0.5 text-[10px] font-bold text-accent">
                  سبرنت
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
