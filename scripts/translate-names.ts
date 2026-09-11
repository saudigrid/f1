/**
 * تعريب أسماء الأعلام بالدفعات.
 *
 *   npm run translate:names            # يكمل ما ينقص فقط
 *   npm run translate:names -- --limit 5   # عدد محدود من الدفعات
 *
 * لماذا بالدفعات؟ 881 سائقاً باسم لكل طلب يعني 881 طلباً — أي أسابيع على حصة
 * مجانية سقفها 20 طلباً يومياً. بستين اسماً في الطلب تصير ~15 طلباً، أي يوم
 * واحد. هذا الفرق هو ما يجعل «عرّب الكل» قراراً ممكناً لا أمنية.
 *
 * السكربت **تراكمي**: يقرأ القاموس الحالي، ويترجم الناقص فقط، ويحفظ بعد كل
 * دفعة. فإن نفدت الحصة في المنتصف لم يضع ما أُنجز، وتشغيلة الغد تكمل من حيث
 * توقّفت.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';

import * as z from 'zod';

import { getProvider } from '@/lib/agents/providers';
import { QuotaExhausted } from '@/lib/agents/errors';
import { listAllDrivers } from '@/lib/data/history';
import { sleep } from '@/lib/data/download';

import { acquireLock } from './lock';

const BATCH_SIZE = 60;

const TranslationBatch = z.object({
  names: z
    .array(z.object({ id: z.string(), ar: z.string() }))
    .describe('لكل معرّف اسمه العربي'),
});

const SYSTEM = `أنت متخصص في تعريب أسماء الأعلام في رياضة السيارات.

القواعد:
- اكتب الاسم كما ينطقه جمهور الرياضة العربي، لا ترجمة حرفية لمعناه.
- اتبع النطق في **لغة صاحب الاسم**: الفرنسي بالفرنسية، الإيطالي بالإيطالية،
  البرازيلي بالبرتغالية. «Jacques» جاك لا جاكيز، و«Gilles» جيل لا غيليس.
- استخدم الأسماء الشائعة المستقرة إن وُجدت: شوماخر، سينا، فانخيو، لاودا.
- الاسم الأول ثم اسم العائلة، بلا ألقاب ولا أرقام.
- لا تضف تشكيلاً إلا حيث يمنع لبساً حقيقياً.
- ⚠️ انتبه للعائلات: كثير من السائقين آباء وأبناء يتشاركون اسم العائلة
  (Mario/Michael Andretti، Emerson/Christian Fittipaldi، Gilles/Jacques
  Villeneuve، Keke/Nico Rosberg). عرّب **الاسم الأول المعطى لك** لا الأشهر
  في العائلة. سنة الميلاد بين قوسين تحسم أي التباس.
- أعد معرّفاً واحداً لكل اسم أُعطيته، بنفس المعرّف حرفياً.

أعد JSON مطابقاً للمخطط، بلا أي نص خارجه.`;

interface Pending {
  id: string;
  english: string;
  hint: string;
}


async function loadDict(file: string): Promise<Record<string, string>> {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch {
    return {};
  }
}

async function saveDict(file: string, dict: Record<string, string>): Promise<void> {
  const sorted = Object.fromEntries(Object.keys(dict).sort().map((key) => [key, dict[key]]));
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(sorted, null, 2)}\n`, 'utf8');
}

async function translateBatch(batch: Pending[]): Promise<Record<string, string>> {
  const list = batch
    .map((item) => `${item.id} = ${item.english}${item.hint ? ` (${item.hint})` : ''}`)
    .join('\n');

  const { parsed } = await getProvider('translate').generate({
    system: SYSTEM,
    prompt: `عرّب هذه الأسماء. الصيغة «المعرّف = الاسم (الجنسية)»:\n\n${list}`,
    schema: TranslationBatch,
    effort: 'low',
    maxTokens: 8000,
  });

  if (!parsed) return {};

  const valid = new Set(batch.map((item) => item.id));
  const result: Record<string, string> = {};

  for (const entry of parsed.names) {
    // النموذج قد يخترع معرّفاً — نقبل ما طلبناه فقط
    if (valid.has(entry.id) && entry.ar.trim()) result[entry.id] = entry.ar.trim();
  }

  return result;
}

async function main(): Promise<void> {
  const release = await acquireLock('translate-names');
  try {
    await run();
  } finally {
    await release();
  }
}

async function run(): Promise<void> {
  const limitArg = process.argv.indexOf('--limit');
  const maxBatches = limitArg > -1 ? Number(process.argv[limitArg + 1]) : Infinity;

  const file = path.join(process.cwd(), 'src', 'data', 'i18n', 'drivers.json');
  const dict = await loadDict(file);

  console.log('▶ تعريب أسماء السائقين\n');
  console.log(`مترجَم مسبقاً: ${Object.keys(dict).length}`);

  const drivers = await listAllDrivers();
  const pending: Pending[] = drivers
    .filter((driver) => !dict[driver.id])
    .map((driver) => ({
      id: driver.id,
      english: driver.nameEn,
      // الجنسية تحدّد النطق، وسنة الميلاد تفصل الأب عن الابن
      hint: [driver.nationality, driver.dateOfBirth?.slice(0, 4)].filter(Boolean).join(', '),
    }));

  console.log(`ينقص       : ${pending.length}`);

  if (pending.length === 0) {
    console.log('\n✓ القاموس مكتمل.');
    return;
  }

  const batches: Pending[][] = [];
  for (let i = 0; i < pending.length; i += BATCH_SIZE) {
    batches.push(pending.slice(i, i + BATCH_SIZE));
  }

  const planned = Math.min(batches.length, maxBatches);
  console.log(`دفعات      : ${planned} × ${BATCH_SIZE} اسماً\n`);

  let done = 0;
  let added = 0;

  for (const batch of batches.slice(0, planned)) {
    done += 1;
    process.stdout.write(`  دفعة ${done}/${planned} … `);

    try {
      const translated = await translateBatch(batch);
      Object.assign(dict, translated);
      added += Object.keys(translated).length;

      // الحفظ بعد كل دفعة: نفاد الحصة لا يضيّع ما أُنجز
      await saveDict(file, dict);
      console.log(`✓ ${Object.keys(translated).length}/${batch.length}`);
    } catch (error) {
      if (error instanceof QuotaExhausted) {
        console.log('✗ نفدت الحصة');
        console.log(`\n⏸ توقّفنا عند الدفعة ${done}. المحفوظ آمن.`);
        console.log('   أعد التشغيل بعد تجدّد الحصة — سيكمل من حيث توقّف.');
        break;
      }
      console.log(`✗ ${error instanceof Error ? error.message.slice(0, 70) : error}`);
    }

    // مهلة بين الدفعات — تخفّف الضغط على حدّ الطلبات في الدقيقة
    await sleep(2_000);
  }

  const remaining = drivers.filter((driver) => !dict[driver.id]).length;

  console.log('\n── الخلاصة ─────────────────────');
  console.log(`أُضيف   : ${added}`);
  console.log(`الإجمالي: ${Object.keys(dict).length}`);
  console.log(`يبقى    : ${remaining}`);

  if (remaining > 0) {
    console.log(`\nأعد التشغيل لإكمال الباقي: npm run translate:names`);
  }
}

main().catch((error) => {
  console.error('\n✗ فشل التعريب:', error instanceof Error ? error.message : error);
  process.exit(1);
});
