import 'server-only';

import { licensedFeedProvider } from './licensed-feed';
import { topicFallbackProvider } from './topic-fallback';
import type { ImageQuery, ResolvedImage } from './types';
import { wikimediaProvider } from './wikimedia';

export type { ImageQuery, ResolvedImage } from './types';

/**
 * ترتيب المزوّدين — أول من يعيد صورة يفوز.
 *
 * ١. صورة الخبر نفسه من ناشر مرخّص: الأدقّ لأنها تصوير الحدث المقصود.
 * ٢. ويكيميديا بالكيان: صورة السائق أو الفريق أو الجولة.
 * ٣. ويكيميديا بالموضوع: وحدة طاقة، إطارات، حلبة — لأخبار لا بطل لها.
 * ٤. لا شيء → نمط الهوية في البطاقة.
 *
 * لإضافة مصدر مدفوع لاحقاً (Getty مثلاً): اكتب مزوّداً يحقّق ImageProvider
 * وضعه في هذه المصفوفة بالموضع الذي تريده. لا شيء آخر يتغيّر.
 */
const PROVIDERS = [licensedFeedProvider, wikimediaProvider, topicFallbackProvider];

export async function resolveImage(query: ImageQuery): Promise<ResolvedImage | null> {
  for (const provider of PROVIDERS) {
    try {
      const image = await provider.resolve(query);
      if (image) return image;
    } catch (error) {
      // فشل مزوّد صور لا يُسقط خبراً — ننتقل للتالي ونمضي
      console.warn(
        `[images] تعذّر ${provider.name}: ${error instanceof Error ? error.message : error}`,
      );
    }
  }
  return null;
}
