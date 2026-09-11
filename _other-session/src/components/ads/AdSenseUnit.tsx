"use client";

import Script from "next/script";
import { useEffect, useRef } from "react";

/** وحدة AdSense واحدة. لا تُحمَّل مكتبة جوجل إلا عند وجود وحدة فعلية على الصفحة. */
export default function AdSenseUnit({ client, slot }: { client: string; slot: string }) {
  const pushed = useRef(false);

  useEffect(() => {
    if (pushed.current) return;
    pushed.current = true;
    try {
      const w = window as unknown as { adsbygoogle?: unknown[] };
      (w.adsbygoogle = w.adsbygoogle || []).push({});
    } catch {
      // مانع الإعلانات نشط — الموضع يبقى فارغاً بلا خطأ في الكونسول
    }
  }, []);

  return (
    <>
      <Script
        id="adsbygoogle-lib"
        strategy="lazyOnload"
        crossOrigin="anonymous"
        src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`}
      />
      <ins
        className="adsbygoogle"
        style={{ display: "block", width: "100%" }}
        data-ad-client={client}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </>
  );
}
