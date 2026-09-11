/**
 * صور السائقين — كل من قاد في الفورمولا 1 منذ 1950.
 *
 * يكتب `src/data/driver-cards.json`. ⚠️ لا تسمّه `drivers.json`: ذاك الاسم
 * مأخوذ لتشكيلة الموسم الحالي التي تقرأها طبقة الصور والمخزن المحلي، والخلط
 * بينهما يمحو ملفاً حيّاً.
 *
 *   npm run sync:drivers                 # يكمل ما ينقص فقط
 *   npm run sync:drivers -- --limit 20   # عدد محدود، للتجربة
 *   npm run sync:drivers -- --only senna,hunt,fangio
 *   npm run sync:drivers -- --retry      # يعيد محاولة من فشلوا سابقاً
 *   npm run sync:drivers -- --force      # يعيد اختيار الصورة ولو كانت محفوظة
 *
 * الأولوية: صورة السائق ← صورة فريقه. سائقو الخمسينيات الذين شاركوا بسباق
 * واحد كثيرون، وكثير منهم بلا صورة حرّة على الإطلاق — فصورة الفريق تبقيهم
 * داخل الشبكة بدل مربّع رمادي.
 *
 * السكربت **تراكمي**: يقرأ الملف الحالي ويعالج الناقص، ويحفظ كل 10 سائقين.
 * 881 سائقاً تعني ساعة من الطلبات المهذّبة — والانقطاع في المنتصف لا يضيّع
 * ما أُنجز.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';

import { downloadAsset, downloadFlag, sleep } from '@/lib/data/download';
import { listAllDrivers } from '@/lib/data/history';
import {
  findConstructorImage,
  findDriverPortrait,
  type DriverImageKind,
} from '@/lib/images/driver-portrait';
import type { ImageCredit } from '@/lib/types';

import { acquireLock } from './lock';

const SAVE_EVERY = 10;
const BASE = 'https://api.jolpi.ca/ergast/f1';
const UA = { 'user-agent': 'SaudiF1Grid/1.0 (https://saudif1grid.com) sync-script' };

export interface DriverCard {
  id: string;
  image: string | null;
  imageCredit: ImageCredit | null;
  imageKind: DriverImageKind | null;
  /** اسم الفريق حين تكون الصورة صورة فريق — يُذكر للقارئ صراحة. */
  imageTeam: string | null;

  /**
   * حقول العرض — تُكتب هنا لا تُطلَب وقت البناء.
   *
   * ⚠️ صفحة `/drivers` كانت تنادي `listAllDrivers()` لتجلبها، فانهالت تسع
   * صفحات ترقيم من كل عامل بناء على واجهة مفتوحة تبرّعية وردّت **429** وأسقطت
   * البناء. وهي ثوابت: جنسية فانخيو لن تتغيّر. فنكتبها مع البطاقة، ولا يبقى
   * لـ`npm run backfill` إلا إصلاح ملفات قديمة كُتبت قبل هذا.
   */
  name: string;
  nameEn: string;
  nationality: string;
  countryCode: string;
  active: boolean;
}

/** فرق السائق — تُطلب فقط حين تفشل صورته، فلا ندفع طلباً لمن وجدنا صورته. */
async function mainConstructor(driverId: string): Promise<string | null> {
  try {
    const response = await fetch(
      `${BASE}/drivers/${encodeURIComponent(driverId)}/constructors/?format=json&limit=30`,
      { headers: UA, signal: AbortSignal.timeout(20_000) },
    );
    if (!response.ok) return null;

    const list = (await response.json())?.MRData?.ConstructorTable?.Constructors ?? [];
    return list[list.length - 1]?.name ?? null;
  } catch {
    return null;
  }
}

async function loadCards(file: string): Promise<Map<string, DriverCard>> {
  try {
    const rows = JSON.parse(await fs.readFile(file, 'utf8')) as DriverCard[];
    return new Map(rows.map((row) => [row.id, row]));
  } catch {
    return new Map();
  }
}

