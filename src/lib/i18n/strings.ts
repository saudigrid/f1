/**
 * قاموس نصوص الواجهة.
 *
 * العربية هي **المرجع**: مفاتيحها تحدّد ما يجب أن توجد له ترجمة. النوع أدناه
 * يجبر الإنجليزية على تغطية كل مفتاح عربي — فمفتاح ناقص خطأ عند الترجمة
 * البرمجية لا نصّ عربي يظهر فجأة في صفحة إنجليزية.
 *
 * ما يدخل هنا: نصوص **الواجهة** المتكرّرة — التنقّل، الأزرار، عناوين الأقسام،
 * رسائل الفراغ. وما لا يدخل: أسماء الأعلام (لها قواميس في `src/data/i18n`)،
 * ولا مقالات الصفحات الثابتة الطويلة (سياسة الخصوصية وما شابه) — تلك تُكتب
 * لكل لغة على حدة لا تُترجَم مفتاحاً مفتاحاً.
 */

import type { Locale } from './config';

const ar = {
  // ── التنقّل ──────────────────────────────────
  'nav.home': 'الرئيسية',
  'nav.news': 'الأخبار',
  'nav.races': 'السباقات',
  'nav.calendar': 'الروزنامة',
  'nav.circuits': 'الحلبات',
  'nav.drivers': 'السائقون',
  'nav.eras': 'تاريخ الرياضة',
  'nav.standings': 'الترتيب',
  'nav.teams': 'الفرق',
  'nav.technical': 'تحليل تقني',
  'nav.about': 'عن الموقع',
  'nav.editorialPolicy': 'السياسة التحريرية',
  'nav.privacy': 'الخصوصية والإعلانات',
  'nav.contact': 'اتصل بنا',

  // ── الهيكل العام ─────────────────────────────
  'chrome.skipToContent': 'تخطَّ إلى المحتوى',
  'chrome.mainNav': 'التنقّل الرئيسي',
  'chrome.mobileNav': 'التنقّل على الجوال',
  'chrome.menu': 'القائمة',
  'chrome.breadcrumb': 'مسار التنقّل',
  'chrome.sections': 'الأقسام',
  'chrome.site': 'الموقع',
  'chrome.sectionLinks': 'روابط الأقسام',
  'chrome.siteLinks': 'روابط الموقع',
  'chrome.tagline':
    'تغطية عربية يومية لعالم الفورمولا 1 — كل الفرق، كل السائقين، كل جولة في الروزنامة.',
  'chrome.viewAll': 'عرض الكل',
  'chrome.showMore': 'عرض المزيد',
  'chrome.toggleTheme': 'تبديل الوضع',

  // ── السائقون ─────────────────────────────────
  'drivers.title': 'السائقون',
  'drivers.currentSeason': 'سائقو الموسم',
  'drivers.champions': 'أبطال العالم',
  'drivers.former': 'السائقون السابقون',
  'drivers.thisSeason': 'هذا الموسم',
  'drivers.worldChampion': 'بطل عالم',
  'drivers.titlesPlural': 'ألقاب',
  'drivers.teamPhotoShort': 'صورة فريق',
  'drivers.searchLabel': 'ابحث عن سائق',
  'drivers.searchPlaceholder': 'ابحث بالاسم — عربي أو إنجليزي',
  'drivers.searchEmpty': 'لا سائق بهذا الاسم. جرّب جزءاً من الاسم أو اكتبه بالإنجليزية.',
  'drivers.teams': 'الفرق التي قاد لها',
  'drivers.wins': 'السباقات التي فاز فيها',
  'drivers.allResults': 'ترتيبه في كل سباق',
  'drivers.noResults': 'لا نتائج مسجّلة — قد يكون تأهّل لسباق ولم ينطلق فيه.',
  'drivers.teamPhotoNote': 'لا صورة حرّة للسائق — الصورة لفريق',
  'drivers.careerPoints': 'مجموع النقاط في المسيرة',

  // ── إحصاءات ──────────────────────────────────
  'stat.races': 'سباقات',
  'stat.wins': 'انتصارات',
  'stat.podiums': 'منصّات',
  'stat.poles': 'انطلاقات أولى',
  'stat.points': 'نقطة',
  'stat.bestFinish': 'أفضل مركز',

  // ── نتائج السباق ─────────────────────────────
  'result.retired': 'انسحب',
  'result.disqualified': 'استُبعد',
  'result.excluded': 'مستبعد',
  'result.withdrew': 'انسحب قبل الانطلاق',
  'result.failedToQualify': 'لم يتأهّل',
  'result.notClassified': 'غير مصنَّف',

  // ── السباقات والحلبات ────────────────────────
  'races.upcoming': 'القادمة',
  'races.nextRace': 'السباق القادم',
  'races.completed': 'التي أُقيمت',
  'races.seasonResults': 'نتائج الموسم',
  'races.season': 'الموسم',
  'races.noResults': 'لا نتائج منشورة لهذا الموسم بعد.',
  'circuits.current': 'الحلبات الحالية',
  'circuits.former': 'الحلبات السابقة',
  'circuits.fastestLap': 'أسرع لفة في تاريخ الحلبة',
  'circuits.length': 'الطول',
  'circuits.turns': 'المنعطفات',
  'circuits.opened': 'الافتتاح',

  // ── الحقب ────────────────────────────────────
  'eras.title': 'تاريخ الفورمولا 1',
  'eras.champions': 'أبطال العالم في هذه الحقبة',
  'eras.constructorTitles': 'ألقاب الصانعين',
  'eras.now': 'الآن',

  // ── عام ──────────────────────────────────────
  'common.source': 'المصدر',
  'common.wikipedia': 'ويكيبيديا',
  'common.advertisement': 'إعلان',
} as const;

