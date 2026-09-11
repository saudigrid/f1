/**
 * شعارات الفرق — تنقية وإعادة بناء.
 *
 *   npm run sync:logos            # ينقّي ثم يجلب الناقص
 *   npm run sync:logos -- --report  # يعرض ما سيفعله دون كتابة
 *
 * ## لماذا سكربت مستقلّ عن `sync:teams`
 *
 * لأن المشكلة ليست في الجلب بل في **الاختيار**. البحث بالكلمات في كومنز يجد
 * الاسم لا الجهة، فأعاد لـ«هوندا» صورة سيارة هوندا صفراء، ولـ«إيغل» شعار شركة
 * حواسيب، ولـ«تيرنر» شعار تينا تيرنر. راجعتُ الـ59 شعاراً المحمَّلة بالعين
 * على لوحة تواصل، ورفضتُ ستة عشر.
 *
 * ## ثلاث طبقات، من الأوثق إلى الأضعف
 *
 * ١. **`MANUAL`** — ملفّات كومنز بعينها تحقّقتُ منها يدوياً. لا بحث، لا حزر.
 * ٢. **سلسلة «Mini Free Logo»** — مجموعة على كومنز برخصة CC0 تضمّ شعارات فرق
 *    فورمولا 1 بمقاس موحّد. اسم الملف قالبيّ (`Mini Free Logo <الاسم>.png`)،
 *    فيُسأل عن وجوده **مباشرة** بدل البحث — والسؤال عن ملف باسمه لا يُخطئ.
 * ٣. **لا شيء** — يتكفّل `TeamCrest` بشارة حروف نظيفة.
 *
 * ما حُذف من الطبقة الثالثة: البحث بالكلمات. جرّبناه، وكلفتنا نتيجته ستة عشر
 * شعاراً خاطئاً وساعةً من المراجعة اليدوية.
 *
 * ⚠️ كومنز يحدّ الطلبات بحزم («You are making too many requests»). كل نداء
 * هنا متتابع وبتراجع أُسّي، والوجود يُسأل عنه **مجمَّعاً** خمسين عنواناً في
 * الطلب الواحد.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';

import { LOGO_BLOCKLIST } from '@/data/logo-blocklist';
import { downloadAsset, sleep } from '@/lib/data/download';
import type { ImageCredit } from '@/lib/types';

import { acquireLock } from './lock';

const API = 'https://commons.wikimedia.org/w/api.php';
const UA = { 'user-agent': 'SaudiF1Grid/1.0 (https://saudif1grid.com) sync-script' };
const TITLE_BATCH = 50;

/**
 * ملفّات تحقّقتُ منها بالعين على لوحة تواصل.
 *
 * كلّها إمّا في الملك العام أو CC0 أو «حرّ الاستعمال» — والشعار البسيط لا
 * يُحمى بحقّ المؤلف أصلاً، لكن الرخصة الصريحة تريح.
 */
const MANUAL: Record<string, string> = {
  mclaren: 'Mclaren-formula-1-team-seeklogo.png',
  audi: 'Audi-Logo 2016.svg',
  honda: 'Logo Honda F1 Racing.svg',
  toyota: 'Panasonic Toyota Racing logo.svg',
  matra: 'Matra sports logo.svg',
  maserati: 'Maserati logo 2.svg',
  pacific: 'Logo Pacific Grand Prix.svg',
  arrows: 'Arrows Grand Prix logo.png',
  life: 'Life Engines Logo (from Vector).png',
  porsche: 'Porsche-Automarken-Logo.jpg',
  surtees: 'SurteesLogo.svg',
  dallara: 'Dallara logo.svg',
  lancia: 'Lancia Logo 2023.svg',
  bugatti: 'Bugatti logo.svg',
};

interface ConstructorRecord {
  id: string;
  name: string;
  logo: string | null;
  logoCredit: ImageCredit | null;
  [key: string]: unknown;
}

interface WikiPage {
  title: string;
  missing?: string;
  imageinfo?: {
    url: string;
    thumburl?: string;
    extmetadata?: Record<string, { value: string }>;
  }[];
}

async function query<T>(params: Record<string, string>): Promise<T | null> {
  const search = new URLSearchParams({ action: 'query', format: 'json', formatversion: '2', ...params });

  for (let attempt = 0; attempt < 5; attempt += 1) {
    if (attempt > 0) await sleep(2_000 * 2 ** (attempt - 1));
    try {
      const response = await fetch(`${API}?${search}`, {
        headers: UA,
        signal: AbortSignal.timeout(30_000),
      });
      if (response.status === 429 || response.status >= 500) continue;
      if (!response.ok) return null;

      const text = await response.text();
      // ⚠️ كومنز يردّ نصّاً عادياً عند تجاوز الحدّ، لا JSON — فيسقط التحليل
      if (!text.startsWith('{')) continue;
      return JSON.parse(text) as T;
    } catch {
      // مهلة أو تحليل فاشل — نعيد
    }
  }
  return null;
}

function strip(html: string | undefined): string | null {
  if (!html) return null;
  const text = html.replace(/<[^>]+>/g, '').trim();
  return text || null;
}

