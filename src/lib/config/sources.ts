/**
 * مصادر الأخبار. كلها خلاصات RSS عامة.
 *
 * ملاحظة قانونية مهمة: هذه المصادر تُستخدم كـ«إشارة» فقط — وكيل الترجمة يعيد صياغة
 * الخبر بأسلوب أصلي ولا ينسخ نص المصدر، ويبقى الإسناد والرابط ظاهرين أسفل كل خبر.
 * لا تُفعّل أي مصدر يمنع ذلك في شروط استخدامه.
 */

export interface NewsSource {
  id: string;
  name: string;      // الاسم كما يظهر للقارئ
  rss: string;
  /** الوزن في حساب المصداقية: 3 = مصدر رسمي، 2 = صحافة متخصصة، 1 = تجميعي. */
  trust: 1 | 2 | 3;
  enabled: boolean;
}

export const NEWS_SOURCES: NewsSource[] = [
  {
    id: 'fia',
    name: 'الاتحاد الدولي للسيارات (FIA)',
    rss: 'https://www.fia.com/rss/news',
    trust: 3,
    enabled: true,
  },
  {
    id: 'formula1',
    name: 'الموقع الرسمي للفورمولا 1',
    rss: 'https://www.formula1.com/en/latest/all.xml',
    trust: 3,
    enabled: true,
  },
  {
    id: 'motorsport',
    name: 'Motorsport.com',
    rss: 'https://www.motorsport.com/rss/f1/news/',
    trust: 2,
    enabled: true,
  },
  {
    id: 'autosport',
    name: 'Autosport',
    rss: 'https://www.autosport.com/rss/f1/news/',
    trust: 2,
    enabled: true,
  },
  {
    id: 'racefans',
    name: 'RaceFans',
    rss: 'https://www.racefans.net/feed/',
    trust: 2,
    enabled: true,
  },
];

/** بيانات النتائج والترتيب — واجهة مجانية ومفتوحة، لا تحتاج مفتاحاً. */
export const RESULTS_API = {
  base: 'https://api.jolpi.ca/ergast/f1',
  attribution: 'Jolpica F1 API',
} as const;
