/**
 * فحص سريع للمزوّد قبل تشغيل خط الأتمتة كاملاً.
 *
 *   npm run check
 *
 * يجري نداءين صغيرين فقط — واحد للمخرجات المهيكلة وآخر للبحث — بتكلفة
 * لا تُذكر. الغرض أن تكتشف مشكلة مفتاح أو نموذج في ثوانٍ بدل أن تكتشفها
 * بعد اثنتي عشرة محاولة فاشلة داخل التشغيلة الكاملة.
 *
 * لا يطبع المفتاح ولا أي جزء منه.
 */

import * as z from 'zod';

import { PIPELINE_CONFIG } from '../src/lib/config/pipeline';
import { getProvider } from '../src/lib/agents/providers';

const Answer = z.object({
  answer: z.string().describe('الإجابة بالعربية في جملة واحدة قصيرة'),
});

function keyState(name: string): string {
  const value = process.env[name];
  if (!value) return 'غير موجود';
  return `موجود (${value.length} محرفاً)`;
}

/** نتيجة اختبار واحد: هل نجح، وهل جرى البحث فعلاً. */
interface ProbeResult {
  ok: boolean;
  searchUsed: boolean;
}

async function probe(role: 'translate' | 'factCheck', webSearch: boolean): Promise<ProbeResult> {
  const provider = getProvider(role);
  const label = `${role} → ${provider.name}/${provider.model}${webSearch ? ' + بحث' : ''}`;

  process.stdout.write(`  ${label} … `);

  try {
    const started = Date.now();
    const { parsed, searchUsed } = await provider.generate({
      system: 'أجب بإيجاز شديد بالعربية.',
      prompt: webSearch
        ? 'من فاز بجائزة إيطاليا الكبرى للفورمولا 1 في عام 2025؟'
        : 'ما اسم الرياضة التي تُقام فيها جائزة موناكو الكبرى؟',
      schema: Answer,
      webSearch,
      effort: 'low',
      maxTokens: 2000,
    });

    const seconds = ((Date.now() - started) / 1000).toFixed(1);
    console.log(`✓ (${seconds}ث)`);
    console.log(`      ← ${parsed?.answer ?? '—'}`);
    return { ok: true, searchUsed };
  } catch (error) {
    console.log('✗');
    console.log(`      ${error instanceof Error ? error.message : String(error)}`);
    return { ok: false, searchUsed: false };
  }
}

async function main(): Promise<void> {
  console.log('▶ فحص المزوّدين\n');

  console.log('المفاتيح:');
  console.log(`  GOOGLE_API_KEY    : ${keyState('GOOGLE_API_KEY')}`);
  console.log(`  ANTHROPIC_API_KEY : ${keyState('ANTHROPIC_API_KEY')}`);

  console.log('\nالإعدادات:');
  for (const [role, cfg] of Object.entries(PIPELINE_CONFIG.agents)) {
    console.log(`  ${role.padEnd(10)}: ${cfg.provider} / ${cfg.model}`);
  }

  console.log('\nالاختبارات:');
  const structured = await probe('translate', false);
  const grounded = await probe('factCheck', true);

  console.log('\n── قدرة التحقق الخارجي ─────────');
  if (grounded.searchUsed) {
    console.log('  البحث على الويب : متاح ✓');
    console.log('  التدقيق          : تحقّق مستقل حقيقي');
    if (PIPELINE_CONFIG.requireHumanReview) {
      console.log('\n  ⭐ البحث صار متاحاً، والنشر التلقائي ما زال مقفلاً.');
      console.log('     لتفعيله: بدّل requireHumanReview إلى false في');
      console.log('     src/lib/config/pipeline.ts — سطر واحد، لا تغيير آخر.');
    }
  } else {
    console.log('  البحث على الويب : غير متاح (يحتاج خطة مفعّلة الفوترة)');
    console.log('  التدقيق          : فحص اتساق داخلي فقط — لا تحقّق مستقل');
    console.log('  الثقة            : مسقّفة تحت حدّ النشر التلقائي');
    console.log(
      `  النشر            : ${PIPELINE_CONFIG.requireHumanReview ? 'مراجعة يدوية لكل خبر ✓ (متّسق)' : '⚠ requireHumanReview=false مع غياب البحث — راجع الإعداد'}`,
    );

    console.log('\n  للترقية إلى تحقق مستقل — أي مسار من الاثنين:');
    console.log('   ١. فعّل الفوترة على مشروع Google Cloud المرتبط بالمفتاح.');
    console.log('      ربط بحث جوجل يعمل فوراً — صفر تعديل في الكود.');
    console.log('   ٢. أضف ANTHROPIC_API_KEY إلى .env، ثم في config/pipeline.ts:');
    console.log("        factCheck: { provider: 'anthropic', model: 'claude-opus-5' }");
    console.log('\n  بعد أي منهما أعد `npm run check`. حين يقول «متاح ✓» تكون');
    console.log('  البنية جاهزة، ويبقى قرار requireHumanReview وحده لك.');
  }

  console.log();
  if (structured.ok && grounded.ok) {
    console.log('✓ المزوّد جاهز. شغّل: npm run pipeline');
  } else {
    console.log('✗ الفحص لم يكتمل — راجع الرسائل أعلاه قبل تشغيل خط الأتمتة.');
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('\n✗ فشل الفحص:', error instanceof Error ? error.message : error);
  process.exit(1);
});
