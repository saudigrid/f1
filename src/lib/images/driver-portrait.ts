import 'server-only';

import type { ImageCredit } from '@/lib/types';

import { getCommonsFile, searchCommons } from './commons';

/**
 * صورة السائق، بالأولوية التي طلبها التحرير:
 *
 *   ١. **صورة السائق** — من بطاقة مقالته في ويكيبيديا أولاً، فهي صورة الشخص
 *      نفسه لا أقرب نتيجة بحث اسمياً. ثم بحث كومنز باسمه كاملاً.
 *   ٢. **صورة فريقه** حين لا توجد صورة له — وهذا شائع في سائقي الخمسينيات
 *      الذين شاركوا بسباق أو سباقين ولم تُرفع لهم صورة حرّة قطّ.
 *
 * ⚠️ فحص «الأرشيفية» معطَّل هنا عمداً (`allowHistoric`). صورة من 1958 خاطئة
 * فوق خبر اليوم، وصحيحة تماماً في صفحة سائق قاد في 1958 — بل هي الصورة
 * الوحيدة الممكنة. الترخيص لا يُخفَّف: كومنز وحده، وبرخصة حرّة معروفة.
 */

export type DriverImageKind = 'portrait' | 'commons' | 'team';

export interface DriverImage {
  url: string;
  kind: DriverImageKind;
  credit: ImageCredit;
}

const UA = { 'user-agent': 'SaudiF1Grid/1.0 (https://saudif1grid.com)' };

/**
 * عرض صور السائقين المنزَّلة.
 *
 * ⚠️ 480 ليس رقماً اعتباطياً: ويكيميديا تصيّر مجموعة عروض محدّدة فقط، وتعيد
 * **الأصل كاملاً** لما عداها بلا أي خطأ. قياس على ملف واحد (860×1153):
 * 400 ✓، 480 ✓، 512 ✗، 640 ✗ — والأصل 891 كيلوبايت مقابل ~90 للمصغَّر.
 * لا تغيّره دون التحقّق، وإلا تضاعف حجم  بلا سبب ظاهر.
 */
const IMAGE_WIDTH = 480;

/** يوحّد أي رابط كومنز إلى مصغَّر بالعرض المعتمد، مع نسبته الصحيحة. */
async function normalizeHit(
  url: string,
  fallbackCredit: ImageCredit,
  kind: DriverImageKind,
): Promise<DriverImage> {
  const file = await getCommonsFile(url, IMAGE_WIDTH);
  return file
    ? { url: file.url, kind, credit: file.credit }
    : { url, kind, credit: fallbackCredit };
}

/** صور `/wikipedia/en/` رفع محلي باستخدام عادل — غير حرّة. الحرّ تحت `/commons/` وحده. */
function isFreelyLicensed(url: string): boolean {
  return url.includes('/wikipedia/commons/');
}

function normalize(text: string): string {
  return ` ${text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Räikkönen ← raikkonen في أسماء الملفات
    .replace(/[_\-.:()/,']+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()} `;
}

/**
 * تطابق صارم: الاسم الأول **واسم العائلة** معاً.
 *
 * العائلة وحدها لا تكفي في هذه الرياضة تحديداً — سينا وفيتيبالدي وشوماخر
 * وفيرستابن وروزبرغ وأندريتي وفيلنوف كلها عائلات فيها أكثر من سائق. قبول
 * «Senna» وحدها يضع برونو مكان أيرتون.
 */
/** لواحق الأجيال — الفارق الوحيد بين اسمَي أب وابنه. */
const GENERATION = /\s(jr|junior|sr|senior|ii|iii)\s/;

function matchesName(title: string, nameEn: string): boolean {
  const haystack = normalize(title);
  const parts = normalize(nameEn).trim().split(' ').filter(Boolean);
  if (parts.length === 0) return false;

  const family = parts[parts.length - 1];
  const given = parts[0];

  if (!haystack.includes(` ${family} `) || !haystack.includes(` ${given} `)) return false;

  /**
   * اللاحقة يجب أن تتطابق في الاتجاهين.
   *
   * «Nelson Piquet» و«Nelson Piquet Jr» يتطابقان في الاسم الأول والعائلة معاً،
   * فمرّت صورة **الابن** وهو يحطّم سيارته في سنغافورة 2008 في بطاقة **الأب**
   * بطل العالم ثلاث مرات. الفارق كلّه في مقطع من حرفين.
   */
  return GENERATION.test(haystack) === GENERATION.test(normalize(nameEn));
}

