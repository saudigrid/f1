import 'server-only';

import type { ImageCredit } from '@/lib/types';

import { searchCommons, type CommonsHit } from './commons';

/**
 * صورة بطاقة الحلبة، بأولوية مقصودة:
 *
 *   ١. **مخطّط الحلبة** — الشكل الهندسي للمسار. يميّز الحلبة فوراً حتى لمن
 *      لم يزرها، ويتّسق بصرياً عبر 78 بطاقة مهما اختلفت مصادر الصور.
 *   ٢. **صورة فوتوغرافية** للحلبة حين لا يوجد مخطّط حرّ.
 *   ٣. **اللوجو** آخراً — كثير منها محمي بعلامة تجارية، فلا نقبل إلا ما كان
 *      على كومنز برخصة حرّة.
 */

export type CircuitImageKind = 'layout' | 'photo' | 'logo';

export interface CircuitImage {
  url: string;
  kind: CircuitImageKind;
  credit: ImageCredit;
}

/**
 * المخطّطات في كومنز شبه دائماً ملفات متجهة: «Spa-Francorchamps of Belgium.svg»،
 * «Korea international circuit v3.svg». الامتداد وحده ليس دليلاً كافياً، فنطلب
 * معه كلمة تدلّ على مخطّط لا على صورة.
 */
const LAYOUT_WORDS = /\b(circuit|track|layout|map|route|plan|schema|diagram)\b/i;

function isLayout(title: string): boolean {
  const vector = /\.(svg|png)$/i.test(title);
  return vector && LAYOUT_WORDS.test(title.replace(/[_\-.]+/g, ' '));
}

function isLogo(title: string): boolean {
  return /\b(logo|emblem|badge|wordmark)\b/i.test(title.replace(/[_\-.]+/g, ' '));
}

function toImage(hit: CommonsHit, kind: CircuitImageKind): CircuitImage {
  return { url: hit.url, kind, credit: hit.credit };
}

/** يطابق اسم الحلبة جزئياً — أسماء الملفات نادراً ما تحمل الاسم الرسمي كاملاً. */
function mentionsCircuit(title: string, nameEn: string): boolean {
  const haystack = title.toLowerCase().replace(/[_\-.:()]+/g, ' ');
  const words = nameEn
    .toLowerCase()
    .split(/\s+/)
    .filter(
      (word) =>
        word.length > 3 &&
        !['circuit', 'international', 'street', 'park', 'raceway', 'autodromo'].includes(word),
    );

  // اسم بلا كلمة مميّزة («Circuit Park») — نقبله بالكلمة الأولى مهما كانت
  if (words.length === 0) return haystack.includes(nameEn.toLowerCase().split(/\s+/)[0]);
  return words.some((word) => haystack.includes(word));
}

/**
 * يبحث عن أفضل صورة للحلبة.
 *
 * ⚠️ فحوص الترخيص ونوع الملف تجري داخل `searchCommons` ولا تُخفَّف هنا. لكن
 * فحص «الأرشيفي» لا يعني شيئاً للمخططات — مخطّط حلبة من 2019 صحيح تماماً —
 * ولذلك لا نشترط تاريخاً في هذا المسار.
 */
export async function findCircuitImage(
  nameEn: string,
  exclude: string[] = [],
): Promise<CircuitImage | null> {
  const used = new Set(exclude);
  const bare = nameEn.replace(/\b(Circuit|International|Autodromo|Autódromo)\b/gi, '').trim();

  const attempts: { term: string; want: CircuitImageKind }[] = [
    { term: `${nameEn} circuit map`, want: 'layout' },
    { term: `${bare} circuit layout`, want: 'layout' },
    { term: `${bare} track map`, want: 'layout' },
    { term: nameEn, want: 'photo' },
    { term: `${nameEn} logo`, want: 'logo' },
  ];

  for (const attempt of attempts) {
    const hits = (
      await searchCommons(attempt.term, (title) => mentionsCircuit(title, nameEn))
    ).filter((hit) => !used.has(hit.url));

    if (hits.length === 0) continue;

    if (attempt.want === 'layout') {
      const layout = hits.find((hit) => isLayout(hit.title) && !isLogo(hit.title));
      if (layout) return toImage(layout, 'layout');
      continue; // لا نقبل صورة عادية في محاولة مخصّصة للمخطّط
    }

    if (attempt.want === 'logo') {
      const logo = hits.find((hit) => isLogo(hit.title));
      if (logo) return toImage(logo, 'logo');
      continue;
    }

    // صورة فوتوغرافية: نستبعد اللوجوهات ونفضّل ما ليس متجهاً
    const photo = hits.find((hit) => !isLogo(hit.title) && !/\.svg$/i.test(hit.title));
    if (photo) return toImage(photo, 'photo');
  }

  return null;
}
