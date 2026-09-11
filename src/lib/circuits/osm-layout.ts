/**
 * مخطّطات الحلبات — مرسومة عندنا من بيانات OpenStreetMap.
 *
 * ## لماذا لا نأخذها جاهزة
 *
 * لا يوجد مصدر حرّ **موحّد** لمخططات الحلبات. مخططات فورمولا 1 الرسمية موحّدة
 * لكنها محمية. وما على ويكيميديا رسمه عشرات المتطوّعين عبر عشرين سنة: سماكات
 * خطوط مختلفة، وألوان مختلفة، وبعضها صور نقطية باهتة. جمعُها في شبكة واحدة
 * يبدو مبعثراً مهما اجتهدنا في الاختيار.
 *
 * الحلّ أن نرسمها بأنفسنا: OpenStreetMap يخزّن **الهندسة الحقيقية** لكل مسار،
 * فنحوّلها إلى SVG بأسلوب واحد. التوحيد هنا بالتكوين لا بالصدفة، والوضوح
 * مضمون لأن الناتج متجهيّ يكبر بلا تشوّه.
 *
 * الترخيص: بيانات OSM تحت ODbL — تتطلّب النسبة، وتُذكر تحت كل مخطّط.
 *
 * ## كيف نعثر على الحلبة الصحيحة
 *
 * البحث بالإحداثيات وحده يجرّ الجوار: حلبة الكارتينغ، والحلقة العالية القديمة،
 * ومسار الاختبارات. لكن OSM يضع للحلبات علاقة `type=circuit` تحمل **معرّف
 * ويكي بيانات**، وهو المعرّف نفسه الذي نستعمله لجلب الطول والمنعطفات. فنطابق
 * عليه، فنحصل على مسار الجائزة الكبرى الحالي بالضبط.
 */

export interface LatLon {
  lat: number;
  lon: number;
}

interface OverpassWay {
  type: 'way';
  id: number;
  tags?: Record<string, string>;
  geometry?: LatLon[];
}

const OVERPASS = 'https://overpass-api.de/api/interpreter';
const UA = 'SaudiF1Grid/1.0 (https://saudif1grid.com)';

/**
 * ممرّ الصيانة ليس جزءاً من المسار.
 *
 * إبقاؤه يرسم خطاً موازياً غريباً بجانب خطّ الانطلاق يفسد شكل المخطّط كلّه.
 */
function isPitLane(way: OverpassWay): boolean {
  const tags = way.tags ?? {};
  if (tags.raceway === 'pitlane' || tags.service === 'pitlane') return true;
  return /pit\s?lane|boxengasse|voie des stands/i.test(tags.name ?? '');
}

/** مفتاح نقطة — التقريب يجمع الأطراف التي يفصلها خطأ عشري ضئيل. */
function key(point: LatLon): string {
  return `${point.lat.toFixed(6)},${point.lon.toFixed(6)}`;
}

/**
 * يصل المقاطع في مسار واحد متّصل.
 *
 * OSM يخزّن الحلبة مقاطعَ منفصلة (كل منعطف باسمه). رسمُها منفصلة يعطي خطوطاً
 * متقطّعة، فنلاحق الأطراف المشتركة: نبدأ بأطول مقطع ثم نضمّ إليه ما يلامس
 * طرفه، عاكسين اتجاهه عند اللزوم، حتى ينغلق المسار أو ينفد الوصل.
 */
export function stitch(ways: OverpassWay[]): LatLon[] {
  const segments = ways
    .filter((way) => way.geometry && way.geometry.length > 1 && !isPitLane(way))
    .map((way) => way.geometry as LatLon[])
    .sort((a, b) => b.length - a.length);

  if (segments.length === 0) return [];

  const used = new Set<number>([0]);
  const path = [...segments[0]];

  let progress = true;
  while (progress) {
    progress = false;
    const tail = key(path[path.length - 1]);
    const head = key(path[0]);

    for (let i = 0; i < segments.length; i += 1) {
      if (used.has(i)) continue;
      const segment = segments[i];
      const start = key(segment[0]);
      const end = key(segment[segment.length - 1]);

      if (start === tail) path.push(...segment.slice(1));
      else if (end === tail) path.push(...segment.slice(0, -1).reverse());
      else if (end === head) path.unshift(...segment.slice(0, -1));
      else if (start === head) path.unshift(...segment.slice(1).reverse());
      else continue;

      used.add(i);
      progress = true;
      break;
    }
  }

  return path;
}

export interface Projected {
  /** نقاط في فضاء العرض، جاهزة لمسار SVG. */
  points: { x: number; y: number }[];
  width: number;
  height: number;
  /** هل انغلق المسار على نفسه؟ حلبة مفتوحة إشارة إلى بيانات ناقصة. */
  closed: boolean;
}

/**
 * إسقاط جغرافي إلى إحداثيات العرض.
 *
 * `cos(lat)` ضروري: درجة الطول تتقلّص كلّما ابتعدنا عن خطّ الاستواء، وإغفالها
 * يمطّ الحلبات الشمالية أفقياً — سيلفرستون تبدو أعرض ممّا هي بنحو الثلث.
 */
