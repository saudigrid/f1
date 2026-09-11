/**
 * يفهرس الصور التي أضافها المحرّر بيده.
 *
 *   npm run photos:sync
 *
 * يقرأ `public/drivers-custom/` ويكتب `src/data/driver-photos.json`، فيلتقط
 * الموقع الصور فوراً. شغّله بعد كل دفعة صور تضيفها.
 *
 * ⚠️ يتحقّق أن اسم كل ملف معرّفُ سائق حقيقي. الملف المسمّى خطأً لن يظهر في
 * أي صفحة، ولن يشتكي أحد — فيبقى المحرّر يظنّ أنه أضاف صورة وهي غائبة.
 * الصمت هنا أسوأ من الخطأ.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';

const ACCEPTED = /\.(jpe?g|png|webp|avif)$/i;

interface DriverCard {
  id: string;
  name?: string;
}

async function main(): Promise<void> {
  const root = process.cwd();
  const dir = path.join(root, 'public', 'drivers-custom');
  await fs.mkdir(dir, { recursive: true });

  const cards = JSON.parse(
    await fs.readFile(path.join(root, 'src', 'data', 'driver-cards.json'), 'utf8'),
  ) as DriverCard[];

  const known = new Map(cards.map((card) => [card.id, card.name ?? card.id]));
  const files = (await fs.readdir(dir)).filter((name) => ACCEPTED.test(name));

  const index: Record<string, string> = {};
  const unknown: string[] = [];

  for (const file of files.sort()) {
    const id = file.replace(/\.[^.]+$/, '');
    if (!known.has(id)) {
      unknown.push(file);
      continue;
    }
    index[id] = `/drivers-custom/${file}`;
  }

  const sorted = Object.fromEntries(Object.keys(index).sort().map((id) => [id, index[id]]));
  await fs.writeFile(
    path.join(root, 'src', 'data', 'driver-photos.json'),
    `${JSON.stringify(sorted, null, 2)}\n`,
    'utf8',
  );

  console.log('▶ صور السائقين اليدوية\n');
  console.log(`ملفات في المجلد : ${files.length}`);
  console.log(`مطابِقة لسائق   : ${Object.keys(sorted).length}`);

  if (unknown.length > 0) {
    console.log(`\n⚠ أسماء لا تطابق أي سائق (${unknown.length}) — لن تظهر:`);
    for (const file of unknown) console.log(`   ${file}`);
    console.log('\n   الاسم الصحيح هو العمود الأول في صور-السائقين-المطلوبة.csv');
  }

  if (Object.keys(sorted).length > 0) {
    console.log('\n── أُضيفت ─────────────────────');
    for (const id of Object.keys(sorted).slice(0, 20)) {
      console.log(`  ${id.padEnd(22)} ${known.get(id)}`);
    }
  }
}

main().catch((error) => {
  console.error('\n✗ فشل:', error instanceof Error ? error.message : error);
  process.exit(1);
});
