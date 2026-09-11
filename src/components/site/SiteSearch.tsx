/* eslint-disable @next/next/no-img-element */
'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';

import type { SearchEntry, SearchKind } from '@/lib/search/types';

/**
 * البحث العام — لوحة أوامر تفتح فوق أي صفحة.
 *
 * ## لماذا لوحة عائمة لا صفحة `/search`
 *
 * القارئ يعرف الاسم الذي يبحث عنه غالباً — «سينا»، «مونزا»، «برابهام» — وما
 * يريده رابط واحد لا نتائج مبعثرة. اللوحة تفتح فوق مكانه الحالي بلا فقد
 * للسياق، وتُغلق بـ Escape أو نقرة خارجها.
 *
 * ## لماذا الفهرس يُجلب لا يُستورد
 *
 * `public/search-index.json` يبنيه `scripts/build-search-index.ts` — 1146
 * سجلّاً، 148 كيلوبايت. استيراده في هذا المكوّن يُدخله حزمة **كل** صفحة؛
 * جلبه هنا يعني أن يدفع ثمنه من فتح البحث فقط، ومرّة واحدة (يبقى في
 * ذاكرة المتصفّح بعدها بفضل التخزين المؤقّت).
 *
 * ## الترتيب
 *
 * تطابق البداية أولاً («سين» تُخرج «سينا» قبل «حسين»)، ثم الاحتواء، وأبطال
 * العالم والفرق النشطة يُرفعون ضمن كل مستوى — فكتابة «فيراري» تُخرج الفريق
 * النشط قبل «فيراري 500» التاريخية.
 */

const LABELS: Record<SearchKind, string> = {
  driver: 'سائق',
  team: 'فريق',
  circuit: 'حلبة',
  era: 'حقبة',
};

const ICONS: Record<SearchKind, string> = {
  driver: '🏎️',
  team: '🛠️',
  circuit: '🏁',
  era: '📖',
};

function score(entry: SearchEntry, needle: string): number {
  const name = entry.n.toLowerCase();
  const nameEn = entry.e.toLowerCase();
  let base: number;

  if (name.startsWith(needle) || nameEn.startsWith(needle)) base = 0;
  else if (name.includes(needle) || nameEn.includes(needle)) base = 1;
  else if (entry.s?.toLowerCase().includes(needle)) base = 2;
  else return -1;

  return entry.p ? base - 0.5 : base;
}

export function SiteSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [entries, setEntries] = useState<SearchEntry[] | null>(null);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Ctrl+K أو / يفتح البحث من أي مكان في الموقع
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA';

      if ((event.key === 'k' && (event.metaKey || event.ctrlKey)) || (event.key === '/' && !typing)) {
        event.preventDefault();
        setOpen(true);
      } else if (event.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  // الفهرس يُجلب مرّة واحدة عند أول فتح — لا قبله
  useEffect(() => {
    if (!open || entries) return;
    fetch('/search-index.json')
      .then((response) => response.json())
      .then((data: SearchEntry[]) => setEntries(data))
      .catch(() => setEntries([]));
  }, [open, entries]);

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!entries || needle.length < 1) return [];

    return entries
      .map((entry) => ({ entry, rank: score(entry, needle) }))
      .filter((row) => row.rank >= 0)
      .sort((a, b) => a.rank - b.rank)
      .slice(0, 20)
      .map((row) => row.entry);
  }, [entries, query]);

  useEffect(() => setActive(0), [query]);

  const close = () => {
    setOpen(false);
    setQuery('');
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm text-subtle transition-colors hover:text-fg"
        aria-label="ابحث في الموقع"
      >
        <svg viewBox="0 0 24 24" className="size-[15px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" />
        </svg>
        <span className="hidden sm:inline">ابحث…</span>
        <kbd className="hidden rounded border border-line px-1.5 py-0.5 text-[0.65rem] text-subtle sm:inline" dir="ltr">
          Ctrl K
        </kbd>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 px-4 pt-[12vh] backdrop-blur-sm"
          onClick={close}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="البحث في الموقع"
            className="w-full max-w-xl overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-line px-4 py-3">
              <svg viewBox="0 0 24 24" className="size-4 shrink-0 text-subtle" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.3-4.3" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'ArrowDown') {
                    event.preventDefault();
                    setActive((value) => Math.min(value + 1, results.length - 1));
                  } else if (event.key === 'ArrowUp') {
                    event.preventDefault();
                    setActive((value) => Math.max(value - 1, 0));
                  } else if (event.key === 'Enter' && results[active]) {
                    window.location.href = results[active].h;
                  }
                }}
                placeholder="ابحث عن سائق، فريق، حلبة…"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-subtle"
              />
              <button
                type="button"
                onClick={close}
                className="shrink-0 rounded border border-line px-1.5 py-0.5 text-[0.65rem] text-subtle"
              >
                Esc
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-1.5">
              {!entries && (
                <p className="px-3 py-8 text-center text-sm text-subtle">جارٍ التحميل…</p>
              )}

              {entries && query.trim().length > 0 && results.length === 0 && (
                <p className="px-3 py-8 text-center text-sm text-subtle">لا نتائج لـ«{query}».</p>
              )}

              {entries && query.trim().length === 0 && (
                <p className="px-3 py-8 text-center text-sm text-subtle">
                  ابحث عن أي سائق أو فريق أو حلبة منذ 1950.
                </p>
              )}

              {results.map((entry, index) => (
                <Link
                  key={entry.h + entry.n}
                  href={entry.h}
                  onClick={close}
                  onMouseEnter={() => setActive(index)}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${
                    index === active ? 'bg-bg' : ''
                  }`}
                >
                  {entry.i ? (
                    <img
                      src={entry.i}
                      alt=""
                      className={`size-9 shrink-0 rounded-lg object-cover ${
                        entry.k === 'team' ? 'bg-white p-1 object-contain' : ''
                      }`}
                    />
                  ) : (
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-bg text-base">
                      {ICONS[entry.k]}
                    </span>
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{entry.n}</p>
                    <p className="truncate text-xs text-subtle" dir={entry.k === 'driver' || entry.k === 'circuit' ? 'rtl' : 'ltr'}>
                      {[entry.s, entry.e].filter(Boolean).join(' · ')}
                    </p>
                  </div>

                  <span className="shrink-0 rounded-md bg-bg px-2 py-1 text-[0.68rem] text-subtle">
                    {LABELS[entry.k]}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
