'use client';

import { useEffect, useState } from 'react';

import { AdSlot } from './AdSlot';

/**
 * الشريط الإعلاني السفلي على الجوال.
 *
 * قواعده الصارمة: يظهر فقط بعد أن يمرّر القارئ جزءاً من الصفحة (لا يقابله فور
 * الدخول)، وقابل للإغلاق نهائياً لبقية الجلسة، ولا يغطي أي محتوى لأن الجسم
 * يترك له مساحة سفلية.
 */
export function MobileAnchorAd() {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem('sfg-anchor-dismissed') === '1') {
        setDismissed(true);
        return;
      }
    } catch {
      // تصفح خاص — نكمل بالسلوك الافتراضي
    }

    const onScroll = () => setVisible(window.scrollY > 600);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  function dismiss() {
    setDismissed(true);
    try {
      sessionStorage.setItem('sfg-anchor-dismissed', '1');
    } catch {
      // لا شيء — الإغلاق يسري على هذه الصفحة على الأقل
    }
  }

  if (dismissed || !visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/95 backdrop-blur-md lg:hidden">
      <div className="relative flex items-center gap-2 px-2 py-1.5">
        <AdSlot placement="mobile-anchor" className="flex-1" />
        <button
          type="button"
          onClick={dismiss}
          aria-label="إغلاق الإعلان"
          className="grid size-7 shrink-0 place-items-center rounded-md border border-line text-muted"
        >
          <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
