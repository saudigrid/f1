/**
 * قائمة السائقين المحتاجين صورة حقيقية.
 *
 *   npm run photos:wanted            # ملخّص + ملف CSV
 *   npm run photos:wanted -- --all   # يشمل من لديه صورة كومنز أيضاً
 *
 * ## كيف تُضيف صورة
 *
 * ضع الملف في `public/drivers-custom/<المعرّف>.jpg` — والمعرّف هو العمود
 * الأول في الملف الناتج. الموقع يفضّل الصورة المخصّصة على أي صورة أخرى
 * تلقائياً، بلا تعديل كود ولا إعادة مزامنة.
 *
 * الترتيب بالأهمية لا بالأبجدية: من يظهر في الصفحة الرئيسية وصفحات الموسم
 * أولاً، ثم الأبطال، ثم أصحاب الانتصارات، ثم البقية. أول خمسين اسماً في
 * القائمة تغطّي معظم ما يراه الزائر فعلاً.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';

import { driverTitles } from '@/lib/data/champions';

interface DriverCard {
  id: string;
  name?: string;
  nameEn?: string;
  nationality?: string;
  active?: boolean;
  image: string | null;
  imageKind: string | null;
  imageTeam: string | null;
}

function priority(card: DriverCard, titles: number): number {
  if (card.active) return 0; // تشكيلة الموسم — تُرى كل يوم
  if (titles > 0) return 1; // أبطال العالم — صفحة مستقلة لهم
  if (!card.image) return 2; // بلا صورة إطلاقاً — مربّع فارغ
  return 3; // صورة فريق بدل صورته
}

const LABELS = ['تشكيلة الموسم', 'بطل عالم', 'بلا صورة', 'صورة فريق'];

async function main(): Promise<void> {
  const all = process.argv.includes('--all');

  const file = path.join(process.cwd(), 'src', 'data', 'driver-cards.json');
  const cards = JSON.parse(await fs.readFile(file, 'utf8')) as DriverCard[];

  const customDir = path.join(process.cwd(), 'public', 'drivers-custom');
  await fs.mkdir(customDir, { recursive: true });

  const existing = new Set(
    (await fs.readdir(customDir).catch(() => [])).map((name) => name.replace(/\.[^.]+$/, '')),
  );

  const wanted = cards
    .filter((card) => {
      if (existing.has(card.id)) return false; // وصلت صورته منك
      if (all) return true;
      return !card.image || card.imageKind === 'team';
    })
    .map((card) => {
      const titles = driverTitles(card.id).length;
      return { card, titles, rank: priority(card, titles) };
    })
    .sort(
      (a, b) =>
        a.rank - b.rank ||
        b.titles - a.titles ||
        (a.card.nameEn ?? '').localeCompare(b.card.nameEn ?? ''),
    );

  const rows = [
    'id,name_ar,name_en,nationality,why,titles',
    ...wanted.map((entry) =>
      [
        entry.card.id,
        `"${entry.card.name ?? ''}"`,
        `"${entry.card.nameEn ?? ''}"`,
        `"${entry.card.nationality ?? ''}"`,
        `"${LABELS[entry.rank]}"`,
        entry.titles,
      ].join(','),
    ),
  ];

  const out = path.join(process.cwd(), 'صور-السائقين-المطلوبة.csv');
  // BOM حتى يفتح إكسل العربية بترميز صحيح بدل رموز مشوّهة
  await fs.writeFile(out, `﻿${rows.join('\n')}\n`, 'utf8');

  const byRank = [0, 1, 2, 3].map((rank) => wanted.filter((entry) => entry.rank === rank).length);

  console.log('▶ سائقون يحتاجون صورة\n');
  LABELS.forEach((label, index) => {
    if (byRank[index] > 0) console.log(`  ${label.padEnd(16)} ${byRank[index]}`);
  });

  console.log(`\nالمجموع  : ${wanted.length}`);
  console.log(`وصلت منك : ${existing.size}`);
  console.log(`\nالملف    : صور-السائقين-المطلوبة.csv`);
  console.log(`المجلد   : public/drivers-custom/<المعرّف>.jpg`);

  console.log('\n── أول 25 بالأولوية ─────────────');
  for (const entry of wanted.slice(0, 25)) {
    console.log(
      `  ${entry.card.id.padEnd(22)} ${(entry.card.nameEn ?? '').slice(0, 26).padEnd(27)}${LABELS[entry.rank]}`,
    );
  }
}

main().catch((error) => {
  console.error('\n✗ فشل:', error instanceof Error ? error.message : error);
  process.exit(1);
});
