/**
 * قراءة ادّعاءات ويكي بيانات — **مع احترام وحدة القياس**.
 *
 * ⚠️ هذا الملف وُلد من خطأ ظاهر على الصفحة. كان القارئ السابق يفعل
 * `Math.round(Number(amount))` ويتجاهل الوحدة، فظهر طول حلبة أديلايد
 * «0.004 كم». السبب أن ويكي بيانات تخزّن الأطوال بوحدتين:
 *
 *   مونزا    → `{ amount: "+5793",  unit: Q11573  }`  ← متر
 *   أديلايد  → `{ amount: "+3.780", unit: Q828224 }`  ← كيلومتر
 *
 * فصار 3.780 كم يُقرَّب إلى «4 متر». والتقريب قبل التحويل أتلف الرقم فلم
 * يعد ممكناً استرجاعه من الملف — لذلك يُعاد جلبه لا يُصلَح حسابياً.
 *
 * القاعدة: **حوِّل أولاً، وقرِّب أخيراً.**
 */

/** معرّفات وحدات الطول في ويكي بيانات ← معاملها بالمتر. */
const LENGTH_UNITS: Record<string, number> = {
  Q11573: 1, // متر
  Q828224: 1_000, // كيلومتر
  Q253276: 1_609.344, // ميل
  Q3710: 0.3048, // قدم
  Q174728: 0.01, // سنتيمتر
};

export interface Claim {
  mainsnak: { datavalue?: { value?: unknown } };
}

export interface Entity {
  claims?: Record<string, Claim[]>;
}

interface QuantityValue {
  amount?: string;
  unit?: string;
}

function quantity(entity: Entity | null, property: string): QuantityValue | null {
  const value = entity?.claims?.[property]?.[0]?.mainsnak?.datavalue?.value as
    | QuantityValue
    | undefined;
  return value?.amount ? value : null;
}

/** رقم بلا وحدة — للعدّ المجرّد مثل عدد المنعطفات. */
export function claimCount(entity: Entity | null, property: string): number | null {
  const value = quantity(entity, property);
  if (!value) return null;
  const parsed = Number(value.amount);
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
}

/**
 * طول بالمتر، محوَّلاً من وحدته الأصلية.
 *
 * الوحدة المجهولة تعني أننا لا نعرف ما نقرأ — فنعيد null بدل تخمينٍ يضع رقماً
 * خاطئاً على الصفحة. الغياب أصدق من الخطأ.
 */
export function claimLengthMeters(entity: Entity | null, property: string): number | null {
  const value = quantity(entity, property);
  if (!value) return null;

  const amount = Number(value.amount);
  if (!Number.isFinite(amount)) return null;

  const unitId = value.unit?.split('/').pop() ?? '';
  const factor = LENGTH_UNITS[unitId];
  if (!factor) return null;

  return Math.round(amount * factor);
}

/** سنة من ادّعاء زمني. */
export function claimYear(entity: Entity | null, property: string): number | null {
  const value = entity?.claims?.[property]?.[0]?.mainsnak?.datavalue?.value as
    | { time?: string }
    | undefined;
  const match = value?.time?.match(/(\d{4})/);
  return match ? Number(match[1]) : null;
}
