import Link from "next/link";
import { categoryLabel } from "@/lib/config/site";
import { relativeTime } from "@/lib/format";
import type { Article } from "@/lib/data/types";

/**
 * بطاقة خبر.
 * variant="lead" للخبر الرئيسي، "default" للشبكة، "compact" للأعمدة الجانبية.
 */
export default function NewsCard({
  article,
  variant = "default",
}: {
  article: Article;
  variant?: "lead" | "default" | "compact";
}) {
  const href = `/a/${article.slug}`;

  if (variant === "compact") {
    return (
      <article className="group border-b border-border pb-3 last:border-0">
        <Link href={href} className="block">
          <h3 className="font-display text-[15px] font-bold leading-snug transition-colors group-hover:text-accent">
            {article.title}
          </h3>
          <p className="mt-1.5 text-xs text-text-faint">{relativeTime(article.publishedAt)}</p>
        </Link>
      </article>
    );
  }

  const lead = variant === "lead";

  return (
    <article className="card group overflow-hidden">
      <Link href={href} className="flex h-full flex-col">
        <div
          className={`relative overflow-hidden bg-surface-2 ${lead ? "aspect-[16/9]" : "aspect-[16/10]"}`}
        >
          {article.heroImage ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={article.heroImage.url}
              alt={article.heroImage.alt}
              loading={lead ? "eager" : "lazy"}
              decoding="async"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            /* لا صورة: نمط العلم المنقّط بدل مربع رمادي فارغ */
            <div
              aria-hidden
              className="h-full w-full opacity-[0.07]"
              style={{
                backgroundImage:
                  "conic-gradient(from 90deg at 50% 50%, var(--text) 25%, transparent 0 50%, var(--text) 0 75%, transparent 0)",
                backgroundSize: "22px 22px",
              }}
            />
          )}
          <span className="absolute top-3 start-3 rounded bg-bg/85 px-2 py-1 text-[11px] font-bold text-accent backdrop-blur">
            {categoryLabel(article.category)}
          </span>
        </div>

        <div className={`flex flex-1 flex-col p-4 ${lead ? "sm:p-5" : ""}`}>
          <h3
            className={`font-display font-bold leading-snug transition-colors group-hover:text-accent ${
              lead ? "text-[22px] sm:text-[26px]" : "text-[17px]"
            }`}
          >
            {article.title}
          </h3>
          <p
            className={`mt-2 text-text-dim ${lead ? "text-[15px]" : "line-clamp-2 text-sm"}`}
          >
            {article.excerpt}
          </p>

          <div className="mt-auto flex items-center gap-2 pt-4 text-xs text-text-faint">
            <time dateTime={article.publishedAt}>{relativeTime(article.publishedAt)}</time>
            <span aria-hidden>·</span>
            <span className="numeric">{article.readingMinutes}</span>
            <span>دقائق قراءة</span>
          </div>
        </div>
      </Link>
    </article>
  );
}
