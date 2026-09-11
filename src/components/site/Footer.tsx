import Link from 'next/link';

import { t } from '@/lib/i18n';
import { NAV_LINKS, SECONDARY_LINKS } from '@/lib/nav';

import { Logo } from './Logo';

export function Footer() {
  return (
    <footer className="mt-20 border-t border-line bg-bg-elev">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="flex flex-col gap-10 md:flex-row md:justify-between">
          <div className="max-w-sm">
            <Logo />
            <p className="mt-4 text-sm leading-relaxed text-muted">
              {t('chrome.tagline')}
            </p>
          </div>

          <nav aria-label={t('chrome.sectionLinks')}>
            <h2 className="text-xs font-semibold tracking-widest text-subtle">{t('chrome.sections')}</h2>
            <ul className="mt-4 grid grid-cols-2 gap-x-10 gap-y-2.5 text-sm">
              {NAV_LINKS.filter((l) => l.href !== '/').map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-muted transition-colors hover:text-red">
                    {t(link.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label={t('chrome.siteLinks')}>
            <h2 className="text-xs font-semibold tracking-widest text-subtle">{t('chrome.site')}</h2>
            <ul className="mt-4 space-y-2.5 text-sm">
              {SECONDARY_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-muted transition-colors hover:text-red">
                    {t(link.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-line pt-6 text-xs text-subtle sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Saudi F1 Grid — جميع الحقوق محفوظة.</p>
          <p className="max-w-md leading-relaxed">
            موقع مستقل لا تربطه صلة بـ Formula 1 أو الاتحاد الدولي للسيارات.
          </p>
        </div>
      </div>
    </footer>
  );
}
