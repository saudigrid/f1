import 'server-only';

import { createHash } from 'node:crypto';

import { PIPELINE_CONFIG } from '@/lib/config/pipeline';
import { getRepository } from '@/lib/data/repository';
import { resolveImage, type ResolvedImage } from '@/lib/images';
import type { Article, ArticleStatus, Category } from '@/lib/types';

import { NeedsHumanReview, QuotaExhausted } from './errors';
import { clusterStories, fetchAllSources, type StoryCluster } from './ingest';
import { anyProviderConfigured } from './providers';
import { factCheckDraft } from './factcheck';
import { draftArabicArticle, type Draft } from './translate';

/**
 * منسّق خط الأتمتة: جمع ← صياغة ← تدقيق ← قرار نشر.
 *
 * قرار النشر ليس عند النموذج. النموذج يعطي تقييماً، والقرار يُتخذ هنا
 * بقواعد مكتوبة صراحة في lib/config/pipeline.ts — بحيث تستطيع تغيير
 * سياسة النشر دون لمس أي منطق ذكاء اصطناعي.
 */

export interface RunSummary {
  fetched: number;
  clustered: number;
  processed: number;
  published: number;
  queuedForReview: number;
  failed: number;
  skippedDuplicates: number;
  errors: string[];
  /** توقفت التشغيلة قبل نهاية الطابور (نفاد حصة عادةً). */
  stoppedEarly: boolean;
  ranAt: string;
}

/** يقرّر مصير الخبر بعد التدقيق. */
function decideStatus(
  confidence: number,
  corroborating: number,
  isSpeculation: boolean,
  hasFactualErrors: boolean,
  category: Category,
): { status: ArticleStatus; reason: string } {
  // القفل العام يسبق كل شيء: حين يكون مرفوعاً لا يُنشر خبر تلقائياً مهما كانت أرقامه
  if (PIPELINE_CONFIG.requireHumanReview) {
    return { status: 'review', reason: 'سياسة الموقع: مراجعة بشرية لكل خبر' };
  }
  if (hasFactualErrors) {
    return { status: 'review', reason: 'وكيل التدقيق وجد أخطاء صريحة' };
  }
  if (PIPELINE_CONFIG.alwaysReviewSpeculation && isSpeculation) {
    return { status: 'review', reason: 'الخبر تكهّنات أو إشاعة سوق' };
  }
  if ((PIPELINE_CONFIG.alwaysReviewCategories as readonly string[]).includes(category)) {
    return { status: 'review', reason: `تصنيف «${category}» يخضع لمراجعة إلزامية` };
  }
  if (corroborating < PIPELINE_CONFIG.minCorroboratingSources) {
    return { status: 'review', reason: `مصادر مستقلة غير كافية (${corroborating})` };
  }
  if (confidence < PIPELINE_CONFIG.autoPublishConfidence) {
    return { status: 'review', reason: `الثقة ${confidence} دون حدّ النشر التلقائي` };
  }
  return { status: 'published', reason: 'استوفى شروط النشر التلقائي' };
}

function makeId(clusterKey: string): string {
  return createHash('sha1').update(clusterKey).digest('hex').slice(0, 16);
}

/** رابط الخبر: مفتاح إنجليزي مقروء + بصمة قصيرة تضمن التفرّد. */
function makeSlug(clusterKey: string, id: string): string {
  const base = clusterKey.replace(/[^a-z0-9-]/g, '').slice(0, 60) || 'f1-news';
  return `${base}-${id.slice(0, 6)}`;
}

function estimateReadingMinutes(body: string): number {
  const words = body.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 180)); // ~180 كلمة عربية في الدقيقة
}

function buildArticle(
  cluster: StoryCluster,
  draft: Draft,
  report: Awaited<ReturnType<typeof factCheckDraft>>,
  status: ArticleStatus,
  image: ResolvedImage | null,
): Article {
  const id = makeId(cluster.key);
  const { factualErrors, ...factCheck } = report;

  return {
    id,
    slug: makeSlug(cluster.key, id),
    title: draft.title,
    excerpt: draft.excerpt,
    body: draft.body,
    category: draft.category,
    tags: draft.tags,
    heroImage: image?.url ?? null,
    heroImageAlt: image?.alt ?? draft.heroImageAlt,
    heroImageCredit: image?.credit ?? null,
    publishedAt: cluster.items[0].publishedAt,
    updatedAt: null,
    readingMinutes: estimateReadingMinutes(draft.body),
    status,
    sources: cluster.items.map((item) => ({
      name: item.sourceName,
      url: item.url,
      publishedAt: item.publishedAt,
    })),
    factCheck: {
      ...factCheck,
      // الأخطاء الصريحة تُدمج في ملاحظات المحرّر حتى تراها في لوحة المراجعة
      editorNotes: factualErrors.length
        ? `${factCheck.editorNotes}\n\nأخطاء رُصدت: ${factualErrors.join(' | ')}`.trim()
        : factCheck.editorNotes,
    },
    humanReviewed: false,
  };
}

