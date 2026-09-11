import articleData from '@/data/race-articles.json';

/**
 * مقالة كل سباق — من ويكيبيديا العربية، مقروءة من القرص.
 *
 * ## لماذا العربية لا الإنجليزية المترجَمة
 *
 * ويكيبيديا العربية تملك مقالة لكل جائزة كبرى تقريباً. فالنصّ هنا **مكتوب
 * بالعربية أصلاً** لا مترجَماً آلياً — أدقّ لغةً، ولا يستهلك حصة الترجمة
 * المحجوزة للأخبار اليومية.
 *
 * ⚠️ يُملأ بـ`npm run sync:races`. ما لا مقالة له يبقى بلا نصّ — والفراغ
 * أصدق من ملخّص مؤلَّف.
 */

export interface RaceArticle {
  title: string;
  summary: string;
  url: string;
}

const articles = articleData as Record<string, RaceArticle>;

export function raceArticle(season: number | string, round: number | string): RaceArticle | null {
  return articles[`${season}-${round}`] ?? null;
}

export function raceArticleCount(): number {
  return Object.keys(articles).length;
}

/**
 * اسم السباق بالعربية من عنوان مقالته، وإلّا الاسم الإنجليزي المزحوف.
 *
 * ⚠️ يُقصّ من العنوان: بادئة «سباق» وسنةٌ في آخره. عنوان المقالة يحمل السنة
 * («جائزة موناكو الكبرى 1960») وأغلب المواضع التي تستدعي هذه الدالّة تعرض
 * الموسم بجانبها أصلاً، فتركها يعني تكرارها مرّتين في سطر واحد.
 */
export function raceNameAr(stamp: { season: number; round: number; race: string }): string {
  const title = raceArticle(stamp.season, stamp.round)?.title;
  if (!title) return stamp.race;
  return title.replace(/^سباق\s+/, '').replace(/\s+\d{4}$/, '').trim() || stamp.race;
}
