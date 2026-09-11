'use client';

import Image from 'next/image';
import { useEffect, useRef } from 'react';

import { AD_PLACEMENTS, type AdPlacementId } from '@/lib/config/ads';

/**
 * موضع إعلاني واحد يقبل ثلاث حالات:
 * ١. إعلان مباشر (صورة + رابط) — تمرّره في `direct`.
 * ٢. AdSense — يُستخدم تلقائياً متى وُجد معرّف الناشر في البيئة.
 * ٣. لا شيء — يعرض إطاراً شبحياً في التطوير، ولا شيء في الإنتاج.
 *
 * في كل الحالات يُحجز الارتفاع مسبقاً فلا تقفز الصفحة تحت يد القارئ.
 */

export interface DirectAd {
  image: string;
  href: string;
  alt: string;
  advertiser: string;
}

interface Props {
  placement: AdPlacementId;
  direct?: DirectAd;
  className?: string;
}

const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;

export function AdSlot({ placement, direct, className = '' }: Props) {
  const config = AD_PLACEMENTS[placement];
  const insRef = useRef<HTMLModElement>(null);
  const pushed = useRef(false);

  useEffect(() => {
    if (direct || !ADSENSE_CLIENT || !config.adsenseSlot || pushed.current) return;
    pushed.current = true;
    try {
      // @ts-expect-error — adsbygoogle يُحقن من سكربت جوجل الخارجي
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // حاجب إعلانات أو فشل تحميل السكربت — نتجاهل بصمت
    }
  }, [direct, config.adsenseSlot]);

  const visibility = [
    config.mobile ? '' : 'hidden',
    config.desktop ? 'lg:block' : 'lg:hidden',
  ].join(' ');

  const style = {
    '--h-mobile': `${config.reservedHeight.mobile}px`,
    '--h-desktop': `${config.reservedHeight.desktop}px`,
  } as React.CSSProperties;

  return (
    <aside
      aria-label="محتوى إعلاني"
      style={style}
      className={`ad-slot relative w-full overflow-hidden ${visibility} ${className}`}
    >
      {/* وسم صريح — الشفافية مع القارئ تُبقي الثقة وتُرضي سياسات الإعلانات */}
      <span className="pointer-events-none absolute end-2 top-2 z-10 rounded bg-surface-2/80 px-1.5 py-0.5 text-[0.62rem] font-medium tracking-wide text-subtle">
        إعلان
      </span>

      {direct ? (
        <a
          href={direct.href}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="group block size-full"
        >
          <Image
            src={direct.image}
            alt={direct.alt}
            fill
            sizes="(max-width: 1024px) 100vw, 728px"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
          />
        </a>
      ) : ADSENSE_CLIENT && config.adsenseSlot ? (
        <ins
          ref={insRef}
          className="adsbygoogle block size-full"
          data-ad-client={ADSENSE_CLIENT}
          data-ad-slot={config.adsenseSlot}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      ) : (
        <div className="grid size-full place-items-center rounded-[var(--radius-card)] border border-dashed border-line text-[0.72rem] text-subtle">
          {process.env.NODE_ENV === 'development' ? config.label : null}
        </div>
      )}
    </aside>
  );
}
