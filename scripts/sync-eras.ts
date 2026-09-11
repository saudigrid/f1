/**
 * صورة لكل حقبة — سيارة أو سباق من زمنها.
 *
 *   npm run sync:eras
 *   npm run sync:eras -- --force
 *
 * يكتب `src/data/era-images.json` وينزّل الصور إلى `public/eras/`.
 *
 * ⚠️ فحص «الأرشيفية» معطَّل هنا بالضرورة: المطلوب صورة **من داخل الحقبة**،
 * فصورة لوتس 79 من 1978 هي الصواب لا الخطأ. أما الترخيص فلا يُخفَّف — كومنز
 * وحده، وبرخصة حرّة معروفة.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';

import { ERAS } from '@/data/eras';
import { downloadAsset, sleep } from '@/lib/data/download';
import { getCommonsFile, searchCommons } from '@/lib/images/commons';
import type { ImageCredit } from '@/lib/types';

import { acquireLock } from './lock';

const IMAGE_WIDTH = 800;

interface EraImage {
  id: string;
  image: string | null;
  credit: ImageCredit | null;
}

/**
 * تقبل الصورة إن حملت كلمة مميّزة من الاستعلام.
 *
 * الطراز هو المميِّز («MP4/4»، «FW14B»، «RB19»)، فنطلب أن يظهر في العنوان
 * بدل الاكتفاء باسم الفريق — وإلا عادت أي سيارة مكلارين من أي عقد.
 */
function accepts(query: string) {
  const tokens = query
    .toLowerCase()
    .replace(/[/]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 2 && !['formula', 'one', 'grand', 'prix', 'car'].includes(token));

  return (title: string) => {
    const haystack = title.toLowerCase().replace(/[_\-.:()/,]+/g, ' ');
    return tokens.every((token) => haystack.includes(token));
  };
}

async function run(): Promise<void> {
  const force = process.argv.includes('--force');
  const file = path.join(process.cwd(), 'src', 'data', 'era-images.json');

  let existing: EraImage[] = [];
  try {
    existing = JSON.parse(await fs.readFile(file, 'utf8')) as EraImage[];
  } catch {
    existing = [];
  }

  const byId = new Map(existing.map((row) => [row.id, row]));

  console.log(`▶ صور ${ERAS.length} حقبة\n`);

  for (const era of ERAS) {
    if (!force && byId.get(era.id)?.image) {
      console.log(`  · ${era.id.padEnd(24)} محفوظة`);
      continue;
    }

    const hits = await searchCommons(era.imageQuery, accepts(era.imageQuery), {
      allowHistoric: true,
    });

    if (hits.length === 0) {
      console.log(`  ✗ ${era.id.padEnd(24)} لا نتيجة — «${era.imageQuery}»`);
      byId.set(era.id, { id: era.id, image: null, credit: null });
      await sleep(1_500);
      continue;
    }

    const file2 = await getCommonsFile(hits[0].url, IMAGE_WIDTH);
    const url = file2?.url ?? hits[0].url;
    const credit = file2?.credit ?? hits[0].credit;

    const local = await downloadAsset(url, 'eras', era.id, { overwrite: force });

    byId.set(era.id, { id: era.id, image: local, credit: local ? credit : null });
    console.log(`  ${local ? '▣' : '✗'} ${era.id.padEnd(24)} ${hits[0].title.replace('File:', '').slice(0, 46)}`);

    await sleep(1_500);
  }

  const rows = ERAS.map((era) => byId.get(era.id) ?? { id: era.id, image: null, credit: null });
  await fs.writeFile(file, `${JSON.stringify(rows, null, 2)}\n`, 'utf8');

  console.log('\n── الخلاصة ─────────────────────');
  console.log(`بصورة : ${rows.filter((row) => row.image).length} / ${rows.length}`);
}

async function main(): Promise<void> {
  const release = await acquireLock('sync-eras');
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