/**
 * إشارات أن الملف صورة **شيء** لا صورة **شخص**.
 *
 * حالتان ظهرتا في الاختبار، كلتاهما تحمل الاسم الصحيح:
 *
 *   • **سيارته لا هو** — `Charles Leclerc's Ferrari SF90.jpg`. رمز الطراز
 *     أوضح دليل، فنمط كهذا لا يظهر إلا في السيارات.
 *
 *     ⚠️ حرف واحد يكفي: اشترطتُ أولاً حرفين فأكثر (`SF90`، `MCL35`)، فمرّت
 *     `Renault R26` في بطاقة ألونسو و`Sauber C31` في بطاقة بيريز — صورتا
 *     سيارتين في مكان صورتَي رجلين.
 *   • **تمثاله لا هو** — `Senna_and_Fangio_Memorial_(Juan_Manuel_Fangio).jpg`.
 *     هذه أخطر: كلما قدم السائق قلّت صوره الحيّة الحرّة وكثرت النُّصُب، فتصعد
 *     في نتائج البحث. صورة نصب تذكاري في بطاقة فانخيو خطأ صريح.
 */
/**
 * رمز طراز السيارة — حروف يليها أرقام مباشرة.
 *
 * ⚠️ الصياغة أدقّ ممّا تبدو، وكل قيد فيها ثمنه خطأ ظهر فعلاً:
 *
 *   • **حرف لاحق مسموح** (`FW15C`): اشتراط نهاية الكلمة بعد الأرقام أفلت
 *     `Alain Prost - Williams FW15C` إلى بطاقة بروست — صورة سيارة مكان رجل.
 *   • **فاصل رقمي مسموح** (`MP4-8`، `MP4/4`): أفلت `Ayrton Senna - Mclaren
 *     MP4-8` إلى بطاقة سينا للسبب نفسه.
 *   • **رقمان على الأقلّ** بعد الحروف: بحرف واحد يصير `F1` رمز طراز، فتُرفض
 *     كل صورة فيها «F1» — أي معظم صور هذه الرياضة.
 */
const CAR_MODEL = String.raw`[A-Za-z]{1,4}\d{2,4}[A-Za-z]?|[A-Za-z]{2,4}\d[-/]\d`;

/**
 * اسم صانع يليه رقم بمسافة — «Jordan 193»، «Lotus 79»، «Brabham BT37».
 *
 * نمط الطُّرُز يشترط التصاق الحروف بالأرقام، فيفلت منه ما فصلته مسافة. ولا
 * يمكن تعميم «كلمة ثم رقم» لأن «Hockenheimring 1992» و«Silverstone 2019»
 * تطابقه وهي عناوين صور سليمة تماماً. فالقيد على **أسماء الصانعين** تحديداً:
 * هي وحدها التي يتلوها رقم فيصير المعنى «سيارة» لا «حدث».
 */
const CONSTRUCTOR_CAR = String.raw`(?:ferrari|mclaren|williams|lotus|brabham|jordan|benetton|tyrrell|arrows|ligier|minardi|sauber|jaguar|renault|honda|matra|march|shadow|surtees|wolf|hesketh|ensign|toleman|osella|cooper|brm|ats|lola|dallara|footwork|larrousse|simtek|forti|prost|stewart|jaguar|toyota|midland|spyker|caterham|marussia|manor|haas)\s+[A-Z]{0,3}\d{1,3}`;

const NOT_A_PERSON = new RegExp(
  String.raw`\b(${CAR_MODEL}|${CONSTRUCTOR_CAR}|helmet|helm|livery|steering|engine|garage|pit\s?wall|trophy|logo|memorial|statue|monument|bust|plaque|grave|tribute|mural|sign|street|flag|grandstand|tribune|banner|crowd|fans?|poster|board|paddock\s?club|motorhome)\b`,
  'i',
);

/** هل هذا الملف صورة للسائق نفسه، بسياق سباقات، وبيقين في الهوية؟ */
function looksLikePersonPhoto(title: string, nameEn: string): boolean {
  return matchesName(title, nameEn) && !NOT_A_PERSON.test(title.replace(/[_]+/g, ' '));
}

interface Summary {
  originalimage?: { source: string };
  thumbnail?: { source: string };
}

