import 'server-only';

import type { ImageCredit } from '@/lib/types';

/**
 * آلة البحث في ويكيميديا كومنز — مشتركة بين مزوّدَي الصور.
 *
 * `wikimedia` يستعملها بتطابق صارم على كيان الخبر (سائق، فريق، جولة).
 * `topic-fallback` يستعملها بتطابق مرن على موضوع الخبر (إطارات، وحدة طاقة).
 * الفحوص القانونية ونوع الملف واحدة في الحالتين — لا تُخفَّف أبداً.
 */

const API = 'https://commons.wikimedia.org/w/api.php';

/** تراخيص نقبلها. ما عداها يُتجاهل حتى لو كانت الصورة مناسبة. */
const ACCEPTED_LICENSE = /^(CC BY(-SA)?( \d(\.\d)?)?|CC0|Public domain|PD)/i;

/** أقدم سنة نقبلها — صورة 1952 فوق خبر 2026 خطأ تحريري. */
const OLDEST_ACCEPTABLE_YEAR = 2015;

/**
 * إشارات أن الصورة من عالم السباقات لا من الطريق العام.
 * اسم الفريق وحده لا يكفي: «McLaren 2026» أعاد سيارة McLaren 720S للطرق.
 */
export const RACING_SIGNAL =
  /\b(f1|formula|grand prix|gp|grid|paddock|qualifying|practice|circuit|race|pit|tyre|tire|pirelli)\b/i;

/**
 * إشارات أن الصورة لسيارة أو حدث تاريخي.
 *
 * ⚠️ لا يغني عنه فحص السنة، بل يعالج ثغرته: السنة في اسم الملف هي **تاريخ
 * الالتقاط** لا عصر ما في الصورة. ملف حقيقي ظهر في الاختبار اسمه
 * `Minardi_M198_2025-09-06_Italian_Grand_Prix.jpg` — التاريخ 2025 فاجتاز فحص
 * الحداثة، بينما السيارة من 1998 صُوّرت في عرض تاريخي. الفرق يُكتشف من الاسم.
 */
const VINTAGE_MARKERS = [
  // كلمات صريحة
  'historic', 'classic', 'vintage', 'museum', 'heritage', 'demonstration',
  'goodwood', 'retro', 'legends', 'anniversary',

  /**
   * رعاية التبغ — أقوى إشارة زمنية في هذه الرياضة.
   * مُنعت في الفورمولا 1 منذ 2006، فوجود أيٍّ منها يعني أن الصورة أقدم من ذلك
   * قطعاً. هذه القاعدة أمسكت 9_Marlboro_BRM_Paddock.jpg أثناء الاختبار.
   */
  'marlboro', 'gold leaf', 'john player', 'jps', 'camel', 'mild seven',
  'lucky strike', 'rothmans', 'gitanes', 'west mclaren',

  // فرق غادرت الشبكة — من الأحدث إلى الأقدم
  'minardi', 'jordan', 'benetton', 'toro rosso', 'force india', 'alphatauri',
  'caterham', 'marussia', 'virgin racing', 'manor', 'lotus f1', 'team lotus',
  'brawn', 'honda racing f1', 'bar honda', 'renault f1', 'alfa romeo racing',
  'midland', 'spyker', 'super aguri', 'stewart grand prix', 'jaguar racing',
  'arrows', 'prost grand prix', 'toleman', 'ligier', 'simtek', 'forti',
  'pacific racing', 'eurobrun', 'larrousse', 'zakspeed', 'coloni', 'osella',
  'brabham', 'tyrrell', 'shadow', 'hesketh', 'ensign', 'wolf racing',
  'march engineering', 'brm', 'vanwall', 'maserati', 'matra', 'surtees',
  'cooper car', 'lola', 'eagle', 'connaught',
];

/** كيانات HTML الشائعة في حقول كومنز — تُفكّ قبل العرض. */
const HTML_ENTITIES: Record<string, string> = {
  '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"',
  '&#039;': "'", '&#39;': "'", '&nbsp;': ' ',
};

export interface CommonsHit {
  url: string;
  title: string;
  credit: ImageCredit;
  year: number | null;
  racing: boolean;
}

interface CommonsPage {
  title: string;
  imageinfo?: {
    url: string;
    mediatype?: string;
    thumburl?: string;
    descriptionurl?: string;
    extmetadata?: Record<string, { value?: string }>;
  }[];
}

