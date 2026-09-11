/**
 * إعدادات خط الأتمتة — كل الأرقام الحسّاسة في مكان واحد لتضبطها بدون لمس الكود.
 */

import type { ProviderName } from '@/lib/agents/providers/types';

/** الوكيلان اللذان يستدعيان نموذجاً. */
export type AgentRole = 'translate' | 'factCheck';

export const PIPELINE_CONFIG = {
  /**
   * ⭐ المفتاح الرئيسي للنشر — هذا هو السطر الوحيد الذي تبدّله عند الترقية.
   *
   * true  = لا يُنشر شيء تلقائياً إطلاقاً. كل خبر يمرّ على /admin.
   * false = تُطبَّق السياسة الهجينة أدناه.
   *
   * مضبوط على true لأن ربط البحث غير متاح على الحساب الحالي، فوكيل التدقيق
   * يجري فحص اتساق داخلي لا تحققاً مستقلاً.
   *
   * عند إضافة مفتاح مدفوع لاحقاً: شغّل `npm run check` — سيخبرك صراحة إن صار
   * البحث متاحاً. عندها فقط بدّل هذا السطر إلى false. لا تتركه يتبدّل ضمنياً:
   * النشر التلقائي قرار تحريري، لا نتيجة جانبية لتغيّر في خطة الفوترة.
   */
  requireHumanReview: true,

  /**
   * السياسة الهجينة — تعمل فقط حين requireHumanReview = false:
   * ثقة ≥ autoPublishConfidence و مصادر مستقلة ≥ minCorroboratingSources → نشر تلقائي.
   */
  autoPublishConfidence: 82,
  minCorroboratingSources: 2,

  /** الإشاعات والتكهنات تذهب للمراجعة اليدوية دائماً مهما ارتفعت الثقة. */
  alwaysReviewSpeculation: true,

  /** التصنيفات التي لا تُنشر تلقائياً أبداً (حسّاسة أو عالية الأثر). */
  alwaysReviewCategories: ['transfers', 'regulations'] as const,

  /**
   * أقصى عدد أخبار تُعالَج في تشغيلة واحدة — صمّام الأمان الأول للفاتورة.
   *
   * الحساب: كل خبر يكلّف نداءين (صياغة + تدقيق). الحساب المجاني على Gemini
   * يعطي **20 طلباً يومياً** لـ gemini-3.8-flash — أي 10 أخبار في اليوم كله.
   *
   * مع جدولة vercel.json الحالية (تشغيلتان يومياً): 4 × 2 × 2 = 16 طلباً،
   * داخل الحصة مع هامش للفحص اليدوي بـ `npm run check`.
   *
   * بعد ترقية الخطة ارفعه إلى 12 أو أكثر، وراجع الجدولة معه — كل نصف ساعة
   * × 12 خبراً = 576 خبراً يومياً، وهو رقم لا تريده على الأرجح.
   */
  maxArticlesPerRun: 4,

  /** لا يُعاد سحب الأخبار الأقدم من هذه المدة. */
  lookbackHours: 24,

  /**
   * ⭐ مزوّد ونموذج كل وكيل — هنا تبدّل بين Gemini وClaude.
   *
   * الافتراضي Gemini للاثنين:
   * - التدقيق يستفيد من ربط بحث جوجل مباشرة، وهو جوهر عمله.
   * - الصياغة على نفس المزوّد تعني مفتاحاً واحداً وسلوكاً متجانساً.
   *
   * للتبديل: غيّر `provider` إلى 'anthropic' و`model` إلى 'claude-opus-5'.
   * لا شيء آخر يحتاج تعديلاً — الوكلاء لا يعرفون من يعمل تحتهم.
   */
  agents: {
    translate: { provider: 'gemini' as ProviderName, model: 'gemini-3.8-flash' },
    factCheck: { provider: 'gemini' as ProviderName, model: 'gemini-3.8-flash' },
  } satisfies Record<AgentRole, { provider: ProviderName; model: string }>,

  /** النموذج المستخدم عند التحوّل الاضطراري لمزوّد آخر (مفتاح مفقود). */
  fallbackModels: {
    gemini: 'gemini-3.8-flash',
    anthropic: 'claude-opus-5',
  } satisfies Record<ProviderName, string>,

  /** عمق التفكير لكل وكيل. التدقيق يستحق أعلى من الصياغة. */
  effort: {
    translate: 'medium',
    factCheck: 'high',
  } satisfies Record<AgentRole, 'low' | 'medium' | 'high'>,
} as const;
