import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import {
  AgentRefusal,
  FACT_CHECKER_EFFORT,
  FACT_CHECKER_MODEL,
  getAnthropic,
  webSearchEnabled,
} from "./client";
import type { Cluster } from "./ingest";
import type { Draft } from "./translator";
import type { FactCheckReport } from "../data/types";

/**
 * الوكيل الثالث: التدقيق قبل النشر.
 *
 * يعمل على خطوتين:
 *   1) بحث: يتحقق من الادعاءات مقابل الويب (يُعطَّل بمتغير البيئة).
 *   2) حكم: يخرج تقريراً منظّماً بدرجة ثقة رقمية تقرر مصير الخبر.
 *
 * التقرير داخلي بالكامل ولا يظهر للزوار — الحقل internal يُحذف في publicArticle().
 */

const ReportSchema = z.object({
  confidence: z
    .number()
    .int()
    .min(0)
    .max(100)
    .describe(
      "درجة الثقة في دقة الخبر ككل. 90+ يعني كل ادعاء مؤكد من مصدر موثوق. اخفض بشدة عند وجود أي ادعاء غير مدعوم",
    ),
  verdict: z.enum(["verified", "partially_verified", "unverified", "contradicted"]),
  claims: z.array(
    z.object({
      claim: z.string(),
      status: z.enum(["supported", "unsupported", "contradicted"]),
      note: z.string().describe("سبب الحكم في سطر واحد، مع ذكر المصدر إن وجد"),
    }),
  ),
  editorNotes: z
    .array(z.string())
    .describe("ما يجب على المحرر البشري تعديله أو الانتباه له قبل النشر"),
  independentSourceCount: z
    .number()
    .int()
    .describe("عدد المنافذ الإخبارية المستقلة فعلياً التي تدعم جوهر الخبر"),
});

const SYSTEM = `أنت مدقق معلومات صارم في قسم أخبار الفورمولا 1. مهمتك منع نشر أي خطأ.

منهجك:
- افترض أن الادعاء غير مدعوم حتى تجد ما يسنده. عبء الإثبات على الخبر لا عليك.
- ميّز بين ما تؤكده جهة رسمية (FIA، الفريق، السائق) وما ينقله صحفي عن مصدر مجهول.
- انتبه بشكل خاص إلى: الأرقام (نقاط، أزمنة، أعمار، مبالغ)، التواريخ، نسبة التصريحات لقائليها، وحالة العقود والانتقالات.
- الشائعات والانتقالات غير المعلنة رسمياً لا تتجاوز درجة ثقة 65 مهما تعددت المصادر.
- إذا كان الخبر يتحدث عن حدث لم يقع بعد بصيغة الماضي، فهذا تناقض صريح.
- لا تكافئ الصياغة الجيدة. الصياغة الحسنة لخبر خاطئ أخطر من الصياغة الركيكة.

كن كمّياً وصريحاً. درجة ثقة 100 نادرة جداً.`;

/** خطوة البحث — تجمع أدلة من الويب حول ادعاءات الخبر. */
async function research(client: Anthropic, draft: Draft): Promise<string> {
  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content:
        `تحقّق من الادعاءات التالية الواردة في خبر فورمولا 1 مرشّح للنشر. ` +
        `ابحث في الويب عن كل ادعاء واذكر ما وجدته ومصدره، أو صرّح بأنك لم تجد ما يؤكده.\n\n` +
        `العنوان: ${draft.title}\n\nالادعاءات:\n` +
        draft.claims.map((c, i) => `${i + 1}. ${c}`).join("\n"),
    },
  ];

  let response = await client.messages.create({
    model: FACT_CHECKER_MODEL,
    max_tokens: 8000,
    system: "أنت باحث تحقق. ابحث بدقة واذكر المصادر بروابطها. لا تصدر حكماً نهائياً بعد.",
    tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 6 }],
    messages,
    output_config: { effort: "medium" },
  });

  // البحث قد يوقف الدور مؤقتاً — نكمله حتى 3 مرات
  let guard = 0;
  while (response.stop_reason === "pause_turn" && guard++ < 3) {
    messages.push({ role: "assistant", content: response.content });
    response = await client.messages.create({
      model: FACT_CHECKER_MODEL,
      max_tokens: 8000,
      tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 6 }],
      messages,
      output_config: { effort: "medium" },
    });
  }

  return response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

/** يدقق مسوّدة ويعيد تقريراً كاملاً. */
export async function factCheck(draft: Draft, cluster: Cluster): Promise<FactCheckReport> {
  const client = getAnthropic();

  let evidence = "";
  if (webSearchEnabled()) {
    try {
      evidence = await research(client, draft);
    } catch (err) {
      console.warn("[fact-checker] تعذّر البحث في الويب:", (err as Error).message);
    }
  }

  const sourceBlock = cluster.items
    .map((i) => `- ${i.outlet} (ثقة ${i.trust}/5): ${i.title}\n  ${i.summary}\n  ${i.link}`)
    .join("\n");

  const response = await client.messages.parse({
    model: FACT_CHECKER_MODEL,
    max_tokens: 16000,
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: [
          "## الخبر المرشّح للنشر",
          `العنوان: ${draft.title}`,
          `الملخص: ${draft.excerpt}`,
          "",
          "المتن:",
          draft.body,
          "",
          "## الادعاءات المستخرجة",
          draft.claims.map((c, i) => `${i + 1}. ${c}`).join("\n"),
          "",
          draft.uncertainties.length
            ? `## ما أشار المحرر إلى عدم تأكده منه\n${draft.uncertainties.join("\n")}`
            : "",
          "",
          "## المصادر الأصلية",
          sourceBlock,
          "",
          evidence ? `## نتائج البحث في الويب\n${evidence}` : "## لم يُجرَ بحث في الويب لهذا الخبر",
          "",
          "أصدر تقرير التدقيق.",
        ].join("\n"),
      },
    ],
    output_config: {
      format: zodOutputFormat(ReportSchema, "fact_check"),
      effort: FACT_CHECKER_EFFORT,
    },
  });

  if (response.stop_reason === "refusal") {
    throw new AgentRefusal(
      response.stop_details?.category ?? null,
      response.stop_details?.explanation ?? null,
    );
  }

  const report = response.parsed_output;
  if (!report) throw new Error("تعذّر تحليل مخرجات وكيل التدقيق");

  return {
    ...report,
    checkedAt: new Date().toISOString(),
    model: FACT_CHECKER_MODEL,
  };
}
