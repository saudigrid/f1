'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * تقدّم القراءة كلفّة في حلبة.
 *
 * ## الفكرة
 *
 * بدل شريط تقدّم مستقيم، يُرسم **مسار حلبة حقيقي** ويُملأ كلّما نزل القارئ في
 * الصفحة، وتتحرّك نقطة حمراء عليه كأنها سيارة تلفّ. الوصول إلى نهاية المقال
 * يعني إكمال اللفّة.
 *
 * ## لماذا هذه الطريقة تحديداً
 *
 * التحريك كلّه على **خاصية واحدة**: `stroke-dashoffset`. لا إعادة تخطيط ولا
 * إعادة طلاء للصفحة — والقيمة تُكتب في متغيّر CSS مرة واحدة لكل إطار عبر
 * `requestAnimationFrame`، فحدث التمرير المتكرّر لا يترجم إلى عمل متكرّر.
 *
 * ⚠️ مستمع التمرير `passive` بالضرورة: بدونها ينتظر المتصفّح احتمال
 * `preventDefault` قبل كل تمرير، فيتقطّع السكرول على الجوال — وهو بالضبط
 * العيب الذي يُفترض بهذا المكوّن أن يتجنّبه.
 */

/**
 * مسار حلبة كورنيش جدة، مبسَّطاً ومغلقاً.
 *
 * مولَّد من هندسة OSM الحقيقية ثم مرَّ بخوارزمية دوغلاس-بويكر: 333 نقطة
 * صارت 62 بلا فرق مرئي عند هذا الحجم — الفرق في الحمولة، 4 كيلوبايت مقابل
 * 655 بايت تُرسَل مع **كل** صفحة.
 *
 * ⚠️ مغلق بأمر `Z` عمداً: طرفا المسار الأصلي يفصلهما نحو 5% من ارتفاع الصندوق
 * (بيانات OSM لا تصل الحلقة دائماً). الإغلاق يجعل اللفّة تكتمل تماماً عند
 * نهاية الصفحة، وهو ما يُفترض بمؤشّر التقدّم أن يفعله.
 */
const TRACK = 'M16 54.6 L16.5 53.8 L17.3 54.1 L16.2 46.9 L14.5 45.8 L13.6 44.4 L13.5 42.7 L14.7 40.4 L14.8 39.2 L14.1 37.1 L12.5 35.7 L12.3 34.6 L12.5 31.6 L13.1 30.9 L14.8 30.1 L15.4 29.5 L16.7 24.2 L16.9 21.1 L16.3 11.2 L15.5 10.2 L14.5 10 L13.4 10.5 L12.9 11.6 L12.9 13.4 L14.9 17 L15.1 20.4 L14.6 22.1 L13.6 24.2 L13.2 26.9 L12.6 27.7 L11.4 28.1 L10.6 28.8 L10 31.3 L10.3 34.1 L12.3 39.5 L12.8 45.6 L15.2 50.3 L15.8 52.6 L16 55.9 L15.4 59.5 L15.9 60.4 L17.5 62.1 L18.1 64.6 L17.9 66 L15.3 71.4 L15 73.5 L15.1 75.1 L16.7 80.9 L19.3 85.2 L21.2 87 L25.4 90 L26.6 90 L27.1 89 L25.9 83.2 L25 83.3 L25.6 81.8 L23.3 75.8 L23.3 74.6 L18.6 61 L18.2 60.4 L16.7 59.8 L16.5 59 Z';

export function TrackProgress() {
  const pathRef = useRef<SVGPathElement>(null);
  const [length, setLength] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const path = pathRef.current;
    if (path) setLength(path.getTotalLength());
  }, []);

  useEffect(() => {
    let frame = 0;

    const update = () => {
      frame = 0;
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - doc.clientHeight;
      setProgress(scrollable > 0 ? Math.min(1, Math.max(0, doc.scrollTop / scrollable)) : 0);
    };

    /** التمرير يُطلق عشرات الأحداث في الثانية — نجمعها في إطار واحد. */
    const onScroll = () => {
      if (frame === 0) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  const point = pathRef.current && length ? pathRef.current.getPointAtLength(length * progress) : null;

  return (
    <div
      aria-hidden="true"
      /* خافت 50% — مؤشّر لا يزاحم المحتوى، ولا إطار حوله ولا خلفية */
      className="pointer-events-none fixed bottom-4 start-4 z-30 hidden opacity-50 lg:block"
    >
      {/*
        ⚠️ الإطار مقصوص على حدود المسار الفعلية لا على مربّع فضفاض.
        المسار يشغل س ∈ [10, 27] وع ∈ [10, 90]، فإطار `0 0 38 100` كان يهدر
        نصف العرض فراغاً، ويضغط الحلبة في شريط ضيّق حتى تلتصق أضلاعها ببعضها.
        القصّ إلى الحدود + التكبير إلى 208 بكسل يفصلها، وتخفيف السُمك من 2.2
        إلى 1.1 يمنع الخطوط من الالتحام عند المنعطفات الضيّقة.
      */}
      <svg viewBox="6.5 6.5 24.1 87" className="h-52 w-auto" fill="none">
        {/* المسار الكامل، خافتاً */}
        <path
          d={TRACK}
          stroke="var(--fg-subtle)"
          strokeWidth="1.1"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.4"
        />

        {/* الجزء المقطوع — يمتدّ مع التقدّم */}
        <path
          ref={pathRef}
          d={TRACK}
          stroke="var(--red)"
          strokeWidth="1.1"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={length || 1}
          strokeDashoffset={(length || 1) * (1 - progress)}
        />

        {/* السيارة */}
        {point && <circle cx={point.x} cy={point.y} r="1.6" fill="var(--red)" />}
      </svg>

      <p className="tnum mt-0.5 text-center text-[0.55rem] font-bold text-subtle">
        {Math.round(progress * 100)}%
      </p>
    </div>
  );
}
