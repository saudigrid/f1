import 'server-only';

import { searchCommons } from './commons';
import type { ImageProvider, ImageQuery, ResolvedImage } from './types';

/**
 * ويكيميديا كومنز — بحث بكيان الخبر (سائق، فريق، جولة).
 *
 * الصور هناك بتراخيص مفتوحة وتشترط نسبة العمل إلى مصوّره. الواجهة تعيد اسم
 * المصوّر والترخيص مع الرابط، فالإسناد آلي ولا يعتمد على انتباه بشري.
 *
 * حدّه الصادق: التغطية بالكيان لا بالحدث. يعطيك صورة للسائق أو للجولة، لا
 * لحظة الخبر نفسه — استخدام أرشيفي مشروع، لكن يجب ألا يُقدَّم كتصوير للحدث.
 */

/**
 * بوابة الصلة الصارمة.
 *
 * بحث كومنز فضفاض: استعلام «Italian Grand Prix 2026» أعاد أثناء الاختبار صورة
 * فريق **إبحار** في SailGP. لا يكفي أن يعيد البحث نتيجة، بل يجب أن يحمل اسم
 * الملف كل كلمات الكيان الذي بحثنا عنه.
 *
 * متشدد عمداً: نتيجة خاطئة فوق خبر أسوأ من بطاقة بلا صورة — ولهذا يوجد
 * مزوّد الموضوع بعده، لا بدلاً منه.
 */
function matchesEntity(title: string, entity: string): boolean {
  const haystack = title.toLowerCase();
  const words = entity
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 2);

  return words.length > 0 && words.every((word) => haystack.includes(word));
}

export const wikimediaProvider: ImageProvider = {
  name: 'wikimedia',

  async resolve(query: ImageQuery): Promise<ResolvedImage | null> {
    if (query.entities.length === 0) return null;

    const season = new Date().getUTCFullYear();
    const entities = query.entities.slice(0, 2);
    const currentGrid = query.currentGrid ?? [];

    /**
     * كل كيان على حدة، بالموسم الحالي ثم الذي قبله.
     *
     * كومنز يعامل كلمات الاستعلام كتقاطع، فدمج كيانين («Italian Grand Prix
     * Ferrari») يضيّق النتائج حتى الصفر، وسنتان معاً تُفرغانها. أما كيان واحد
     * + سنة واحدة فيطابق بنية أسماء الملفات هناك مباشرة، مثل
     * «Charles Leclerc 2025 Italian Grand Prix qualifying.jpg».
     */
    const attempts: { term: string; entity: string }[] = [];
    for (const entity of entities) {
      attempts.push({ term: `${entity} ${season}`, entity });
      attempts.push({ term: `${entity} ${season - 1}`, entity });
    }
    attempts.push({ term: `${entities[0]} Formula One`, entity: entities[0] });

    for (const attempt of attempts) {
      const hits = await searchCommons(attempt.term, (title) =>
        matchesEntity(title, attempt.entity),
      );
      if (hits.length === 0) continue;

      /**
       * الرتبة، بالأهمية:
       * ١. اسم فريق أو سائق من تشكيلة الموسم — أقوى دليل على الحداثة الفعلية.
       * ٢. سياق السباقات لا سيارة طريق.
       * ٣. الأحدث تاريخاً.
       */
      const ranked = hits
        .map((hit) => {
          const haystack = hit.title.toLowerCase().replace(/[_-]+/g, ' ');
          const onGrid = currentGrid.some((name) => haystack.includes(name.toLowerCase()));
          return {
            hit,
            rank: (onGrid ? 1_000_000 : 0) + (hit.racing ? 100_000 : 0) + (hit.year ?? 0),
          };
        })
        .sort((a, b) => b.rank - a.rank);

      const best = ranked[0].hit;
      return { url: best.url, alt: query.alt, credit: best.credit };
    }

    return null;
  },
};
