/* eslint-disable @next/next/no-img-element */

/**
 * شارة الفريق — شعاره الحقيقي إن وُجد، وإلّا شارة حروف مولَّدة.
 *
 * ## لماذا شارة مولَّدة أصلاً
 *
 * 214 صانعاً منذ 1950، وثلثهم فقط له شعار حرّ على كومنز. والبحث الآلي عن
 * البقية أنتج كوارث موثّقة في `logo-blocklist.ts`: «إيغل» جاءته شارة شركة
 * حواسيب، و«شادو» شارة أدوبي، و«هوندا» صورة سيارة صفراء. فالخيار الحقيقي ليس
 * «شعار صحيح أو شعار قريب» بل **شعار صحيح أو شيء لا يدّعي أنه شعار**.
 *
 * ## الشكل يتبع مصدر الشعار
 *
 * ⚠️ هذا ليس تجميلاً — كان عطلاً. الصندوق كان **مربّعاً** دائماً، وشعارات
 * الفرق الحديثة **عريضة** (كلمة ممتدّة لا رمز)، فكانت تُسحق في 48 بكسل حتى
 * اختفى شعار ألبين تماماً: ظهر مربّعاً أبيض فارغاً.
 *
 * فصار لكل مصدر شكله:
 *
 * | المصدر | الشكل | الخلفية | لماذا |
 * |---|---|---|---|
 * | شعار المحرّر (`teams-custom/`) | مربّع | من الصورة نفسها | بلاطة رسمية مربّعة تحمل خلفيتها — أي لوحة تحتها تصنع إطاراً دخيلاً |
 * | شعار كومنز | عريض | بيضاء | شعارات شفّافة سوداء، تختفي على الوضع الليلي بلا لوحة |
 * | لا شعار | مربّع | لون الفريق | شارة حروف، والمربّع شكلها الطبيعي |
 */

/** FNV-1a — صغيرة وثابتة عبر البيئات، ولا نحتاج أكثر من ذلك للون. */
function hue(seed: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return Math.abs(hash) % 360;
}

/**
 * حرفا الشارة.
 *
 * الاختصارات تُترك كما هي: «BRM» و«ATS» و«AGS» أسماء الفرق نفسها لا أوائل
 * كلمات، وقصّها إلى حرفين يمحو المعنى.
 */
function initials(name: string): string {
  const stripped = name
    .replace(/\b(f1|team|racing|grand\s*prix|gp|motorsport|scuderia|engineering)\b/gi, ' ')
    .trim();
  const words = (stripped || name).split(/[\s\-–]+/).filter(Boolean);

  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }

  const word = words[0] ?? name;
  if (/^[A-Z0-9]{2,4}$/.test(word)) return word;
  return word.slice(0, 2).toUpperCase();
}

export interface TeamCrestProps {
  id: string;
  nameEn: string;
  logo?: string | null;
  color?: string | null;
  /**
   * شعار أضافه المحرّر — بلاطة رسمية تحمل خلفيتها، فتُعرض من حافة إلى حافة
   * بلا لوحة ولا حشو.
   */
  custom?: boolean;
  /** صنف ارتفاع من Tailwind. العرض يُشتقّ منه حسب الشكل. */
  height?: string;
}

export function TeamCrest({
  id,
  nameEn,
  logo,
  color,
  custom = false,
  height = 'h-12',
}: TeamCrestProps) {
  if (logo) {
    return (
      <span
        /*
         * ⚠️ الشكل يتبع الملف. بلاطات المحرّر **مربّعة** (أيقونات رسمية)،
         * فوضعها في إطار 3:2 يقصّ ثلثها — اختفى سطر «ALPINE F1 TEAM» تحت
         * الحرف. أما شعارات كومنز فكلمات ممتدّة، والمربّع يسحقها.
         */
        className={`grid shrink-0 place-items-center overflow-hidden rounded-xl border border-line ${height} ${
          custom ? 'aspect-square' : 'aspect-[3/2] bg-white p-1.5'
        }`}
      >
        <img
          src={logo}
          alt={nameEn}
          loading="lazy"
          decoding="async"
          className={
            custom ? 'size-full object-cover' : 'max-h-full max-w-full object-contain'
          }
        />
      </span>
    );
  }

  const background = color ?? `hsl(${hue(id)} 52% 30%)`;
  const label = initials(nameEn);

  return (
    <span
      className={`relative grid shrink-0 place-items-center overflow-hidden rounded-xl border border-line ${height} aspect-square`}
      style={{ background }}
      role="img"
      aria-label={nameEn}
    >
      {/* شطرنجية خافتة — إشارة الرياضة بلا ادّعاء شعار */}
      <svg
        viewBox="0 0 8 8"
        className="absolute inset-0 size-full opacity-[0.13]"
        aria-hidden="true"
        preserveAspectRatio="none"
      >
        <path d="M0 0h2v2H0zM4 0h2v2H4zM2 2h2v2H2zM6 2h2v2H6zM0 4h2v2H0zM4 4h2v2H4zM2 6h2v2H2zM6 6h2v2H6z" fill="#fff" />
      </svg>

      <span
        className="relative font-display text-sm leading-none font-bold tracking-tight text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]"
        dir="ltr"
      >
        {label}
      </span>
    </span>
  );
}
