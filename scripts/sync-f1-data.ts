/**
 * مزامنة بيانات الموسم الحقيقية.
 *
 *   npm run sync              # الموسم الحالي
 *   npm run sync -- 2025      # موسم بعينه
 *
 * يسحب السباقات والنتائج وترتيب السائقين والصانعين من واجهة مفتوحة بلا مفتاح،
 * ويكتبها في src/data. هذا هو ما يحوّل الموقع من بيانات توضيحية إلى بيانات
 * صالحة للنشر.
 *
 * التشغيل آمن ومتكرّر: يعيد الكتابة كاملة في كل مرة، ولا يلمس الأخبار.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';

import { missingTranslations } from '../src/lib/data/arabic-names';
import { attachPodiums, fetchRaces, fetchSeason } from '../src/lib/data/f1-api';

const DATA_DIR = path.join(process.cwd(), 'src', 'data');

async function write(file: string, value: unknown): Promise<void> {
  const target = path.join(DATA_DIR, file);
  await fs.writeFile(target, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  console.log(`  ✓ ${file}`);
}

async function main(): Promise<void> {
  const season = Number(process.argv[2]) || new Date().getUTCFullYear();

  console.log(`▶ مزامنة موسم ${season}…\n`);

  const [{ drivers, teams, standings }, rawRaces] = await Promise.all([
    fetchSeason(season),
    fetchRaces(season),
  ]);

  const races = await attachPodiums(season, rawRaces);

  await write('drivers.json', drivers);
  await write('teams.json', teams);
  await write('races.json', races);
  await write('standings.json', standings);

  const completed = races.filter((race) => race.status === 'completed').length;
  const next = races.find((race) => race.status === 'upcoming');

  console.log('\n── الخلاصة ─────────────────────');
  console.log(`سائقون        : ${drivers.length}`);
  console.log(`فرق           : ${teams.length}`);
  console.log(`جولات         : ${races.length} (${completed} منتهية)`);
  console.log(`متصدّر السائقين: ${drivers.find((d) => d.id === standings.drivers[0]?.entityId)?.name ?? '—'}`);
  console.log(`متصدّر الصانعين: ${teams.find((t) => t.id === standings.constructors[0]?.entityId)?.name ?? '—'}`);
  console.log(`السباق القادم  : ${next ? `${next.name} — ${next.startsAt.slice(0, 10)}` : 'انتهى الموسم'}`);

  if (missingTranslations.size > 0) {
    console.log('\n⚠ معرّفات بلا ترجمة عربية — أضفها في src/lib/data/arabic-names.ts:');
    for (const item of [...missingTranslations].sort()) console.log(`  • ${item}`);
  }

  // تنبيه خاص بهوية الموقع: قسم السعودية يعتمد على وجود الجولة في الروزنامة
  if (!races.some((race) => race.countryCode === 'SA')) {
    console.log(
      '\nℹ لا توجد جولة سعودية في روزنامة هذا الموسم — قسم /saudi سيعتمد على الأخبار وحدها.',
    );
  }
}

main().catch((error) => {
  console.error('\n✗ فشلت المزامنة:', error instanceof Error ? error.message : error);
  process.exit(1);
});
