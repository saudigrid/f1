import type { StringKey } from '@/lib/i18n/strings';

/**
 * روابط التنقّل — مصدر واحد يستخدمه الهيدر والفوتر وخريطة الموقع.
 *
 * الرابط يحمل **مفتاح** نصّه لا النصّ نفسه. الفرق ليس شكلياً: التسمية هنا
 * تظهر في ثلاثة مواضع، وكتابتها عربية في هذا الملف كانت تعني ترجمة القائمة
 * في كل موضع على حدة يوم تُضاف الإنجليزية.
 */
export interface NavLink {
  href: string;
  key: StringKey;
}

export const NAV_LINKS: readonly NavLink[] = [
  { href: '/', key: 'nav.home' },
  { href: '/news', key: 'nav.news' },
  { href: '/races', key: 'nav.races' },
  { href: '/calendar', key: 'nav.calendar' },
  { href: '/circuits', key: 'nav.circuits' },
  { href: '/drivers', key: 'nav.drivers' },
  { href: '/standings', key: 'nav.standings' },
  { href: '/records', key: 'nav.records' },
  { href: '/teams', key: 'nav.teams' },
  { href: '/technical', key: 'nav.technical' },
  { href: '/eras', key: 'nav.eras' },
];

/** روابط ثانوية: تظهر في الفوتر فقط، وتدخل خريطة الموقع. */
export const SECONDARY_LINKS: readonly NavLink[] = [
  { href: '/about', key: 'nav.about' },
  { href: '/editorial-policy', key: 'nav.editorialPolicy' },
  { href: '/privacy', key: 'nav.privacy' },
  { href: '/contact', key: 'nav.contact' },
];
