/**
 * فحص طبقة الصور — بلا استهلاك أي حصة نماذج.
 *
 *   npm run check:images
 *
 * يجرّب الحالتين: صورة قادمة من ناشر مرخّص، وصورة احتياطية من ويكيميديا.
 */

import { resolveImage } from '../src/lib/images';
import drivers from '../src/data/drivers.json';
import teams from '../src/data/teams.json';

/** تشكيلة الموسم الحقيقية — نفس ما يمرّره المنسّق. */
const CURRENT_GRID = [
  ...drivers.map((d) => d.nameEn),
  ...teams.map((t) => t.nameEn),
];

async function show(label: string, query: Parameters<typeof resolveImage>[0]) {
  process.stdout.write(`\n── ${label} ──\n`);
  const image = await resolveImage(query);

  if (!image) {
    console.log('  ✗ لا صورة — البطاقة ستعرض نمط الهوية');
    return;
  }

  console.log(`  ✓ ${image.url.slice(0, 92)}`);
  console.log(`    المصوّر  : ${image.credit.author.slice(0, 60)}`);
  console.log(`    المصدر   : ${image.credit.source}`);
  console.log(`    الترخيص  : ${image.credit.license ?? '— (اتفاقية خاصة)'}`);
}

async function main() {
  console.log('▶ فحص طبقة الصور');

  await show('١) ناشر مرخّص في الخلاصة', {
    feedImages: [
      {
        sourceId: 'motorsport',
        sourceName: 'Motorsport.com',
        url: 'https://cdn-5.motorsport.com/images/amp/0rVPMbG0/s6/example.jpg',
      },
    ],
    entities: ['Max Verstappen'],
    currentGrid: CURRENT_GRID,
    alt: 'سيارة فورمولا 1',
  });

  await show('٢) ناشر غير مخوّل — يجب تجاهله والرجوع لويكيميديا', {
    feedImages: [
      { sourceId: 'racefans', sourceName: 'RaceFans', url: 'https://example.com/photo.jpg' },
    ],
    entities: ['Kimi Antonelli'],
    currentGrid: CURRENT_GRID,
    alt: 'كيمي أنتونيلي',
  });

  await show('٣) لا صور في الخلاصة — ويكيميديا وحدها (اسم الجائزة)', {
    feedImages: [],
    entities: ['Italian Grand Prix', 'Ferrari'],
    currentGrid: CURRENT_GRID,
    alt: 'جائزة إيطاليا الكبرى',
  });

  await show('٤) كيان مجهول — يجب ألا يجد شيئاً', {
    feedImages: [],
    entities: ['Zzzq Nonexistent Driver 9999'],
    currentGrid: CURRENT_GRID,
    alt: 'لا شيء',
  });

  await show('٥) سائق من الموسم الحالي', {
    feedImages: [],
    entities: ['Charles Leclerc', 'Ferrari'],
    currentGrid: CURRENT_GRID,
    alt: 'شارل لوكلير',
  });

  await show('٦) فريق', {
    feedImages: [],
    entities: ['McLaren', 'Lando Norris'],
    currentGrid: CURRENT_GRID,
    alt: 'مكلارين',
  });

  console.log('\nالمتوقع: ١ من Motorsport، ٢ و٣ من ويكيميديا، ٤ بلا صورة.');
}

main().catch((error) => {
  console.error('\n✗ فشل الفحص:', error instanceof Error ? error.message : error);
  process.exit(1);
});
