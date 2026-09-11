import 'server-only';

import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';

import { NeedsHumanReview } from '../errors';

import type { Citation, GenerateRequest, GenerateResult, LLMProvider } from './types';

/**
 * مزوّد Anthropic Claude.
 *
 * فرق بنيوي عن Gemini يخفيه هذا الملف عن الوكلاء: خلط أداة البحث المستضافة
 * مع المخرجات المهيكلة في نداء واحد هشّ هنا. فحين يُطلب الاثنان معاً نقسّمها
 * إلى مرحلتين — بحث حرّ ثم تنظيم — ونعيد النتيجة بنفس الشكل الذي يعيده Gemini.
 */

export const anthropicConfigured = Boolean(process.env.ANTHROPIC_API_KEY);

let client: Anthropic | null = null;

function api(): Anthropic {
  if (!anthropicConfigured) {
    throw new Error('ANTHROPIC_API_KEY غير موجود — مزوّد Claude معطّل.');
  }
  if (!client) client = new Anthropic();
  return client;
}

function refusalGuard(response: { stop_reason?: string | null; stop_details?: unknown }): void {
  if (response.stop_reason !== 'refusal') return;
  const details = response.stop_details as { category?: string } | null;
  throw new NeedsHumanReview(
    `رفض النموذج معالجة الخبر (${details?.category ?? 'غير محدد'}).`,
  );
}

/** يجمع نصوص كتل الرد في سلسلة واحدة. */
function textOf(content: Anthropic.ContentBlock[]): string {
  return content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('\n');
}

/** يلتقط روابط نتائج البحث المستضاف لعرضها كمصادر في تقرير التدقيق. */
function citationsOf(content: Anthropic.ContentBlock[]): Citation[] {
  const found = new Map<string, Citation>();

  for (const block of content) {
    if (block.type !== 'web_search_tool_result') continue;

    // عند الخطأ يعود content كائناً واحداً لا مصفوفة — نتجاهله بهدوء
    const results = (block as { content?: unknown }).content;
    if (!Array.isArray(results)) continue;

    for (const result of results as { url?: string; title?: string }[]) {
      if (result.url && !found.has(result.url)) {
        found.set(result.url, { url: result.url, title: result.title ?? result.url });
      }
    }
  }

  return [...found.values()];
}

export function createAnthropicProvider(model: string): LLMProvider {
  return {
    name: 'anthropic',
    model,

    async generate<T>(request: GenerateRequest<T>): Promise<GenerateResult<T>> {
      const maxTokens = request.maxTokens ?? 16000;
      const effort = request.effort ?? 'medium';

      // ── الحالة البسيطة: مخطط بلا بحث ──────────────────────────
      if (request.schema && !request.webSearch) {
        const response = await api().messages.parse({
          model,
          max_tokens: maxTokens,
          system: request.system,
          thinking: { type: 'adaptive' },
          output_config: { effort, format: zodOutputFormat(request.schema) },
          messages: [{ role: 'user', content: request.prompt }],
        });

        refusalGuard(response);

        if (!response.parsed_output) {
          throw new NeedsHumanReview('تعذّر تحليل مخرجات Claude المهيكلة.');
        }

        return {
          parsed: response.parsed_output as T,
          text: textOf(response.content),
          citations: [],
          searchUsed: false,
        };
      }

      // ── المرحلة الأولى: توليد نصّي، مع البحث إن طُلب ───────────
      const research = await api().messages.create({
        model,
        max_tokens: maxTokens,
        system: request.system,
        thinking: { type: 'adaptive' },
        output_config: { effort },
        ...(request.webSearch
          ? { tools: [{ type: 'web_search_20260209' as const, name: 'web_search' as const, max_uses: 8 }] }
          : {}),
        messages: [{ role: 'user', content: request.prompt }],
      });

      refusalGuard(research);

      const text = textOf(research.content);
      const citations = citationsOf(research.content);

      if (!text.trim()) {
        throw new NeedsHumanReview('لم يُنتج Claude أي مخرجات نصّية.');
      }

      const searchUsed = Boolean(request.webSearch);

      if (!request.schema) return { parsed: null, text, citations, searchUsed };

      // ── المرحلة الثانية: تحويل الخلاصة إلى الشكل المطلوب ───────
      const structured = await api().messages.parse({
        model,
        max_tokens: 4000,
        system: 'حوّل التقرير التالي إلى الصيغة المطلوبة بدقة، بلا إضافة ولا تخفيف.',
        output_config: { effort: 'low', format: zodOutputFormat(request.schema) },
        messages: [{ role: 'user', content: text }],
      });

      refusalGuard(structured);

      if (!structured.parsed_output) {
        throw new NeedsHumanReview('تعذّر تحويل خلاصة Claude إلى الشكل المطلوب.');
      }

      return { parsed: structured.parsed_output as T, text, citations, searchUsed };
    },
  };
}
