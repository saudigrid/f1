import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import {
  AgentRefusal,
  TRANSLATOR_EFFORT,
  TRANSLATOR_MODEL,
  getAnthropic,
} from "./client";
import type { Cluster } from "./ingest";

/**
 * الوكيل الثاني: التحرير العربي.
 *
 * ليس مترجماً حرفياً. مهمته إعادة صياغة الحدث بلغة صحفية عربية أصلية
 * انطلاقاً من عدة مصادر، مع إسناد كل معلومة. هذا اختيار تحريري وقانوني معاً:
 * الترجمة الحرفية لمقال محمي إعادةُ نشر، أما الخبر المُعاد تحريره من عدة
 * مصادر مع الإسناد فهو عمل صحفي مستقل.
 */

const DraftSchema = z.object({
  slug: z
    .string()
    .describe("معرّف لاتيني بالشرطات مشتق من الحدث، 3-8 كلمات، بدون تاريخ"),
  title: z.string().describe("عنوان عربي جذاب ودقيق، 40-70 حرفاً، بدون مبالغة"),
  excerpt: z.string().describe("جملة واحدة تلخّص الخبر، 90-160 حرفاً"),
  body: z
    .string()
    .describe(
      "متن الخبر بالعربية الفصحى الصحفية بصيغة Markdown: 4-7 فقرات، يجوز استخدام ## لعنوان فرعي واحد. بدون عناوين أخرى وبدون قوائم إلا للضرورة",
    ),
  category: z.enum(["news", "tech", "transfers", "regulations", "saudi"]),
  tags: z.array(z.string()).describe("3-6 وسوم عربية: أسماء فرق وسائقين وحلبات"),
  readingMinutes: z.number().int().min(1).max(15),
  claims: z
    .array(z.string())
    .describe(
      "كل ادعاء واقعي محدد ورد في المتن (رقم، تاريخ، تصريح، نتيجة، قرار) بجملة مستقلة — يستخدمها وكيل التدقيق",
    ),
  /** إشارة الوكيل نفسه إلى ما لم يستطع تأكيده */
  uncertainties: z
    .array(z.string())
    .describe("النقاط التي لم تتضح من المصادر أو تناقضت فيها، إن وجدت"),
});

export type Draft = z.infer<typeof DraftSchema>;

const SYSTEM = `أنت محرر عربي متخصص في رياضة الفورمولا 1 تكتب لموقع "Saudi F1 Grid".

هويتك التحريرية:
- التغطية عالمية: كل الفرق والسائقين والسباقات، لا تركّز على السعودية إلا حين يكون الخبر عنها فعلاً.
- لغتك عربية فصحى صحفية حديثة، مباشرة وبلا إنشاء أو مبالغة.
- تستخدم المصطلحات المتعارف عليها عربياً: "التجارب التأهيلية"، "لفة التتويج"، "استراتيجية التوقفات"، "وحدة القدرة"، "الجناح الخلفي"، "سيارة الأمان"، "منطقة التجاوز DRS"، "معدل الانحدار الأرضي".
- أسماء السائقين والفرق تُكتب بالعربية مع ذكر الاسم اللاتيني بين قوسين عند أول ورود.

قواعد غير قابلة للتفاوض:
1. لا تترجم نص المصدر حرفياً. أعد بناء الخبر بصياغتك من المعطيات المشتركة بين المصادر.
2. لا تخترع أي معلومة. أي رقم أو تصريح أو تاريخ يجب أن يكون موجوداً في المصادر المعطاة لك.
3. إذا تناقضت المصادر، اذكر التناقض صراحة في المتن وأضفه إلى uncertainties.
4. إذا كان الخبر إشاعة أو تقريراً غير مؤكد، قل ذلك في المتن بصيغة "بحسب تقرير..." ولا تقدّمه كحقيقة.
5. لا تقتبس أكثر من جملة قصيرة واحدة من أي مصدر، وضعها بين علامتي تنصيص مع نسبتها لقائلها.
6. صنّف الخبر في saudi فقط إذا كان محوره الجائزة الكبرى السعودية أو حلبة جدة أو حضور سعودي في الرياضة.`;

/** يحوّل مجموعة مصادر إلى مسوّدة عربية جاهزة للتدقيق. */
export async function translate(cluster: Cluster): Promise<Draft> {
  const client = getAnthropic();

  const sourceBlock = cluster.items
    .map(
      (item, i) =>
        `### المصدر ${i + 1}: ${item.outlet} (ثقة ${item.trust}/5)\n` +
        `العنوان: ${item.title}\n` +
        `الملخص: ${item.summary}\n` +
        `الرابط: ${item.link}\n` +
        `النشر: ${item.publishedAt}`,
    )
    .join("\n\n");

  const response = await client.messages.parse({
    model: TRANSLATOR_MODEL,
    max_tokens: 16000,
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content:
          `حرّر خبراً عربياً واحداً من المصادر التالية. ` +
          `عدد المنافذ المستقلة التي غطّت الحدث: ${cluster.independentSources}.\n\n${sourceBlock}`,
      },
    ],
    output_config: {
      format: zodOutputFormat(DraftSchema, "draft"),
      effort: TRANSLATOR_EFFORT,
    },
  });

  if (response.stop_reason === "refusal") {
    throw new AgentRefusal(
      response.stop_details?.category ?? null,
      response.stop_details?.explanation ?? null,
    );
  }

  const draft = response.parsed_output;
  if (!draft) throw new Error("تعذّر تحليل مخرجات وكيل التحرير");
  return draft;
}
