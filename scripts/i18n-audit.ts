/**
 * جرد النصوص العربية المكتوبة داخل الكود.
 *
 *   npm run i18n:audit           # ملخّص لكل ملف
 *   npm run i18n:audit -- --list # كل نصّ على حدة
 *
 * لماذا سكربت لا تقدير بالعين؟ لأن «البنية جاهزة للإنجليزي» جملة يسهل قولها
 * ويصعب إثباتها. طبقة البيانات جاهزة فعلاً — كل نوع يحمل `nameEn` بجانب
 * العربي. لكن **نصوص الواجهة** مكتوبة عربية داخل المكوّنات، وهذا هو العمل
 * الباقي. هذا السكربت يحوّله من انطباع إلى رقم، ويجعل التقدّم قابلاً للقياس:
 * كل نصّ ينتقل إلى `src/lib/i18n/strings.ts` ينقص من هذا العدّاد.
 *
 * التعليقات العربية مستثناة — هي شرح للمبرمج لا نصّ للقارئ، وتبقى عربية.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';

const ARABIC = /[؀-ۿ]/;

/** أسطر التعليقات — عربيتها للمبرمج لا للزائر. */
function isComment(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.startsWith('*') || trimmed.startsWith('//') || trimmed.startsWith('/*');
}

/** ملفات القواميس نفسها — عربيتها هي المقصودة، لا نعدّها عملاً باقياً. */
function isDictionary(file: string): boolean {
  const unix = file.replace(/\\/g, '/');
  return unix.includes('/data/i18n/') || unix.includes('/lib/i18n/') || unix.includes('/data/eras');
}

async function walk(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return entry.name === 'node_modules' ? [] : walk(full);
      return /\.(tsx?|mts)$/.test(entry.name) ? [full] : [];
    }),
  );
  return files.flat();
}

interface Hit {
  file: string;
  line: number;
  text: string;
}

async function main(): Promise<void> {
  const verbose = process.argv.includes('--list');
  const root = path.join(process.cwd(), 'src');

  const hits: Hit[] = [];

  for (const file of await walk(root)) {
    if (isDictionary(file)) continue;

    const lines = (await fs.readFile(file, 'utf8')).split('\n');
    lines.forEach((line, index) => {
      if (isComment(line) || !ARABIC.test(line)) return;
      hits.push({
        file: path.relative(process.cwd(), file).replace(/\\/g, '/'),
        line: index + 1,
        text: line.trim().slice(0, 90),
      });
    });
  }

  const byFile = new Map<string, number>();
  for (const hit of hits) byFile.set(hit.file, (byFile.get(hit.file) ?? 0) + 1);

  const ranked = [...byFile.entries()].sort((a, b) => b[1] - a[1]);

  console.log('▶ نصوص عربية داخل الكود (خارج القواميس والتعليقات)\n');

  for (const [file, count] of ranked) {
    console.log(`${String(count).padStart(4)}  ${file}`);
    if (!verbose) continue;
    for (const hit of hits.filter((entry) => entry.file === file)) {
      console.log(`      ${String(hit.line).padStart(4)}  ${hit.text}`);
    }
  }

  console.log('\n── الخلاصة ─────────────────────');
  console.log(`ملفات : ${ranked.length}`);
  console.log(`أسطر  : ${hits.length}`);
  console.log('\nكل سطر ينتقل إلى src/lib/i18n/strings.ts ينقص من هذا العدد.');
}

main().catch((error) => {
  console.error('\n✗ فشل الجرد:', error instanceof Error ? error.message : error);
  process.exit(1);
});
