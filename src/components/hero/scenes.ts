/**
 * مكتبة مشاهد الهيرو — شادر لكل قسم.
 *
 * ## لماذا شادرات لا نماذج
 *
 * كل مشهد هنا **مربّع واحد وشادر**: بلا هندسة، بلا ملفات، بلا أضواء، بلا
 * تحميل أصول. الكلفة في الحزمة صفر تقريباً، والكلفة على المعالج ثابتة مهما
 * تعقّد الشكل — لأن العمل كله في البكسل لا في الرؤوس. هذا ما يجعل «ثري دي في
 * كل صفحة» ممكناً على الجوال أصلاً؛ نموذج زجاجي لسيارة في كل صفحة سيقتلها.
 *
 * ## العقد المشترك
 *
 * كل شادر يستقبل نفس المتغيّرات (`uRes` `uTime` `uPointer` `uBg` `uLine`
 * `uAccent`) فيقدر `SceneCanvas` أن يبدّل بينها بلا أي معرفة بمحتواها،
 * وترث كلها ألوان الثيم فتتبدّل مع الوضع الداكن والفاتح تلقائياً.
 *
 * ## القاعدة التحريرية
 *
 * المشهد **خلفية لا بطل**. يبقى خافتاً تحت طبقة تدرّج، ولا يسحب العين عن
 * النص. لهذا ينتهي كل شادر بتعتيم الأطراف.
 */

export const VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

/** ترويسة مشتركة: نفس المتغيّرات ودوال مساعدة لكل المشاهد. */
const HEADER = /* glsl */ `
  precision highp float;

  uniform vec2  uRes;
  uniform float uTime;
  uniform vec2  uPointer;
  uniform vec3  uBg;
  uniform vec3  uLine;
  uniform vec3  uAccent;

  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float gridLine(float coord, float width) {
    float d = abs(fract(coord - 0.5) - 0.5) / max(fwidth(coord), 1e-5);
    return 1.0 - smoothstep(0.0, width, d);
  }

  vec2 aspectUv() {
    vec2 uv = vUv * 2.0 - 1.0;
    uv.x *= uRes.x / max(uRes.y, 1.0);
    return uv;
  }

  /** تعتيم الأطراف — يضمن أن يبقى النص فوق المشهد مقروءاً. */
  vec3 vignette(vec3 col) {
    return col * (1.0 - 0.32 * length(vUv - 0.5));
  }
`;

/** الرئيسية: مضمار لانهائي يبتعد نحو الأفق. */
const GRID = /* glsl */ `
  void main() {
    vec2 uv = aspectUv();
    uv.x += uPointer.x * 0.07;
    float horizon = 0.10 + uPointer.y * 0.025;

    vec3 col = uBg;

    if (uv.y < horizon) {
      float depth = 1.0 / (horizon - uv.y + 0.0015);
      float z = depth * 0.55 + uTime * 1.35;
      float x = uv.x * depth * 0.55;

      float g = max(gridLine(x, 1.7), gridLine(z, 1.7) * 0.8);
      float near = smoothstep(0.0, 1.0, clamp((horizon - uv.y) * 3.4, 0.0, 1.0));
      float far  = 1.0 - smoothstep(0.0, 1.0, clamp(depth * 0.018, 0.0, 1.0));
      float fade = near * far;

      col = mix(col, uLine, g * fade * 0.6);

      float lane   = smoothstep(0.88, 1.0, 1.0 - abs(fract(z * 0.22) - 0.5) * 2.0);
      float centre = 1.0 - smoothstep(0.0, 0.75, abs(x));
      col = mix(col, uAccent, lane * centre * fade * 0.55);
    }

    float glow = exp(-abs(uv.y - horizon) * 8.0) * exp(-abs(uv.x) * 0.45);
    col += uAccent * glow * 0.16;

    gl_FragColor = vec4(vignette(col), 1.0);
  }
`;

