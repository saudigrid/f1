/**
 * يضيف حقول العرض إلى بطاقات الحلبات والسائقين.
 *
 *   npm run backfill
 *
 * ## لماذا
 *
 * صفحتا `/circuits` و`/drivers` كانتا تنادِيان الواجهة وقت البناء للحصول على
 * الاسم والدولة والجنسية. ومع أحد عشر عاملاً متوازياً صار ذلك انفجار طلبات
 * متطابقة على واجهة مفتوحة تبرّعية، فردّت **429** وسقط البناء — مرّتين، ولم
 * تنفع زيادة إعادة المحاولة لأن الحدّ حدُّ **تزامن** لا حدُّ يوم: الطلب الفردي
 * يعود 200 بلا مشكلة.
 *
 * العلاج ليس إعادة محاولة أذكى بل **ألا نسأل أصلاً**: هذه الحقول ثابتة (اسم
 * مونزا لن يتغيّر)، فتُكتب في الملفات مرة وتُقرأ من القرص عند البناء.
 *
 * يبقى النداء الحيّ حيث يلزم فعلاً: نتائج السباقات وأسرع لفة في صفحات التفاصيل
 * التي تُصيَّر عند الطلب لا وقت البناء.
 *
 * السكربت **متسلسل ومحدود** عمداً — عشرة طلبات تقريباً، مرّة واحدة.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';

import { listAllDrivers, listCircuits } from '@/lib/data/history';

import { acquireLock } from './lock';

interface Card {
  id: string;
  [key: string]: unknown;
}

async function readCards(file: string): Promise<Card[]> {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8')) as Card[];
  } catch {
    return [];
  }
}

async function writeCards(file: string, cards: Card[]): Promise<void> {
  await fs.writeFile(file, `${JSON.stringify(cards, null, 2)}\n`, 'utf8');
}

async function run(): Promise<void> {
  const dataDir = path.join(process.cwd(), 'src', 'data');

  // ── الحلبات ───────────────────────────────────
  const circuitFile = path.join(dataDir, 'circuits.json');
  const circuitCards = await readCards(circuitFile);
  const circuits = new Map((await listCircuits()).map((circuit) => [circuit.id, circuit]));

  let circuitsFilled = 0;
  for (const card of circuitCards) {
    const circuit = circuits.get(card.id);
    if (!circuit) continue;

    card.name = circuit.name;
    card.nameEn = circuit.nameEn;
    card.locality = circuit.locality;
    card.localityEn = circuit.localityEn;
    card.country = circuit.country;
    card.countryCode = circuit.countryCode;
    card.active = circuit.active;
    // الإحداثيات: يحتاجها توليد المخططات حين لا تُطابَق الحلبة بمعرّف ويكي بيانات
    card.lat = circuit.lat;
    card.lon = circuit.long;
    circuitsFilled += 1;
  }

  await writeCards(circuitFile, circuitCards);
  console.log(`حلبات   : ${circuitsFilled} / ${circuitCards.length}`);

  // ── السائقون ──────────────────────────────────
  const driverFile = path.join(dataDir, 'driver-cards.json');
  const driverCards = await readCards(driverFile);
  const drivers = new Map((await listAllDrivers()).map((driver) => [driver.id, driver]));

  let driversFilled = 0;
  for (const card of driverCards) {
    const driver = drivers.get(card.id);
    if (!driver) continue;

    card.name = driver.name;
    card.nameEn = driver.nameEn;
    card.nationality = driver.nationality;
    card.countryCode = driver.countryCode;
    card.active = driver.active;
    driversFilled += 1;
  }

  await writeCards(driverFile, driverCards);
  console.log(`سائقون  : ${driversFilled} / ${driverCards.length}`);

  const missing = [...drivers.keys()].filter(
    (id) => !driverCards.some((card) => card.id === id),
  ).length;
  if (missing > 0) {
    console.log(`\nℹ ${missing} سائقاً بلا بطاقة بعد — أكمل: npm run sync:drivers`);
  }
}

async function main(): Promise<void> {
  const release = await acquireLock('backfill-cards');
  try {
    console.log('▶ حقول العرض في البطاقات\n');
    await run();
    console.log('\n✓ تمّ — صفحتا القوائم لم تعودا تنادِيان الواجهة وقت البناء.');
  } finally {
    await release();
  }
}

main().catch((error) => {
  console.error('\n✗ فشل الإكمال:', error instanceof Error ? error.message : error);
  process.exit(1);
});