async function saveCards(file: string, cards: Map<string, DriverCard>): Promise<void> {
  const rows = [...cards.values()].sort((a, b) => a.id.localeCompare(b.id));
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(rows, null, 2)}\n`, 'utf8');
}

function flag(kind: DriverImageKind | null): string {
  if (kind === 'portrait') return '●';
  if (kind === 'commons') return '○';
  if (kind === 'team') return '▤';
  return '·';
}

async function main(): Promise<void> {
  // تشغيلة واحدة فقط — تشغيلتان تكتبان الملف نفسه تمحو إحداهما الأخرى
  const release = await acquireLock('sync-drivers');
  try {
    await run();
  } finally {
    await release();
  }
}

async function run(): Promise<void> {
  const argv = process.argv;
  const limitArg = argv.indexOf('--limit');
  const onlyArg = argv.indexOf('--only');
  const retry = argv.includes('--retry');
  // إعادة الاختيار من الصفر: تتخطّى الملف المحفوظ وتنزّل فوقه
  const force = argv.includes('--force') || onlyArg > -1;

  const limit = limitArg > -1 ? Number(argv[limitArg + 1]) : Infinity;
  const only = onlyArg > -1 ? new Set(argv[onlyArg + 1].split(',')) : null;

  const file = path.join(process.cwd(), 'src', 'data', 'driver-cards.json');
  const cards = await loadCards(file);

  console.log('▶ صور السائقين\n');

  const drivers = await listAllDrivers();
  console.log(`سائقون      : ${drivers.length}`);
  console.log(`محفوظ مسبقاً : ${cards.size}`);

  const pending = drivers.filter((driver) => {
    if (only) return only.has(driver.id);
    // ⚠️ --force يعني إعادة **الاختيار** لا إعادة التنزيل وحدها. كان يضبط
    // `overwrite` فقط، فمرّت التشغيلة على 881 بطاقة وقالت «لا جديد».
    if (force) return true;
    const card = cards.get(driver.id);
    if (!card) return true;
    // بطاقة بلا صورة: نعيدها فقط عند --retry، وإلا مررنا 700 فاشل كل مرة
    return retry && !card.image;
  });

  const queue = pending.slice(0, limit);
  console.log(`سيُعالج     : ${queue.length}\n`);

  if (queue.length === 0) {
    console.log('✓ لا جديد.');
    return;
  }

  const usedImages = new Set(
    [...cards.values()].map((card) => card.image).filter((url): url is string => url !== null),
  );

  let processed = 0;

  for (const driver of queue) {
    let image: string | null = null;
    let credit: ImageCredit | null = null;
    let kind: DriverImageKind | null = null;
    let team: string | null = null;

    const portrait = await findDriverPortrait(driver.nameEn, driver.wikipediaUrl, [...usedImages]);

    if (portrait) {
      image = portrait.url;
      credit = portrait.credit;
      kind = portrait.kind;
    } else {
      // لا صورة له — نعرض فريقه بدل مربّع فارغ
      const constructor = await mainConstructor(driver.id);
      const fallback = constructor ? await findConstructorImage(constructor) : null;

      if (fallback) {
        image = fallback.url;
        credit = fallback.credit;
        kind = 'team';
        team = constructor;
      }
    }

    if (image) {
      // الرابط مضبوط العرض أصلاً من طبقة الصور — لا نعيد كتابته هنا
      usedImages.add(image);
      const local = await downloadAsset(image, 'drivers', driver.id, { overwrite: force });
      // فشل التنزيل يعني لا ملف محلياً — البطاقة بلا صورة أصدق من رابط مكسور
      image = local;
      if (!local) {
        credit = null;
        kind = null;
        team = null;
      }
    }

    cards.set(driver.id, {
      id: driver.id,
      image,
      imageCredit: credit,
      imageKind: kind,
      imageTeam: team,
      name: driver.name,
      nameEn: driver.nameEn,
      nationality: driver.nationality,
      countryCode: driver.countryCode,
      active: driver.active,
    });
    processed += 1;

    console.log(
      `  ${flag(kind)} ${driver.id.padEnd(22)} ${driver.nameEn.slice(0, 26).padEnd(27)}` +
        `${team ? `(فريق: ${team})` : ''}`,
    );

    if (processed % SAVE_EVERY === 0) await saveCards(file, cards);
    await sleep(350);
  }

  await saveCards(file, cards);

  // أعلام الجنسيات — الشبكة تعرضها تحت كل اسم
  const codes = [...new Set(drivers.map((driver) => driver.countryCode).filter(Boolean))];
  const flags = await Promise.all(codes.map((code) => downloadFlag(code)));

  const all = [...cards.values()];
  const withImage = all.filter((card) => card.image).length;

  console.log('\n── الخلاصة ─────────────────────');
  console.log(`بطاقات      : ${all.length} / ${drivers.length}`);
  console.log(
    `بصورة       : ${withImage}  ` +
      `(● بطاقة ${all.filter((c) => c.imageKind === 'portrait').length}` +
      ` · ○ كومنز ${all.filter((c) => c.imageKind === 'commons').length}` +
      ` · ▤ فريق ${all.filter((c) => c.imageKind === 'team').length})`,
  );
  console.log(`بلا صورة    : ${all.length - withImage}`);
  console.log(`أعلام       : ${flags.filter(Boolean).length}/${codes.length}`);

  const remaining = drivers.filter((driver) => !cards.has(driver.id)).length;
  if (remaining > 0) console.log(`\nيبقى ${remaining} — أعد التشغيل: npm run sync:drivers`);
}

main().catch((error) => {
  console.error('\n✗ فشلت المزامنة:', error instanceof Error ? error.message : error);
  process.exit(1);
});
