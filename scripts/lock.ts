import { promises as fs } from 'node:fs';
import path from 'node:path';

/**
 * قفل تشغيلة واحدة لكل سكربت مزامنة طويل.
 *
 * ⚠️ ليس احتياطاً نظرياً. حدث فعلاً: أوقفتُ مزامنة صور السائقين وأطلقتُ بديلة،
 * فتبيّن أن إيقاف الأمر قتل غلاف npm وترك عملية node حيّة. صارت تشغيلتان
 * تكتبان `driver-cards.json` معاً، كلٌّ من نسختها في الذاكرة، فتمحو الأخيرةُ
 * عملَ الأولى: 148 سائقاً في السجلّ و60 فقط في الملف.
 *
 * القفل يحمل رقم العملية. إن وُجد ورقمه لعملية **حيّة** رفضنا البدء؛ وإن كان
 * لعملية ميتة (انقطاع كهرباء، قتل قسري) اعتبرناه متروكاً وتجاوزناه — فالقفل
 * الأبدي أسوأ من غيابه.
 */

function isRunning(pid: number): boolean {
  try {
    // الإشارة 0 لا تقتل شيئاً — تسأل فقط: هل هذه العملية موجودة؟
    process.kill(pid, 0);
    return true;
  } catch (error) {
    // EPERM يعني موجودة لكن لا صلاحية عليها — أي أنها حيّة
    return (error as NodeJS.ErrnoException).code === 'EPERM';
  }
}

/** يحجز القفل ويعيد دالة تحريره. يرمي إن كانت تشغيلة أخرى حيّة. */
export async function acquireLock(name: string): Promise<() => Promise<void>> {
  const file = path.join(process.cwd(), '.cache', `${name}.lock`);
  await fs.mkdir(path.dirname(file), { recursive: true });

  try {
    const held = Number(await fs.readFile(file, 'utf8'));
    if (Number.isInteger(held) && held !== process.pid && isRunning(held)) {
      throw new Error(
        `تشغيلة أخرى من «${name}» تعمل الآن (العملية ${held}).\n` +
          `   انتظر انتهاءها، أو أوقفها ثم احذف ${file}`,
      );
    }
  } catch (error) {
    // الملف غير موجود = لا قفل. أي خطأ آخر (ومنه رفضنا أعلاه) يُرفع
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }

  await fs.writeFile(file, String(process.pid), 'utf8');

  const release = async () => {
    await fs.rm(file, { force: true });
  };

  // القتل بـSIGINT/SIGTERM لا يمرّ بـfinally — نحرّر القفل صراحةً
  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.once(signal, () => {
      void release().finally(() => process.exit(130));
    });
  }

  return release;
}
