/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';

import { driverDisplayName } from '@/lib/data/driver-records';

/**
 * بطاقة رقم قياسي مفرد — سائق واحد، حدث واحد، لا قائمة.
 *
 * «أصغر فائز» أو «أطول سلسلة انتصارات» ليست مقارنة بين عشرة — هي حقيقة
 * واحدة تستحقّ مساحة أكبر من سطر في جدول: صورة أكبر، رقم أكبر، وسياق الحدث
 * (السباق، الموسم) الذي يجعله موثوقاً لا مجرّد رقم.
 */
export function RecordHighlight({
  label,
  driverId,
  nameEn,
  value,
  context,
}: {
  label: string;
  driverId: string;
  nameEn: string;
  /** الرقم بصيغته النهائية — «١٨ سنة و٦٩ يوماً»، «١٠ سباقات». */
  value: string;
  /** سطر السياق: السباق أو الموسم. */
  context: string;
}) {
  const { name, image } = driverDisplayName(driverId, nameEn);

  return (
    <Link
      href={`/drivers/${driverId}`}
      className="group flex items-center gap-4 rounded-[var(--radius-card)] border border-line bg-surface p-4 transition-colors hover:border-line-strong"
    >
      {image ? (
        <img
          src={image}
          alt=""
          className="size-14 shrink-0 rounded-xl border border-line object-cover"
        />
      ) : (
        <span className="size-14 shrink-0 rounded-xl border border-line bg-bg" />
      )}

      <div className="min-w-0 flex-1">
        <p className="text-[0.7rem] text-subtle">{label}</p>
        <p className="mt-0.5 truncate font-bold transition-colors group-hover:text-red">{name}</p>
        <p className="tnum mt-1 font-display text-xl font-bold text-red" dir="ltr">
          {value}
        </p>
        <p className="mt-0.5 truncate text-[0.7rem] text-subtle">{context}</p>
      </div>
    </Link>
  );
}
