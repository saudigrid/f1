/**
 * إعدادات اللغة — الأساس الذي ستُبنى عليه النسخة الإنجليزية.
 *
 * الحالة اليوم: العربية هي اللغة الوحيدة المعروضة. لكن كل ما يعتمد على اللغة
 * (الاتجاه، وسم `lang`، تنسيق التاريخ، القاموس) يمرّ من هنا بدل أن يكون
 * مكتوباً في عشرات الملفات. فيوم تُضاف الإنجليزية لا يتغيّر إلا **مصدر**
 * `getLocale`، لا كل صفحة.
 *
 * ⚠️ لا تجعل `getLocale` تكذب. هي تعيد العربية اليوم لأن العربية هي المعروض
 * فعلاً — لا لأننا «سنضيف الباقي لاحقاً». حين يصير `/en` موجوداً تقرأ اللغة
 * من مقطع المسار، وحينها فقط تصير الدالة صادقة بلغتين.
 */

export const LOCALES = ['ar', 'en'] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'ar';

export const DIRECTION: Record<Locale, 'rtl' | 'ltr'> = {
  ar: 'rtl',
  en: 'ltr',
};

/** وسم `lang` في HTML — يؤثّر على قارئات الشاشة وفصل الكلمات والترجمة الآلية. */
export const HTML_LANG: Record<Locale, string> = {
  ar: 'ar',
  en: 'en',
};

/** وسم اللغة في OpenGraph. */
export const OG_LOCALE: Record<Locale, string> = {
  ar: 'ar_SA',
  en: 'en_US',
};

/**
 * اللغة المعروضة الآن.
 *
 * نقطة التبديل الوحيدة: حين تُضاف مسارات `/en` تصير هذه الدالة تقرأ المقطع
 * الأول من المسار (عبر `params` أو رأس يضعه الوسيط)، ويبقى كل مستدعٍ لها
 * كما هو.
 */
export function getLocale(): Locale {
  return DEFAULT_LOCALE;
}