/** كل مفتاح موجود في العربية — المرجع الذي تُقاس عليه بقية اللغات. */
export type StringKey = keyof typeof ar;

/**
 * ⚠️ النوع `Record<StringKey, string>` مقصود: أيّ مفتاح تنساه هنا يصير خطأ
 * ترجمة، لا نصّاً عربياً يتسلّل إلى صفحة إنجليزية.
 */
const en: Record<StringKey, string> = {
  'nav.home': 'Home',
  'nav.news': 'News',
  'nav.races': 'Races',
  'nav.calendar': 'Calendar',
  'nav.circuits': 'Circuits',
  'nav.drivers': 'Drivers',
  'nav.eras': 'History of the Sport',
  'nav.standings': 'Standings',
  'nav.teams': 'Teams',
  'nav.technical': 'Technical',
  'nav.about': 'About',
  'nav.editorialPolicy': 'Editorial Policy',
  'nav.privacy': 'Privacy & Ads',
  'nav.contact': 'Contact',

  'chrome.skipToContent': 'Skip to content',
  'chrome.mainNav': 'Main navigation',
  'chrome.mobileNav': 'Mobile navigation',
  'chrome.menu': 'Menu',
  'chrome.breadcrumb': 'Breadcrumb',
  'chrome.sections': 'Sections',
  'chrome.site': 'Site',
  'chrome.sectionLinks': 'Section links',
  'chrome.siteLinks': 'Site links',
  'chrome.tagline':
    'Daily Formula 1 coverage — every team, every driver, every round on the calendar.',
  'chrome.viewAll': 'View all',
  'chrome.showMore': 'Show more',
  'chrome.toggleTheme': 'Toggle theme',

  'drivers.title': 'Drivers',
  'drivers.currentSeason': 'This season',
  'drivers.champions': 'World champions',
  'drivers.former': 'Former drivers',
  'drivers.thisSeason': 'This season',
  'drivers.worldChampion': 'World champion',
  'drivers.titlesPlural': 'titles',
  'drivers.teamPhotoShort': 'Team photo:',
  'drivers.searchLabel': 'Search for a driver',
  'drivers.searchPlaceholder': 'Search by name — Arabic or English',
  'drivers.searchEmpty': 'No driver by that name. Try part of the name, or the English spelling.',
  'drivers.teams': 'Teams driven for',
  'drivers.wins': 'Race wins',
  'drivers.allResults': 'Finishing position in every race',
  'drivers.noResults': 'No recorded results — they may have entered a race without starting it.',
  'drivers.teamPhotoNote': 'No free photo of this driver — image shows their team',
  'drivers.careerPoints': 'Career points',

  'stat.races': 'Races',
  'stat.wins': 'Wins',
  'stat.podiums': 'Podiums',
  'stat.poles': 'Poles',
  'stat.points': 'pts',
  'stat.bestFinish': 'Best finish',

  'result.retired': 'Retired',
  'result.disqualified': 'Disqualified',
  'result.excluded': 'Excluded',
  'result.withdrew': 'Withdrew',
  'result.failedToQualify': 'Did not qualify',
  'result.notClassified': 'Not classified',

  'races.upcoming': 'Upcoming',
  'races.nextRace': 'Next race',
  'races.completed': 'Completed',
  'races.seasonResults': 'Season results',
  'races.season': 'Season',
  'races.noResults': 'No results published for this season yet.',
  'circuits.current': 'Current circuits',
  'circuits.former': 'Former circuits',
  'circuits.fastestLap': 'Fastest lap in circuit history',
  'circuits.length': 'Length',
  'circuits.turns': 'Turns',
  'circuits.opened': 'Opened',

  'eras.title': 'History of Formula 1',
  'eras.champions': 'World champions in this era',
  'eras.constructorTitles': 'Constructors’ titles',
  'eras.now': 'now',

  'common.source': 'Source',
  'common.wikipedia': 'Wikipedia',
  'common.advertisement': 'Advertisement',
};

export const STRINGS: Record<Locale, Record<StringKey, string>> = { ar, en };
