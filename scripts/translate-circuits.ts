/**
 * تعريب محتوى الحلبات: المدن أولاً، ثم المقدّمات.
 *
 *   npm run translate:circuits              # يكمل ما ينقص فقط
 *   npm run translate:circuits -- --limit 3 # عدد محدود من الطلبات
 *
 * الترتيب مقصود. المدن **74 اسماً في طلب أو طلبين**، وتظهر في كل بطاقة حلبة
 * وكل صفحة سباق — أعلى أثر لكل وحدة حصة. أما المقدّمات فكل واحدة فقرة كاملة
 * لا تُجمَع كثيراً في طلب واحد، فتُترك للأخير.
 *
 * تراكمي كأخيه `translate:names`: يحفظ بعد كل طلب، ويتوقّف بهدوء عند نفاد
 * الحصة، وتشغيلة الغد تكمل من حيث توقّف.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';

import * as z from 'zod';

import { QuotaExhausted } from '@/lib/agents/errors';
import { getProvider } from '@/lib/agents/providers';
import { listCircuits } from '@/lib/data/history';
import { sleep } from '@/lib/data/download';

import { acquireLock } from './lock';

/** المدن قصيرة فتُجمع بكثافة؛ المقدّمات فقرات فتُجمع بحذر. */
const LOCALITY_BATCH = 40;
const SUMMARY_BATCH = 5;

const LocalityBatch = z.object({
  names: z.array(z.object({ en: z.string(), ar: z.string() })),
});

const SummaryBatch = z.object({
  summaries: z.array(z.object({ id: z.string(), ar: z.string() })),
});

const LOCALITY_SYSTEM = `أنت متخصص في تعريب أسماء المدن.

القواعد:
- استخدم الاسم العربي المستقرّ إن وُجد: «Jeddah» جدة، «Monaco» موناكو،
  «Vienna» فيينا، «Casablanca» الدار البيضاء.
- ما لا اسم عربي له يُنقل صوتياً بنطق **بلده**: «Anderstorp» أندرشتورب
  بالسويدية لا بالإنجليزية.
- بلا «مدينة» ولا «ال» زائدة إلا حيث تكون جزءاً من الاسم المستقرّ.
- أعد كل اسم أُعطيته، بنفس الصيغة الإنجليزية حرفياً في حقل en.

أعد JSON مطابقاً للمخطط، بلا أي نص خارجه.`;

const SUMMARY_SYSTEM = `أنت محرّر رياضي عربي متخصص في الفورمولا 1.

مهمتك: صياغة تعريف عربي للحلبة انطلاقاً من نصّ إنجليزي.

القواعد:
- **أعد الصياغة، لا تترجم حرفياً.** النص العربي يجب أن يُقرأ وكأنه كُتب عربياً.
- من ثلاث إلى خمس جمل. لا عناوين ولا تعداد ولا أقواس مراجع.
- أبقِ الوقائع كما هي: السنوات والأطوال والأسماء. **لا تضف واقعة ليست في النص.**
- إن كان النص الإنجليزي غامضاً أو شديد القصر فاكتفِ بما فيه.
- أسماء الحلبات والفرق تُكتب بالعربية إن كان لها مقابل مستقرّ، وإلا فكما هي.

أعد JSON مطابقاً للمخطط، بلا أي نص خارجه.`;

interface CircuitCard {
  id: string;
  summaryEn: string | null;
  summaryAr: string | null;
  [key: string]: unknown;
}

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8')) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(file: string, value: unknown): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