export async function runPipeline(): Promise<RunSummary> {
  const summary: RunSummary = {
    fetched: 0,
    clustered: 0,
    processed: 0,
    published: 0,
    queuedForReview: 0,
    failed: 0,
    skippedDuplicates: 0,
    errors: [],
    stoppedEarly: false,
    ranAt: new Date().toISOString(),
  };

  if (!anyProviderConfigured) {
    summary.errors.push(
      'لا يوجد مفتاح لأي مزوّد (GOOGLE_API_KEY أو ANTHROPIC_API_KEY) — لم يُشغَّل خط الأتمتة.',
    );
    return summary;
  }

  const repo = await getRepository();

  /** أسماء الموسم الحالي — تميّز الصورة الحديثة من الأرشيفية في طبقة الصور. */
  const [gridDrivers, gridTeams] = await Promise.all([repo.listDrivers(), repo.listTeams()]);
  const currentGrid = [...gridDrivers.map((d) => d.nameEn), ...gridTeams.map((t) => t.nameEn)];

  const items = await fetchAllSources();
  summary.fetched = items.length;

  const clusters = clusterStories(items);
  summary.clustered = clusters.length;

  // نتجاهل ما سبق نشره: المعرّف مشتق من مفتاح العنقود، فالخبر نفسه ينتج نفس المعرّف
  const existing = new Set(
    [...(await repo.listForReview()), ...(await repo.listPublished({ limit: 200 }))].map(
      (a) => a.id,
    ),
  );

  const queue = clusters
    .filter((c) => {
      if (existing.has(makeId(c.key))) {
        summary.skippedDuplicates += 1;
        return false;
      }
      return true;
    })
    .slice(0, PIPELINE_CONFIG.maxArticlesPerRun);

  const produced: Article[] = [];
  /** صور استُخدمت في هذه التشغيلة — تمنع تكرار الصورة عبر أخبار مختلفة. */
  const usedImages: string[] = [];

  for (const cluster of queue) {
    try {
      const draft = await draftArabicArticle(cluster);
      const report = await factCheckDraft(draft, cluster);

      const { status, reason } = decideStatus(
        report.confidence,
        report.corroboratingSources,
        report.isSpeculation,
        report.factualErrors.length > 0,
        draft.category,
      );

      /**
       * الصورة تُطلب بعد التدقيق لا قبله: خبر يسقط في التدقيق لا داعي
       * لاستهلاك طلب صورة له.
       */
      const image = await resolveImage({
        feedImages: cluster.items
          .filter((item) => item.imageUrl)
          .map((item) => ({
            sourceId: item.sourceId,
            sourceName: item.sourceName,
            url: item.imageUrl as string,
          })),
        entities: draft.imageEntities,
        alt: draft.heroImageAlt,
        currentGrid,
        topic: { title: draft.title, keywords: draft.tags, category: draft.category },
        exclude: usedImages,
      });

      if (image) usedImages.push(image.url);

      const article = buildArticle(cluster, draft, report, status, image);
      article.factCheck!.editorNotes = `${reason}. ${article.factCheck!.editorNotes}`.trim();

      produced.push(article);
      summary.processed += 1;
      if (status === 'published') summary.published += 1;
      else summary.queuedForReview += 1;
    } catch (error) {
      /**
       * نفاد الحصة يخصّ التشغيلة كلها لا هذا الخبر وحده. الاستمرار بعده يعني
       * محاولات فاشلة مؤكدة تملأ السجلّ بنفس الرسالة وتخفي الأخبار التي
       * عولجت بنجاح. نتوقف ونحفظ ما أنجزناه.
       */
      if (error instanceof QuotaExhausted) {
        summary.stoppedEarly = true;
        summary.errors.push(
          `${error.message} توقّفت التشغيلة بعد ${summary.processed} خبراً، ` +
            `وبقي ${queue.length - summary.processed - summary.failed} في الانتظار.`,
        );
        break;
      }

      summary.failed += 1;
      const message = error instanceof Error ? error.message : String(error);
      summary.errors.push(`[${cluster.key}] ${message}`);
      // NeedsHumanReview ليس عطلاً — إنه القرار الصحيح حين يتعذّر التحقق
      if (!(error instanceof NeedsHumanReview)) {
        console.error(`[pipeline] فشل معالجة ${cluster.key}`, error);
      }
    }
  }

  if (produced.length > 0) await repo.upsertArticles(produced);

  return summary;
}
