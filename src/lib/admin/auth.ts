import 'server-only';

import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

/**
 * حماية لوحة المراجعة.
 *
 * كلمة المرور نفسها لا تُخزَّن في الكوكي — نخزّن بصمة HMAC مشتقة منها.
 * تكفي لموقع بمحرّر واحد. إذا صار للموقع فريق تحرير، انقل هذا إلى
 * Supabase Auth بدل توسيع هذه الآلية.
 */

const COOKIE = 'sfg-admin';

function fingerprint(password: string): string {
  return createHmac('sha256', password).update('saudi-f1-grid-admin').digest('hex');
}

function equal(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  // timingSafeEqual يرمي استثناءً عند اختلاف الطول، فنفحص الطول أولاً
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

export const adminConfigured = Boolean(process.env.ADMIN_PASSWORD);

/**
 * خنق محاولات الدخول.
 *
 * المقارنة ثابتة الزمن تمنع تسريب الكلمة **حرفاً حرفاً**، لكنها لا تمنع
 * تجريب مليون كلمة. وكلمة المرور هنا يختارها المشغّل بلا شرط تعقيد، فالتخمين
 * المتكرّر هو الهجوم الواقعي الوحيد على هذه اللوحة.
 *
 * ⚠️ الذاكرة تكفي هنا ولا تكفي في كل مكان: على Vercel لكل نسخة خادم ذاكرتها،
 * فالخنق لكل نسخة لا للتطبيق كله. هذا يبطئ المهاجم كثيراً ولا يوقفه نظرياً.
 * إن صار للوحة أكثر من محرّر أو تعرّضت لهجوم حقيقي، انقل العدّاد إلى مخزن
 * مشترك (Vercel KV أو Upstash) — الواجهة هنا لا تتغيّر.
 */
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

const attempts = new Map<string, { count: number; firstAt: number }>();

function throttleKey(ip: string): string {
  return ip || 'unknown';
}

/** هل استُنفدت المحاولات لهذا المصدر؟ */
export function isLockedOut(ip: string): boolean {
  const entry = attempts.get(throttleKey(ip));
  if (!entry) return false;

  if (Date.now() - entry.firstAt > WINDOW_MS) {
    attempts.delete(throttleKey(ip));
    return false;
  }
  return entry.count >= MAX_ATTEMPTS;
}

function recordFailure(ip: string): void {
  const key = throttleKey(ip);
  const entry = attempts.get(key);

  if (!entry || Date.now() - entry.firstAt > WINDOW_MS) {
    attempts.set(key, { count: 1, firstAt: Date.now() });
    return;
  }
  entry.count += 1;

  /**
   * تنظيف كسول للمداخل المنتهية.
   *
   * بلا هذا تنمو الخريطة بلا حدّ مع كل عنوان يحاول مرة — وهو تسريب ذاكرة
   * بطيء يتحوّل إلى وسيلة إنهاك للخادم نفسه.
   */
  if (attempts.size > 1_000) {
    const cutoff = Date.now() - WINDOW_MS;
    for (const [id, value] of attempts) {
      if (value.firstAt < cutoff) attempts.delete(id);
    }
  }
}

export const LOCKOUT_MINUTES = WINDOW_MS / 60_000;

export async function isAdmin(): Promise<boolean> {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return false;

  const token = (await cookies()).get(COOKIE)?.value;
  return Boolean(token) && equal(token as string, fingerprint(password));
}

export async function signIn(attempt: string, ip = ''): Promise<boolean> {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return false;

  // مُقفَل: لا نقارن أصلاً، فلا نمنح المهاجم حتى إشارة زمنية
  if (isLockedOut(ip)) return false;

  if (!equal(attempt, password)) {
    recordFailure(ip);
    return false;
  }

  // نجاح: نمسح العدّاد فلا يُعاقَب المحرّر على أخطائه السابقة
  attempts.delete(throttleKey(ip));

  (await cookies()).set(COOKIE, fingerprint(password), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 12,
  });
  return true;
}

export async function signOut(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

/**
 * مقارنة نصّين بزمن ثابت — تُستعمل خارج لوحة المراجعة أيضاً.
 *
 * تُصدَّر من هنا لأن التطبيق كان يملك النمط الصحيح في ملف واحد ويستعمل `!==`
 * في ملف آخر. وجود نسخة واحدة مشتركة يمنع تكرار ذلك الانقسام.
 */
export function timingSafeEqualString(a: string, b: string): boolean {
  return equal(a, b);
}
