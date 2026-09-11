import type { ImageCredit } from '@/lib/types';

/**
 * سطر نسبة الصورة.
 *
 * ليس زينة: تراخيص المشاع الإبداعي تشترط ذكر المصوّر والترخيص، والاتفاقيات
 * مع الناشرين تشترط ذكر الناشر. لذلك يُعرض دائماً متى وُجدت صورة، ولا يمكن
 * إخفاؤه من الواجهة.
 */
export function ImageCreditLine({
  credit,
  className = '',
}: {
  credit: ImageCredit;
  className?: string;
}) {
  const name = credit.author === credit.source ? credit.author : `${credit.author} / ${credit.source}`;

  return (
    <p className={`text-[0.68rem] leading-relaxed text-subtle ${className}`} dir="auto">
      صورة:{' '}
      {credit.sourceUrl ? (
        <a
          href={credit.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="underline-offset-2 hover:text-muted hover:underline"
        >
          {name}
        </a>
      ) : (
        <span>{name}</span>
      )}
      {credit.license && <span className="text-subtle/80"> — {credit.license}</span>}
    </p>
  );
}
