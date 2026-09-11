'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { t } from '@/lib/i18n';
import { NAV_LINKS } from '@/lib/nav';

import { Logo } from './Logo';
import { SiteSearch } from './SiteSearch';
import { ThemeToggle } from './ThemeToggle';

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // إغلاق قائمة الجوال عند الانتقال لصفحة أخرى
  useEffect(() => setOpen(false), [pathname]);

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <header
      className={`sticky top-0 z-40 border-b transition-colors duration-300 ${
        scrolled
          ? 'border-line bg-bg/85 backdrop-blur-xl'
          : 'border-transparent bg-bg'
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
        <Link href="/" className="shrink-0">
          <Logo />
        </Link>

        <nav className="mx-auto hidden lg:block" aria-label={t('chrome.mainNav')}>
          <ul className="flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={isActive(link.href) ? 'page' : undefined}
                  className={`relative rounded-lg px-3 py-2 text-[0.9rem] font-medium transition-colors ${
                    isActive(link.href)
                      ? 'text-fg'
                      : 'text-muted hover:text-fg'
                  }`}
                >
                  {t(link.key)}
                  {isActive(link.href) && (
                    <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-red" />
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ms-auto flex items-center gap-2 lg:ms-0">
          <SiteSearch />
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={t('chrome.menu')}
            className="grid size-9 place-items-center rounded-lg border border-line text-muted transition-colors hover:text-fg lg:hidden"
          >
            <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
              {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </div>

      {/* شريط أحمر رفيع — يفصل الهيدر عن المحتوى بإشارة الهوية */}
      <div className="h-px w-full bg-gradient-to-l from-transparent via-red/60 to-transparent" />

      <nav
        id="mobile-nav"
        aria-label={t('chrome.mobileNav')}
        hidden={!open}
        className="border-b border-line bg-bg-elev lg:hidden"
      >
        <ul className="mx-auto max-w-7xl px-4 py-2 sm:px-6">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className={`block border-b border-line/60 py-3 text-[0.95rem] last:border-0 ${
                  isActive(link.href) ? 'font-semibold text-red' : 'text-fg'
                }`}
              >
                {t(link.key)}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
