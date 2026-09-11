/**
 * يفهرس شعارات الفرق التي يضيفها المحرّر بيده، ويكتب قائمة الناقص.
 *
 *   npm run logos:sync
 *
 * يقرأ `public/teams-custom/` ويكتب `src/data/team-logos.json`، ثم يولّد
 * `شعارات-الفرق-المطلوبة.csv` بكل فريق بلا شعار مرتّباً بالأهمية.
 *
 * ## لماذا هذا المسار موجود
 *
 * 63 فريقاً من 214 لهم شعار حرّ على ويكيميديا كومنز. البقية إمّا لم يكن لها
 * شعار أصلاً (صانعون دخلوا سباقاً واحداً في الخمسينيات)، أو شعارها محميّ ولا
 * نسخة حرّة منه. لا خوارزمية تحلّ هذا — لكن إنساناً يملك الملف يحلّه في ثانية.
 *
 * ⚠️ الاسم هو **معرّف الفريق** كما في العمود الأول من ملف CSV: `team_lotus.png`
 * لا `Team Lotus.png`. الملف المسمّى خطأً لن يظهر ولن يشتكي أحد، فيبقى المحرّر
 * يظنّ أنه أضاف شعاراً وهو غائب — ولهذا يصرخ السكربت على كل اسم لا يطابق.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';

import { TEAM_ALIASES } from '@/data/team-aliases';

const ACCEPTED = /\.(jpe?g|png|webp|avif|svg)$/i;

interface ConstructorRow {
  id: string;
  name: string;
  logo: string | null;
  firstSeason: number | null;
  lastSeason: number | null;
  seasonCount: number;
  wins: number;
  titles: number[];
  active: boolean;
}

async function main(): Promise<void> {
  const root = process.cwd();
  const dir = path.join(root, 'public', 'teams-custom');
  await fs.mkdir(dir, { recursive: true });

  const rows = JSON.parse(
    await fs.readFile(path.join(root, 'src', 'data', 'constructors.json'), 'utf8'),
  ) as ConstructorRow[];

  const known = new Map(rows.map((row) => [row.id, row.name]));
  const files = (await fs.readdir(dir)).filter((name) => ACCEPTED.test(name));

  const index: Record<string, string> = {};
  const unknown: string[] = [];

  for (const file of files.sort()) {
    const id = file.replace(/\.[^.]+$/, '');
    if (!known.has(id)) {
      unknown.push(file);
      continue;
    }
    index[id] = `/teams-custom/${file}`;
  }

  const sorted = Object.fromEntries(Object.keys(index).sort().map((id) => [id, index[id]]));
  await fs.writeFile(
    path.join(root, 'src', 'data', 'team-logos.json'),
    `${JSON.stringify(sorted, null, 2)}\n`,
    'utf8',
  );

  /**
   * قائمة الناقص، مرتّبة بالأثر.
   *
   * الترتيب ليس تفصيلاً: من يملأ 150 شعاراً يبدأ من الأعلى ويتوقّف حين يتعب،
   * فالأهمّ يجب أن يكون في الأعلى — الفرق النشطة أولاً، ثم أصحاب الألقاب،
   * ثم أصحاب الانتصارات، ثم الأطول عمراً.
   */
  const missing = rows
    /*
     * ⚠️ المعرّفات المدمجة تُستبعَد. «lotus-climax» لا صفحة له — دُمج في
     * «team_lotus»، فشعارٌ باسمه لن يُعرض في أي مكان. إدراجه في القائمة يعني
     * أن يتعب المحرّر على ملفّ لا يظهر.
     */
    .filter((row) => !row.logo && !sorted[row.id] && !TEAM_ALIASES[row.id])
    .sort(
      (a, b) =>
        Number(b.active) - Number(a.active) ||
        b.titles.length - a.titles.length ||
        b.wins - a.wins ||
        b.seasonCount - a.seasonCount,
    );

  const csv = [
    'المعرّف,الاسم,من,إلى,مواسم,انتصارات,ألقاب,نشط',
    ...missing.map((row) =>
      [
        row.id,
        `"${row.name.replace(/"/g, '""')}"`,
        row.firstSeason ?? '',
        row.lastSeason ?? '',
        row.seasonCount,
        row.wins,
        row.titles.length,
        row.active ? 'نعم' : '',
      ].join(','),
    ),
  ].join('\r\n');

  // ⚠️ علامة الترتيب لازمة: إكسل يفتح UTF-8 بلا BOM كـ«ط¹ط±ط¨ظٹ»
  const csvPath = path.join(root, 'شعارات-الفرق-المطلوبة.csv');
  await fs.writeFile(csvPath, `﻿${csv}\r\n`, 'utf8');

  console.log('▶ شعارات الفرق اليدوية\n');
  console.log(`ملفات في المجلد : ${files.length}`);
  console.log(`مطابِقة لفريق   : ${Object.keys(sorted).length}`);
  console.log(`بشعار (المجموع) : ${rows.filter((row) => row.logo).length + Object.keys(sorted).length} / ${rows.length}`);
  console.log(`ما زال ناقصاً   : ${missing.length}`);
  console.log(`\n  ${path.basename(csvPath)}`);

  if (unknown.length > 0) {
    console.log(`\n⚠ أسماء لا تطابق أي فريق (${unknown.length}) — لن تظهر:`);
    for (const file of unknown) console.log(`   ${file}`);
    console.log('\n   الاسم الصحيح هو العمود الأول في شعارات-الفرق-المطلوبة.csv');
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
