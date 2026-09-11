/**
 * توليد مخططات الحلبات الموحّدة من OpenStreetMap.
 *
 *   npm run sync:layouts
 *   npm run sync:layouts -- --only monza,spa,suzuka
 *   npm run sync:layouts -- --force        # يعيد توليد الموجود
 *
 * يكتب `public/layouts/<id>.svg` ويسجّل النتيجة في `circuits.json` بحقل
 * `layout`. الحلبة التي يتعذّر مخططها تُبقي صورتها الحالية — لا نترك فراغاً.
 *
 * Overpass خدمة تبرّعية بحدّ معدّل ضيّق، فالطلبات متسلسلة وبينها مهلة سخيّة.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';

import {
  fetchCircuitWays,
  project,
  stitch,
  toSvg,
} from '@/lib/circuits/osm-layout';
import { sleep } from '@/lib/data/download';

import { acquireLock } from './lock';

const UA = { 'user-agent': 'SaudiF1Grid/1.0 (https://saudif1grid.com) sync-script' };

interface CircuitCard {
  id: string;
  wikipediaUrl: string;
  lat?: number;
  lon?: number;
  layout?: string | null;
  layoutClosed?: boolean;
  [key: string]: unknown;
}

async function wikidataId(wikipediaUrl: string): Promise<string | null> {
  const title = wikipediaUrl?.split('/wiki/')[1];
  if (!title) return null;
  try {
    const response = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${title}`, {
      headers: UA,
      signal: AbortSignal.timeout(25_000),
    });
    if (!response.ok) return null;
    return ((await response.json()) as { wikibase_item?: string }).wikibase_item ?? null;
  } catch {
    return null;
  }
}

async function run(): Promise<void> {
  const argv = process.argv;
  const onlyArg = argv.indexOf('--only');
  const only = onlyArg > -1 ? new Set(argv[onlyArg + 1].split(',')) : null;
  const force = argv.includes('--force') || only !== null;

  const file = path.join(process.cwd(), 'src', 'data', 'circuits.json');
  const cards = JSON.parse(await fs.readFile(file, 'utf8')) as CircuitCard[];
  const outDir = path.join(process.cwd(), 'public', 'layouts');
  await fs.mkdir(outDir, { recursive: true });

  const queue = cards.filter((card) => {
    if (only) return only.has(card.id);
    return force || !card.layout;
  });

  console.log(`▶ مخططات الحلبات — ${queue.length} من ${cards.length}\n`);

  let made = 0;
  let open = 0;
  let failed: string[] = [];

  for (const card of queue) {
    const qid = await wikidataId(card.wikipediaUrl);
    const near =
      typeof card.lat === 'number' && typeof card.lon === 'number'
        ? { lat: card.lat, lon: card.lon }
        : undefined;

    if (!qid && !near) {
      failed.push(card.id);
      console.log(`  ✗ ${card.id.padEnd(20)} لا معرّف ولا إحداثيات`);
      continue;
    }

    let ways;
    try {
      ways = await fetchCircuitWays(qid, near);

      /**
       * المعرّف لم يُرجع شيئاً — نجرّب الإحداثيات قبل أن نستسلم.
       *
       * ليست كل حلبة مربوطة بويكي بيانات في OSM. جدة مثال: هندستها موجودة
       * لكن بلا علاقة `type=circuit` تحمل المعرّف، فلا تُلتقط إلا بالموقع.
       */
      if (ways.length === 0 && qid && near) {
        await sleep(3_000);
        ways = await fetchCircuitWays(null, near);
      }
    } catch (error) {
      failed.push(card.id);
      console.log(`  ✗ ${card.id.padEnd(20)} ${error instanceof Error ? error.message : error}`);
      await sleep(3_000);
      continue;
    }

    const path2d = stitch(ways);
    const projected = project(path2d);
    const svg = toSvg(projected);

    if (!svg || path2d.length < 20) {
      failed.push(card.id);
      console.log(`  · ${card.id.padEnd(20)} لا هندسة كافية (${path2d.length} نقطة)`);
      await sleep(2_000);
      continue;
    }

    await fs.writeFile(path.join(outDir, `${card.id}.svg`), svg, 'utf8');
    card.layout = `/layouts/${card.id}.svg`;
    card.layoutClosed = projected.closed;

    made += 1;
    if (!projected.closed) open += 1;

    console.log(
      `  ${projected.closed ? '▣' : '◹'} ${card.id.padEnd(20)} ${String(path2d.length).padStart(4)} نقطة` +
        `${projected.closed ? '' : '  ⚠ مسار غير مغلق'}`,
    );

    // Overpass خدمة تبرّعية — مهلة سخيّة بين الطلبات
    await sleep(5_000);
  }

  await fs.writeFile(file, `${JSON.stringify(cards, null, 2)}\n`, 'utf8');

  console.log('\n── الخلاصة ─────────────────────');
  console.log(`مخططات    : ${cards.filter((card) => card.layout).length} / ${cards.length}`);
  console.log(`وُلّد الآن  : ${made}${open ? `  (${open} غير مغلق)` : ''}`);
  if (failed.length > 0) {
    console.log(`تعذّر     : ${failed.length} — ${failed.slice(0, 12).join(', ')}`);
    console.log('           (تُبقي صورها الحالية)');
  }
}

async function main(): Promise<void> {
  const release = await acquireLock('sync-layouts');
  try {
    await run();
  } finally {
    await release();
  }
}

main().catch((error) => {
  console.error('\n✗ فشل التوليد:', error instanceof Error ? error.message : error);
  process.exit(1);
});