export function stripHtml(value: string): string {
  const text = value
    .replace(/<[^>]+>/g, '')
    .replace(/&[a-z]+;|&#\d+;/gi, (entity) => HTML_ENTITIES[entity.toLowerCase()] ?? entity)
    .replace(/\s+/g, ' ')
    .trim();

  /** حقل المصوّر يأتي أحياناً بوسم متداخل يحمل الاسم مرتين. */
  const half = text.length / 2;
  if (text.length > 0 && text.length % 2 === 0 && text.slice(0, half) === text.slice(half)) {
    return text.slice(0, half);
  }
  return text;
}

/**
 * يطبّع عنوان الملف إلى كلمات مفصولة بمسافات.
 *
 * ⚠️ النقطتان جزء أساسي من الفواصل: كومنز يعيد العنوان مسبوقاً بـ`File:`،
 * فبدون فصلها تصير `file:minardi` كلمة واحدة ولا تطابق `minardi` — وهذا
 * بالضبط ما أعاد صورة مينارذي 1998 بعد أن ظننتها مرفوضة.
 */
function normalizeTitle(title: string): string {
  return ` ${title
    .toLowerCase()
    .replace(/[_\-.:()/,]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()} `;
}

/**
 * مطابقة بكلمات كاملة لا باحتواء جزئي: «brm» و«eagle» و«lola» قصيرة وتظهر
 * داخل كلمات بريئة، والاحتواء الأعمى كان سيرفض صوراً سليمة.
 */
export function looksVintage(title: string): boolean {
  const words = normalizeTitle(title);
  return VINTAGE_MARKERS.some((marker) => words.includes(` ${marker} `));
}

function yearIn(title: string): number | null {
  const match = title.match(/\b(19|20)\d{2}\b/);
  if (!match) return null;
  const year = Number(match[0]);
  return year >= 1900 && year <= new Date().getUTCFullYear() + 1 ? year : null;
}

/** يجلب نتائج بحث خام من كومنز. */
async function fetchPages(term: string): Promise<CommonsPage[]> {
  const url =
    `${API}?action=query&generator=search&gsrsearch=${encodeURIComponent(term)}` +
    `&gsrnamespace=6&gsrlimit=14&prop=imageinfo` +
    `&iiprop=url%7Cmediatype%7Cextmetadata&iiurlwidth=1600&format=json&origin=*`;

  try {
    const response = await fetch(url, {
      headers: { 'user-agent': 'SaudiF1Grid/1.0 (https://saudif1grid.com)' },
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) return [];
    const pages = (await response.json())?.query?.pages;
    return pages ? Object.values(pages) : [];
  } catch {
    // تعذّر الوصول — ليس سبباً لإسقاط الخبر
    return [];
  }
}

/**
 * يبحث ويعيد النتائج الصالحة قانونياً وتقنياً.
 *
 * `accept` هو الفلتر الخاص بكل مزوّد — الصلة الصارمة أو المرنة. أما فحوص
 * **الترخيص ونوع الملف** فتُطبَّق هنا دائماً ولا يستطيع أي مزوّد تجاوزها.
 *
 * `allowHistoric` يعطّل فحصَي الحداثة (سنة الملف وعلامات الأرشيف) وحدهما.
 * الفرق ليس تخفيفاً للقاعدة بل تصحيح لمجالها: «صورة 1965 خطأ» صحيحة فوق
 * **خبر** اليوم، وخاطئة تماماً في **صفحة سائق قاد في 1965** — فبورتريه
 * جاك برابهام أرشيفي بالضرورة، ورفضه يترك 700 سائق بلا صورة. الترخيص لا
 * يُخفَّف في الحالتين.
 */
export async function searchCommons(
  term: string,
  accept: (title: string) => boolean,
  options: { requireDated?: boolean; allowHistoric?: boolean } = {},
): Promise<CommonsHit[]> {
  const pages = await fetchPages(term);
  const hits: CommonsHit[] = [];

  for (const page of pages) {
    const info = page.imageinfo?.[0];
    if (!info) continue;

    /**
     * الفحص على الملف الأصلي لا على المصغّر: كومنز يولّد مصغّرات JPEG لملفات
     * PDF، فينتهي رابط المصغّر بـ `.pdf/page1-1600px.jpg` ويجتاز فحص الامتداد
     * بينما الأصل وثيقة — وهذا ما أنزل صفحة من الجريدة الرسمية الأوروبية فوق
     * خبر رياضي أثناء الاختبار.
     */
    if (info.mediatype && info.mediatype !== 'BITMAP') continue;
    if (!/\.(jpe?g|png|webp)$/i.test(page.title)) continue;
    if (!options.allowHistoric && looksVintage(page.title)) continue;
    if (!accept(page.title)) continue;

    const meta = info.extmetadata ?? {};
    const license = stripHtml(meta.LicenseShortName?.value ?? '');
    if (!ACCEPTED_LICENSE.test(license)) continue;

    const year = yearIn(page.title);
    if (!options.allowHistoric && year !== null && year < OLDEST_ACCEPTABLE_YEAR) continue;

    /**
     * البحث الموضوعي بمصطلحات عامة («Formula One paddock») يجرّ أرشيف عقود
     * كاملة. الملف بلا سنة في اسمه لا سبيل للتحقق من عصره، فنرفضه في هذا
     * الوضع — هكذا سقطت صورة جيمس هنت (1976) وشبكة بول ريكار غير المؤرّخة.
     */
    if (options.requireDated && year === null) continue;

    hits.push({
      url: info.thumburl ?? info.url,
      title: page.title,
      year,
      racing: RACING_SIGNAL.test(page.title),
      credit: {
        author: stripHtml(meta.Artist?.value ?? '') || 'مصوّر غير مذكور',
        source: 'Wikimedia Commons',
        license,
        sourceUrl: info.descriptionurl ?? null,
      },
    });
  }

  return hits;
}

/**
 * بيانات ترخيص ملف بعينه على كومنز، انطلاقاً من رابط الصورة.
 *
 * صورة البطاقة في مقالة ويكيبيديا أدقّ بكثير من البحث بالكلمات — هي **صورة
 * الشخص نفسه** لا أقرب نتيجة اسمياً. لكن واجهة الملخّص تعطي الرابط بلا مؤلّف
 * ولا ترخيص، ونشرها بلا نسبة إخلال بشرط CC. فنسأل كومنز عن الملف مباشرة.
 *
 * يعيد الرابط المصغَّر مع النسبة، أو null إن لم يكن الملف على كومنز أو لم يكن
 * ترخيصه مقبولاً — وحينها لا
 * تُستعمل الصورة أصلاً. الغياب رفض، لا تجاهل.
 */
export async function getCommonsFile(
  imageUrl: string,
  width = 800,
): Promise<{ url: string; credit: ImageCredit } | null> {
  if (!imageUrl.includes('/wikipedia/commons/')) return null;

  /**
   * .../commons/thumb/a/ab/Name.jpg/800px-Name.jpg → Name.jpg
   *
   * ⚠️ حذف سلسلة الاستعلام أولاً: واجهة ملخّص ويكيبيديا تُلحق
   * `?utm_source=en.wikipedia.org…` بكل رابط صورة. بدون حذفها يصير اسم الملف
   * `Name.jpg?utm_source=…` فلا يجده كومنز، فيعود null — وقد أسقط هذا **كل**
   * صور البطاقات في أول تشغيلة، فسقط الجميع إلى البحث بالكلمات.
   */
  const clean = imageUrl.split('?')[0];
  const parts = clean.split('/wikipedia/commons/')[1]?.split('/') ?? [];
  const file = clean.includes('/thumb/') ? parts[3] : parts[2];
  if (!file) return null;

  const name = decodeURIComponent(file);
  const url =
    `${API}?action=query&titles=${encodeURIComponent(`File:${name}`)}` +
    `&prop=imageinfo&iiprop=extmetadata%7Curl&iiurlwidth=${width}&format=json&origin=*`;

  try {
    const response = await fetch(url, {
      headers: { 'user-agent': 'SaudiF1Grid/1.0 (https://saudif1grid.com)' },
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) return null;

    const pages = (await response.json())?.query?.pages;
    const info = (Object.values(pages ?? {})[0] as CommonsPage | undefined)?.imageinfo?.[0];
    if (!info) return null;

    const meta = info.extmetadata ?? {};
    const license = stripHtml(meta.LicenseShortName?.value ?? '');
    if (!ACCEPTED_LICENSE.test(license)) return null;

    return {
      // عرض ولّدته الواجهة عند الطلب — بديل الأصل الذي قد يبلغ ميغابايتات
      url: info.thumburl ?? info.url ?? imageUrl,
      credit: {
        author: stripHtml(meta.Artist?.value ?? '') || 'مصوّر غير مذكور',
        source: 'Wikimedia Commons',
        license,
        sourceUrl: info.descriptionurl ?? null,
      },
    };
  } catch {
    return null;
  }
}
