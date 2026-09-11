'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { LOCKOUT_MINUTES, isAdmin, isLockedOut, signIn, signOut } from '@/lib/admin/auth';
import { getRepository } from '@/lib/data/repository';

/** إجراءات لوحة المراجعة. كلها تتحقق من الصلاحية قبل أي كتابة. */

export async function loginAction(_prev: string | null, formData: FormData): Promise<string | null> {
  const password = String(formData.get('password') ?? '');

  /**
   * مصدر الطلب لخنق التخمين.
   *
   * ⚠️ `x-forwarded-for` يضعه الوسيط ويمكن للعميل تزويره. على Vercel تُعاد
   * كتابته فيصير موثوقاً، ولذلك نقدّم رأس Vercel الخاص عليه. والأسوأ حالاً
   * — مهاجم يزوّر عنواناً مختلفاً في كل محاولة — يعود بنا إلى ما كنّا عليه
   * قبل الخنق، فالإضافة لا تُضعف شيئاً في أي حال.
   */
  const headerBag = await headers();
  const ip =
    headerBag.get('x-vercel-forwarded-for') ??
    headerBag.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    '';

  if (isLockedOut(ip)) {
    return `محاولات كثيرة. انتظر ${LOCKOUT_MINUTES} دقيقة ثم أعد المحاولة.`;
  }

  if (!(await signIn(password, ip))) return 'كلمة المرور غير صحيحة.';

  // ضبط الكوكي وحده لا يُعيد بناء الصفحة — التوجيه هو ما يجعل الخادم
  // يعيد تقييم isAdmin() ويعرض طابور المراجعة بدل نموذج الدخول
  redirect('/admin');
}

export async function logoutAction(): Promise<void> {
  await signOut();
  revalidatePath('/admin');
}

export async function approveAction(formData: FormData): Promise<void> {
  if (!(await isAdmin())) throw new Error('غير مصرّح.');

  const id = String(formData.get('id') ?? '');
  if (!id) return;

  const repo = await getRepository();
  await repo.setStatus(id, 'published', true);

  // الصفحات المتأثرة تُبنى من جديد فور الموافقة
  revalidatePath('/admin');
  revalidatePath('/news');
  revalidatePath('/');
}

export async function rejectAction(formData: FormData): Promise<void> {
  if (!(await isAdmin())) throw new Error('غير مصرّح.');

  const id = String(formData.get('id') ?? '');
  if (!id) return;

  const repo = await getRepository();
  await repo.setStatus(id, 'rejected', true);

  revalidatePath('/admin');
}
