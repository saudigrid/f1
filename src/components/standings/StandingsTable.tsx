'use client';

import { useState } from 'react';

import type { Driver, Standings, StandingRow, Team } from '@/lib/types';

/**
 * جدول الترتيب بتبويبَي السائقين والصانعين.
 *
 * الجدول يمرّر أفقياً داخل حاويته على الشاشات الضيقة — الصفحة نفسها لا
 * تتحرك أفقياً أبداً، وهذا فرق مهم على الجوال.
 */
export function StandingsTable({
  standings,
  drivers,
  teams,
  limit,
}: {
  standings: Standings;
  drivers: Driver[];
  teams: Team[];
  limit?: number;
}) {
  const [tab, setTab] = useState<'drivers' | 'constructors'>('drivers');

  const driverById = new Map(drivers.map((d) => [d.id, d]));
  const teamById = new Map(teams.map((t) => [t.id, t]));

  const rows = (tab === 'drivers' ? standings.drivers : standings.constructors).slice(
    0,
    limit ?? undefined,
  );

  function labelFor(row: StandingRow): { name: string; sub: string; color: string } {
    if (tab === 'drivers') {
      const driver = driverById.get(row.entityId);
      const team = driver ? teamById.get(driver.teamId) : undefined;
      return {
        name: driver?.name ?? row.entityId,
        sub: team?.name ?? '',
        color: team?.color ?? 'var(--border-strong)',
      };
    }
    const team = teamById.get(row.entityId);
    return {
      name: team?.name ?? row.entityId,
      sub: team?.powerUnit ?? '',
      color: team?.color ?? 'var(--border-strong)',
    };
  }

  return (
    <div className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface">
      <div
        className="flex items-center gap-1 border-b border-line p-1.5"
        role="tablist"
        aria-label="نوع الترتيب"
      >
        {(
          [
            ['drivers', 'السائقون'],
            ['constructors', 'الصانعون'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
              tab === key ? 'bg-red text-white' : 'text-muted hover:text-fg'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[22rem] text-sm">
          <thead>
            <tr className="border-b border-line text-xs text-subtle">
              <th scope="col" className="w-12 px-3 py-2.5 text-center font-medium">
                #
              </th>
              <th scope="col" className="px-2 py-2.5 text-start font-medium">
                {tab === 'drivers' ? 'السائق' : 'الفريق'}
              </th>
              <th scope="col" className="w-16 px-3 py-2.5 text-center font-medium">
                فوز
              </th>
              <th scope="col" className="w-20 px-3 py-2.5 text-center font-medium">
                نقاط
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const { name, sub, color } = labelFor(row);
              return (
                <tr
                  key={row.entityId}
                  className="border-b border-line/60 transition-colors last:border-0 hover:bg-surface-2"
                >
                  <td className="tnum px-3 py-3 text-center font-display text-base font-semibold text-muted">
                    {row.position}
                  </td>
                  <td className="px-2 py-3">
                    <div className="flex items-center gap-2.5">
                      {/* شريط لون الفريق — تمييز لا خلفية، ليبقى النص مقروءاً */}
                      <span
                        className="h-7 w-[3px] shrink-0 rounded-full"
                        style={{ background: color }}
                        aria-hidden="true"
                      />
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">{name}</span>
                        {sub && <span className="block truncate text-xs text-subtle">{sub}</span>}
                      </span>
                    </div>
                  </td>
                  <td className="tnum px-3 py-3 text-center text-muted">{row.wins}</td>
                  <td className="tnum px-3 py-3 text-center font-display text-base font-bold">
                    {row.points}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
