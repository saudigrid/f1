import type { ReactNode } from 'react';

import type { SceneName } from './scenes';
import { SceneCanvas } from './SceneCanvas';

/**
 * ترويسة الصفحة بمشهد ثلاثي الأبعاد — واحدة لكل أقسام الموقع.
 *
 * ## البنية الطبقية، ولماذا هي هكذا
 *
 * ١. **خلفية ثابتة** تظهر فوراً وتبقى إن تعذّر WebGL أو طلب الزائر تقليل
 *    الحركة. الصفحة لا تبدو مكسورة أبداً، ولا تنتظر شيئاً لترسم.
 * ٢. **المشهد** فوقها — يُحمَّل بعد أول رسم ولا يؤخّره.
 * ٣. **تدرّج** يضمن تباين النص فوق أي حركة تحته.
 * ٤. **المحتوى**.
 *
 * الترتيب مقصود: كل طبقة تعمل وحدها لو غابت التي تحتها. وهذا هو الفرق بين
 * «موقع فيه ثري دي» و«موقع يعتمد على الثري دي».
 *
 * ⚠️ لوحة واحدة لكل صفحة — لا لوحتان. سياق WebGL مورد شحيح على الجوال،
 * والمتصفّح يُسقط الأقدم عند تجاوز الحدّ فتنطفئ مشاهد بلا سبب ظاهر.
 */
export function PageHero({
  scene,
  eyebrow,
  title,
  description,
  children,
  compact = false,
}: {
  scene: SceneName;
  /** سطر صغير فوق العنوان — قسم أو حالة. */
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  /** عناصر تفاعلية تحت الوصف: أزرار، فلاتر، عدّادات. */
  children?: ReactNode;
  /** ترويسة أقصر لصفحات القوائم الطويلة. */
  compact?: boolean;
}) {
  return (
    <section className="relative isolate overflow-hidden border-b border-line">
      <div className="absolute inset-0 -z-20 bg-bg">
        <div className="grid-bg absolute inset-0 opacity-70" />
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-[radial-gradient(ellipse_at_50%_100%,var(--red-glow),transparent_70%)]" />
      </div>

      <div className="absolute inset-0 -z-10">
        <SceneCanvas scene={scene} />
      </div>

      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-bg/70 via-bg/45 to-bg/90" />

      <div
        className={`mx-auto max-w-7xl px-4 sm:px-6 ${
          compact ? 'py-12 sm:py-16' : 'py-20 sm:py-24 lg:py-28'
        }`}
      >
        <div className="max-w-3xl">
          {eyebrow && (
            <p className="rise inline-flex items-center gap-2 rounded-full border border-line bg-surface/60 px-3 py-1 text-xs font-medium text-muted backdrop-blur-sm">
              {eyebrow}
            </p>
          )}

          <h1
            className={`rise font-bold tracking-tight text-balance ${
              compact
                ? 'mt-4 text-3xl sm:text-4xl'
                : 'mt-6 text-4xl leading-[1.15] sm:text-5xl lg:text-6xl'
            }`}
          >
            {title}
          </h1>

          {description && (
            <p className="rise mt-4 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
              {description}
            </p>
          )}

          {children && <div className="rise mt-7">{children}</div>}
        </div>
      </div>
    </section>
  );
}
