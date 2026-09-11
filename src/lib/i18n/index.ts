import { DEFAULT_LOCALE, getLocale, type Locale } from './config';
import { STRINGS, type StringKey } from './strings';

export { DEFAULT_LOCALE, DIRECTION, HTML_LANG, LOCALES, OG_LOCALE, getLocale } from './config';
export type { Locale } from './config';
export type { StringKey } from './strings';

/**
 * نصّ الواجهة بلغة العرض.
 *
 * `locale` وسيط اختياري لا حالة عامّة: المكوّن الذي يعرض بالإنجليزية يمرّرها
 * صراحةً، فلا تتسرّب لغة صفحة إلى أخرى — وهذا هو الفخّ الأول في أي i18n
 * يعتمد على متغيّر عام.
 *
 * السقوط إلى العربية عند غياب المفتاح دفاع أخير لا سياسة: النوع في
 * `strings.ts` يمنع المفتاح الناقص أصلاً.
 */
export function t(key: StringKey, locale: Locale = getLocale()): string {
  return STRINGS[locale]?.[key] ?? STRINGS[DEFAULT_LOCALE][key];
}

/** يبني دالة نصّ مربوطة بلغة واحدة — أوضح داخل مكوّن يعرض نصوصاً كثيرة. */
export function translator(locale: Locale = getLocale()) {
  return (key: StringKey) => t(key, locale);
}