/** أي من هذه الملفّات موجود فعلاً على كومنز؟ */
async function existing(titles: string[]): Promise<Set<string>> {
  const found = new Set<string>();

  for (let index = 0; index < titles.length; index += TITLE_BATCH) {
    const batch = titles.slice(index, index + TITLE_BATCH);
    const payload = await query<{ query?: { pages?: WikiPage[] } }>({
      titles: batch.map((title) => `File:${title}`).join('|'),
      prop: 'info',
    });

    for (const page of payload?.query?.pages ?? []) {
      if (!page.missing) found.add(page.title.replace(/^File:/, ''));
    }

    process.stdout.write(`\r  فحص الوجود: ${Math.min(index + TITLE_BATCH, titles.length)} / ${titles.length} — موجود ${found.size}`);
    await sleep(900);
  }
  process.stdout.write('\n');
  return found;
}

/** رابط الصورة ونسبتها. */
async function fileInfo(title: string): Promise<{ url: string; credit: ImageCredit } | null> {
  const payload = await query<{ query?: { pages?: WikiPage[] } }>({
    titles: `File:${title}`,
    prop: 'imageinfo',
    iiprop: 'url|extmetadata',
    iiurlwidth: '400',
  });

  const info = payload?.query?.pages?.[0]?.imageinfo?.[0];
  if (!info) return null;

  const meta = info.extmetadata ?? {};
  return {
    url: info.thumburl ?? info.url,
    credit: {
      author: strip(meta.Artist?.value) ?? 'غير معروف',
      source: 'Wikimedia Commons',
      license: strip(meta.LicenseShortName?.value) ?? 'غير محدّد',
      sourceUrl: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(title.replace(/ /g, '_'))}`,
    },
  };
}

async function run(): Promise<void> {
  const report = process.argv.includes('--report');
  const file = path.join(process.cwd(), 'src', 'data', 'constructors.json');
  const rows = JSON.parse(await fs.readFile(file, 'utf8')) as ConstructorRecord[];

  // ── ١. التنقية ───────────────────────────────
  let purged = 0;
  for (const row of rows) {
    if (LOGO_BLOCKLIST.has(row.id) && row.logo) {
      row.logo = null;
      row.logoCredit = null;
      purged += 1;
    }
  }
  console.log(`▶ نُقّي ${purged} شعاراً مرفوضاً\n`);

  // ── ٢. الملفّات اليدوية ──────────────────────
  /*
   * ⚠️ اليدويّ يفوز دائماً، حتى لو كان للفريق شعار محمَّل.
   * كان الشرط «إن لم يكن له شعار»، فبقيت مكلارين على شعار 1996 النصّي رغم أن
   * الخريطة اليدوية تحمل شعار الفريق الحالي. الطبقة اليدوية أعلى سلطة في هذا
   * السكربت — فلا معنى لأن يحجبها ما جاء من بحث آلي.
   */
  const wanted = new Map<string, string>();
  for (const row of rows) {
    const manual = MANUAL[row.id];
    if (manual) wanted.set(row.id, manual);
  }

  // ── ٣. سلسلة Mini Free Logo ──────────────────
  const candidates = rows
    .filter((row) => !row.logo && !wanted.has(row.id))
    .map((row) => ({ id: row.id, title: `Mini Free Logo ${row.name}.png` }));

  console.log(`▶ فحص ${candidates.length} اسماً في سلسلة «Mini Free Logo»`);
  const present = await existing(candidates.map((row) => row.title));
  for (const row of candidates) {
    if (present.has(row.title)) wanted.set(row.id, row.title);
  }

  console.log(`\n▶ ${wanted.size} شعاراً للجلب\n`);
  if (report) {
    for (const [id, title] of wanted) console.log(`  ${id.padEnd(20)} ${title}`);
    return;
  }

  // ── ٤. الجلب ─────────────────────────────────
  const byId = new Map(rows.map((row) => [row.id, row]));
  let added = 0;

  for (const [id, title] of wanted) {
    const info = await fileInfo(title);
    if (!info) {
      console.log(`  ✗ ${id.padEnd(20)} تعذّر جلب المعلومات`);
      await sleep(900);
      continue;
    }

    const saved = await downloadAsset(info.url, 'teams', id, { overwrite: true });
    const row = byId.get(id);
    if (saved && row) {
      row.logo = saved;
      row.logoCredit = info.credit;
      added += 1;
      console.log(`  ◆ ${id.padEnd(20)} ${title}  [${info.credit.license}]`);
    } else {
      console.log(`  ✗ ${id.padEnd(20)} فشل التنزيل`);
    }
    await sleep(900);
  }

  await fs.writeFile(file, `${JSON.stringify(rows, null, 2)}\n`, 'utf8');

  console.log('\n── الخلاصة ─────────────────────');
  console.log(`منقّى  : ${purged}`);
  console.log(`مضاف  : ${added}`);
  console.log(`بشعار : ${rows.filter((row) => row.logo).length} / ${rows.length}`);
}

async function main(): Promise<void> {
  const release = await acquireLock('sync-team-logos');
  try {
    await run();
  } finally {
    await release();
  }
}

main().catch((error) => {
  console.error('\n✗ فشل:', error instanceof Error ? error.message : error);
  process.exit(1);
});
