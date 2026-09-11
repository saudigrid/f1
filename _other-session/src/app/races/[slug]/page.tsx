import { notFound } from "next/navigation";
import type { Metadata } from "next";
import AdSlot from "@/components/ads/AdSlot";
import RaceCountdown from "@/components/race/RaceCountdown";
import { getRepo } from "@/lib/data/repo";
import { formatDate, formatTime } from "@/lib/format";

export const revalidate = 1800;

export async function generateStaticParams() {
  const repo = await getRepo();
  const races = await repo.listRaces();
  return races.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const repo = await getRepo();
  const race = await repo.getRace(slug);
  if (!race) return { title: "السباق غير موجود" };
  return {
    title: race.name,
    description: `${race.name} على حلبة ${race.circuit} — الموعد والنتائج والترتيب النهائي.`,
    alternates: { canonical: `/races/${race.slug}` },
  };
}

export default async function RacePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const repo = await getRepo();
  const race = await repo.getRace(slug);
  if (!race) notFound();

  const [drivers, teams] = await Promise.all([repo.listDrivers(), repo.listTeams()]);
  const driverById = new Map(drivers.map((d) => [d.id, d]));
  const teamById = new Map(teams.map((t) => [t.id, t]));

  return (
    <div className="page py-10">
      <header className="mb-8">
        <p className="text-xs uppercase tracking-[0.18em] text-text-faint">
          الجولة {race.round} · موسم {race.season}
        </p>
        <h1 className="mt-2 font-display text-[clamp(1.75rem,4.5vw,2.6rem)] font-black leading-tight">
          {race.name}
        </h1>
        <p className="mt-2 text-text-dim">
          {race.circuit} · {race.country}
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-6 rounded-lg border border-border bg-surface p-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-text-faint">
              انطلاق السباق (توقيت الرياض)
            </p>
            <p className="mt-1 font-display text-lg font-bold">
              {formatDate(race.startsAt)} · <span className="numeric">{formatTime(race.startsAt)}</span>
            </p>
          </div>
          {race.status === "upcoming" && <RaceCountdown startsAt={race.startsAt} />}
        </div>
      </header>

      <AdSlot placement="header-leaderboard" className="mb-8" />

      {race.results && race.results.length > 0 ? (
        <section>
          <h2 className="mb-4 font-display text-xl font-bold">
            <span className="speedbar" aria-hidden />
            النتيجة النهائية
          </h2>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="bg-surface text-start text-xs text-text-faint">
                <tr>
                  <th className="px-4 py-3 text-start font-medium">#</th>
                  <th className="px-4 py-3 text-start font-medium">السائق</th>
                  <th className="px-4 py-3 text-start font-medium">الفريق</th>
                  <th className="px-4 py-3 text-start font-medium">الزمن</th>
                  <th className="px-4 py-3 text-start font-medium">النقاط</th>
                </tr>
              </thead>
              <tbody>
                {race.results.map((row) => {
                  const driver = driverById.get(row.driverId);
                  const team = teamById.get(row.teamId);
                  return (
                    <tr key={row.driverId} className="border-t border-border">
                      <td className="numeric px-4 py-3 font-bold">{row.position}</td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-2">
                          <span
                            aria-hidden
                            className="h-5 w-[3px] rounded-full"
                            style={{ background: team?.color ?? "var(--border-strong)" }}
                          />
                          {driver?.name ?? row.driverId}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-text-dim">{team?.name ?? row.teamId}</td>
                      <td className="numeric px-4 py-3 text-text-dim">
                        {row.time ?? row.status ?? "—"}
                      </td>
                      <td className="numeric px-4 py-3 font-bold">{row.points}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <p className="rounded-lg border border-dashed border-border py-14 text-center text-text-dim">
          لم تُسجَّل نتائج هذا السباق بعد.
        </p>
      )}
    </div>
  );
}
