/* eslint-disable @next/next/no-img-element */

/**
 * علم الدولة كملف SVG محلي.
 *
 * تعمّدنا ألا نستعمل رموز الإيموجي: **ويندوز لا يملك خطوط أعلام**، فيعرض
 * حرفَي الدولة («AU» بدل 🇦🇺) — وهذا يمسّ معظم جمهور الموقع.
 *
 * الملفات تُنزَّل وقت المزامنة إلى `public/flags/`، فلا طلب خارجي وقت العرض.
 * نستخدم `<img>` لا `next/image` لأن SVG لا يُحسَّن ولا يحتاج ذلك.
 */
export function Flag({
  code,
  name,
  className = '',
}: {
  code: string;
  name?: string;
  className?: string;
}) {
  if (!code || code.length !== 2) {
    return (
      <span
        className={`inline-block rounded-[2px] bg-surface-2 ${className}`}
        aria-hidden="true"
      />
    );
  }

  return (
    <img
      src={`/flags/${code.toLowerCase()}.svg`}
      alt={name ? `علم ${name}` : ''}
      aria-hidden={name ? undefined : true}
      loading="lazy"
      // الحد يمنع اختفاء الأعلام البيضاء على خلفية فاتحة
      className={`inline-block h-[0.9em] w-auto rounded-[2px] border border-line/60 object-cover align-[-0.1em] ${className}`}
    />
  );
}
