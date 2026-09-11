import circuitNames from '@/data/i18n/circuits.json';
import countries from '@/data/i18n/countries.json';
import driverNames from '@/data/i18n/drivers.json';
import localities from '@/data/i18n/localities.json';
import nationalities from '@/data/i18n/nationalities.json';

/**
 * تعريب المعرّفات التاريخية.
 *
 * القواميس ملفات JSON لا ثوابت في الكود، لأن سكربت التعريب بالدفعات يكتب فيها
 * (`npm run translate:names`). ما لم يُترجَم بعد يظهر بالإنجليزية باتجاه صحيح،
 * ويُسجَّل في `missingTranslations` ليعرف السكربت ما يبقى عليه.
 */

const missing = new Set<string>();

export function missingTranslations(): string[] {
  return [...missing].sort();
}

function lookup(dict: Record<string, string>, key: string, fallback: string, kind: string): string {
  const found = dict[key];
  if (found) return found;
  missing.add(`${kind}:${key}`);
  return fallback;
}

export function driverNameAr(driverId: string, fallback: string): string {
  return lookup(driverNames as Record<string, string>, driverId, fallback, 'driver');
}

export function circuitNameAr(circuitId: string, fallback: string): string {
  return lookup(circuitNames as Record<string, string>, circuitId, fallback, 'circuit');
}

/**
 * اسم المدينة بالعربية.
 *
 * المفتاح هو الاسم الإنجليزي لا معرّف الحلبة: مدينة واحدة تستضيف أكثر من
 * حلبة أحياناً (ملبورن، مونزا)، وتعريبها مرتين بابُ اختلاف لا داعي له.
 */
export function localityAr(name: string): string {
  return lookup(localities as Record<string, string>, name, name, 'locality');
}

/** الدولة: العربية ورمز العلم. */
export function country(name: string): { ar: string; code: string } {
  const found = (countries as Record<string, { ar: string; code: string }>)[name];
  if (found) return found;
  missing.add(`country:${name}`);
  return { ar: name, code: '' };
}

/** الجنسية: العربية ورمز العلم. */
export function nationality(name: string): { ar: string; code: string } {
  const found = (nationalities as Record<string, { ar: string; code: string }>)[name];
  if (found) return found;
  missing.add(`nationality:${name}`);
  return { ar: name, code: '' };
}

/**
 * اسم الجائزة الكبرى بالعربية، مشتقاً من اسمها الإنجليزي.
 *
 * الأسماء تتبع نمطاً ثابتاً («X Grand Prix»)، فنشتقّها من قاموس الدول بدل
 * صيانة قائمة بألف اسم سباق. ما لا يتبع النمط يبقى كما هو.
 */
const RACE_NAME_OVERRIDES: Record<string, string> = {
  'Indianapolis 500': 'إنديانابوليس 500',
  'Emilia Romagna Grand Prix': 'جائزة إميليا رومانيا الكبرى',
  'Miami Grand Prix': 'جائزة ميامي الكبرى',
  'Las Vegas Grand Prix': 'جائزة لاس فيغاس الكبرى',
  'Mexico City Grand Prix': 'جائزة مكسيكو سيتي الكبرى',
  'São Paulo Grand Prix': 'جائزة ساو باولو الكبرى',
  'Sao Paulo Grand Prix': 'جائزة ساو باولو الكبرى',
  'Styrian Grand Prix': 'جائزة شتيريا الكبرى',
  'Tuscan Grand Prix': 'جائزة توسكانا الكبرى',
  'Eifel Grand Prix': 'جائزة آيفل الكبرى',
  'Sakhir Grand Prix': 'جائزة صخير الكبرى',
  '70th Anniversary Grand Prix': 'جائزة الذكرى السبعين الكبرى',
  'Barcelona Grand Prix': 'جائزة برشلونة الكبرى',
  'Caesars Palace Grand Prix': 'جائزة قصر قيصر الكبرى',
  'Dallas Grand Prix': 'جائزة دالاس الكبرى',
  'Detroit Grand Prix': 'جائزة ديترويت الكبرى',
  'Long Beach Grand Prix': 'جائزة لونغ بيتش الكبرى',
  'Pescara Grand Prix': 'جائزة بيسكارا الكبرى',
  'European Grand Prix': 'جائزة أوروبا الكبرى',
  'Pacific Grand Prix': 'جائزة المحيط الهادئ الكبرى',
  'Luxembourg Grand Prix': 'جائزة لوكسمبورغ الكبرى',
  'San Marino Grand Prix': 'جائزة سان مارينو الكبرى',
  'Bahrain Grand Prix in Malaysia': 'جائزة البحرين الكبرى في ماليزيا',
};

/** صفة الدولة الإنجليزية ← اسم الجائزة بالعربية. */
const DEMONYM_TO_AR: Record<string, string> = {
  Argentine: 'الأرجنتين', Australian: 'أستراليا', Austrian: 'النمسا',
  Azerbaijan: 'أذربيجان', Bahrain: 'البحرين', Belgian: 'بلجيكا',
  Brazilian: 'البرازيل', British: 'بريطانيا', Canadian: 'كندا',
  Chinese: 'الصين', Dutch: 'هولندا', French: 'فرنسا', German: 'ألمانيا',
  Hungarian: 'المجر', Indian: 'الهند', Italian: 'إيطاليا',
  Japanese: 'اليابان', Korean: 'كوريا', Malaysian: 'ماليزيا',
  Mexican: 'المكسيك', Monaco: 'موناكو', Moroccan: 'المغرب',
  Portuguese: 'البرتغال', Qatar: 'قطر', Russian: 'روسيا',
  'Saudi Arabian': 'السعودية', Singapore: 'سنغافورة',
  'South African': 'جنوب أفريقيا', Spanish: 'إسبانيا', Swedish: 'السويد',
  Swiss: 'سويسرا', Turkish: 'تركيا', 'United States': 'الولايات المتحدة',
  'Abu Dhabi': 'أبوظبي', Vegas: 'لاس فيغاس',
};

export function raceNameAr(raceName: string): string {
  const override = RACE_NAME_OVERRIDES[raceName];
  if (override) return override;

  const demonym = raceName.replace(/\s+Grand Prix$/, '');
  const arabic = DEMONYM_TO_AR[demonym];
  if (arabic) return `جائزة ${arabic} الكبرى`;

  missing.add(`race:${raceName}`);
  return raceName;
}
