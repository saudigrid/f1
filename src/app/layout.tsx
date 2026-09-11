import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Sans_Arabic, Rajdhani } from 'next/font/google';

import { Footer } from '@/components/site/Footer';
import { Header } from '@/components/site/Header';
import { MobileAnchorAd } from '@/components/ads/MobileAnchorAd';
import { TrackProgress } from '@/components/site/TrackProgress';
import { DIRECTION, HTML_LANG, OG_LOCALE, getLocale, t } from '@/lib/i18n';

import './globals.css';

const arabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic', 'latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-arabic',
  display: 'swap',
});

/** خط لاتيني هندسي للأرقام والعدادات — يعطي الطابع السباقي دون إرباك العربية. */
const display = Rajdhani({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Saudi F1 Grid — أخبار الفورمولا 1 بالعربية',
    template: '%s | Saudi F1 Grid',
  },
  description:
    'تغطية عربية يومية لعالم الفورمولا 1: الأخبار والسباقات والترتيب والتحليل التقني لكل الفرق والسائقين.',
  openGraph: {
    type: 'website',
    locale: OG_LOCALE[getLocale()],
    siteName: 'Saudi F1 Grid',
    title: 'Saudi F1 Grid — أخبار الفورمولا 1 بالعربية',
    description: 'تغطية عربية يومية لعالم الفورمولا 1.',
  },
  alternates: { canonical: '/' },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#08080a' },
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
  ],
  width: 'device-width',
  initialScale: 1,
};

/**
 * يضبط الثيم قبل أول رسم لمنع وميض الشاشة.
 *
 * الداكن هو هوية الموقع لا مجرد تفضيل، فهو الافتراضي دائماً — تفضيل النظام
 * لا يبدّله. الشيء الوحيد الذي يتجاوزه هو اختيار الزائر نفسه من زر التبديل.
 */
const THEME_SCRIPT = `(function(){try{var s=localStorage.getItem('sfg-theme');document.documentElement.setAttribute('data-theme',s==='light'?'light':'dark');}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang={HTML_LANG[getLocale()]}
      dir={DIRECTION[getLocale()]}
      data-theme="dark"
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className={`${arabic.variable} ${display.variable} min-h-dvh flex flex-col`}>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:start-3 focus:z-50 focus:rounded-lg focus:bg-red focus:px-4 focus:py-2 focus:text-white"
        >
          {t('chrome.skipToContent')}
        </a>
        <Header />
        <main id="main" className="flex-1">
          {children}
        </main>
        <Footer />
        <TrackProgress />
        <MobileAnchorAd />
      </body>
    </html>
  );
}
