/**
 * إعدادات الموقع المركزية. كل نص أو رابط يظهر للزائر يبدأ من هنا.
 * التغطية عالمية لرياضة الفورمولا 1 — القسم السعودي واحد من الأقسام لا محورها.
 */

export const site = {
  name: "Saudi F1 Grid",
  nameAr: "سعودي إف١ جريد",
  tagline: "تغطية عربية شاملة لعالم الفورمولا 1",
  description:
    "أخبار الفورمولا 1 العالمية بالعربية: السباقات، الترتيب، الفرق، السائقون، والتحليل التقني — مصادر موثقة وتدقيق قبل النشر.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  locale: "ar" as const,
  twitter: "@saudif1grid",
} as const;

/** أقسام الموقع. الترتيب هنا هو ترتيب شريط التنقل. */
export const sections = [
  { slug: "news", label: "الأخبار", hint: "آخر مستجدات البادوك" },
  { slug: "races", label: "السباقات", hint: "التقويم والنتائج", href: "/races" },
  { slug: "standings", label: "الترتيب", hint: "السائقون والصانعون", href: "/standings" },
  { slug: "teams", label: "الفرق", hint: "الفرق العشرة", href: "/teams" },
  { slug: "tech", label: "تحليل تقني", hint: "التطويرات والاستراتيجية" },
  { slug: "transfers", label: "الانتقالات", hint: "سوق السائقين والعقود" },
  { slug: "saudi", label: "جدة", hint: "الجائزة الكبرى السعودية" },
] as const;

/** أقسام المحتوى التحريري فقط (التي تُصنَّف تحتها المقالات). */
export const articleCategories = [
  { slug: "news", label: "أخبار" },
  { slug: "tech", label: "تحليل تقني" },
  { slug: "transfers", label: "انتقالات" },
  { slug: "regulations", label: "لوائح FIA" },
  { slug: "saudi", label: "جدة والسعودية" },
] as const;

export type CategorySlug = (typeof articleCategories)[number]["slug"];

export function categoryLabel(slug: string): string {
  return articleCategories.find((c) => c.slug === slug)?.label ?? slug;
}
