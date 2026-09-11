/**
 * تشغيل خط الأتمتة يدوياً من الطرفية:
 *   npm run pipeline
 *
 * مفيد لتجربة الوكيلين قبل ربط Vercel Cron، ولفحص ما يصل لطابور المراجعة.
 */

import { runPipeline } from '../src/lib/agents/pipeline';

async function main() {
  console.log('▶ تشغيل خط الأتمتة…\n');
  const summary = await runPipeline();

  console.log('── الخلاصة ─────────────────────');
  console.log(`مسحوب من المصادر : ${summary.fetched}`);
  console.log(`عناقيد أخبار      : ${summary.clustered}`);
  console.log(`تخطّي مكرّر        : ${summary.skippedDuplicates}`);
  console.log(`تمت معالجته      : ${summary.processed}`);
  console.log(`نُشر تلقائياً      : ${summary.published}`);
  console.log(`للمراجعة اليدوية  : ${summary.queuedForReview}`);
  console.log(`فشل              : ${summary.failed}`);

  if (summary.stoppedEarly) {
    console.log('\n⚠ توقفت التشغيلة مبكراً — ما أُنجز قبل التوقف محفوظ.');
  }

  if (summary.errors.length > 0) {
    console.log('\n── ملاحظات ─────────────────────');
    for (const error of summary.errors) console.log(`• ${error}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
