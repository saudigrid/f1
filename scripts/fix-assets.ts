/**
 * يصلح روابط الصور بعد أن يستبدل المحرّر ملفات بيده.
 *
 *   npm run fix:assets           # يعرض ما سيفعله دون كتابة
 *   npm run fix:assets -- --apply
 *
 * ## لماذا هذا السكربت موجود
 *
 * حين تنزّل صورة بديلة، يتغيّر **الملف** ولا يتغيّر **السجلّ** الذي يشير إليه.
 * فتظهر أربع علل، أخطرها لا تظهر على ويندوز إطلاقاً:
 *
 * ١. **اختلاف حالة الأحرف.** المتصفّح ينزّل `albon.JPG` والسجلّ يقول
 *    `albon.jpg`. ويندوز لا يفرّق بين الاسمين فتعمل الصورة عندك — أما
 *    **لينكس فيفرّق**، فتُرجع 404 على الاستضافة وحدها. عطل يظهر بعد النشر لا
 *    قبله، وهو أسوأ أنواع الأعطال.
 *
 * ٢. **تغيّر الامتداد.** استبدلتَ `albert_park.png` بـ`albert_park.webp`
 *    فحُذف الأول وبقي السجلّ يشير إليه — صورة مكسورة، هنا والآن.
 *
 * ٣. **صورة في المجلد الخطأ.** وضعتَ صورة سائق ليس له صورة في
 *    `public/drivers/` بدل `public/drivers-custom/`. المزامنة تملك المجلد
 *    الأول وقد تمسحها، والثاني هو الذي يحميها ويُعطيها الأولوية المطلقة.
 *
 * ٤. **خطأ إملائي.** `russel.JPG` ومعرّف السائق `russell` — حرف واحد يكفي
 *    ليختفي الملف بصمت.
 *
 * والجامع بين الأربع أن **لا شيء يشتكي**. الصفحة تُبنى، والبناء ينجح، ويبقى
 * المحرّر يظنّ أنه أضاف صورة وهي غائبة.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';

/** الامتدادات التي نعدّها صوراً. `.htm` وغيره يُبلَّغ عنه ولا يُلمس. */
const IMAGE = /\.(jpe?g|png|webp|avif|svg)$/i;

/**
 * ⚠️ أفضلية الامتداد حين يوجد أكثر من ملف بالجذع نفسه.
 *
 * `webp` أولاً لأن استبدال `png` بـ`webp` اختيار متعمّد من المحرّر (حجم أصغر
 * بجودة مماثلة)، فلا معنى لأن نبقي السجلّ على القديم لمجرّد أنه ما زال موجوداً.
 */
const PREFERENCE = ['webp', 'avif', 'png', 'jpg', 'jpeg', 'svg'];

function rank(file: string): number {
  const extension = file.split('.').pop()?.toLowerCase() ?? '';
  const index = PREFERENCE.indexOf(extension);
  return index === -1 ? PREFERENCE.length : index;
}

interface Row {
  id: string;
  image?: string | null;
  [key: string]: unknown;
}

interface Target {
  label: string;
  json: string;
  dir: string;
  /** مجلد الصور اليدوية — من كان سجلّه بلا صورة يُنقل إليه. */
  customDir?: string;
}

const TARGETS: Target[] = [
  {
    label: 'السائقون',
    json: 'src/data/driver-cards.json',
    dir: 'drivers',
    customDir: 'drivers-custom',
  },
  { label: 'الحلبات', json: 'src/data/circuits.json', dir: 'circuits' },
];

interface Plan {
  renames: [string, string][];
  repoints: [string, string, string][];
  moves: [string, string][];
  unidentified: string[];
  unreferenced: string[];
  dangling: string[];
}

