import constructorData from '@/data/constructors.json';
import customLogoData from '@/data/team-logos.json';
import historyData from '@/data/team-history.json';
import nationalityData from '@/data/i18n/nationalities.json';
import { canonicalTeamId } from '@/data/team-aliases';
import { TEAM_NAMES } from '@/data/team-names';
import { driverCard } from '@/lib/data/cards';
import type { ImageCredit } from '@/lib/types';

/**
 * ملفّات الفرق — تُقرأ من القرص، لا نداء شبكة.
 *
 * تجمع ثلاثة ملفات مزامنة في صورة واحدة: `constructors.json` (المدى والألقاب
 * والشعار)، و`team-history.json` (المواسم والسائقون والنتائج)، وأسماء العربية
 * والألوان من `team-names.ts`.
 */


/* ────────────────────────────────────────────────
   الأنواع
   ──────────────────────────────────────────────── */

interface ConstructorRow {
  id: string;
  name: string;
  nationality: string;
  wikipediaUrl: string;
  firstSeason: number | null;
  lastSeason: number | null;
  seasonCount: number;
  wins: number;
  titles: number[];
  active: boolean;
  engines: string | null;
  logo: string | null;
  logoCredit: ImageCredit | null;
}

interface HistoryDriver {
  id: string;
  nameEn: string;
  firstSeason: number;
  lastSeason: number;
  seasons: number;
  entries: number;
  wins: number;
  podiums: number;
  points: number;
}

interface HistoryRow {
  seasons: number[];
  entries: number;
  wins: number;
  podiums: number;
  poles: number;
  points: number;
  bestFinish: number | null;
  firstWin: { season: number; round: number; race: string } | null;
  lastWin: { season: number; round: number; race: string } | null;
  drivers: HistoryDriver[];
}

export interface TeamDriver {
  id: string;
  name: string;
  nameEn: string;
  image: string | null;
  firstSeason: number;
  lastSeason: number;
  entries: number;
  wins: number;
  podiums: number;
  points: number;
}

export interface TeamProfile {
  id: string;
  name: string;
  nameEn: string;
  nationality: string;
  countryCode: string | null;
  active: boolean;
  /** المواسم التي خاض فيها سباقاً فعلاً — مرتّبة تصاعدياً. */
  seasons: number[];
  firstSeason: number | null;
  lastSeason: number | null;
  seasonCount: number;
  /** فترات متّصلة: رينو 1977–1985 ثم 2002–2011 ثم 2016–2020. */
  spans: [number, number][];
  entries: number;
  wins: number;
  podiums: number;
  poles: number;
  points: number;
  bestFinish: number | null;
  titles: number[];
  firstWin: HistoryRow['firstWin'];
  lastWin: HistoryRow['lastWin'];
  engines: string | null;
  logo: string | null;
  logoCredit: ImageCredit | null;
  /** شعار أضافه المحرّر — بلاطة رسمية تحمل خلفيتها. */
  logoIsCustom: boolean;
  color: string | null;
  wikipediaUrl: string;
  drivers: TeamDriver[];
  /** معرّفات Ergast التي دُمجت في هذا الملفّ. */
  merged: string[];
}

const constructors = constructorData as ConstructorRow[];
const history = historyData as Record<string, HistoryRow>;
const nationalities = nationalityData as Record<string, { ar: string; code: string }>;

/**
 * شعارات يضيفها المحرّر بيده — تسبق كل ما تجده المزامنة.
 *
 * يضع الملف في `public/teams-custom/<المعرّف>.png` ثم يشغّل `npm run logos:sync`.
 * 63 فريقاً فقط من 214 لهم شعار حرّ على كومنز؛ البقية إمّا بلا شعار أصلاً أو
 * شعارها محميّ. حين يجد إنسانٌ الملف الصحيح، لا معنى لأن تنافسه خوارزمية —
 * والحكم اليدوي نهائي، تماماً كما في صور السائقين.
 */
const customLogos = customLogoData as Record<string, string>;

/* ────────────────────────────────────────────────
   البناء
   ──────────────────────────────────────────────── */

/** يجمع سنوات متتالية في فترات — الفجوة هي الخبر. */
function toSpans(seasons: number[]): [number, number][] {
  if (seasons.length === 0) return [];
  const spans: [number, number][] = [];
  let start = seasons[0];
  let previous = seasons[0];

  for (const season of seasons.slice(1)) {
    // فجوة موسم واحد لا تكسر الفترة — كثير من الفرق غابت سنة ثم عادت
    if (season - previous > 2) {
      spans.push([start, previous]);
      start = season;
    }
    previous = season;
  }
  spans.push([start, previous]);
  return spans;
}

