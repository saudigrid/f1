import 'server-only';

import * as z from 'zod';

import { PIPELINE_CONFIG } from '@/lib/config/pipeline';

import { NeedsHumanReview } from './errors';
import type { StoryCluster } from './ingest';
import { getProvider } from './providers';

/**
 * الوكيل الثاني: الصياغة العربية.
 *
 * ليس مترجماً حرفياً. مهمّته إعادة كتابة الخبر بالعربية بأسلوب صحفي أصلي
 * انطلاقاً من الوقائع الواردة في المصادر — وهذا مقصود لسببين:
 * ١. الترجمة الحرفية لنص محمي بحقوق نشر مشكلة قانونية.
 * ٢. الترجمة الحرفية تنتج عربية ركيكة لأن التركيب الإنجليزي يتسرّب إليها.
 *
 * الوكيل مخفي تماماً: لا يظهر اسمه ولا أثره في أي مكان يراه الزائر.
 */

const DraftSchema = z.object({
  title: z.string().describe('عنوان عربي من 6 إلى 12 كلمة، خبري لا إعلاني، بلا علامات تعجب'),
  excerpt: z.string().describe('ملخّص من جملة إلى جملتين، 20-35 كلمة'),
  body: z
    .string()
    .describe(
      'المتن بالعربية بصيغة Markdown: فقرات قصيرة وعناوين فرعية بـ ## عند الحاجة. 250-450 كلمة',
    ),
  category: z.enum([
    'breaking',
    'news',
    'transfers',
    'technical',
    'race-report',
    'regulations',
  ]),
  tags: z.array(z.string()).describe('من 2 إلى 5 وسوم عربية'),
  heroImageAlt: z.string().describe('وصف بديل للصورة الرئيسية بالعربية'),
  /** ادعاءات يرى الوكيل أنها تحتاج تحققاً — تُمرَّر لوكيل التدقيق. */
  claimsToVerify: z.array(z.string()).describe('الوقائع القابلة للتحقق في هذا الخبر'),
  /**
   * أسماء بالإنجليزية للبحث عن صورة — لا تُعرض للقارئ.
   *
   * الترتيب مهم: اسم السائق يعطي أفضل نتائج في أرشيف الصور المفتوح، واسم
   * الجائزة الكبرى أفضل بكثير من اسم الحلبة المجرّد («Italian Grand Prix»
   * يعيد صور الموسم، بينما «Monza» يعيد أرشيفاً من الخمسينات).
   */
  imageEntities: z
    .array(z.string())
    .describe(
      'من 1 إلى 3 أسماء علم بالإنجليزية، الأهم أولاً. ابدأ باسم السائق إن كان الخبر عنه، ' +
        'ثم اسم الفريق. للسباقات استخدم اسم الجائزة الكبرى كاملاً لا اسم الحلبة — ' +
        'مثل: Charles Leclerc, Ferrari, Italian Grand Prix',
    ),
});

export type Draft = z.infer<typeof DraftSchema>;

const SYSTEM = `أنت محرّر عربي متخصص في الفورمولا 1 يكتب لموقع «Saudi F1 Grid».
تغطيتك عالمية: كل الفرق والسائقين والجولات، وليس السعودية وحدها.

قواعد الكتابة:
- اكتب عربية فصيحة معاصرة، جُملاً قصيرة، بلا حشو وبلا مبالغة.
- لا تترجم حرفياً. أعد بناء الخبر من الوقائع بأسلوبك.
- لا تنسخ أي جملة من نص المصدر.
- لا تخترع رقماً أو تصريحاً أو اسماً غير موجود في المصادر. إن نقص شيء فاحذفه.
- ميّز المؤكد من غير المؤكد: استخدم «تشير تقارير» أو «لم يتأكد» حين يلزم.
- أسماء السائقين والفرق بالعربية كما هي شائعة عند جمهور الرياضة العربي.
- الأرقام والأزمنة بالأرقام اللاتينية (1، 2، 3).
- لا تخاطب القارئ بصيغة الأمر، ولا تنهِ الخبر بدعوة للتفاعل.
- لا تذكر أنك ذكاء اصطناعي، ولا تشر إلى عملية الترجمة أو المعالجة إطلاقاً.

اختيار التصنيف:
- breaking: حدث عاجل خلال الساعات الماضية له أثر مباشر.
- race-report: نتائج وتقارير ما بعد سباق أو تصفيات.
- technical: تطويرات، ديناميكا هوائية، وحدات طاقة، إطارات.
- transfers: عقود وانتقالات ومقاعد.
- regulations: لوائح الاتحاد الدولي وقرارات الحكّام.
- news: كل ما عدا ذلك.

أعد النتيجة كائن JSON مطابقاً للمخطط المطلوب، بلا أي نص خارجه.`;

export async function draftArabicArticle(cluster: StoryCluster): Promise<Draft> {
  const sourceBlock = cluster.items
    .map(
      (item, i) =>
        `[مصدر ${i + 1}] ${item.sourceName} (درجة الموثوقية ${item.trust}/3)\n` +
        `العنوان: ${item.title}\n` +
        `النص: ${item.summary || '(بلا ملخّص)'}\n` +
        `الرابط: ${item.url}`,
    )
    .join('\n\n---\n\n');

  const { parsed } = await getProvider('translate').generate({
    system: SYSTEM,
    prompt:
      `اكتب خبراً عربياً واحداً من المصادر التالية. إن تعارضت المصادر، اعتمد الأعلى موثوقية ` +
      `وأشر إلى التعارض داخل المتن.\n\n${sourceBlock}`,
    schema: DraftSchema,
    effort: PIPELINE_CONFIG.effort.translate,
  });

  if (!parsed) throw new NeedsHumanReview('تعذّر الحصول على مسوّدة من وكيل الصياغة.');

  return parsed;
}
