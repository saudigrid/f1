"use client";

import { useState, useTransition } from "react";
import { triggerPipeline } from "./actions";
import type { PipelineResult } from "@/lib/agents/pipeline";

/** زر تشغيل يدوي لخط الأتمتة — مفيد للاختبار قبل ضبط الـ Cron. */
export default function RunPipelineButton({ enabled }: { enabled: boolean }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<PipelineResult | null>(null);

  function run() {
    startTransition(async () => {
      setResult(await triggerPipeline());
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={run}
        disabled={pending || !enabled}
        title={enabled ? undefined : "اضبط ANTHROPIC_API_KEY أولاً"}
        className="rounded border border-border-strong px-4 py-2 text-sm font-bold transition-colors hover:border-accent hover:text-accent disabled:opacity-40"
      >
        {pending ? "جارٍ التشغيل…" : "تشغيل دورة أتمتة الآن"}
      </button>

      {result && (
        <div className="mt-4 rounded-lg border border-border bg-surface p-4 text-sm">
          <p className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-text-dim">
            <span>
              فُحص <span className="numeric font-bold text-text">{result.considered}</span>
            </span>
            <span>
              نُشر <span className="numeric font-bold text-ok">{result.published}</span>
            </span>
            <span>
              للمراجعة <span className="numeric font-bold text-warn">{result.queued}</span>
            </span>
            <span>
              مرفوض <span className="numeric font-bold">{result.rejected}</span>
            </span>
            <span>
              فشل <span className="numeric font-bold text-accent">{result.failed}</span>
            </span>
          </p>
          <ul className="space-y-1.5 text-xs">
            {result.log.map((entry, i) => (
              <li key={i} className="text-text-faint">
                <span className="text-text">{entry.title}</span> — {entry.reason}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