function buildProfiles(): Map<string, TeamProfile> {
  /** كل معرّفات Ergast التي تؤول إلى معرّف قانوني واحد. */
  const groups = new Map<string, ConstructorRow[]>();
  for (const row of constructors) {
    const key = canonicalTeamId(row.id);
    const list = groups.get(key);
    if (list) list.push(row);
    else groups.set(key, [row]);
  }

  const profiles = new Map<string, TeamProfile>();

  for (const [id, rows] of groups) {
    /**
     * الصفّ الأساسي هو صاحب المعرّف القانوني إن وُجد، وإلّا فأطولها عمراً.
     * (بعض المركّبات موجودة بلا أصل: «إيغل-ويسلايك» بلا «إيغل» في بعض النسخ.)
     */
    const primary =
      rows.find((row) => row.id === id) ??
      [...rows].sort((a, b) => b.seasonCount - a.seasonCount)[0];

    const parts = rows
      .map((row) => history[row.id])
      .filter((row): row is HistoryRow => Boolean(row));

    const seasons = [...new Set(parts.flatMap((row) => row.seasons))].sort((a, b) => a - b);

    /** السائقون مجموعين عبر كل المعرّفات المدمجة. */
    const byDriver = new Map<string, HistoryDriver>();
    for (const part of parts) {
      for (const driver of part.drivers) {
        const existing = byDriver.get(driver.id);
        if (!existing) {
          byDriver.set(driver.id, { ...driver });
          continue;
        }
        existing.firstSeason = Math.min(existing.firstSeason, driver.firstSeason);
        existing.lastSeason = Math.max(existing.lastSeason, driver.lastSeason);
        existing.entries += driver.entries;
        existing.wins += driver.wins;
        existing.podiums += driver.podiums;
        existing.points += driver.points;
      }
    }

    const drivers: TeamDriver[] = [...byDriver.values()]
      .map((driver) => {
        const card = driverCard(driver.id);
        return {
          id: driver.id,
          name: card?.name ?? driver.nameEn,
          nameEn: driver.nameEn,
          image: card?.image ?? null,
          firstSeason: driver.firstSeason,
          lastSeason: driver.lastSeason,
          entries: driver.entries,
          wins: driver.wins,
          podiums: driver.podiums,
          points: Math.round(driver.points * 100) / 100,
        };
      })
      .sort((a, b) => b.wins - a.wins || b.podiums - a.podiums || b.entries - a.entries);

    const titles = [...new Set(rows.flatMap((row) => row.titles))].sort((a, b) => a - b);
    const wins = parts.reduce((sum, row) => sum + row.wins, 0) || rows.reduce((s, r) => s + r.wins, 0);
    const bestFinishes = parts
      .map((row) => row.bestFinish)
      .filter((value): value is number => value !== null);

    const wins1 = parts.map((row) => row.firstWin).filter(Boolean) as NonNullable<HistoryRow['firstWin']>[];
    const winsLast = parts.map((row) => row.lastWin).filter(Boolean) as NonNullable<HistoryRow['lastWin']>[];

    const fallbackFirst = Math.min(...rows.map((row) => row.firstSeason ?? Infinity));
    const fallbackLast = Math.max(...rows.map((row) => row.lastSeason ?? -Infinity));

    /** الشعار من أول صفّ يملكه — المدمجة تتشارك هوية واحدة. */
    const withLogo = rows.find((row) => row.logo) ?? primary;
    const custom = customLogos[id] ?? null;

    profiles.set(id, {
      id,
      name: TEAM_NAMES[id]?.ar ?? primary.name,
      nameEn: primary.name,
      nationality: nationalities[primary.nationality]?.ar ?? primary.nationality,
      countryCode: nationalities[primary.nationality]?.code ?? null,
      active: rows.some((row) => row.active),
      seasons,
      firstSeason: seasons[0] ?? (Number.isFinite(fallbackFirst) ? fallbackFirst : null),
      lastSeason: seasons.at(-1) ?? (Number.isFinite(fallbackLast) ? fallbackLast : null),
      seasonCount: seasons.length || primary.seasonCount,
      spans: toSpans(seasons),
      entries: parts.reduce((sum, row) => sum + row.entries, 0),
      wins,
      podiums: parts.reduce((sum, row) => sum + row.podiums, 0),
      poles: parts.reduce((sum, row) => sum + row.poles, 0),
      points: Math.round(parts.reduce((sum, row) => sum + row.points, 0) * 100) / 100,
      bestFinish: bestFinishes.length > 0 ? Math.min(...bestFinishes) : null,
      titles,
      firstWin: wins1.sort((a, b) => a.season - b.season || a.round - b.round)[0] ?? null,
      lastWin: winsLast.sort((a, b) => b.season - a.season || b.round - a.round)[0] ?? null,
      engines: rows.find((row) => row.engines)?.engines ?? null,
      logo: custom ?? withLogo.logo,
      logoIsCustom: custom !== null,
      // الشعار اليدوي لا نسبة له — أضافه المحرّر، فلا نُلصق به نسبة كومنز
      logoCredit: custom ? null : withLogo.logoCredit,
      color: TEAM_NAMES[id]?.color ?? null,
      wikipediaUrl: primary.wikipediaUrl,
      drivers,
      merged: rows.map((row) => row.id).filter((rowId) => rowId !== id),
    });
  }

  return profiles;
}

/** يُبنى مرة واحدة لكل عملية — الملفّات ثابتة على القرص. */
let cache: Map<string, TeamProfile> | null = null;

function profiles(): Map<string, TeamProfile> {
  cache ??= buildProfiles();
  return cache;
}

export function teamProfile(id: string): TeamProfile | null {
  return profiles().get(canonicalTeamId(id)) ?? null;
}

/**
 * الفرق السابقة، مرتّبة بالأثر.
 *
 * الترتيب: الألقاب أولاً، فالانتصارات، فالمواسم. القارئ يبحث عن لوتس وبرابهام
 * وتايرل — لا عن صانع دخل سباقاً واحداً سنة 1952 ولم يُكمله.
 */
export function listFormerTeams(): TeamProfile[] {
  return [...profiles().values()]
    .filter((team) => !team.active)
    .sort(
      (a, b) =>
        b.titles.length - a.titles.length ||
        b.wins - a.wins ||
        b.podiums - a.podiums ||
        b.seasonCount - a.seasonCount ||
        (b.lastSeason ?? 0) - (a.lastSeason ?? 0),
    );
}

export function listActiveTeams(): TeamProfile[] {
  return [...profiles().values()]
    .filter((team) => team.active)
    .sort((a, b) => b.titles.length - a.titles.length || b.wins - a.wins);
}
