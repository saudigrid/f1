import type { ArticleStatus, FactCheckReport } from "../data/types";

/**
 * سياسة النشر الهجينة.
 *
 * القرار يعتمد على تقرير وكيل التدقيق وليس على رأي وكيل التحرير — الوكيل
 * الذي كتب الخبر لا يملك صلاحية نشره. كل الأرقام قابلة للضبط من البيئة.
 */

/** أدنى درجة ثقة تسمح بالنشر التلقائي. */
export const AUTO_PUBLISH_MIN_CONFIDENCE = Number(process.env.AUTO_PUBLISH_MIN_CONFIDENCE ?? 88);

/** أدنى عدد منافذ مستقلة للنشر التلقائي. */
export const AUTO_PUBLISH_MIN_SOURCES = Number(process.env.AUTO_PUBLISH_MIN_SOURCES ?? 2);

/** أقصى درجة ثقة تُرفض تحتها المسوّدة نهائياً بدل إشغال طابور المراجعة. */
export const REJECT_BELOW_CONFIDENCE = Number(process.env.REJECT_BELOW_CONFIDENCE ?? 35);

/** أقسام لا تُنشر تلقائياً أبداً مهما ارتفعت الثقة. */
const ALWAYS_REVIEW_CATEGORIES = new Set(["transfers"]);

export interface PublishDecision {
  status: ArticleStatus;
  autoPublished: boolean;
  /** سبب القرار — يظهر في لوحة المراجعة وسجل التشغيل */
  reason: string;
}

export function decide(report: FactCheckReport, category: string): PublishDecision {
  if (report.verdict === "contradicted" || report.confidence < REJECT_BELOW_CONFIDENCE) {
    return {
      status: "rejected",
      autoPublished: false,
      reason: `مرفوض: الحكم ${report.verdict} بثقة ${report.confidence}`,
    };
  }

  if (ALWAYS_REVIEW_CATEGORIES.has(category)) {
    return {
      status: "pending_review",
      autoPublished: false,
      reason: "أخبار الانتقالات تمر بمراجعة بشرية دائماً",
    };
  }

  const hasUnsupported = report.claims.some((c) => c.status !== "supported");
  if (hasUnsupported) {
    const n = report.claims.filter((c) => c.status !== "supported").length;
    return {
      status: "pending_review",
      autoPublished: false,
      reason: `${n} ادعاء غير مؤكد يحتاج مراجعة`,
    };
  }

  if (
    report.verdict === "verified" &&
    report.confidence >= AUTO_PUBLISH_MIN_CONFIDENCE &&
    report.independentSourceCount >= AUTO_PUBLISH_MIN_SOURCES
  ) {
    return {
      status: "published",
      autoPublished: true,
      reason: `نشر تلقائي: ثقة ${report.confidence} من ${report.independentSourceCount} مصادر مستقلة`,
    };
  }

  return {
    status: "pending_review",
    autoPublished: false,
    reason: `ثقة ${report.confidence} دون عتبة النشر التلقائي (${AUTO_PUBLISH_MIN_CONFIDENCE})`,
  };
}
