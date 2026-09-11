/**
 * علامة الموقع — مستمدة من اللوجو: كلمة عريضة + علم منقّط أحمر مائل.
 *
 * مرسومة كـ SVG لتبقى حادّة على كل الشاشات وتتبدّل مع الثيم تلقائياً.
 * لاستبدالها بملف اللوجو الأصلي: ضع `public/logo.svg` واستبدل الـ <svg> بـ <Image>.
 */
export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5" aria-label="Saudi F1 Grid">
      <span
        className="font-display text-[1.35rem] leading-none font-bold tracking-[0.02em] text-fg sm:text-2xl"
        dir="ltr"
      >
        SAUDI<span className="mx-1 text-red">F1</span>GRID
      </span>
      <CheckeredMark className={compact ? 'h-4 w-6' : 'h-5 w-8'} />
    </span>
  );
}

/** العلم المنقّط المائل — نفس الإيقاع الموجود في اللوجو. */
export function CheckeredMark({ className }: { className?: string }) {
  // شبكة 4×3 مائلة؛ المربعات الممتلئة فقط تُرسم
  const filled: [number, number][] = [
    [0, 0], [2, 0],
    [1, 1], [3, 1],
    [0, 2], [2, 2],
  ];

  return (
    <svg viewBox="0 0 48 30" className={className} fill="none" aria-hidden="true">
      <g transform="skewX(-14) translate(6 0)">
        {filled.map(([col, row]) => (
          <rect
            key={`${col}-${row}`}
            x={col * 10}
            y={row * 10}
            width="10"
            height="10"
            className="fill-red"
          />
        ))}
      </g>
    </svg>
  );
}