/** الحلبات: شريط مسار ينساب ويلتوي كأنه مخطّط حلبة يُرسم. */
const TRACK = /* glsl */ `
  float ribbon(vec2 uv, float phase, float amp) {
    float y = sin(uv.x * 1.6 + phase) * amp + sin(uv.x * 0.7 - phase * 0.6) * amp * 0.5;
    float d = abs(uv.y - y);
    return 1.0 - smoothstep(0.0, 0.045, d);
  }

  void main() {
    vec2 uv = aspectUv();
    uv.y += uPointer.y * 0.05;
    float t = uTime * 0.22;

    vec3 col = uBg;

    // ثلاثة شرائط متداخلة بأطوار مختلفة — إحساس بعمق المسار
    for (int i = 0; i < 3; i++) {
      float fi = float(i);
      float phase = t + fi * 2.1;
      float band = ribbon(uv + vec2(uPointer.x * 0.04 * fi, 0.0), phase, 0.30 - fi * 0.07);
      float depth = 1.0 - fi * 0.28;
      col = mix(col, uLine, band * depth * 0.22);
    }

    // الشريط الأمامي بلون الهوية، مع نبضة تمرّ عليه
    float lead = ribbon(uv, t, 0.30);
    float pulse = smoothstep(0.4, 1.0, sin(uv.x * 2.0 - uTime * 1.6) * 0.5 + 0.5);
    col = mix(col, uAccent, lead * (0.30 + pulse * 0.45));

    gl_FragColor = vec4(vignette(col), 1.0);
  }
`;

/** السائقون: انعكاس ضوئي يمسح خوذة — أشرطة مائلة تمرّ ببطء. */
const VISOR = /* glsl */ `
  void main() {
    vec2 uv = aspectUv();
    float t = uTime * 0.35;

    vec3 col = uBg;

    // قوس الخوذة: منحنى ناعم يقسم المشهد
    float arc = 0.42 - uv.x * uv.x * 0.20 + uPointer.y * 0.03;
    float visor = smoothstep(0.02, -0.02, uv.y - arc);

    // أشرطة انعكاس مائلة تنزلق فوق الزجاج
    float band = sin((uv.x * 1.1 + uv.y * 0.8) * 6.0 - t * 2.2);
    float sheen = smoothstep(0.75, 1.0, band) * visor;

    col = mix(col, uLine, visor * 0.10);
    col = mix(col, uLine, sheen * 0.28);

    // خطّ الحافة السفلية بلون الهوية
    float edge = 1.0 - smoothstep(0.0, 0.012, abs(uv.y - arc));
    col = mix(col, uAccent, edge * 0.55);

    // وهج خافت يتبع المؤشر
    float glow = exp(-length(uv - vec2(uPointer.x * 0.6, arc)) * 3.2);
    col += uAccent * glow * 0.10;

    gl_FragColor = vec4(vignette(col), 1.0);
  }
`;

/** السباقات: علم الشطرنج يتموّج. */
const FLAG = /* glsl */ `
  void main() {
    vec2 uv = aspectUv();
    float t = uTime * 0.6;

    // تموّج القماش
    float wave = sin(uv.x * 2.2 - t) * 0.10 + sin(uv.x * 3.7 - t * 1.4) * 0.04;
    vec2 p = vec2(uv.x, uv.y + wave);

    // مربّعات الشطرنج
    vec2 cell = floor(p * 4.0);
    float checker = mod(cell.x + cell.y, 2.0);

    // الإضاءة تتبع ميل القماش فتعطي إحساس الحجم
    float shade = 0.5 + 0.5 * cos(uv.x * 2.2 - t);

    vec3 col = uBg;
    float band = smoothstep(0.85, 0.0, abs(uv.y + wave));
    col = mix(col, mix(uBg, uLine, 0.55), checker * band * 0.55 * shade);
    col = mix(col, uAccent, (1.0 - checker) * band * 0.10);

    gl_FragColor = vec4(vignette(col), 1.0);
  }
`;

/** التحليل التقني: خطوط تيليمتري تتحرّك كأنها راسم ذبذبات. */
const TELEMETRY = /* glsl */ `
  float trace(vec2 uv, float seed, float speed, float amp) {
    float x = uv.x * 1.4 + uTime * speed;
    float y = sin(x * 2.3 + seed) * amp
            + sin(x * 5.1 + seed * 2.0) * amp * 0.35
            + sin(x * 11.0 + seed * 3.0) * amp * 0.12;
    return 1.0 - smoothstep(0.0, 0.02, abs(uv.y - y));
  }

  void main() {
    vec2 uv = aspectUv();
    vec3 col = uBg;

    // شبكة قياس خافتة في الخلفية
    float g = max(gridLine(uv.x * 6.0, 1.2), gridLine(uv.y * 6.0, 1.2));
    col = mix(col, uLine, g * 0.07);

    // ثلاثة مسارات: السرعة، الدوّاسة، الفرامل
    col = mix(col, uLine,   trace(uv + vec2(0.0,  0.28), 0.0, 0.30, 0.16) * 0.45);
    col = mix(col, uLine,   trace(uv + vec2(0.0, -0.02), 2.4, 0.24, 0.12) * 0.30);
    col = mix(col, uAccent, trace(uv + vec2(0.0, -0.30), 5.1, 0.35, 0.20) * 0.75);

    // مؤشّر رأسي يمسح المشهد كرأس القراءة
    float head = fract(uTime * 0.12);
    float sweep = 1.0 - smoothstep(0.0, 0.01, abs(vUv.x - head));
    col += uAccent * sweep * 0.35;

    gl_FragColor = vec4(vignette(col), 1.0);
  }
`;

