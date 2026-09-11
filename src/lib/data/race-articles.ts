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
