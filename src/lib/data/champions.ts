import championsData from '@/data/champions.json';

import { driverNameAr, nationality } from './i18n';

/**
 * أبطال العالم، مقروءين من ملف مزامَن مسبقاً (`npm run sync:champions`).
 *
 * الملف ثابت لا يُحرَّر يدوياً. القاعدة الوحيدة التي تُطبَّق هنا: **الموسم
 * الجاري لا بطل له**. من يتصدّر الترتيب اليوم قد لا يتوّج، وعدّ صدارته لقباً
 * خطأ وقائعي يظهر في كل صفحة سائق.
 */

export interface SeasonChampions {
  season: number;
  driverId: string | null;
  driverName: string | null;
  driverNationality: string | null;
  constructorId: string | null;
  constructorName: string | null;
  rounds: number | null;
  complete: boolean;
}

const ALL = championsData as SeasonChampions[];

/** المواسم المنتهية وحدها — هذه هي الألقاب الحقيقية. */
const CROWNED = ALL.filter((row) => row.complete);

export function allSeasonChampions(): SeasonChampions[] {
  return ALL;
}

/** مواسم فاز فيها السائق باللقب، من الأقدم إلى الأحدث. */
export function driverTitles(driverId: string): number[] {
  return CROWNED.filter((row) => row.driverId === driverId)
    .map((row) => row.season)
    .sort((a, b) => a - b);
}

/** مواسم فاز فيها الصانع بلقب الصانعين. */
export function constructorTitles(constructorId: string): number[] {
  return CROWNED.filter((row) => row.constructorId === constructorId)
    .map((row) => row.season)
    .sort((a, b) => a - b);
}

/** متصدّر الموسم الجاري — يُعرض بوصفه متصدّراً لا بطلاً. */
export function currentLeader(): SeasonChampions | null {
  return ALL.find((row) => !row.complete && row.driverId) ?? null;
}

export interface ChampionTally {
  driverId: string;
  name: string;
  nameEn: string;
  countryCode: string;
  titles: number[];
}

/** ترتيب الأبطال بعدد ألقابهم — الأكثر أولاً. */
export function championTally(): ChampionTally[] {
  const byDriver = new Map<string, ChampionTally>();

  for (const row of CROWNED) {
    if (!row.driverId || !row.driverName) continue;

    const existing = byDriver.get(row.driverId);
    if (existing) {
      existing.titles.push(row.season);
      continue;
    }

    byDriver.set(row.driverId, {
      driverId: row.driverId,
      name: driverNameAr(row.driverId, row.driverName),
      nameEn: row.driverName,
      countryCode: row.driverNationality ? nationality(row.driverNationality).code : '',
      titles: [row.season],
    });
  }

  return [...byDriver.values()]
    .map((entry) => ({ ...entry, titles: entry.titles.sort((a, b) => a - b) }))
    .sort((a, b) => b.titles.length - a.titles.length || a.titles[0] - b.titles[0]);
}
