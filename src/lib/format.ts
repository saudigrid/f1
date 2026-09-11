import { getLocale, t, type Locale } from '@/lib/i18n';
import type { StringKey } from '@/lib/i18n/strings';

/** تنسيقات نصّية مشتركة — عربية العرض، لاتينية الأرقام. */

/**
 * منسّقات لكل لغة، تُبنى مرة وتُخزَّن.
 *
 * `numberingSystem: 'latn'` مقصود في العربية: الأرقام الهندية (٢٠٢٦) تُربك
 * قارئ نتائج رياضية اعتاد اللاتينية في كل مصدر آخر، وتكسر محاذاة الجداول.
 */
const dateFormatters = new Map<Locale, Intl.DateTimeFormat>();
const relativeFormatters = new Map<Locale, Intl.RelativeTimeFormat>();

function dateFormatter(locale: Locale): Intl.DateTimeFormat {
  let formatter = dateFormatters.get(locale);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      numberingSystem: 'latn',
    });
    dateFormatters.set(locale, formatter);
  }
  return formatter;
}

function relativeFormatter(locale: Locale): Intl.RelativeTimeFormat {
  let formatter = relativeFormatters.get(locale);
  if (!formatter) {
    formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    relativeFormatters.set(locale, formatter);
  }
  return formatter;
}

export function formatDate(iso: string, locale: Locale = getLocale()): string {
  return dateFormatter(locale).format(new Date(iso));
}

/** «قبل 3 ساعات» — يعود للتاريخ الكامل بعد أسبوع لأن النسبية تفقد معناها. */
export function formatRelative(
  iso: string,
  now: number = Date.now(),
  locale: Locale = getLocale(),
): string {
  const diffMs = new Date(iso).getTime() - now;
  const diffMinutes = Math.round(diffMs / 60_000);

  if (Math.abs(diffMinutes) < 60) return relativeFormatter(locale).format(diffMinutes, 'minute');

  const diffHours = Math.round(diffMs / 3_600_000);
  if (Math.abs(diffHours) < 24) return relativeFormatter(locale).format(diffHours, 'hour');

  const diffDays = Math.round(diffMs / 86_400_000);
  if (Math.abs(diffDays) < 7) return relativeFormatter(locale).format(diffDays, 'day');

  return formatDate(iso, locale);
}

/**
 * عرض Markdown المبسّط الذي ينتجه وكيل الصياغة: فقرات و«## عناوين» فقط.
 *
 * نتعمّد ألا نستخدم محرّك Markdown كامل: مصدر النص آلي، وأي وسم HTML يمرّ
 * منه يصبح ثغرة. هذا المحلّل يتجاهل كل ما عدا الفقرات والعناوين.
 */
export type Block = { type: 'heading'; text: string } | { type: 'paragraph'; text: string };

export function parseBody(body: string): Block[] {
  return body
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) =>
      chunk.startsWith('## ')
        ? { type: 'heading' as const, text: chunk.slice(3).trim() }
        : { type: 'paragraph' as const, text: chunk.replace(/\n/g, ' ') },
    );
}

/**
 * ترجمة رمز نتيجة السباق إلى عربية مفهومة.
 *
 * واجهة النتائج تعيد `positionText`: رقماً لمن صُنِّف، ورمزاً لمن لم يُصنَّف.
 * عرض الرمز الخام («R») لا يعني شيئاً للقارئ، وعرض الرقم الذي يرافقه أسوأ:
 * من انسحب في اللفة الثانية يظهر رقمه 26 وكأنه «أنهى السباق في المركز 26».
 */
const RESULT_CODES: Record<string, StringKey> = {
  R: 'result.retired',
  D: 'result.disqualified',
  E: 'result.excluded',
  W: 'result.withdrew',
  F: 'result.failedToQualify',
  N: 'result.notClassified',
};

export function positionLabel(positionText: string, locale?: Locale): string {
  const key = RESULT_CODES[positionText];
  return key ? t(key, locale) : positionText;
}

/** هل الرمز يعني أن السائق لم يُنهِ السباق مصنَّفاً؟ */
export function isRetirement(positionText: string): boolean {
  return positionText in RESULT_CODES;
}
