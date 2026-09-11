import Link from "next/link";
import { getRepo } from "@/lib/data/repo";

/**
 * ملخص الترتيب للصفحة الرئيسية — أول 5 سائقين.
 * كل صف يحمل شريطاً بلون فريق السائق كإشارة بصرية سريعة.
 */
export default async function StandingsWidget() {
  const repo = await getRepo();
  const [standings, drivers, teams] = await Promise.all([
    repo.getStandings(),
    repo.listDrivers(),
    repo.listTeams(),
  ]);

  if (!standings) return null;

  const driverById = new Map(drivers.map((d) => [d.id, d]));
  const teamById = new Map(teams.map((t) => [t.id, t]));
  const top = standings.drivers.slice(0, 5);
  const leaderPoints = top[0]?.points || 1;

  return (
    <section className="card p-4">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="font-display text-base font-bold">
          <span className="speedbar" aria-hidden />
          ترتيب السائقين
        </h2>
        <Link href="/standings" className="text-xs text-text-dim transition-colors hover:text-accent">
          الجدول كامل ←
        </Link>
      </div>

      <ol className="space-y-1">
        {top.map((row) => {
          const driver = driverById.get(row.entityId);
          const team = driver ? teamById.get(driver.teamId) : undefined;
          const width = Math.max(8, (row.points / leaderPoints) * 100);

          return (
            <li key={row.entityId} className="relative overflow-hidden rounded">
              {/* شريط النقاط النسبي في الخلفية */}
              <span
                aria-hidden
                className="absolute inset-y-0 start-0 opacity-[0.13]"
                style={{ width: `${width}%`, background: team?.color ?? "var(--text-dim)" }}
              />
              <div className="relative flex items-center gap-3 px-2 py-2">
                <span className="numeric w-5 text-sm font-bold text-text-faint">
                  {row.position}
                </span>
                <span
                  aria-hidden
                  className="h-6 w-[3px] shrink-0 rounded-full"
                  style={{ background: team?.color ?? "var(--border-strong)" }}
                />
                <span className="flex-1 truncate text-sm font-medium">
                  {driver?.name ?? row.entityId}
                </span>
                <span className="truncate text-xs text-text-faint max-sm:hidden">
                  {team?.name}
                </span>
                <span className="numeric text-sm font-bold">{row.points}</span>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
