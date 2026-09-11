import Link from 'next/link';

import { NextRaceCountdown } from '@/components/race/NextRaceCountdown';
import type { Race } from '@/lib/types';

import { SceneCanvas } from './SceneCanvas';

// GridCanvas مكوّن عميل يرسم عنصراً فارغاً على الخادم، ولا يستورد three إلا
// داخل useEffect — فلا تدخل المكتبة الحزمة الأولى ولا تؤخّر أول رسم.

export function Hero({ nextRace }: { nextRace: Race | null }) {
  return (
    <section className="relative isolate overflow-hidden border-b border-line">
      {/* الطبقة ١: خلفية ثابتة — تظهر فوراً وتبقى إن تعذّر تشغيل WebGL */}
      <div className="absolute inset-0 -z-20 bg-bg">
        <div className="grid-bg absolute inset-0 opacity-70" />
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-[radial-gradient(ellipse_at_50%_100%,var(--red-glow),transparent_70%)]" />
      </div>

      {/* الطبقة ٢: المشهد ثلاثي الأبعاد */}
      <div className="absolute inset-0 -z-10">
        <SceneCanvas scene="grid" />
      </div>

      {/* الطبقة ٣: تدرّج يضمن تباين النص فوق أي حركة تحته */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-bg via-bg/55 to-bg/90" />

      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:py-36">
        <div className="max-w-3xl">
          <p className="rise inline-flex items-center gap-2 rounded-full border border-line bg-surface/60 px-3 py-1 text-xs font-medium text-muted backdrop-blur-sm">
            <span className="size-1.5 animate-pulse rounded-full bg-red" />
            تغطية عالمية للفورمولا 1 — بالعربية
          </p>

          <h1 className="rise mt-6 text-4xl leading-[1.15] font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl">
            كل ما يحدث على
            <span className="relative mx-2 inline-block">
              <span className="text-red">الجريد</span>
              <span className="checker absolute -bottom-1 inset-x-0 h-1.5 text-red/40 [--checker-size:6px]" />
            </span>
            <br className="hidden sm:block" />
            في مكان واحد
          </h1>

          <p className="rise mt-5 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
            أخبار وتحليلات ونتائج كل جولة، من كل حلبة، لكل فريق وسائق — مكتوبة بالعربية.
          </p>

          <div className="rise mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/news"
              className="rounded-xl bg-red px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-hover"
            >
              آخر الأخبار
            </Link>
            <Link
              href="/standings"
              className="rounded-xl border border-line-strong bg-surface/60 px-5 py-3 text-sm font-semibold text-fg backdrop-blur-sm transition-colors hover:border-red hover:text-red"
            >
              ترتيب البطولة
            </Link>
          </div>
        </div>

        {nextRace && (
          <div className="rise mt-14 lg:mt-20">
            <NextRaceCountdown race={nextRace} />
          </div>
        )}
      </div>
    </section>
  );
}
