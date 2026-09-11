import 'server-only';

import type { ImageProvider, ImageQuery, ResolvedImage } from './types';

/**
 * صور تأتي مع الخبر في خلاصته، من ناشر بيننا وبينه اتفاقية.
 *
 * ⚖️ القائمة أدناه هي حدّ الصلاحية كله. معرّف المصدر غير المذكور فيها لا
 * تُلمس صوره مهما كانت متاحة في خلاصته — وجود الرابط في RSS ليس ترخيصاً.
 *
 * لإيقاف السحب عند تغيّر اتفاقية: احذف المعرّف من هذه المصفوفة. لا يوجد
 * مكان آخر يمنح هذه الصلاحية.
 */
const LICENSED_SOURCE_IDS: readonly string[] = [
  'motorsport', // اتفاقية Motorsport Network
  'autosport', // ضمن نفس الاتفاقية
];

/** أسماء العرض للقارئ — الإسناد إلزامي حتى مع وجود اتفاقية. */
const CREDIT_NAMES: Record<string, string> = {
  motorsport: 'Motorsport.com',
  autosport: 'Autosport',
};

export const licensedFeedProvider: ImageProvider = {
  name: 'licensed-feed',

  async resolve(query: ImageQuery): Promise<ResolvedImage | null> {
    const allowed = query.feedImages.find((image) =>
      LICENSED_SOURCE_IDS.includes(image.sourceId),
    );
    if (!allowed) return null;

    return {
      url: allowed.url,
      alt: query.alt,
      credit: {
        author: CREDIT_NAMES[allowed.sourceId] ?? allowed.sourceName,
        source: CREDIT_NAMES[allowed.sourceId] ?? allowed.sourceName,
        // مرخّصة باتفاقية، لا برخصة عامة — لا رمز ترخيص يُعرض
        license: null,
        sourceUrl: null,
      },
    };
  },
};
