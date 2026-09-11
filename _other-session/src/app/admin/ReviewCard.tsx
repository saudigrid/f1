"use client";

import { useState, useTransition } from "react";
import { updateStatus } from "./actions";
import { categoryLabel } from "@/lib/config/site";
import { relativeTime } from "@/lib/format";
import type { Article } from "@/lib/data/types";

const VERDICT_LABELS: Record<string, string> = {
  verified: "مؤكد",
  partially_verified: "مؤكد جزئياً",
  unverified: "غير مؤكد",
  contradicted: "متناقض",
};

const CLAIM_STYLES: Record<string, string> = {
  supported: "text-ok",
  unsupported: "text-warn",
  contradicted: "text-accent",
};

/** لون درجة الثقة — أخضر فوق 88، أصفر فوق 65، أحمر تحتها. */
function confidenceColor(value: number): string {
  if (value >= 88) return "var(--ok)";
  if (value >= 65) return "var(--warn)";
  return "var(--accent)";
}

export default function ReviewCard({ article }: { article: Article }) {
  const [expanded, setExpanded] = useState(false);
  const [pending, startTransition] = useTransition();
  const report = article.internal?.factCheck;

  function act(status: "published" | "rejected") {
    startTransition(() => {
      void updateStatus(article.id, status);
    });
  }

  return (
    <article className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded bg-surface-2 px-2 py-0.5 text-text-dim">
              {categoryLabel(article.category)}
            </span>
            <span className="text-text-faint">{relativeTime(article.publishedAt)}</span>
            <span className="text-text-faint">
              · <span className="numeric">{article.sources.length}</span> مصادر
            </span>
          </div>
          <h2 className="font-display text-lg font-bold leading-snug">{article.title}</h2>
          <p className="mt-1.5 text-sm text-text-dim">{article.excerpt}</p>
        </div>

        {report && (
          <div className="shrink-0 text-center">
            <div
              className="numeric text-3xl font-bold leading-none"
              style={{ color: confidenceColor(report.confidence) }}
            >
              {report.confidence}
            </div>
            <div className="mt-1 text-[10px] text-text-faint">
              {VERDICT_LABELS[report.verdict] ?? report.verdict}
            </div>
          </div>
        )}
      </div>

      {report && report.editorNotes.length > 0 && (
        <ul className="mt-4 space-y-1.5 rounded border border-warn/30 bg-warn/5 p-3 text-sm">
          {report.editorNotes.map((note, i) => (
            <li key={i} className="text-text-dim">
              • {note}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => act("published")}
          disabled={pending}
          className="rounded bg-accent px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
        >
          نشر
        </button>
        <button
          type="button"
          onClick={() => act("rejected")}
          disabled={pending}
          className="rounded border border-border-strong px-4 py-2 text-sm font-bold disabled:opacity-50"
        >
          رفض
        </button>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="rounded border border-border px-4 py-2 text-sm text-text-dim"
          aria-expanded={expanded}
        >
          {expanded ? "إخفاء التفاصيل" : "عرض المتن وتقرير التدقيق"}
        </button>
      </div>

      {expanded && (
        <div className="mt-5 space-y-5 border-t border-border pt-5">
          <section>
            <h3 className="mb-2 font-display text-sm font-bold text-text-dim">المتن</h3>
            <div className="prose-ar max-w-none text-sm">
              {article.body
                .split(/\n{2,}/)
                .filter(Boolean)
                .map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
            </div>
          </section>

          {report && (
            <section>
              <h3 className="mb-2 font-display text-sm font-bold text-text-dim">
                تقرير التدقيق ({report.model})
              </h3>
              <ul className="space-y-2 text-sm">
                {report.claims.map((claim, i) => (
                  <li key={i} className="rounded border border-border p-2.5">
                    <p className="font-medium">{claim.claim}</p>
                    <p className={`mt-1 text-xs ${CLAIM_STYLES[claim.status] ?? ""}`}>
                      {claim.status} — {claim.note}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <h3 className="mb-2 font-display text-sm font-bold text-text-dim">المصادر</h3>
            <ul className="space-y-1 text-sm">
              {article.sources.map((s) => (
                <li key={s.url}>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent-soft underline underline-offset-4"
                  >
                    {s.outlet}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </article>
  );
}