export function project(path: LatLon[], size = 1000, padding = 60): Projected {
  if (path.length < 2) return { points: [], width: size, height: size, closed: false };

  const midLat = (Math.min(...path.map((p) => p.lat)) + Math.max(...path.map((p) => p.lat))) / 2;
  const scaleX = Math.cos((midLat * Math.PI) / 180);

  const raw = path.map((p) => ({ x: p.lon * scaleX, y: -p.lat }));

  const minX = Math.min(...raw.map((p) => p.x));
  const maxX = Math.max(...raw.map((p) => p.x));
  const minY = Math.min(...raw.map((p) => p.y));
  const maxY = Math.max(...raw.map((p) => p.y));

  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;

  // مقياس واحد للمحورين حفاظاً على الشكل الحقيقي
  const inner = size - padding * 2;
  const scale = inner / Math.max(spanX, spanY);

  const width = Math.round(spanX * scale + padding * 2);
  const height = Math.round(spanY * scale + padding * 2);

  const points = raw.map((p) => ({
    x: Math.round(((p.x - minX) * scale + padding) * 10) / 10,
    y: Math.round(((p.y - minY) * scale + padding) * 10) / 10,
  }));

  const first = points[0];
  const last = points[points.length - 1];
  const gap = Math.hypot(first.x - last.x, first.y - last.y);

  return { points, width, height, closed: gap < inner * 0.04 };
}

/**
 * يجلب مقاطع الحلبة من Overpass بمعرّف ويكي بيانات.
 *
 * ⚠️ Overpass خدمة تبرّعية تشغّلها الجامعات، وحدّها صارم: طلبات متتابعة بلا
 * تنفّس تُقابَل بـ**429** حتى لو كانت متسلسلة. أول تشغيلة نجح فيها ثلاثة من
 * ستّة لهذا السبب وحده. الانتظار هنا ليس تهذيباً زائداً بل شرط عمل.
 */
export async function fetchCircuitWays(
  wikidataId: string | null,
  fallback?: { lat: number; lon: number; radius?: number },
): Promise<OverpassWay[]> {
  /**
   * مسارَان للعثور على الحلبة، والأول أدقّ بكثير.
   *
   * **بالمعرّف**: يعطي مسار الجائزة الكبرى الحالي بالضبط، بلا جوار.
   * **بالإحداثيات**: احتياطي لحلبة لم تُربَط بويكي بيانات في OSM — مثل جدة.
   * لكنه يجرّ ما حولها (كارتينغ، مسار اختبار، تخطيط قديم)، فنتّكل بعده على
   * `stitch` ليختار أطول سلسلة متّصلة.
   */
  const query = wikidataId
    ? `[out:json][timeout:60];
relation["type"="circuit"]["wikidata"="${wikidataId}"];
way(r);
out geom;`
    : `[out:json][timeout:60];
way(around:${fallback?.radius ?? 2500},${fallback?.lat},${fallback?.lon})["highway"="raceway"];
out geom;`;

  if (!wikidataId && !fallback) throw new Error('لا معرّف ولا إحداثيات');

  let lastStatus = 0;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    if (attempt > 0) {
      // تراجع سخيّ: 8، 16، 32 ثانية — الخادم يعافي نفسه بينها
      await new Promise((resolve) => setTimeout(resolve, 8_000 * 2 ** (attempt - 1)));
    }

    let response: Response;
    try {
      response = await fetch(OVERPASS, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded', 'user-agent': UA },
        body: `data=${encodeURIComponent(query)}`,
        signal: AbortSignal.timeout(90_000),
      });
    } catch {
      lastStatus = 0; // مهلة أو انقطاع — نعيد المحاولة
      continue;
    }

    if (response.ok) {
      const data = (await response.json()) as { elements: OverpassWay[] };
      return data.elements.filter((element) => element.type === 'way');
    }

    lastStatus = response.status;
    if (response.status !== 429 && response.status < 500) break;
  }

  throw new Error(`Overpass ${lastStatus || 'timeout'}`);
}

/**
 * يبني SVG بأسلوب موحّد.
 *
 * السماكة **نسبة من المقاس** لا رقماً ثابتاً، فتبدو موحّدة عبر 78 حلبة مهما
 * اختلفت أبعادها — وهذا جوهر التوحيد المطلوب.
 *
 * ⚠️ اللون رمادي محايد صريح لا `currentColor`. السبب تقني: الملف يُعرض عبر
 * `<img>` فلا يرث لون الصفحة — `currentColor` داخله يصير أسود على خلفية
 * داكنة. والرمادي المتوسط يُقرأ على الوضعين معاً، فنكسب التوحيد والوضوح بلا
 * تعقيد. علامة خطّ الانطلاق وحدها بلون الهوية.
 */
const NEUTRAL = '#a1a1aa';

export function toSvg(projected: Projected, options: { accent?: string } = {}): string {
  const { points, width, height } = projected;
  if (points.length < 2) return '';

  const accent = options.accent ?? '#e10600';
  const stroke = Math.max(width, height) * 0.022;

  const d = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`)
    .join(' ')
    .concat(projected.closed ? ' Z' : '');

  /** شارة خطّ الانطلاق: خطّ قصير عمودي على اتجاه المسار عند أول نقطة. */
  const [a, b] = points;
  const angle = Math.atan2(b.y - a.y, b.x - a.x) + Math.PI / 2;
  const tick = stroke * 1.9;
  const sx = a.x + Math.cos(angle) * tick;
  const sy = a.y + Math.sin(angle) * tick;
  const ex = a.x - Math.cos(angle) * tick;
  const ey = a.y - Math.sin(angle) * tick;

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" fill="none" role="img">`,
    `<path d="${d}" stroke="${NEUTRAL}" stroke-width="${stroke.toFixed(1)}" stroke-linecap="round" stroke-linejoin="round" opacity="0.9"/>`,
    `<path d="M${sx.toFixed(1)} ${sy.toFixed(1)} L${ex.toFixed(1)} ${ey.toFixed(1)}" stroke="${accent}" stroke-width="${(stroke * 0.9).toFixed(1)}" stroke-linecap="round"/>`,
    '</svg>',
  ].join('');
}
