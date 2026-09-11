'use client';

import { useEffect, useState } from 'react';

/**
 * وقت الجلسة بتوقيت الزائر.
 *
 * ## لماذا مكوّن عميل، ولماذا بهذا الشكل تحديداً
 *
 * الخادم لا يعرف منطقة الزائر الزمنية — لا يعرفها أحد إلا المتصفّح. فلو
 * صيّرنا الوقت المحلّي على الخادم لظهر توقيت الخادم للجميع، ولو صيّرناه في
 * العميل مباشرة لاختلف نصّ الخادم عن نصّ العميل فينهار الترطيب.
 *
 * الحلّ: نعرض **UTC** في تصيير الخادم (صحيح ومفيد بذاته، ويظهر لمن يعطّل
 * الجافاسكربت)، ثم نبدّله إلى التوقيت المحلّي بعد الترطيب. المستخدم يرى
 * الرقم الصحيح، ولا يرى وميض «قيمة خاطئة ثم صحيحة» لأن الفرق دقائق لا محتوى.
 */
export function LocalTime({ iso }: { iso: string }) {
  const [text, setText] = useState(() => iso.slice(11, 16));

  useEffect(() => {
    setText(
      new Date(iso).toLocaleTimeString('ar', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        numberingSystem: 'latn',
      }),
    );
  }, [iso]);

  return (
    <time className="tnum text-muted" dateTime={iso} suppressHydrationWarning>
      {text}
    </time>
  );
}
