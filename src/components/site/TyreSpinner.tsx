/**
 * مؤشّر الانتظار — كفر بيريللي يدور.
 *
 * SVG ودورة CSS فقط: بلا صور، بلا جافاسكربت، بلا طلب شبكة. يظهر فوراً حتى
 * قبل أن تُحمَّل أي حزمة، وهذا هو المطلوب من مؤشّر تحميل تحديداً — أسوأ ما
 * فيه أن ينتظر شيئاً ليظهر.
 *
 * الألوان من مركّبات بيريللي الحقيقية، فيصير المؤشّر إشارة إلى الرياضة لا
 * زخرفة: الأحمر للطري، الأصفر للمتوسط، الأبيض للصلب، الأخضر للمبلّل.
 */

const COMPOUNDS = {
  soft: '#e10600',
  medium: '#ffd800',
  hard: '#e8e8ea',
  intermediate: '#43b02a',
  wet: '#0067ad',
} as const;

export type Compound = keyof typeof COMPOUNDS;

export function TyreSpinner({
  compound = 'soft',
  size = 40,
  label = 'جارٍ التحميل',
}: {
  compound?: Compound;
  size?: number;
  /** نص لقارئ الشاشة — الحركة وحدها لا تُخبر أحداً بشيء. */
  label?: string;
}) {
  const color = COMPOUNDS[compound];

  return (
    <span
      role="status"
      aria-label={label}
      className="inline-grid place-items-center"
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 100 100" width={size} height={size} className="tyre-spin" aria-hidden="true">
        {/* المطّاط */}
        <circle cx="50" cy="50" r="46" fill="none" stroke="#18181b" strokeWidth="16" />

        {/* شريط المركّب الملوّن — مقطوع ليُرى الدوران */}
        <circle
          cx="50"
          cy="50"
          r="38"
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray="150 89"
          opacity="0.95"
        />

        {/* الجنط */}
        <circle cx="50" cy="50" r="24" fill="none" stroke="#3f3f46" strokeWidth="7" />

        {/* البراغي الخمسة — تجعل الدوران مرئياً */}
        {[0, 72, 144, 216, 288].map((angle) => {
          const rad = (angle * Math.PI) / 180;
          return (
            <circle
              key={angle}
              cx={50 + Math.cos(rad) * 15}
              cy={50 + Math.sin(rad) * 15}
              r="2.6"
              fill="#71717a"
            />
          );
        })}

        <circle cx="50" cy="50" r="5" fill="#52525b" />
      </svg>

      <span className="sr-only">{label}</span>
    </span>
  );
}
