import 'server-only';

import { RACING_SIGNAL, searchCommons } from './commons';
import type { ImageProvider, ImageQuery, ResolvedImage } from './types';

/**
 * الملاذ الأخير: صورة موضوعية حين لا يوجد كيان مصوَّر.
 *
 * أخبار كثيرة لا تدور حول سائق أو فريق بعينه — توجيه فني من الاتحاد الدولي،
 * تغيير في مركّبات الإطارات، مراجعة صيغة سباق. هذه لا يجد لها البحث بالكيان
 * شيئاً، فتبقى بلا صورة.
 *
 * هنا نبحث بموضوع الخبر بدل كيانه. الصورة توضيحية لا توثيقية — مقبول تحريرياً
 * ما دامت من عالم الرياضة نفسه وحديثة ومنسوبة.
 *
 * الفحوص القانونية هنا هي نفسها في المزوّد السابق: لا تخفيف في الترخيص ولا في
 * نوع الملف ولا في رفض الأرشيفي.
 */

interface Term {
  text: string;
  /**
   * مصطلح **محدّد** يقيّد النتيجة بذاته («Jeddah Corniche Circuit»، «Formula
   * One power unit»)، فيُقبل حتى بلا سنة في الاسم.
   *
   * مصطلح **عام** («Formula One paddock») يجرّ أرشيف عقود، فنشترط عليه سنة
   * صريحة — وإلا عاد بصورة جيمس هنت من 1976.
   */
  specific: boolean;
}

/** موضوع الخبر ← مصطلحات بحث محدّدة. أول قاعدة تطابق تفوز، فالأخصّ أولاً. */
const TOPIC_RULES: { match: RegExp; terms: string[] }[] = [
  {
    match: /إطار|مركّب|مركب|بيريل/,
    terms: ['Pirelli Formula One tyre', 'Formula One pit stop tyre'],
  },
  {
    match: /وحدة طاقة|وحدات الطاقة|محرك|هجين|بطارية|استرجاع/,
    terms: ['Formula One power unit', 'Formula One engine'],
  },
  {
    match: /جناح|أجنحة|ديناميكا|تحميل هوائي/,
    terms: ['Formula One rear wing', 'Formula One front wing'],
  },
  {
    match: /جدة|كورنيش|السعودية/,
    terms: ['Jeddah Corniche Circuit', 'Saudi Arabian Grand Prix'],
  },
  { match: /سباق السرعة|سبرينت|انطلاق|شبكة/, terms: ['Formula One starting grid'] },
  { match: /انتقال|عقد|مقعد|سوق السائقين/, terms: ['Formula One pit lane'] },
  { match: /الاتحاد الدولي|لوائح|حكّام|حكام|عقوبة/, terms: ['Formula One race control'] },
  { match: /منصة|تتويج|فوز|بطولة/, terms: ['Formula One podium'] },
];

/** احتياطي التصنيف — عام، فيخضع لشرط السنة. */
const CATEGORY_TERMS: Record<string, string[]> = {
  regulations: ['Formula One paddock', 'Formula One pit lane'],
  technical: ['Formula One car', 'Formula One garage'],
  transfers: ['Formula One paddock'],
  'race-report': ['Formula One podium', 'Formula One race start'],
  breaking: ['Formula One car'],
  saudi: ['Saudi Arabian Grand Prix'],
  news: ['Formula One car', 'Formula One paddock'],
};

const LAST_RESORT = ['Formula One car', 'Formula One Grand Prix'];

function termsFor(query: ImageQuery): Term[] {
  const haystack = [query.topic?.title ?? '', ...(query.topic?.keywords ?? [])].join(' ');
  const matched = TOPIC_RULES.find((rule) => rule.match.test(haystack));
  const byCategory = query.topic?.category ? (CATEGORY_TERMS[query.topic.category] ?? []) : [];

  const terms: Term[] = [
    ...(matched?.terms ?? []).map((text) => ({ text, specific: true })),
    ...byCategory.map((text) => ({ text, specific: false })),
    ...LAST_RESORT.map((text) => ({ text, specific: false })),
  ];

  // إزالة التكرار مع الحفاظ على الترتيب والأولوية للمحدّد
  const seen = new Set<string>();
  return terms.filter((term) => (seen.has(term.text) ? false : seen.add(term.text)));
}

/**
 * مطابقة مرنة: يكفي أن يحمل اسم الملف كلمة مميّزة من المصطلح **و** إشارة
 * سباقات. لا نطلب كل الكلمات كما في البحث بالكيان، لأن «Pirelli Formula One
 * tyre» لا يظهر كاملاً في أسماء الملفات — لكن «Pirelli» + سياق سباق يكفيان.
 */
function relaxedMatch(title: string, term: string): boolean {
  if (!RACING_SIGNAL.test(title)) return false;

  const haystack = title.toLowerCase().replace(/[_\-.:]+/g, ' ');
  const distinctive = term
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 3 && !['formula', 'grand', 'prix'].includes(word));

  return distinctive.length === 0 || distinctive.some((word) => haystack.includes(word));
}

export const topicFallbackProvider: ImageProvider = {
  name: 'topic-fallback',

  async resolve(query: ImageQuery): Promise<ResolvedImage | null> {
    const season = new Date().getUTCFullYear();
    const used = new Set(query.exclude ?? []);

    for (const term of termsFor(query)) {
      // المؤرّخة أولاً لترجيح الحداثة، ثم المصطلح وحده
      for (const attempt of [`${term.text} ${season}`, `${term.text} ${season - 1}`, term.text]) {
        const hits = await searchCommons(attempt, (title) => relaxedMatch(title, term.text), {
          requireDated: !term.specific,
        });

        /**
         * تفادي تكرار نفس الصورة عبر أخبار مختلفة: ثلاثة أخبار بصورة واحدة
         * يبدو خللاً لا اختياراً. نتخطّاها ونكمل البحث.
         */
        const fresh = hits.filter((hit) => !used.has(hit.url));
        if (fresh.length === 0) continue;

        const best = [...fresh].sort(
          (a, b) => (b.racing ? 1 : 0) - (a.racing ? 1 : 0) || (b.year ?? 0) - (a.year ?? 0),
        )[0];

        return { url: best.url, alt: query.alt, credit: best.credit };
      }
    }

    return null;
  },
};
