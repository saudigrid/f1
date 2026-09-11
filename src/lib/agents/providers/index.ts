import 'server-only';

import { PIPELINE_CONFIG, type AgentRole } from '@/lib/config/pipeline';

import { anthropicConfigured, createAnthropicProvider } from './anthropic';
import { geminiConfigured, createGeminiProvider } from './gemini';
import type { LLMProvider, ProviderName } from './types';

export type { Citation, GenerateRequest, GenerateResult, LLMProvider, ProviderName } from './types';

/** هل يوجد مفتاح لأي مزوّد؟ بدونه خط الأتمتة لا يعمل أصلاً. */
export const anyProviderConfigured = geminiConfigured || anthropicConfigured;

function isConfigured(provider: ProviderName): boolean {
  return provider === 'gemini' ? geminiConfigured : anthropicConfigured;
}

const cache = new Map<string, LLMProvider>();

/**
 * يعيد المزوّد المناسب لدور الوكيل حسب `config/pipeline.ts`.
 *
 * إن كان المزوّد المختار بلا مفتاح ووُجد مفتاح للآخر، نتحوّل إليه مع تحذير
 * صريح في السجلّ بدل أن نُسقط التشغيلة كلها — نصف تغطية أفضل من صفر، ما دام
 * التحوّل ظاهراً لا صامتاً.
 */
export function getProvider(role: AgentRole): LLMProvider {
  const configured = PIPELINE_CONFIG.agents[role];

  let provider: ProviderName = configured.provider;
  let model: string = configured.model;

  if (!isConfigured(provider)) {
    const fallback: ProviderName = provider === 'gemini' ? 'anthropic' : 'gemini';

    if (!isConfigured(fallback)) {
      throw new Error(
        `لا يوجد مفتاح لأي مزوّد. أضف GOOGLE_API_KEY أو ANTHROPIC_API_KEY إلى .env`,
      );
    }

    console.warn(
      `[providers] المزوّد «${provider}» بلا مفتاح — تحوّل الدور «${role}» إلى «${fallback}».`,
    );
    provider = fallback;
    model = PIPELINE_CONFIG.fallbackModels[fallback];
  }

  const key = `${provider}:${model}`;
  let instance = cache.get(key);

  if (!instance) {
    instance = provider === 'gemini' ? createGeminiProvider(model) : createAnthropicProvider(model);
    cache.set(key, instance);
  }

  return instance;
}
