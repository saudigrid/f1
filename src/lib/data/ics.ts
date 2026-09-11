import type { CalendarRace, RaceSession } from './history';

/**
 * تصدير الروزنامة كملف تقويم (iCalendar / RFC 5545).
 *
 * الغرض عملي: الزائر يضغط زراً على جواله فتدخل كل جلسات الموسم في تقويمه
 * بتوقيته المحلّي تلقائياً — لا يحتاج حساباً ولا تطبيقاً ولا يعود للموقع.
 *
 * ⚠️ الصيغة صارمة أكثر ممّا تبدو، وثلاثة تفاصيل تكسر الملف بصمت إن أُغفلت:
 *
 *   • **نهايات الأسطر CRLF** لا LF. تقويم أبل يرفض الملف كلّه بلا رسالة.
 *   • **طيّ الأسطر عند 75 بايت** — والقياس بالبايت لا بالحرف، فالعربية
 *     حرفان لكل رمز في UTF-8 وسطر من 40 حرفاً عربياً يتجاوز الحدّ.
 *   • **تهريب `\` و`;` و`,` وسطر جديد** في كل نصّ حرّ.
 */

const SESSION_LABELS: Record<RaceSession['kind'], string> = {
  fp1: 'التجربة الحرة الأولى',
  fp2: 'التجربة الحرة الثانية',
  fp3: 'التجربة الحرة الثالثة',
  sprintQualifying: 'تأهيلي السبرنت',
  sprint: 'سباق السبرنت',
  qualifying: 'التجارب التأهيلية',
  race: 'السباق',
};

export function sessionLabel(kind: RaceSession['kind']): string {
  return SESSION_LABELS[kind];
}

/** مدّة كل جلسة بالدقائق — تقريبية لكنها تعطي الحدث حجماً صحيحاً في التقويم. */
const SESSION_MINUTES: Record<RaceSession['kind'], number> = {
  fp1: 60,
  fp2: 60,
  fp3: 60,
  sprintQualifying: 45,
  sprint: 60,
  qualifying: 60,
  race: 120,
};

function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

function stamp(iso: string): string {
  return `${iso.replace(/[-:]/g, '').replace(/\.\d{3}/, '').replace(/Z?$/, '')}Z`;
}

/**
 * يطوي السطر عند 75 بايت بمسافة بادئة، كما تشترط المواصفة.
 *
 * القياس بالبايت مقصود: `TextEncoder` يعطي طول UTF-8 الحقيقي، والاعتماد على
 * `String.length` كان سينتج أسطراً تتجاوز الحدّ في النصّ العربي وحده.
 */
function fold(line: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) return line;

  const out: string[] = [];
  let current = '';
  let bytes = 0;

  for (const char of line) {
    const size = encoder.encode(char).length;
    // 74 لا 75: نترك مكاناً للمسافة البادئة في السطر التالي
    if (bytes + size > 74) {
      out.push(current);
      current = ' ';
      bytes = 1;
    }
    current += char;
    bytes += size;
  }
  out.push(current);
  return out.join('\r\n');
}

export function buildIcs(season: number, races: CalendarRace[], origin: string): string {
  const now = stamp(new Date().toISOString());

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Saudi F1 Grid//Formula 1 Calendar//AR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(`فورمولا 1 — موسم ${season}`)}`,
    'X-WR-TIMEZONE:UTC',
  ];

  for (const race of races) {
    for (const session of race.sessions) {
      // جلسة بلا توقيت معلن لا تصلح حدثاً في تقويم — نتجاوزها بدل اختراع وقت
      if (!session.startsAt) continue;

      const start = new Date(session.startsAt);
      const end = new Date(start.getTime() + SESSION_MINUTES[session.kind] * 60_000);
      const label = SESSION_LABELS[session.kind];

      lines.push(
        'BEGIN:VEVENT',
        `UID:${race.season}-${race.round}-${session.kind}@saudif1grid.com`,
        `DTSTAMP:${now}`,
        `DTSTART:${stamp(start.toISOString())}`,
        `DTEND:${stamp(end.toISOString())}`,
        `SUMMARY:${escapeText(`${label} — ${race.name}`)}`,
        `LOCATION:${escapeText(`${race.circuitName}، ${race.locality}، ${race.country}`)}`,
        `DESCRIPTION:${escapeText(
          `الجولة ${race.round} من موسم ${race.season}\n${origin}/races?season=${race.season}`,
        )}`,
        `URL:${origin}/circuits/${race.circuitId}`,
        // تنبيه قبل ساعة — الافتراض المعقول لحدث رياضي
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        'TRIGGER:-PT1H',
        `DESCRIPTION:${escapeText(`${label} — ${race.name}`)}`,
        'END:VALARM',
        'END:VEVENT',
      );
    }
  }

  lines.push('END:VCALENDAR');

  // CRLF إلزامي — تقويم أبل يرفض الملف بلا رسالة إن كانت النهايات LF
  return lines.map(fold).join('\r\n') + '\r\n';
}
