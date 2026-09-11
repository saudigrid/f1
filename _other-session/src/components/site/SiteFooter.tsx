import Link from "next/link";
import { sections, site } from "@/lib/config/site";
import CheckerMark from "./CheckerMark";

export default function SiteFooter() {
  return (
    <footer className="mt-20 border-t bg-bg-elev">
      <div className="checkers" style={{ ["--sq" as string]: "5px", opacity: 0.35 }} aria-hidden />
      <div className="page grid gap-10 py-12 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2.5">
            <CheckerMark size={28} />
            <span className="font-display text-base font-extrabold tracking-tight">
              SAUDI<span className="mx-1 text-accent">F1</span>GRID
            </span>
          </div>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-text-dim">
            {site.description}
          </p>
        </div>

        <nav aria-label="أقسام الموقع">
          <h2 className="mb-3 font-display text-sm font-bold text-text-faint">الأقسام</h2>
          <ul className="space-y-2 text-sm text-text-dim">
            {sections.map((s) => (
              <li key={s.slug}>
                <Link
                  href={"href" in s && s.href ? s.href : `/c/${s.slug}`}
                  className="transition-colors hover:text-text"
                >
                  {s.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="روابط عامة">
          <h2 className="mb-3 font-display text-sm font-bold text-text-faint">الموقع</h2>
          <ul className="space-y-2 text-sm text-text-dim">
            <li><Link href="/about" className="hover:text-text">عن الموقع</Link></li>
            <li><Link href="/editorial-policy" className="hover:text-text">السياسة التحريرية</Link></li>
            <li><Link href="/privacy" className="hover:text-text">الخصوصية والإعلانات</Link></li>
            <li><Link href="/contact" className="hover:text-text">اتصل بنا</Link></li>
          </ul>
        </nav>
      </div>

      <div className="border-t">
        <div className="page flex flex-col gap-2 py-5 text-xs text-text-faint sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {site.name}. جميع الحقوق محفوظة.</p>
          <p>
            موقع مستقل غير تابع لـ Formula 1 أو FIA. العلامات التجارية ملك أصحابها.
          </p>
        </div>
      </div>
    </footer>
  );
}
