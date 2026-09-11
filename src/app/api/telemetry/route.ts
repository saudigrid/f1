import { NextResponse, type NextRequest } from 'next/server';

import { getTelemetry } from '@/lib/data/openf1';

export const revalidate = 86_400;

/**
 * تيليمتري سائق في لفّة بعينها.
 *
 * مسار منفصل لأن المقارنة تفاعلية: يبدّل القارئ السائق واللفّة عشرات المرات،
 * وجلبُ كل احتمال مسبقاً مستحيل — سباق بعشرين سائقاً وخمسين لفّة يعني ألف
 * عيّنة تيليمتري.
 *
 * ⚠️ كل وسيط يُتحقَّق منه قبل أي استعمال: `session` و`driver` أرقام صحيحة
 * ضمن مدى معقول، و`from` تاريخ ISO صالح. الوسائط تُركَّب في نداء خارجي، فقبولها
 * كما هي يفتح باب حقن على الواجهة الخلفية.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  const session = Number(params.get('session'));
  const driver = Number(params.get('driver'));
  const from = params.get('from') ?? '';

  const validSession = Number.isInteger(session) && session > 0 && session < 1_000_000;
  const validDriver = Number.isInteger(driver) && driver > 0 && driver < 100;

  // تاريخ ISO صالح ومعقول — لا نقبل نصّاً حرّاً يُركَّب في الاستعلام
  const parsed = Date.parse(from);
  const validFrom =
    Number.isFinite(parsed) &&
    parsed > Date.parse('2018-01-01') &&
    parsed < Date.now() + 86_400_000;

  if (!validSession || !validDriver || !validFrom) {
    return NextResponse.json({ error: 'وسائط غير صالحة' }, { status: 400 });
  }

  try {
    const points = await getTelemetry(session, driver, new Date(parsed).toISOString(), 90);
    return NextResponse.json(
      { points },
      { headers: { 'cache-control': 'public, max-age=3600, s-maxage=86400' } },
    );
  } catch {
    return NextResponse.json({ error: 'تعذّر جلب التيليمتري' }, { status: 502 });
  }
}
