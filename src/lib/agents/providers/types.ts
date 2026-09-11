import type { ZodType } from 'zod';

/**
 * الواجهة الموحّدة لمزوّدي النماذج.
 *
 * الوكلاء (الصياغة والتدقيق) لا يعرفون أي مزوّد يعمل تحتهم. هذا يعني أن تبديل
 * Gemini بـ Claude — أو استخدام كل واحد لوكيل مختلف — تغييرُ سطر في
 * `config/pipeline.ts`، لا إعادة كتابة.
 */

export type ProviderName = 'gemini' | 'anthropic';

/** عمق التفكير المطلوب. كل مزوّد يترجمه إلى مصطلحه الخاص. */
export type Effort = 'low' | 'medium' | 'high';

/** مصدر استشهد به النموذج أثناء البحث — نستخدمه في تقرير التدقيق. */
export interface Citation {
  url: string;
  title: string;
}

export interface GenerateRequest<T> {
  system: string;
  prompt: string;
  /**
   * مخطط Zod للمخرجات. مع وجوده يعود `parsed` مملوءاً ومطابقاً للنوع.
   * يمكن دمجه مع `webSearch` — كل مزوّد يتكفّل بتفاصيل ذلك داخلياً.
   */
  schema?: ZodType<T>;
  /** تمكين البحث على الويب للتحقق من الوقائع. */
  webSearch?: boolean;
  effort?: Effort;
  maxTokens?: number;
}

export interface GenerateResult<T> {
  /** null إذا لم يُطلب مخطط أو تعذّر تحليل المخرجات. */
  parsed: T | null;
  text: string;
  citations: Citation[];
  /**
   * هل جرى البحث على الويب فعلاً؟
   *
   * يكون false حين يُطلب البحث لكن الحساب لا يتيحه (حصة أو خطة). المزوّد
   * عندها يعيد المحاولة بلا بحث بدل أن يُسقط الطلب — والمستدعي هو من يقرر
   * ما يفعله بنتيجة غير متحقَّق منها خارجياً.
   */
  searchUsed: boolean;
}

export interface LLMProvider {
  readonly name: ProviderName;
  readonly model: string;
  generate<T>(request: GenerateRequest<T>): Promise<GenerateResult<T>>;
}
