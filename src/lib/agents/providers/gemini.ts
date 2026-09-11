import 'server-only';

import { GoogleGenAI } from '@google/genai';
import * as z from 'zod';

import { NeedsHumanReview, QuotaExhausted } from '../errors';

import type { Citation, GenerateRequest, GenerateResult, LLMProvider } from './types';

/**
 * مزوّد Google Gemini — عبر واجهة Interactions.
 *
 * ميزته الحاسمة لوكيل التدقيق: يجمع **ربط بحث جوجل مع المخرجات المهيكلة في
 * نداء واحد**، فيبحث ويحكم ويعيد تقريراً منظّماً دفعة واحدة. مزوّد Claude
 * يحتاج ندائين لنفس النتيجة (انظر anthropic.ts) — والوكيل لا يرى هذا الفرق.
 */

const API_KEY = process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY;

export const geminiConfigured = Boolean(API_KEY);

let client: GoogleGenAI | null = null;

function api(): GoogleGenAI {
  if (!API_KEY) throw new Error('GOOGLE_API_KEY غير موجود — مزوّد Gemini معطّل.');
  if (!client) client = new GoogleGenAI({ apiKey: API_KEY });
  return client;
}

/** Gemini يرفض مفاتيح JSON Schema التي لا يعرفها، و`$schema` أبرزها. */
function toGeminiSchema(schema: z.ZodType): Record<string, unknown> {
  const json = z.toJSONSchema(schema) as Record<string, unknown>;
  delete json.$schema;
  return json;
}

/**
 * يستخرج مصادر الاستشهاد من خطوات الاستجابة.
 *
 * نمشي على البنية بفحوص وقت التشغيل بدل الاعتماد على الأنواع: شكل `steps`
 * اتحاد واسع يتغيّر بين إصدارات الحزمة، وفشل استخراج المصادر يجب ألا يُسقط
 * تدقيق خبر — أسوأ ما يحدث أن يصل الخبر للمراجعة اليدوية بمصادر أقل.
 */
function extractCitations(interaction: unknown): Citation[] {
  const found = new Map<string, Citation>();

  const visit = (node: unknown): void => {
    if (Array.isArray(node)) {
      for (const item of node) visit(item);
      return;
    }
    if (!node || typeof node !== 'object') return;

    const record = node as Record<string, unknown>;

    if (record.type === 'url_citation' && typeof record.url === 'string') {
      const url = record.url;
      if (!found.has(url)) {
        found.set(url, {
          url,
          title: typeof record.title === 'string' && record.title ? record.title : url,
        });
      }
    }

    for (const value of Object.values(record)) visit(value);
  };

  visit(interaction);
  return [...found.values()];
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function statusOf(error: unknown): number | undefined {
  return (error as { status?: number })?.status;
}

/**
 * هل نفدت حصة الطلبات العامة؟
 *
 * الواجهة تسمّي المقياس صراحة في هذه الحالة (`generate_content_free_tier_requests`
 * مثلاً). هذا ما يفرّقها عن رفض البحث: الأول يعني «كفى لهذا اليوم»، والثاني
 * يعني «هذه القدرة ليست في خطتك». الاثنان يردّان 429، والخلط بينهما يجعل
 * النظام يعيد المحاولة بلا جدوى أو يستسلم بلا داعٍ.
 */
function isRequestQuotaExhausted(error: unknown): boolean {
  return /generate_content|_requests\b|requests per|limit:\s*\d+/i.test(messageOf(error));
}

/** كم ثانية تنصح الواجهة بالانتظار — تأتي بصيغة «Please retry in 24.17s». */
function retryAfterSeconds(error: unknown): number | null {
  const match = messageOf(error).match(/retry in ([\d.]+)s/i);
  return match ? Math.ceil(Number(match[1])) : null;
}

/**
 * هل يعني هذا الخطأ أن **ربط البحث** غير متاح لهذا الحساب؟
 *
 * ربط بحث جوجل يحتاج خطة مفعّلة الفوترة؛ الحساب المجاني يردّ 429 فوراً
 * (أو 403) برسالة عامة عن الحصة والفوترة **بلا تسمية مقياس**. نميّز هذه
 * الحالة لأنها ليست عطلاً عابراً بل قدرة غائبة — والتصرف الصحيح أن نكمل
 * بلا بحث ونعلن ذلك، لا أن نُسقط الخبر.
 */
function isSearchUnavailable(error: unknown): boolean {
  // نفاد الحصة العامة ليس غياباً للبحث — لا تُعِد المحاولة بلا بحث، فستفشل أيضاً
  if (isRequestQuotaExhausted(error)) return false;

  const status = statusOf(error);
  if (status === 429 || status === 403) return true;

  return /\b(429|403)\b|quota|billing|permission/i.test(messageOf(error));
}

export function createGeminiProvider(model: string): LLMProvider {
  return {
    name: 'gemini',
    model,

    async generate<T>(request: GenerateRequest<T>): Promise<GenerateResult<T>> {
      const build = (withSearch: boolean) => ({
        model,
        input: request.prompt,
        system_instruction: request.system,
        generation_config: {
          max_output_tokens: request.maxTokens ?? 8192,
          thinking_level: request.effort ?? 'medium',
        },
        ...(withSearch ? { tools: [{ type: 'google_search' as const }] } : {}),
        ...(request.schema
          ? {
              response_format: {
                type: 'text' as const,
                mime_type: 'application/json',
                schema: toGeminiSchema(request.schema),
              },
            }
          : {}),
      });

      /** يحوّل نفاد الحصة إلى خطأ يفهمه المنسّق ويوقف عنده التشغيلة. */
      const send = async (withSearch: boolean) => {
        try {
          return await api().interactions.create(build(withSearch));
        } catch (error) {
          if (isRequestQuotaExhausted(error)) {
            const wait = retryAfterSeconds(error);
            throw new QuotaExhausted(
              `نفدت حصة طلبات Gemini${wait ? ` — تنصح الواجهة بالانتظار ${wait} ثانية` : ''}.`,
              wait,
            );
          }
          throw error;
        }
      };

      let searchUsed = Boolean(request.webSearch);
      let interaction;

      try {
        interaction = await send(searchUsed);
      } catch (error) {
        if (!searchUsed || !isSearchUnavailable(error)) throw error;

        console.warn(
          '[gemini] ربط بحث جوجل غير متاح لهذا الحساب — إعادة المحاولة بلا بحث. ' +
            'النتيجة ستُعامَل كغير متحقَّق منها خارجياً.',
        );
        searchUsed = false;
        interaction = await send(false);
      }

      const text = interaction.output_text ?? '';

      if (!text.trim()) {
        // استجابة فارغة تعني غالباً حجباً بفلاتر الأمان أو انقطاع التوليد
        throw new NeedsHumanReview('لم يُنتج Gemini أي مخرجات نصّية.');
      }

      let parsed: T | null = null;
      if (request.schema) {
        try {
          parsed = request.schema.parse(JSON.parse(text)) as T;
        } catch (error) {
          const reason = error instanceof Error ? error.message : String(error);
          throw new NeedsHumanReview(`مخرجات Gemini لم تطابق المخطط المطلوب: ${reason}`);
        }
      }

      return { parsed, text, citations: extractCitations(interaction), searchUsed };
    },
  };
}
