/**
 * مزامنة بطاقات الحلبات — صورة ومقدّمة وحقائق منظّمة.
 *
 *   npm run sync:circuits
 *
 * يجمع من ثلاثة مصادر مفتوحة بلا مفاتيح:
 *   Jolpica    → قائمة الحلبات ورابط ويكيبيديا لكل واحدة
 *   Wikipedia  → صورة البطاقة + مقدّمة إنجليزية
 *   Wikidata   → الطول والمنعطفات وسنة الافتتاح والمصمّم
 *
 * يكتب src/data/circuits.json مرة واحدة، فتقرأه الصفحات بلا أي نداء وقت الطلب.
 * الحلبات لا تتغيّر إلا نادراً — شغّله عند تعديل حلبة أو انضمام جديدة.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';

import { downloadAsset, downloadFlag, sleep } from '@/lib/data/download';
import { findCircuitImage, type CircuitImageKind } from '@/lib/images/circuit-layout';
import { listCircuits } from '@/lib/data/history';
import {
  claimCount,
  claimLengthMeters,
  claimYear,
  type Entity,
} from '@/lib/data/wikidata';
import type { ImageCredit } from '@/lib/types';

const UA = { 'user-agent': 'SaudiF1Grid/1.0 (https://saudif1grid.com)' };

export interface CircuitCard {
  id: string;
  image: string | null;
  imageCredit: ImageCredit | null;
  /** نوع الصورة: مخطّط أم صورة أم لوجو — للعرض وللتشخيص. */
  imageKind: CircuitImageKind | null;
  /** المقدّمة الإنجليزية كما هي — تُعرَّب لاحقاً عبر طابور التعريب. */
  summaryEn: string | null;
  summaryAr: string | null;
  lengthMeters: number | null;
  turns: number | null;
  openedYear: number | null;
  designer: string | null;
  wikipediaUrl: string;
}

async function json<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url, { headers: UA, signal: AbortSignal.timeout(25_000) });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

/**
 * صور `upload.wikimedia.org/wikipedia/en/` رفع محلي بترخيص استخدام عادل — غير
 * حرة. الحرّ وحده ما كان تحت `/commons/`. نرفض ما عداه حتى لو كان أنسب بصرياً.
 */
function isFreelyLicensed(url: string): boolean {
  return url.includes('/wikipedia/commons/');
}

interface Summary {
  wikibase_item?: string;
  extract?: string;
  originalimage?: { source: string };
  thumbnail?: { source: string };
}

async function main(): Promise<void> {
  const circuits = await listCircuits();
  console.log(`▶ مزامنة ${circuits.length} حلبة…\n`);

  const cards: CircuitCard[] = [];
  const usedImages: string[] = [];

  for (const circuit of circuits) {
    const title = circuit.wikipediaUrl.split('/wiki/')[1];
    const summary = title
      ? await json<Summary>(`https://en.wikipedia.org/api/rest_v1/page/summary/${title}`)
      : null;

    /**
     * أولوية الصورة: مخطّط الحلبة أولاً، ثم صورة، ثم لوجو.
     *
     * المخطّط يميّز الحلبة فوراً ويوحّد شكل البطاقات الـ78. صورة ويكيبيديا في
     * البطاقة الجانبية غالباً مخطّط أصلاً، لكنها أحياناً صورة قمر صناعي —
     * فنبحث عن المخطّط صراحة بدل الاعتماد على الصدفة.
     */
    let image: string | null = null;
    let imageCredit: ImageCredit | null = null;
    let imageKind: CircuitImageKind | null = null;

    const found = await findCircuitImage(circuit.nameEn, usedImages);
    if (found) {
      image = found.url;
      imageCredit = found.credit;
      imageKind = found.kind;
    }

    // احتياطي أخير: صورة بطاقة ويكيبيديا إن كانت على كومنز (حرّة)
    if (!image) {
      const wikiImage = summary?.originalimage?.source ?? summary?.thumbnail?.source;
      if (wikiImage && isFreelyLicensed(wikiImage)) {
        image = wikiImage;
        imageKind = 'photo';
        imageCredit = {
          author: 'Wikimedia Commons',
          source: 'Wikimedia Commons',
          license: null,
          sourceUrl: circuit.wikipediaUrl,
        };
      }
    }

    if (image) {
      usedImages.push(image);
      const local = await downloadAsset(image, 'circuits', circuit.id, { width: 800 });
      if (local) image = local;
    }

    // ٣. الحقائق المنظّمة من ويكي بيانات
    const entityId = summary?.wikibase_item;
    const entity = entityId
      ? (
          await json<{ entities: Record<string, Entity> }>(
            `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${entityId}&props=claims&format=json`,
          )
        )?.entities?.[entityId] ?? null
      : null;

    cards.push({
      id: circuit.id,
      image,
      imageCredit,
      imageKind,
      summaryEn: summary?.extract ?? null,
      summaryAr: null,
      lengthMeters: claimLengthMeters(entity, 'P2043'),
      turns: claimCount(entity, 'P8626'),
      openedYear: claimYear(entity, 'P571'),
      designer: null,
      wikipediaUrl: circuit.wikipediaUrl,
    });

    // مهلة قصيرة بين الحلبات — وصول متسلسل مهذّب لا انفجار طلبات
    await sleep(400);

    const mark = imageKind === 'layout' ? '▣' : imageKind === 'photo' ? '▤' : imageKind === 'logo' ? '◆' : '·';
    console.log(`  ${mark} ${circuit.id.padEnd(18)} ${circuit.name.slice(0, 26)}`);
  }

  // أعلام الدول — ملفات محلية لأن ويندوز لا يرسم رموز الأعلام
  const codes = [...new Set(circuits.map((c) => c.countryCode).filter(Boolean))];
  const flags = await Promise.all(codes.map((code) => downloadFlag(code)));
  console.log(`\nأعلام: ${flags.filter(Boolean).length}/${codes.length}`);

  const file = path.join(process.cwd(), 'src', 'data', 'circuits.json');
  await fs.writeFile(file, `${JSON.stringify(cards, null, 2)}\n`, 'utf8');

  const withImage = cards.filter((c) => c.image).length;
  const layouts = cards.filter((c) => c.imageKind === 'layout').length;
  const photos = cards.filter((c) => c.imageKind === 'photo').length;
  const logos = cards.filter((c) => c.imageKind === 'logo').length;
  const withLength = cards.filter((c) => c.lengthMeters).length;
  const withSummary = cards.filter((c) => c.summaryEn).length;

  console.log('\n── الخلاصة ─────────────────────');
  console.log(`حلبات      : ${cards.length}`);
  console.log(`بصورة      : ${withImage}  (▣ مخطّط ${layouts} · ▤ صورة ${photos} · ◆ لوجو ${logos})`);
  console.log(`بطول مؤكَّد  : ${withLength}`);
  console.log(`بمقدّمة     : ${withSummary}`);
  console.log(`\nالمقدّمات إنجليزية — عرّبها بـ: npm run translate:circuits`);
}

main().catch((error) => {
  console.error('\n✗ فشلت المزامنة:', error instanceof Error ? error.message : error);
  process.exit(1);
});
