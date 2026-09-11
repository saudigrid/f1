import type { ImageCredit } from '@/lib/types';

/**
 * طبقة مزوّدي الصور — نفس فكرة طبقة النماذج.
 *
 * المنسّق يطلب «صورة لهذا الخبر» ولا يعرف من أين تأتي. الترتيب والصلاحيات
 * تُحسم داخل هذه الطبقة وحدها، فإضافة مصدر مدفوع لاحقاً لا تلمس خط الأتمتة.
 */

export interface ResolvedImage {
  url: string;
  /** وصف بديل بالعربية — يُملأ من مسوّدة الخبر إن لم يوفّره المصدر. */
  alt: string;
  credit: ImageCredit;
}

/** ما يعرفه المزوّد عن الخبر ليبحث له عن صورة. */
export interface ImageQuery {
  /** روابط صور جاءت مع الخبر في خلاصته، مع معرّف المصدر لكل رابط. */
  feedImages: { sourceId: string; sourceName: string; url: string }[];
  /** كيانات الخبر: أسماء سائقين وفرق وحلبات بالإنجليزية للبحث. */
  entities: string[];
  /** الوصف البديل الذي كتبه وكيل الصياغة. */
  alt: string;
  /**
   * أسماء فرق وسائقي الموسم الحالي بالإنجليزية.
   *
   * تُستخدم لتمييز الحديث من الأرشيفي: أرشيف الصور المفتوح مليء بسيارات
   * تاريخية تُصوَّر في عروض على هامش السباقات، فيحمل اسم الملف تاريخ اليوم
   * بينما السيارة من التسعينات.
   */
  currentGrid?: string[];
  /**
   * سياق الخبر للبحث الموضوعي حين يفشل البحث بالكيان.
   * العنوان والوسوم بالعربية — قواعد المطابقة عربية أصلاً.
   */
  topic?: { title: string; keywords: string[]; category: string };
  /** روابط صور استُخدمت في نفس التشغيلة — لتفادي تكرارها عبر الأخبار. */
  exclude?: string[];
}

export interface ImageProvider {
  readonly name: string;
  resolve(query: ImageQuery): Promise<ResolvedImage | null>;
}
