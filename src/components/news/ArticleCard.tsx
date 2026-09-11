import Image from 'next/image';
import Link from 'next/link';

import { formatRelative } from '@/lib/format';
import { CATEGORY_LABELS, type PublicArticle } from '@/lib/types';

/** زاوية كسحة الضوء في البطاقات بلا صورة — ثابتة لكل خبر ومختلفة بينها. */
function sweepAngle(id: string): number {
  let sum = 0;
  for (let i = 0; i < id.length; i += 1) sum += id.charCodeAt(i);
  return 96 + (sum % 5) * 12; // بين 96 و 144 درجة
}

/**
 * بطاقة خبر.
 *
 * `featured` تكبّر البطاقة الأولى في الشبكة — تسلسل بصري يخبر القارئ
 * بأهم خبر دون كلمة «حصري» ولا لون صارخ.
 */
export function ArticleCard({
  article,
  featured = false,
  priority = false,
}: {
  article: PublicArticle;
  featured?: boolean;
  priority?: boolean;
}) {
  return (
    <article
      className={`group relative flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface transition-all duration-300 hover:border-line-strong hover:shadow-[var(--shadow-card)] ${
        featured ? 'sm:col-span-2 sm:row-span-2' : ''
      }`}
    >
      <div
        className={`relative w-full shrink-0 overflow-hidden bg-surface-2 ${
          featured ? 'aspect-[16/9]' : 'aspect-[16/10]'
        }`}
      >
        {article.heroImage ? (
          <Image
            src={article.heroImage}
            alt={article.heroImageAlt}
            fill
            priority={priority}
            sizes={featured ? '(max-width: 640px) 100vw, 60vw' : '(max-width: 640px) 100vw, 30vw'}
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          /* لا صورة بعد: خلفية هوية هادئة — شبكة مضمار + كسحة ضوء حمراء
             مائلة. تعمّدنا ألا نستعمل النمط الشطرنجي بملء المساحة لأنه
             يُقرأ كـ«صورة مفقودة» لا كعلامة. زاوية الكسحة تتغيّر حسب معرّف
             الخبر فلا تبدو البطاقات نسخاً مكرّرة من بعضها. */
          <div className="absolute inset-0 bg-surface-2">
            <span className="grid-bg absolute inset-0 opacity-50" />
            <span
              className="absolute inset-0 opacity-55"
              style={{
                backgroundImage: `linear-gradient(${sweepAngle(article.id)}deg, transparent 40%, var(--red-glow) 52%, transparent 64%)`,
              }}
            />
            <span className="absolute inset-y-0 start-0 w-[3px] bg-gradient-to-b from-red to-transparent" />
          </div>
        )}

        <span className="absolute start-3 top-3 rounded-md bg-bg/80 px-2 py-1 text-[0.68rem] font-semibold text-red backdrop-blur-sm">
          {CATEGORY_LABELS[article.category]}
        </span>

        {/* نسبة مختصرة على البطاقة؛ السطر الكامل بالترخيص في صفحة الخبر */}
        {article.heroImageCredit && (
          <span className="absolute end-2 bottom-2 rounded bg-bg/70 px-1.5 py-0.5 text-[0.6rem] text-subtle backdrop-blur-sm">
            {article.heroImageCredit.source}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <h3
          className={`font-bold text-balance transition-colors group-hover:text-red ${
            featured ? 'text-xl sm:text-2xl' : 'text-base sm:text-[1.05rem]'
          }`}
        >
          {/* الرابط يغطي البطاقة كلها — مساحة لمس أكبر على الجوال */}
          <Link href={`/news/${article.slug}`} className="after:absolute after:inset-0">
            {article.title}
          </Link>
        </h3>

        <p
          className={`mt-2 leading-relaxed text-muted ${
            featured ? 'text-[0.95rem]' : 'line-clamp-2 text-sm'
          }`}
        >
          {article.excerpt}
        </p>

        <div className="mt-auto flex items-center gap-2 pt-4 text-xs text-subtle">
          <time dateTime={article.publishedAt}>{formatRelative(article.publishedAt)}</time>
          <span aria-hidden="true">•</span>
          <span>{article.readingMinutes} دقائق قراءة</span>
        </div>
      </div>
    </article>
  );
}
