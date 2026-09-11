/**
 * يطبع أسماء السائقين التي لم تُعرَّب بعد، مع الجنسية وسنة الميلاد.
 *
 *   npm run i18n:names -- 0 130
 *
 * الجنسية تحدّد النطق الصحيح، وسنة الميلاد تفصل الأب عن الابن — وهما أكثر
 * مصدرَي خطأ في تعريب أسماء هذه الرياضة تحديداً.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';

import { listAllDrivers } from '@/lib/data/history';

async function main(): Promise<void> {
  const file = path.join(process.cwd(), 'src', 'data', 'i18n', 'drivers.json');
  const dict = JSON.parse(await fs.readFile(file, 'utf8')) as Record<string, string>;

  const pending = (await listAllDrivers()).filter((driver) => !dict[driver.id]);

  const from = Number(process.argv[2] ?? 0);
  const size = Number(process.argv[3] ?? 130);

  console.log(`# ينقص ${pending.length} | هذه ${from}–${Math.min(from + size, pending.length)}`);
  for (const driver of pending.slice(from, from + size)) {
    const year = driver.dateOfBirth?.slice(0, 4) ?? '?';
    console.log(`${driver.id} = ${driver.nameEn} [${driver.nationality}, ${year}]`);
  }
}

main().catch((error) => {
  console.error('✗', error instanceof Error ? error.message : error);
  process.exit(1);
});
