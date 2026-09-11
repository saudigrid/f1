import { promises as fs } from 'node:fs';
import path from 'node:path';

/**
 * تنزيل الأصول الخارجية إلى public وقت المزامنة.
 *
 * لماذا لا نربط مباشرة؟ لأن 78 صورة تُطلب دفعة واحدة من ويكيميديا تُقابَل بـ
 * **429 Too Many Requests**، فتظهر نصف الحلبات بلا صورة. وهذا قبل أن نتحدث عن
 * أدب التعامل: استنزاف خوادم مشروع تبرّعي في كل زيارة ليس مقبولاً.
 *
 * بعد التنزيل تصير الصور ملفات محلية: بلا حدود معدّل، وبلا اعتماد وقت الطلب،
 * وبلا نطاق خارجي في `next.config.ts`.
 */

const UA = { 'user-agent': 'SaudiF1Grid/1.0 (https://saudif1grid.com) sync-script' };

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * يبدّل عرض رابط مصغَّر قائم.
 *
 * ⚠️ لا يبني مسار مصغَّر من رابط أصلي — جرّبناه ففشل: `upload.wikimedia.org`
 * يخدم العروض **المولَّدة مسبقاً** فقط، ويردّ 400 على ما عداها. اختبار على
 * ملف واحد: 330 ✓، 480 ✗، 500 ✓، 640 ✗ — نمط لا يمكن التنبّؤ به من الرابط.
 *
 * الطريق الصحيح لعرض مخصّص هو **طلبه من الواجهة** بـ`iiurlwidth`، وهي تولّده
 * وتعيد رابطه جاهزاً. لذلك تصل الروابط إلى هنا مصغَّرة أصلاً، ولا يبقى لنا
 * إلا ضبط الرقم.
 */
function capWidth(url: string, width: number): string {
  return url.replace(/\/(\d{2,4})px-/, `/${width}px-`);
}

function extensionOf(url: string): string {
  const clean = url.split('?')[0].toLowerCase();
  if (clean.endsWith('.png')) return '.png';
  if (clean.endsWith('.webp')) return '.webp';
  if (clean.endsWith('.svg')) return '.svg';
  return '.jpg';
}

/**
 * ينزّل ملفاً إلى `public/<dir>/<name><ext>` ويعيد مساره العام.
 * يعيد null عند الفشل — أصل ناقص لا يُسقط المزامنة كلها.
 */
/**
 * أسماء الملفات والمجلدات: حروف وأرقام وشرطات فقط.
 *
 * ⚠️ هذه الدالة تكتب على القرص من قيمتين نصّيتين. مستدعوها اليوم كلهم سكربتات
 * تمرّر معرّفات ثابتة، فلا خطر **الآن**. لكنّها بشكلها السابق «ابتدائية كتابة
 * بمسار حرّ»: يكفي أن يربطها أحد يوماً بقيمة مشتقّة من تغذية RSS أو من مخرجات
 * نموذج — وكلاهما موجود في هذا المشروع — ليصير `../../` كتابةً خارج `public`.
 *
 * الحارس هنا لا عند المستدعي: القاعدة التي تعتمد على تذكّر كل مستدعٍ ليست
 * قاعدة.
 */
const SAFE_SEGMENT = /^[a-zA-Z0-9._-]+$/;

function assertSafeSegment(value: string, label: string): void {
  if (!SAFE_SEGMENT.test(value) || value.includes('..')) {
    throw new Error(`اسم ${label} غير آمن: «${value}»`);
  }
}

export async function downloadAsset(
  url: string,
  dir: string,
  name: string,
  options: { width?: number; overwrite?: boolean } = {},
): Promise<string | null> {
  assertSafeSegment(dir, 'المجلد');
  assertSafeSegment(name, 'الملف');
  /**
   * نجرّب عرضاً أصغر أولاً لتخفيف حجم الملف، ثم الرابط الأصلي.
   *
   * ويكيميديا لا تقبل أي عرض عشوائي: طلب `800px-` لملف تُخدَم منه `1920px-`
   * يعيد **400 Bad Request**. اكتشفنا ذلك بعد أن فشل تنزيل 61 صورة من 78
   * بينما كانت روابطها الأصلية تعمل. الصحة تسبق التوفير.
   */
  const candidates = options.width ? [capWidth(url, options.width), url] : [url];
  const extension = extensionOf(url);
  const relative = `/${dir}/${name}${extension}`;
  const target = path.join(process.cwd(), 'public', dir, `${name}${extension}`);

  /**
   * موجود مسبقاً — لا نعيد التنزيل في كل تشغيلة.
   *
   * `overwrite` ضروري حين يتغيّر **اختيار** الصورة لا الملف: إعادة ترتيب
   * أولويات البحث تعطي رابطاً جديداً لنفس السائق، ولولا التجاوز لبقي الملف
   * القديم مكانه وبدا كأن التغيير لم يعمل.
   */
  if (!options.overwrite) {
    try {
      const stat = await fs.stat(target);
      if (stat.size > 0) return relative;
    } catch {
      // غير موجود — نكمل للتنزيل
    }
  }

  /**
   * ويكيميديا تحدّ المعدّل بحزم: تنزيل 78 صورة بلا فواصل يعيد 429 لمعظمها.
   * ننتظر بينها ونتراجع تصاعدياً عند الرفض — مشروع تبرّعي يستحق هذا الأدب،
   * والنتيجة العملية أن التنزيل ينجح بدل أن يفشل.
   */
  for (const source of candidates) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      if (attempt > 0) await sleep(1_500 * 2 ** attempt);

      try {
        const response = await fetch(source, { headers: UA, signal: AbortSignal.timeout(30_000) });

        // مؤقت: نعيد المحاولة. دائم (400/404): ننتقل للمرشّح التالي
        if (response.status === 429 || response.status >= 500) continue;
        if (!response.ok) break;

        const bytes = Buffer.from(await response.arrayBuffer());
        if (bytes.length === 0) break;

        await fs.mkdir(path.dirname(target), { recursive: true });
        await fs.writeFile(target, bytes);
        return relative;
      } catch {
        // مهلة أو انقطاع — نعيد المحاولة
      }
    }
  }

  return null;
}


/**
 * أعلام الدول كملفات SVG محلية.
 *
 * لا نستعمل رموز الإيموجي: **ويندوز لا يملك خطوط أعلام**، فيعرض حرفَي الدولة
 * («AU» بدل 🇦🇺) — وهذا يمسّ معظم جمهور الموقع.
 */
export async function downloadFlag(code: string): Promise<string | null> {
  if (!code || code.length !== 2) return null;
  const lower = code.toLowerCase();
  return downloadAsset(`https://flagcdn.com/${lower}.svg`, 'flags', lower);
}