/** صورة بطاقة مقالة ويكيبيديا — أدقّ مصدر لصورة شخص بعينه. */
async function fromWikipedia(wikipediaUrl: string | null): Promise<DriverImage | null> {
  const title = wikipediaUrl?.split('/wiki/')[1];
  if (!title) return null;

  let summary: Summary | null = null;
  try {
    const response = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${title}`,
      { headers: UA, signal: AbortSignal.timeout(20_000) },
    );
    if (!response.ok) return null;
    summary = (await response.json()) as Summary;
  } catch {
    return null;
  }

  // الواجهة تُلحق وسوم تتبّع بالرابط — تُحذف قبل أي استعمال
  const source = (summary?.originalimage?.source ?? summary?.thumbnail?.source)?.split('?')[0];
  if (!source || !isFreelyLicensed(source)) return null;

  /**
   * الرابط وحده لا يكفي للنشر: رخص CC تشترط نسبة المصوّر. فنسأل كومنز عن
   * الملف، وإن لم يعد بترخيص مقبول تركنا الصورة — الغياب رفض لا تجاهل.
   */
  const file = await getCommonsFile(source, IMAGE_WIDTH);
  if (!file) return null;

  return { url: file.url, kind: 'portrait', credit: file.credit };
}

/** يبحث عن صورة سائق. `wikipediaUrl` اختياري لكنه يرفع الدقّة كثيراً. */
export async function findDriverPortrait(
  nameEn: string,
  wikipediaUrl: string | null = null,
  exclude: string[] = [],
): Promise<DriverImage | null> {
  const used = new Set(exclude);

  /**
   * أولاً: صورة **للسائق نفسه في سياق السباقات**، إن وُجدت بيقين.
   *
   * صورة بطاقة ويكيبيديا مضمونة الهوية لكنها ليست دائماً رياضية: بطاقتا شارل
   * لوكلير وكارلوس ساينز صورتان رسميتان على سجّادة حمراء — صحيحتان تماماً،
   * وغريبتان فوق موقع سباقات. فنجرّب أولاً صورة مؤهَّلة بالرياضة تحمل الاسمين
   * ولا تحمل إشارة «شيء»، ونسقط إلى البطاقة عند أدنى شكّ.
   *
   * الشرط مشدَّد عمداً: نتيجة واحدة مشكوك فيها أسوأ من عشر صور رسمية.
   */
  /**
   * نجمع من كل المصطلحات ثم نرتّب بالأحدث — لا نأخذ أول نتيجة.
   *
   * السبب تحريري: المطلوب صورة السائق **ببدلة فريقه الأخير**. وترتيب البحث
   * يعطي الأصلح لغوياً لا الأحدث زمنياً، فظهر هاميلتون بألوان مكلارين 2012
   * وقد انتقل منها منذ سنوات، وألونسو بسيارة رينو 2006. سنة الملف في عنوانه،
   * فالترتيب التنازلي بها يقارب «الفريق الأخير» بلا معرفة إضافية.
   *
   * الملف بلا سنة يأتي بعد المؤرَّخ: لا نعرف عصره، فلا نقدّمه على ما نعرفه.
   */
  const candidates = [];
  for (const term of [`${nameEn} Grand Prix`, `${nameEn} Formula One`]) {
    const hits = (
      await searchCommons(term, (title) => looksLikePersonPhoto(title, nameEn), {
        allowHistoric: true,
      })
    ).filter((hit) => !used.has(hit.url) && hit.racing);
    candidates.push(...hits);
  }

  if (candidates.length > 0) {
    const seen = new Set<string>();
    const ranked = candidates
      .filter((hit) => (seen.has(hit.url) ? false : seen.add(hit.url)))
      .sort((a, b) => (b.year ?? 0) - (a.year ?? 0));

    return normalizeHit(ranked[0].url, ranked[0].credit, 'commons');
  }

  const infobox = await fromWikipedia(wikipediaUrl);
  if (infobox && !used.has(infobox.url)) return infobox;

  /**
   * البحث مؤهَّل بالرياضة، والاسم المجرّد آخراً وبشرط.
   *
   * البحث بـ«James Hunt» وحده أعاد لوحة زيتية لجيمس هنري لي هَنت، الشاعر
   * الإنجليزي المتوفّى 1859: الاسمان يتطابقان، وفحص الاسم — مهما اشتدّ — لا
   * يفرّق بين شخصين يحملانه. ما يفرّق بينهما هو **السياق**: بطل عالم 1976 له
   * صور في مضمار، والشاعر لا. لذلك تُقيَّد المحاولة الأخيرة بإشارة سباقات.
   */
  const attempts: { term: string; requireRacing: boolean }[] = [
    { term: `${nameEn} racing driver`, requireRacing: false },
    { term: `${nameEn} portrait`, requireRacing: false },
    { term: nameEn, requireRacing: true },
  ];

  for (const attempt of attempts) {
    const hits = (
      await searchCommons(attempt.term, (title) => matchesName(title, nameEn), {
        allowHistoric: true,
      })
    ).filter((hit) => !used.has(hit.url) && (!attempt.requireRacing || hit.racing));

    if (hits.length > 0) {
      // نتائج البحث تأتي بعرض 1600 (مقاس أخبار) — نعيد ضبطها لمقاس البطاقات
      return normalizeHit(hits[0].url, hits[0].credit, 'commons');
    }
  }

  return null;
}

/**
 * صورة فريق — الاحتياطي حين لا توجد صورة للسائق.
 *
 * نبحث عن سيارة الفريق لا عن شعاره: الشعارات الرسمية علامات تجارية، وما
 * يظهر منها على كومنز برخصة حرّة قليل ومتقلّب. صورة السيارة تعطي القارئ
 * سياقاً بصرياً حقيقياً لفريق لم يبق منه إلا اسمه.
 */
export async function findConstructorImage(nameEn: string): Promise<DriverImage | null> {
  for (const term of [`${nameEn} Formula One car`, `${nameEn} racing car`, nameEn]) {
    const hits = await searchCommons(
      term,
      (title) => normalize(title).includes(` ${normalize(nameEn).trim()} `),
      { allowHistoric: true },
    );

    if (hits.length > 0) return normalizeHit(hits[0].url, hits[0].credit, 'team');
  }

  return null;
}
