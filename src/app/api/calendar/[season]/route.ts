import { NextResponse } from 'next/server';

import { CURRENT_SEASON, getSeasonCalendar } from '@/lib/data/history';
import { buildIcs } from '@/lib/data/ics';

export const revalidate = 21_600;

const FIRST_SEASON = 1950;

/**
 * ملف تقويم الموسم — يفتحه الجوال فيضيف الجلسات مباشرة.
 *
 * ⚠️ الموسم يُتحقَّق منه كعدد ضمن مدى معلوم قبل أي استعمال. المقطع قادم من
 * المسار، أي من الزائر، ويُركَّب في نداء شبكة — فقبوله كما هو يفتح باب حقن
 * مسار على الواجهة الخلفية. الرقم وحده يمرّ، وما عداه 400.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ season: string }> },
) {
  const { season: raw } = await params;

  const season = Number(raw.replace(/\.ics$/i, ''));
  const valid =
    Number.isInteger(season) && season >= FIRST_SEASON && season <= CURRENT_SEASON + 1;

  if (!valid) {
    return NextResponse.json({ error: 'موسم غير صالح' }, { status: 400 });
  }

  let races;
  try {
    races = await getSeasonCalendar(season);
  } catch {
    return NextResponse.json({ error: 'تعذّر جلب الروزنامة' }, { status: 502 });
  }

  if (races.length === 0) {
    return NextResponse.json({ error: 'لا روزنامة لهذا الموسم' }, { status: 404 });
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://saudif1grid.com';
  const body = buildIcs(season, races, origin);

  return new NextResponse(body, {
    headers: {
      'content-type': 'text/calendar; charset=utf-8',
      // اسم الملف يظهر في تقويم الهاتف — نجعله واضحاً
      'content-disposition': `attachment; filename="f1-${season}.ics"`,
      'cache-control': 'public, max-age=3600, s-maxage=21600',
    },
  });
}
