/** خطأ يعني: لا تنشر هذا الخبر، أرسله للمراجعة البشرية. */
export class NeedsHumanReview extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = 'NeedsHumanReview';
  }
}

/**
 * نفدت حصة المزوّد.
 *
 * مختلف جوهرياً عن NeedsHumanReview: ذاك يخصّ خبراً واحداً، وهذا يعني أن
 * **بقية التشغيلة بلا جدوى**. المنسّق يوقف الحلقة فوراً بدل أن يحرق عشر
 * محاولات فاشلة ويملأ السجلّ بنفس الرسالة.
 */
export class QuotaExhausted extends Error {
  /** كم ثانية تنصح الواجهة بالانتظار قبل إعادة المحاولة. */
  readonly retryAfterSeconds: number | null;

  constructor(reason: string, retryAfterSeconds: number | null = null) {
    super(reason);
    this.name = 'QuotaExhausted';
    this.retryAfterSeconds = retryAfterSeconds;
  }
}