/** يعيد عدد الطلبات المستهلكة، أو يرمي QuotaExhausted لتتوقّف التشغيلة. */
async function translateLocalities(budget: number): Promise<number> {
  const file = path.join(process.cwd(), 'src', 'data', 'i18n', 'localities.json');
  const dict = await readJson<Record<string, string>>(file, {});

  const circuits = await listCircuits();
  const pending = [...new Set(circuits.map((circuit) => circuit.localityEn))]
    .filter((name) => name && !dict[name])
    .sort();

  console.log(`\n── المدن ───────────────────────`);
  console.log(`مترجَم مسبقاً: ${Object.keys(dict).length}`);
  console.log(`ينقص       : ${pending.length}`);

  if (pending.length === 0) return 0;

  let used = 0;

  for (let i = 0; i < pending.length && used < budget; i += LOCALITY_BATCH) {
    const batch = pending.slice(i, i + LOCALITY_BATCH);
    used += 1;
    process.stdout.write(`  دفعة ${used} (${batch.length} مدينة) … `);

    const { parsed } = await getProvider('translate').generate({
      system: LOCALITY_SYSTEM,
      prompt: `عرّب أسماء المدن التالية:\n\n${batch.join('\n')}`,
      schema: LocalityBatch,
      effort: 'low',
      maxTokens: 4000,
    });

    const valid = new Set(batch);
    let added = 0;

    for (const entry of parsed?.names ?? []) {
      // النموذج قد يعيد اسماً لم نطلبه — نقبل ما طلبناه فقط
      if (valid.has(entry.en) && entry.ar.trim()) {
        dict[entry.en] = entry.ar.trim();
        added += 1;
      }
    }

    const sorted = Object.fromEntries(Object.keys(dict).sort().map((key) => [key, dict[key]]));
    await writeJson(file, sorted);

    console.log(`✓ ${added}/${batch.length}`);
    await sleep(2_000);
  }

  return used;
}

async function translateSummaries(budget: number): Promise<number> {
  const file = path.join(process.cwd(), 'src', 'data', 'circuits.json');
  const cards = await readJson<CircuitCard[]>(file, []);

  const pending = cards.filter((card) => card.summaryEn && !card.summaryAr);

  console.log(`\n── المقدّمات ────────────────────`);
  console.log(`معرَّب مسبقاً : ${cards.filter((card) => card.summaryAr).length}`);
  console.log(`ينقص       : ${pending.length}`);

  if (pending.length === 0 || budget <= 0) return 0;

  let used = 0;

  for (let i = 0; i < pending.length && used < budget; i += SUMMARY_BATCH) {
    const batch = pending.slice(i, i + SUMMARY_BATCH);
    used += 1;
    process.stdout.write(`  دفعة ${used} (${batch.length} حلبة) … `);

    const body = batch
      .map((card) => `### ${card.id}\n${card.summaryEn}`)
      .join('\n\n');

    const { parsed } = await getProvider('translate').generate({
      system: SUMMARY_SYSTEM,
      prompt: `صُغ تعريفاً عربياً لكل حلبة. المعرّف بعد ### :\n\n${body}`,
      schema: SummaryBatch,
      effort: 'medium',
      maxTokens: 8000,
    });

    const byId = new Map(batch.map((card) => [card.id, card]));
    let added = 0;

    for (const entry of parsed?.summaries ?? []) {
      const card = byId.get(entry.id);
      if (card && entry.ar.trim().length > 40) {
        card.summaryAr = entry.ar.trim();
        added += 1;
      }
    }

    await writeJson(file, cards);
    console.log(`✓ ${added}/${batch.length}`);
    await sleep(2_000);
  }

  return used;
}

async function run(): Promise<void> {
  const limitArg = process.argv.indexOf('--limit');
  const budget = limitArg > -1 ? Number(process.argv[limitArg + 1]) : Infinity;

  console.log('▶ تعريب محتوى الحلبات');

  let spent = 0;

  try {
    spent += await translateLocalities(budget - spent);
    spent += await translateSummaries(budget - spent);
  } catch (error) {
    if (error instanceof QuotaExhausted) {
      console.log('✗ نفدت الحصة');
      console.log('\n⏸ توقّفنا. المحفوظ آمن — أعد التشغيل بعد تجدّد الحصة.');
      return;
    }
    throw error;
  }

  console.log(`\n── الخلاصة ─────────────────────`);
  console.log(`طلبات مستهلكة: ${spent}`);
}

async function main(): Promise<void> {
  const release = await acquireLock('translate-circuits');
  try {
    await run();
  } finally {
    await release();
  }
}

main().catch((error) => {
  console.error('\n✗ فشل التعريب:', error instanceof Error ? error.message : error);
  process.exit(1);
});
