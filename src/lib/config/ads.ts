/**
 * مواضع الإعلانات. الموضع الواحد يقبل إما كود AdSense أو إعلاناً مباشراً،
 * فتقرر لاحقاً بدون تعديل أي مكوّن.
 *
 * قواعد ثابتة لا نكسرها: لا منبثقات، لا إعلانات تغطي المحتوى،
 * لا فيديو يعمل تلقائياً، وكل موضع له ارتفاع محجوز مسبقاً لمنع قفز الصفحة (CLS).
 */

export type AdPlacementId =
  | 'header-leaderboard'
  | 'in-feed'
  | 'in-article'
  | 'sidebar-sticky'
  | 'mobile-anchor';

export interface AdPlacement {
  id: AdPlacementId;
  label: string;
  /** الارتفاع المحجوز بالبكسل — يمنع اهتزاز التخطيط عند تحميل الإعلان. */
  reservedHeight: { mobile: number; desktop: number };
  /** كود شريحة AdSense إن استُخدم. */
  adsenseSlot?: string;
  /** يظهر على الجوال؟ */
  mobile: boolean;
  desktop: boolean;
}

export const AD_PLACEMENTS: Record<AdPlacementId, AdPlacement> = {
  'header-leaderboard': {
    id: 'header-leaderboard',
    label: 'بانر أسفل الهيدر',
    reservedHeight: { mobile: 100, desktop: 90 },
    mobile: true,
    desktop: true,
  },
  'in-feed': {
    id: 'in-feed',
    label: 'داخل شبكة الأخبار (كل 6 بطاقات)',
    reservedHeight: { mobile: 250, desktop: 250 },
    mobile: true,
    desktop: true,
  },
  'in-article': {
    id: 'in-article',
    label: 'داخل المقال بعد الفقرة الثالثة',
    reservedHeight: { mobile: 250, desktop: 280 },
    mobile: true,
    desktop: true,
  },
  'sidebar-sticky': {
    id: 'sidebar-sticky',
    label: 'عمود جانبي لاصق',
    reservedHeight: { mobile: 0, desktop: 600 },
    mobile: false,
    desktop: true,
  },
  'mobile-anchor': {
    id: 'mobile-anchor',
    label: 'شريط سفلي على الجوال (قابل للإغلاق)',
    reservedHeight: { mobile: 60, desktop: 0 },
    mobile: true,
    desktop: false,
  },
};

/** كم بطاقة خبر بين كل إعلان داخل الشبكة. */
export const IN_FEED_INTERVAL = 6;
