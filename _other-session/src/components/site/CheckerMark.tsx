/**
 * شارة العلم المنقّط — مستمدة من اللوجو (مربعات حمراء مائلة تنحدر يميناً).
 * تُستخدم بجانب الاسم في الهيدر وكعنصر هوية في الهيرو والفواصل.
 *
 * لاستبدالها بملف اللوجو الرسمي: ضع logo.svg في public/ واستخدم
 * <Image src="/logo.svg" .../> بدلاً من هذا المكوّن.
 */
export default function CheckerMark({
  size = 34,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  // شبكة 4×3 من المربعات، النمط متبادل والصف ينزل درجة كلما تقدم لليمين
  const squares: Array<{ x: number; y: number }> = [];
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 3; row++) {
      if ((col + row) % 2 === 0) squares.push({ x: col * 10, y: row * 10 + col * 3.5 });
    }
  }

  return (
    <svg
      width={size}
      height={size * 0.78}
      viewBox="0 0 52 42"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <g transform="skewX(-14) translate(7,0)">
        {squares.map((s, i) => (
          <rect key={i} x={s.x} y={s.y} width="10" height="10" fill="var(--accent)" />
        ))}
      </g>
    </svg>
  );
}
