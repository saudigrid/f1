/**
 * تدقيق قاموس أسماء السائقين.
 *
 *   npm run i18n:check
 *
 * ## لماذا هذا السكربت موجود
 *
 * صنف واحد من الخطأ تكرّر ثلاث مرات في هذا المشروع، وكلّها من **عائلة واحدة
 * في الرياضة**: أب وابن يتشاركان اسم العائلة، فيُكتب اسم الأشهر منهما في
 * بطاقة الآخر.
 *
 *   `andretti`  كُتب «ماريو» والصحيح **مايكل**
 *   `fittipaldi` كُتب «إيمرسون» والصحيح **كريستيان**
 *   `brabham`   كُتب «جاك» والصحيح **ديفيد**
 *
 * لا يظهر أيٌّ منها كعطل: الصفحة تعمل، والاسم عربي سليم، وهو ببساطة **اسم
 * رجل آخر**. ما يكشفه هو أن معرّفَين يحملان النصّ العربي نفسه.
 *
 * التدقيق لا يستدعي الواجهة إلا لجلب القائمة، ولا يستهلك أي حصة نماذج.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';

import { listAllDrivers } from '@/lib/data/history';

const LATIN = /[A-Za-z]/;

async function main(): Promise<void> {
  const file = path.join(process.cwd(), 'src', 'data', 'i18n', 'drivers.json');
  const dict = JSON.parse(await fs.readFile(file, 'utf8')) as Record<string, string>;
  const drivers = await listAllDrivers();

  const byId = new Map(drivers.map((driver) => [driver.id, driver]));
  const problems: string[] = [];

  console.log('▶ تدقيق أسماء السائقين\n');

  // ١. الاكتمال
  const missing = drivers.filter((driver) => !dict[driver.id]);
  console.log(`معرَّب      : ${Object.keys(dict).length} / ${drivers.length}`);
  if (missing.length > 0) {
    problems.push(`${missing.length} سائقاً بلا تعريب`);
  }

  // ٢. مفاتيح لا تقابل سائقاً — غالباً معرّف قديم أو مطبعي
  const orphans = Object.keys(dict).filter((id) => !byId.has(id));
  if (orphans.length > 0) {
    console.log(`\n⚠ مفاتيح بلا سائق (${orphans.length}): ${orphans.join(', ')}`);
    problems.push('مفاتيح يتيمة');
  }

  // ٣. حروف لاتينية — خطأ مطبعي في النقل
  const latin = Object.entries(dict).filter(([, ar]) => LATIN.test(ar));
  if (latin.length > 0) {
    console.log(`\n⚠ فيها حروف لاتينية (${latin.length}):`);
    for (const [id, ar] of latin) console.log(`   ${id} = ${ar}`);
    problems.push('حروف لاتينية');
  }

  /**
   * ٤. **الفحص الأهم**: اسمان عربيان متطابقان.
   *
   * سائقان مختلفان لا يحملان الاسم نفسه. التطابق يعني إمّا خلطاً بين قريبين،
   * وإمّا اسمين متشابهين حقاً — والثاني نادر ويستحقّ نظرة على أي حال.
   */
  const byName = new Map<string, string[]>();
  for (const [id, ar] of Object.entries(dict)) {
    byName.set(ar, [...(byName.get(ar) ?? []), id]);
  }

  const collisions = [...byName.entries()].filter(([, ids]) => ids.length > 1);
  if (collisions.length > 0) {
    console.log(`\n⚠ أسماء عربية متطابقة (${collisions.length}) — تحقّق من الخلط بين قريبين:`);
    for (const [ar, ids] of collisions) {
      console.log(`   «${ar}»`);
      for (const id of ids) {
        const driver = byId.get(id);
        const year = driver?.dateOfBirth?.slice(0, 4) ?? '?';
        console.log(`      ${id.padEnd(22)} ${driver?.nameEn ?? '؟'} (${year})`);
      }
    }
    problems.push('أسماء متطابقة');
  }

  console.log('\n── الخلاصة ─────────────────────');
  if (problems.length === 0) {
    console.log('✓ لا ملاحظات.');
    return;
  }

  console.log(`✗ ${problems.join(' · ')}`);
  process.exit(1);
}

main().catch((error) => {
  console.error('\n✗ فشل التدقيق:', error instanceof Error ? error.message : error);
  process.exit(1);
});
