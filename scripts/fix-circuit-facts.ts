/**
 * إعادة جلب أطوال الحلبات ومنعطفاتها من ويكي بيانات، بوحدات صحيحة.
 *
 *   npm run fix:circuits
 *
 * ## لماذا سكربت منفصل
 *
 * القارئ القديم كان يتجاهل وحدة القياس ويقرّب قبل التحويل، فصار طول أديلايد
 * (3.780 كم) رقماً واحداً: «4»، وظهر على الصفحة «0.004 كم». التقريب **أتلف**
 * الرقم، فلا سبيل لإصلاحه حسابياً من الملف — لا بدّ من جلبه من جديد.
 *
 * وإعادة تشغيل `sync:circuits` كاملاً تعني إعادة البحث عن 78 صورة من كومنز
 * وتنزيلها، وهي أثقل بكثير من الغرض. هذا السكربت يمسّ الحقائق الرقمية وحدها.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';

import { sleep } from '@/lib/data/download';
import { claimCount, claimLengthMeters, claimYear, type Entity } from '@/lib/data/wikidata';

import { acquireLock } from './lock';

const UA = { 'user-agent': 'SaudiF1Grid/1.0 (https://saudif1grid.com) sync-script' };

interface CircuitCard {
  id: string;
  wikipediaUrl: string;
  lengthMeters: number | null;
  turns: number | null;
  openedYear: number | null;
  [key: string]: unknown;
}

async function json<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url, { headers: UA, signal: AbortSignal.timeout(25_000) });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

async function run(): Promise<void> {
  const file = path.join(process.cwd(), 'src', 'data', 'circuits.json');
  const cards = JSON.parse(await fs.readFile(file, 'utf8')) as CircuitCard[];

  console.log(`▶ حقائق ${cards.length} حلبة\n`);

  let fixed = 0;
  let unchanged = 0;

  for (const card of cards) {
    const title = card.wikipediaUrl?.split('/wiki/')[1];
    if (!title) continue;

    const summary = await json<{ wikibase_item?: string }>(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${title}`,
    );
    const entityId = summary?.wikibase_item;
    if (!entityId) {
      await sleep(150);
      continue;
    }

    const data = await json<{ entities: Record<string, Entity> }>(
      `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${entityId}&props=claims&format=json`,
    );
    const entity = data?.entities?.[entityId] ?? null;

    const before = card.lengthMeters;
    const length = claimLengthMeters(entity, 'P2043');
    const turns = claimCount(entity, 'P8626');
    const opened = claimYear(entity, 'P571');

    /**
     * المصدر نفسه قد يكذب.
     *
     * ويكي بيانات تسجّل حلبة روان-لي-إيسار «6542 **كيلومتراً**» — والصحيح
     * 6.542 كم. القراءة سليمة والمصدر خاطئ، فلا ينفع تدقيق الوحدات وحده.
     * أطول حلبة في تاريخ البطولة هي بيسكارا بـ25.6 كم، وأقصرها فوق الكيلومترين
     * بقليل؛ فما خرج عن هذا المدى مرفوض ويبقى الرقم القديم.
     */
    const plausible = length !== null && length >= 2_000 && length <= 30_000;
    if (length !== null && !plausible) {
      console.log(`  ⚠ ${card.id.padEnd(20)} تجاهلنا ${length} م — خارج المدى المعقول`);
    }

    if (plausible) card.lengthMeters = length;
    if (turns !== null) card.turns = turns;
    if (opened !== null) card.openedYear = opened;

    if (before !== card.lengthMeters) {
      fixed += 1;
      const km = (value: number | null) => (value ? (value / 1000).toFixed(3) : '—');
      console.log(`  ✎ ${card.id.padEnd(20)} ${km(before)} → ${km(card.lengthMeters)} كم`);
    } else {
      unchanged += 1;
    }

    await sleep(200);
  }

  await fs.writeFile(file, `${JSON.stringify(cards, null, 2)}\n`, 'utf8');

  /** الحلبات أطول من 2 كم وأقصر من 30 — أي رقم خارج ذلك بقايا الخطأ القديم. */
  const suspicious = cards.filter(
    (card) => card.lengthMeters !== null && (card.lengthMeters < 2_000 || card.lengthMeters > 30_000),
  );

  console.log('\n── الخلاصة ─────────────────────');
  console.log(`صُحّح    : ${fixed}`);
  console.log(`كما هو   : ${unchanged}`);
  console.log(`بطول مؤكَّد: ${cards.filter((card) => card.lengthMeters).length} / ${cards.length}`);

  if (suspicious.length > 0) {
    console.log(`\n⚠ أطوال مريبة (${suspicious.length}):`);
    for (const card of suspicious) console.log(`   ${card.id}: ${card.lengthMeters} م`);
  }
}

async function main(): Promise<void> {
  const release = await acquireLock('fix-circuit-facts');
  try {
    await run();
  } finally {
    await release();
  }
}

main().catch((error) => {
  console.error('\n✗ فشل الإصلاح:', error instanceof Error ? error.message : error);
  process.exit(1);
});
