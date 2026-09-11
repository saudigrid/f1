'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import { TeamCrest } from '@/components/teams/TeamCrest';

/**
 * شبكة الفرق السابقة، مع بحث وتصفية.
 *
 * ## لماذا التصفية ضرورية لا زينة
 *
 * الفرق السابقة 165. منها ما يعرفه كل متابع — لوتس، برابهام، تايرل — ومنها
 * نحو سبعين صانعاً دخل **سباقاً واحداً** في الخمسينيات بسيارة صنعها في مرآب.
 * عرضها كلها بلا فرز يدفن لوتس بين «ستيبرو» و«تِك-مِك».
 *
 * فالترتيب بالأثر (ألقاب ← انتصارات ← مواسم)، والتصفية تسمح بقصر العرض على
 * من ترك أثراً. والبحث في الحروف العربية واللاتينية معاً لأن نصف الأسماء
 * لا مقابل عربياً لها أصلاً.
 *
 * ⚠️ كل شيء في المتصفّح: البيانات أُرسلت مرة واحدة، فالتصفية فورية بلا نداء.
 */

export interface FormerTeamCard {
  id: string;
  name: string;
  nameEn: string;
  nationality: string;
  firstSeason: number | null;
  lastSeason: number | null;
  seasonCount: number;
  wins: number;
  titles: number;
  logo: string | null;
  logoIsCustom: boolean;
  color: string | null;
}

type Filter = 'all' | 'champions' | 'winners';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'الكل' },
  { id: 'winners', label: 'أصحاب انتصارات' },
  { id: 'champions', label: 'أبطال الصانعين' },
];

export function FormerTeamsGrid({ teams }: { teams: FormerTeamCard[] }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return teams.filter((team) => {
      if (filter === 'champions' && team.titles === 0) return false;
      if (filter === 'winners' && team.wins === 0) return false;
      if (!needle) return true;
      return (
        team.name.toLowerCase().includes(needle) ||
        team.nameEn.toLowerCase().includes(needle) ||
        team.nationality.includes(needle)
      );
    });
  }, [teams, query, filter]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ابحث عن فريق…"
            aria-label="ابحث عن فريق"
            className="w-full rounded-xl border border-line bg-surface px-4 py-2.5 text-sm outline-none transition-colors placeholder:text-subtle focus:border-red"
          />
        </div>

        <div className="flex gap-1.5">
          {FILTERS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setFilter(option.id)}
              aria-pressed={filter === option.id}
              className={`rounded-xl border px-3 py-2 text-xs font-bold transition-colors ${
                filter === option.id
                  ? 'border-red bg-red text-white'
                  : 'border-line text-muted hover:text-fg'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <p className="mb-4 text-xs text-subtle">
        <span className="tnum">{shown.length}</span> فريقاً
      </p>

      {shown.length === 0 ? (
        <p className="rounded-[var(--radius-card)] border border-dashed border-line px-6 py-14 text-center text-muted">
          لا فريق يطابق البحث.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((team) => (
            <Link
              key={team.id}
              href={`/teams/former/${team.id}`}
              className="group relative flex gap-4 overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface p-4 transition-colors hover:border-line-strong"
            >
              <span
                className="absolute inset-y-0 start-0 w-1 transition-opacity group-hover:opacity-100"
                style={{ background: team.color ?? 'var(--line-strong)', opacity: team.color ? 0.9 : 0.5 }}
                aria-hidden="true"
              />

              <TeamCrest
                id={team.id}
                nameEn={team.nameEn}
                logo={team.logo}
                custom={team.logoIsCustom}
                color={team.color}
                height="h-14"
              />

              <div className="min-w-0 flex-1">
                <h2 className="truncate font-bold transition-colors group-hover:text-red">
                  {team.name}
                </h2>
                <p className="mt-0.5 truncate text-[0.7rem] text-subtle" dir="ltr">
                  {team.nameEn}
                </p>

                {/* من عام كم لعام كم — أبرز ما في البطاقة من الخارج */}
                <p className="tnum mt-2 font-display text-sm font-bold" dir="ltr">
                  {team.firstSeason ?? '—'} <span className="text-subtle">–</span>{' '}
                  {team.lastSeason ?? '—'}
                </p>

                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.68rem] text-subtle">
                  <span className="tnum">{team.seasonCount} موسماً</span>
                  {team.wins > 0 && (
                    <span className="tnum text-muted">
                      <span className="font-bold text-fg">{team.wins}</span> انتصاراً
                    </span>
                  )}
                  {team.titles > 0 && (
                    <span className="tnum rounded bg-red/15 px-1.5 py-0.5 font-bold text-red">
                      {team.titles} لقباً
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
