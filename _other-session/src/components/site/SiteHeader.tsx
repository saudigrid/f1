"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { sections, site } from "@/lib/config/site";
import CheckerMark from "./CheckerMark";
import ThemeToggle from "./ThemeToggle";

function hrefFor(s: (typeof sections)[number]): string {
  return "href" in s && s.href ? s.href : `/c/${s.slug}`;
}

export default function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // منع تمرير الصفحة خلف القائمة المفتوحة على الجوال
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header
      className={`sticky top-0 z-50 border-b bg-bg/85 backdrop-blur-xl transition-shadow ${
        scrolled ? "shadow-[0_1px_0_0_var(--border),0_8px_28px_-20px_rgba(0,0,0,.9)]" : ""
      }`}
    >
      <div className="page flex h-16 items-center gap-4">
        <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label={site.name}>
          <CheckerMark size={30} />
          <span className="font-display text-[17px] font-900 leading-none tracking-tight">
            <span className="font-extrabold">SAUDI</span>
            <span className="mx-1 text-accent">F1</span>
            <span className="font-extrabold">GRID</span>
          </span>
        </Link>

        <nav className="hidden flex-1 items-center gap-1 lg:flex" aria-label="التنقل الرئيسي">
          {sections.map((s) => {
            const href = hrefFor(s);
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={s.slug}
                href={href}
                title={s.hint}
                className={`relative rounded px-3 py-2 text-[15px] transition-colors ${
                  active ? "text-text" : "text-text-dim hover:text-text"
                }`}
              >
                {s.label}
                {active && (
                  <span className="absolute inset-x-3 -bottom-px h-0.5 bg-accent" aria-hidden />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="ms-auto flex items-center gap-2 lg:ms-0">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label="القائمة"
            className="grid h-9 w-9 place-items-center rounded border border-border text-text-dim lg:hidden"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {open ? <path d="M18 6 6 18M6 6l12 12" /> : <path d="M3 6h18M3 12h18M3 18h18" />}
            </svg>
          </button>
        </div>
      </div>

      {/* شريط العلم المنقّط — الفاصل البصري تحت الهيدر */}
      <div className="checkers" style={{ ["--sq" as string]: "4px", opacity: 0.5 }} aria-hidden />

      {open && (
        <nav
          className="fixed inset-x-0 top-[68px] bottom-0 z-40 overflow-y-auto border-t bg-bg lg:hidden"
          aria-label="التنقل للجوال"
        >
          <ul className="page py-2">
            {sections.map((s) => (
              <li key={s.slug}>
                <Link
                  href={hrefFor(s)}
                  className="flex items-baseline justify-between gap-3 border-b border-border py-4"
                >
                  <span className="font-display text-lg font-bold">{s.label}</span>
                  <span className="text-sm text-text-faint">{s.hint}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
