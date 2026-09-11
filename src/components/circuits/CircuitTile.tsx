import Image from 'next/image';
import Link from 'next/link';

import { Flag } from '@/components/site/Flag';

/**
 * أقلّ ما تحتاجه البطاقة — لا `CircuitSummary` كاملاً.
 *
 * الشبكة تُبنى من `circuits.json` لا من نداء حيّ (انظر `lib/data/cards.ts`)،
 * وطلبُ نوعٍ يحمل الإحداثيات وسنة الافتتاح كان يجبر الصفحة على العودة إلى
 * الواجهة لملء حقول لا تُعرض أصلاً. و`CircuitSummary` يحقّق هذا الشكل بنيوياً
 * فيمرّ كما هو حيث يتوفّر.
 */
export interface TileCircuit {
  id: string;
  name: string;
  country: string;
  countryCode: string;
  active: boolean;
}

/**
 * مربّع حلبة في الشبكة.
 *
 * الصورة من ويكيميديا بترخيص حر — لوجوهات الحلبات الرسمية محمية بعلامات
 * تجارية ولا تُستخدم. مقاس ثابت 4:3 حتى تبقى الشبكة منتظمة مهما اختلفت
 * أبعاد الصور الأصلية.
 */
export function CircuitTile({
  circuit,
  image,
  raceCount,
}: {
  circuit: TileCircuit;
  image: string | null;
  raceCount?: number;
}) {
  return (
    <Link
      href={`/circuits/${circuit.id}`}
      className="group relative flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface transition-all duration-300 hover:border-line-strong hover:shadow-[var(--shadow-card)]"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface-2">
        {/*
          الصورة أولاً — والمخطّط المولَّد معطَّل.

          ⚠️ جرّبنا توليد مخططات موحّدة من هندسة OpenStreetMap. الفكرة صحيحة
          والنتيجة لم تكن: **ستّة عشر من ستّة وستّين** خرجت بمسار غير مغلق —
          ومنها ألبرت بارك وزاندفورت وسيلفرستون وجدة، أي أكثر حلبات الموسم
          زيارةً. سبب ذلك أن OSM يجزّئ المسار مقاطعَ لا تلتقي أطرافها دائماً،
          فيخرج الشكل ناقصاً أو متقطّعاً.

          مخطّط ناقص أسوأ من صورة غير موحّدة: الصورة تُرى فتُفهم، والمخطّط
          الناقص يبدو خطأً. الملفات والمولّد باقيان على القرص
          (`npm run sync:layouts`) — يُعاد تشغيلهما متى صار الوصل موثوقاً.
        */}
        {image ? (
          <Image
            src={image}
            alt={circuit.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 240px"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <span className="grid-bg absolute inset-0 opacity-50" />
        )}

        {circuit.active && (
          <span className="absolute end-2 top-2 rounded-md bg-red px-2 py-0.5 text-[0.62rem] font-bold text-white">
            هذا الموسم
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-3.5">
        <h3 className="text-sm leading-snug font-bold transition-colors group-hover:text-red">
          {circuit.name}
        </h3>

        <p className="mt-1.5 flex items-center gap-1.5 text-xs text-subtle">
          <Flag code={circuit.countryCode} />
          <span className="truncate">{circuit.country}</span>
        </p>

        {raceCount !== undefined && raceCount > 0 && (
          <p className="tnum mt-auto pt-2.5 text-[0.68rem] text-subtle">{raceCount} سباقاً</p>
        )}
      </div>
    </Link>
  );
}
