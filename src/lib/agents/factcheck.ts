import 'server-only';

import * as z from 'zod';

import { PIPELINE_CONFIG } from '@/lib/config/pipeline';
import type { FactCheckReport } from '@/lib/types';

import { NeedsHumanReview } from './errors';
import type { StoryCluster } from './ingest';
import { getProvider } from './providers';
import type { Draft } from './translate';

/**
 * الوكيل الثالث: التدقيق.
 *
 * يبحث على الويب ليقارن كل واقعة بمصادر مستقلة عن مصادر المسوّدة، ثم يعيد
 * تقريراً منظّماً قابلاً للاحتساب. كم نداءً يستغرق ذلك؟ يعتمد على المزوّد،
 * وهذا الملف لا يعرف ولا يهتم — طبقة المزوّدين تتكفّل بالفرق.
 *
 * التقرير كله داخلي — لا يصل منه حرف واحد إلى المتصفح.
 */

const VerdictSchema = z.object({
  confidence: z.number().min(0).max(100).describe('درجة الثقة الإجمالية في دقة الخبر'),
  corroboratingSources: z
    .number()
    .min(0)
    .describe('عدد المصادر المستقلة التي أكّدت جوهر الخبر، بما فيها مصادر المسوّدة'),
  unverifiedClaims: z.array(z.string()).describe('ادعاءات لم يمكن تأكيدها، بالعربية'),
  factualErrors: z.array(z.string()).describe('أخطاء صريحة وجدتها في المسوّدة، بالعربية'),
  isSpeculation: z.boolean().describe('هل جوهر الخبر تكهّنات أو إشاعة سوق؟'),
  editorNotes: z.string().describe('ملاحظات موجزة للمحرّر البشري بالعربية'),
});

const SYSTEM = `أنت مدقّق حقائق في قسم الفورمولا 1. مهمّتك التحقق، لا التحسين.

اعمل هكذا:
1. استخرج الوقائع القابلة للتحقق من المسوّدة (أرقام، نتائج، تصريحات، تواريخ، أسماء).
2. ابحث عن كل واقعة مهمة في مصادر مستقلة عن مصادر المسوّدة الأصلية.
3. صنّف كل واقعة: مؤكدة / متعارضة / غير موجودة.
4. انتبه تحديداً إلى: أرقام النقاط والترتيب، أسماء الفرق والسائقين لهذا الموسم،
   أزمنة اللفات، وصياغة التصريحات المنسوبة.

كن متشدداً. غياب الدليل ليس دليل صحة. إذا لم تجد تأكيداً مستقلاً فقل ذلك صراحة
واخفض درجة الثقة. لا تعدّل نص المسوّدة — قيّمه فقط.

أعد النتيجة كائن JSON مطابقاً للمخطط المطلوب، بلا أي نص خارجه.`;

export async function factCheckDraft(
  draft: Draft,
  cluster: StoryCluster,
): Promise<FactCheckReport & { factualErrors: string[] }> {
  const draftBlock =
    `العنوان: ${draft.title}\n\n` +
    `الملخّص: ${draft.excerpt}\n\n` +
    `المتن:\n${draft.body}\n\n` +
    `وقائع يريد المحرّر التحقق منها:\n${draft.claimsToVerify.map((c) => `- ${c}`).join('\n')}\n\n` +
    `المصادر الأصلية (${cluster.items.length}):\n` +
    cluster.items.map((i) => `- ${i.sourceName}: ${i.url}`).join('\n');

  const { parsed, searchUsed } = await getProvider('factCheck').generate({
    system: SYSTEM,
    prompt: `دقّق هذه المسوّدة:\n\n${draftBlock}`,
    schema: VerdictSchema,
    webSearch: true,
    effort: PIPELINE_CONFIG.effort.factCheck,
  });

  if (!parsed) throw new NeedsHumanReview('تعذّر الحصول على تقرير من وكيل التدقيق.');

  /**
   * تدقيق بلا بحث خارجي ليس تدقيقاً كاملاً — إنه فحص اتساق داخلي مقابل مصادر
   * المسوّدة نفسها. النموذج لا يعرف أن بحثه فشل، فقد يعطي ثقة عالية عن جدارة
   * ظاهرية. نحن نعرف، فنسقّف الثقة تحت حدّ النشر التلقائي: النتيجة تبقى مفيدة
   * للمحرّر، لكنها لا تستطيع النشر وحدها.
   */
  const ceiling = PIPELINE_CONFIG.autoPublishConfidence - 1;
  const rawConfidence = Math.round(parsed.confidence);
  const confidence = searchUsed ? rawConfidence : Math.min(rawConfidence, ceiling);

  const searchNote = searchUsed
    ? ''
    : `⚠ لم يجرِ بحث خارجي (غير متاح على خطة الحساب الحالية). ` +
      `الثقة سُقّفت من ${rawConfidence} إلى ${confidence}. ` +
      `هذا فحص اتساق داخلي فقط، لا تحقّق مستقل.`;

  return {
    confidence,
    /**
     * لا نثق بعدّ النموذج وحده: عدد مصادر العنقود حقيقة نعرفها بأنفسنا، فنأخذ
     * الأعلى. هذا يمنع النموذج من تخفيض رقم نعرف أنه أكبر، ويترك له رفعه إن
     * وجد تأكيداً إضافياً في بحثه.
     */
    corroboratingSources: Math.max(parsed.corroboratingSources, cluster.items.length),
    unverifiedClaims: parsed.unverifiedClaims,
    factualErrors: parsed.factualErrors,
    isSpeculation: parsed.isSpeculation,
    editorNotes: [searchNote, parsed.editorNotes].filter(Boolean).join('\n\n'),
    checkedAt: new Date().toISOString(),
  };
}
