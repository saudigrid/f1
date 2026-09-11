import { NextResponse, type NextRequest } from 'next/server';

import { timingSafeEqualString } from '@/lib/admin/auth';
import { runPipeline } from '@/lib/agents/pipeline';

/**
 * نقطة تشغيل خط الأتمتة. يستدعيها Vercel Cron حسب جدول vercel.json.
 *
 * المسار محمي بسرّ: Vercel يرسل `Authorization: Bearer $CRON_SECRET`.
 * بدونه المسار يرفض الطلب — وإلا لاستطاع أي زائر إشعال فاتورة API.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // معالجة عدة أخبار عبر وكيلين تحتاج وقتاً

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET غير مضبوط على الخادم.' }, { status: 500 });
  }

  /**
   * مقارنة ثابتة الزمن.
   *
   * `!==` يتوقّف عند أول بايت مختلف، فزمن الردّ يتسرّب منه طول البادئة
   * الصحيحة — وهو ما يسمح نظرياً باستخراج السرّ حرفاً حرفاً. الفارق ضئيل عبر
   * الشبكة، لكن ما يحرسه هذا المسار ليس ضئيلاً: تشغيل خط الأتمتة يستهلك حصة
   * نماذج مدفوعة ويكتب في قاعدة الأخبار.
   */
  if (!timingSafeEqualString(request.headers.get('authorization') ?? '', `Bearer ${secret}`)) {
    return NextResponse.json({ error: 'غير مصرّح.' }, { status: 401 });
  }

  try {
    const summary = await runPipeline();
    return NextResponse.json(summary, {
      headers: { 'cache-control': 'no-store' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[cron] فشل خط الأتمتة', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