/** تاريخ الرياضة: طبقات أفقية تنزلق كطبقات الزمن. */
const STRATA = /* glsl */ `
  void main() {
    vec2 uv = aspectUv();
    vec3 col = uBg;

    // ثماني طبقات، كل واحدة أبطأ من التي فوقها
    for (int i = 0; i < 8; i++) {
      float fi = float(i);
      float depth = fi / 8.0;
      float y = -0.8 + depth * 1.7;
      float drift = uTime * (0.02 + depth * 0.05) + uPointer.x * 0.04 * depth;

      float thickness = 0.012 + depth * 0.010;
      float band = 1.0 - smoothstep(0.0, thickness, abs(uv.y - y));

      // تقطيع الطبقة إلى شرائح بأطوال عشوائية — إحساس بالسجلّ لا بالخط
      float seg = step(0.35, hash(vec2(floor(uv.x * 5.0 - drift * 6.0), fi)));
      col = mix(col, uLine, band * seg * (0.35 - depth * 0.22));
    }

    // خطّ اليوم: الأحدث، بلون الهوية
    float now = 1.0 - smoothstep(0.0, 0.016, abs(uv.y - 0.9));
    col = mix(col, uAccent, now * 0.6);

    gl_FragColor = vec4(vignette(col), 1.0);
  }
`;

/** الترتيب والفرق: أعمدة ضوئية تصعد كأنها منصّة تتويج. */
const PODIUM = /* glsl */ `
  void main() {
    vec2 uv = aspectUv();
    vec3 col = uBg;

    for (int i = 0; i < 14; i++) {
      float fi = float(i);
      float x = -1.5 + fi * 0.22;
      float seed = hash(vec2(fi, 3.0));

      // ارتفاع نابض لكل عمود، بسرعة مختلفة
      float h = 0.25 + 0.55 * (0.5 + 0.5 * sin(uTime * (0.4 + seed * 0.5) + seed * 6.28));
      float inside = step(abs(uv.x - x), 0.055) * step(uv.y, -0.75 + h);

      float grad = smoothstep(-0.9, -0.9 + h, uv.y);
      col = mix(col, uLine, inside * grad * 0.28);

      // العمود الأطول يحمل لون الهوية
      col = mix(col, uAccent, inside * grad * smoothstep(0.7, 0.8, h) * 0.5);
    }

    gl_FragColor = vec4(vignette(col), 1.0);
  }
`;

/** الأخبار والروزنامة: خطوط بيانات تمرّ أفقياً. */
const WIRE = /* glsl */ `
  void main() {
    vec2 uv = aspectUv();
    vec3 col = uBg;

    for (int i = 0; i < 10; i++) {
      float fi = float(i);
      float y = -0.9 + fi * 0.2;
      float speed = 0.25 + hash(vec2(fi, 1.0)) * 0.5;
      float head = fract(uTime * speed + hash(vec2(fi, 2.0)));

      float x = mix(-1.8, 1.8, head);
      float len = 0.25 + hash(vec2(fi, 4.0)) * 0.4;

      // شعاع بذيل متلاشٍ خلفه
      float along = clamp((x - uv.x) / len, 0.0, 1.0);
      float streak = step(uv.x, x) * (1.0 - along);
      float band = 1.0 - smoothstep(0.0, 0.010, abs(uv.y - y));

      vec3 tint = mod(fi, 4.0) < 1.0 ? uAccent : uLine;
      col = mix(col, tint, band * streak * 0.45);
    }

    gl_FragColor = vec4(vignette(col), 1.0);
  }
`;

export type SceneName =
  | 'grid'
  | 'track'
  | 'visor'
  | 'flag'
  | 'telemetry'
  | 'strata'
  | 'podium'
  | 'wire';

const BODIES: Record<SceneName, string> = {
  grid: GRID,
  track: TRACK,
  visor: VISOR,
  flag: FLAG,
  telemetry: TELEMETRY,
  strata: STRATA,
  podium: PODIUM,
  wire: WIRE,
};

export function fragmentShader(scene: SceneName): string {
  return HEADER + BODIES[scene];
}