async function planFor(target: Target, root: string): Promise<Plan> {
  const rows = JSON.parse(await fs.readFile(path.join(root, target.json), 'utf8')) as Row[];
  const byId = new Map(rows.map((row) => [row.id, row]));
  const folder = path.join(root, 'public', target.dir);
  const entries = await fs.readdir(folder);

  const plan: Plan = {
    renames: [],
    repoints: [],
    moves: [],
    unidentified: [],
    unreferenced: [],
    dangling: [],
  };

  /* ── ١. توحيد حالة الأحرف في الامتداد ───────── */
  const renamed = new Map<string, string>();
  for (const file of entries) {
    if (!IMAGE.test(file)) {
      plan.unidentified.push(file);
      continue;
    }
    const extension = file.slice(file.lastIndexOf('.'));
    const lower = extension.toLowerCase() === '.jpeg' ? '.jpg' : extension.toLowerCase();
    if (extension !== lower) {
      const to = file.slice(0, file.lastIndexOf('.')) + lower;
      plan.renames.push([file, to]);
      renamed.set(file, to);
    }
  }

  /** أسماء الملفات بعد التسمية، مجمّعة بالجذع. */
  const byStem = new Map<string, string[]>();
  for (const file of entries) {
    if (!IMAGE.test(file)) continue;
    const final = renamed.get(file) ?? file;
    const stem = final.slice(0, final.lastIndexOf('.'));
    const list = byStem.get(stem);
    if (list) list.push(final);
    else byStem.set(stem, [final]);
  }
  for (const list of byStem.values()) list.sort((a, b) => rank(a) - rank(b));

  const referenced = new Set<string>();

  /* ── ٢. إعادة توجيه السجلّات ─────────────────── */
  for (const row of rows) {
    if (!row.image) continue;
    const current = path.basename(row.image);
    const stem = current.slice(0, current.lastIndexOf('.'));
    const best = byStem.get(stem)?.[0];

    if (!best) {
      plan.dangling.push(`${row.id} → ${current}`);
      continue;
    }
    referenced.add(best);
    if (best !== current) {
      plan.repoints.push([row.id, current, best]);
    }
  }

  /* ── ٣. ملفات لا يشير إليها سجلّ ─────────────── */
  for (const [stem, files] of byStem) {
    const best = files[0];
    if (referenced.has(best)) continue;

    const row = byId.get(stem);
    if (!row) {
      plan.unidentified.push(best);
      continue;
    }

    /**
     * سجلّ بلا صورة + ملف باسمه = صورة أضافها المحرّر في المجلد الخطأ.
     * تُنقل إلى المجلد اليدوي حيث تنجو من المزامنة وتأخذ الأولوية المطلقة.
     */
    if (!row.image && target.customDir) {
      plan.moves.push([best, best]);
    } else {
      plan.unreferenced.push(best);
    }
  }

  return plan;
}

function report(target: Target, plan: Plan): void {
  const say = (label: string, lines: string[]) => {
    if (lines.length === 0) return;
    console.log(`\n  ${label} (${lines.length})`);
    for (const line of lines.slice(0, 40)) console.log(`    ${line}`);
    if (lines.length > 40) console.log(`    … و${lines.length - 40} غيرها`);
  };

  console.log(`\n═══ ${target.label} ═══`);
  say('توحيد حالة الأحرف — تُكسر على لينكس وحده', plan.renames.map(([a, b]) => `${a} → ${b}`));
  say('إعادة توجيه السجلّ', plan.repoints.map(([id, a, b]) => `${id}: ${a} → ${b}`));
  say(`نقل إلى ${target.customDir ?? '—'}`, plan.moves.map(([a]) => a));
  say('سجلّ يشير إلى ملف غير موجود', plan.dangling);
  say('ملفات لا هوية لها — تحتاج قراراً', plan.unidentified);
  say('ملفات قديمة متروكة — لا تُلمس', plan.unreferenced);
}

async function apply(target: Target, plan: Plan, root: string): Promise<void> {
  const folder = path.join(root, 'public', target.dir);

  for (const [from, to] of plan.renames) {
    /**
     * ⚠️ عبر ملف وسيط. ويندوز لا يفرّق بين `albon.JPG` و`albon.jpg`، فإعادة
     * التسمية المباشرة قد تُعدّ «لا تغيير» فتبقى الحالة الأصلية على القرص —
     * ويعود العطل على لينكس كما كان.
     */
    const temporary = path.join(folder, `.tmp-${to}`);
    await fs.rename(path.join(folder, from), temporary);
    await fs.rename(temporary, path.join(folder, to));
  }

  if (plan.moves.length > 0 && target.customDir) {
    const destination = path.join(root, 'public', target.customDir);
    await fs.mkdir(destination, { recursive: true });
    for (const [file] of plan.moves) {
      await fs.rename(path.join(folder, file), path.join(destination, file));
    }
  }

  if (plan.repoints.length > 0) {
    const file = path.join(root, target.json);
    const rows = JSON.parse(await fs.readFile(file, 'utf8')) as Row[];
    const byId = new Map(rows.map((row) => [row.id, row]));
    for (const [id, , to] of plan.repoints) {
      const row = byId.get(id);
      if (row) row.image = `/${target.dir}/${to}`;
    }
    await fs.writeFile(file, `${JSON.stringify(rows, null, 2)}\n`, 'utf8');
  }
}

async function main(): Promise<void> {
  const write = process.argv.includes('--apply');
  const root = process.cwd();

  console.log(write ? '▶ إصلاح روابط الصور\n' : '▶ معاينة — لا كتابة (أضف --apply للتنفيذ)\n');

  for (const target of TARGETS) {
    const plan = await planFor(target, root);
    report(target, plan);
    if (write) await apply(target, plan, root);
  }

  if (write) {
    console.log('\n✓ نُفّذ. شغّل بعدها:');
    console.log('    npm run photos:sync');
  }
}

main().catch((error) => {
  console.error('\n✗ فشل:', error instanceof Error ? error.message : error);
  process.exit(1);
});
