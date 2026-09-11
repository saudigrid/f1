"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

/**
 * غلاف المشهد ثلاثي الأبعاد مع كل حمايات الأداء.
 *
 * لا يُحمَّل WebGL إطلاقاً إذا:
 *  - المستخدم مفعّل "تقليل الحركة" في نظامه
 *  - الجهاز ضعيف (أقل من 4 أنوية أو أقل من 4 جيجا ذاكرة)
 *  - المتصفح لا يدعم WebGL
 * وعندما يخرج الهيرو من الشاشة يتوقف الرسم بالكامل بدل استنزاف البطارية.
 *
 * البديل في كل هذه الحالات تدرّج ثابت بنفس الهوية — لا شاشة فارغة.
 */

const HeroCanvas = dynamic(() => import("./HeroCanvas"), {
  ssr: false,
  loading: () => null,
});

function deviceCanHandle3D(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;

  const nav = navigator as Navigator & { deviceMemory?: number };
  if (typeof nav.hardwareConcurrency === "number" && nav.hardwareConcurrency < 4) return false;
  if (typeof nav.deviceMemory === "number" && nav.deviceMemory < 4) return false;

  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

export default function Hero3D() {
  const [enabled, setEnabled] = useState(false);
  const [inView, setInView] = useState(true);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setEnabled(deviceCanHandle3D());
    const read = () =>
      setTheme(document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark");
    read();
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  // إيقاف الرسم عند خروج الهيرو من الشاشة
  useEffect(() => {
    const node = hostRef.current;
    if (!node || !enabled) return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      rootMargin: "80px",
    });
    io.observe(node);
    return () => io.disconnect();
  }, [enabled]);

  return (
    <div ref={hostRef} className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* التدرّج الثابت — الطبقة الأساسية التي يراها الجميع */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 80% at 50% 108%, var(--accent-wash) 0%, transparent 58%)," +
            "linear-gradient(to bottom, transparent 40%, var(--bg) 96%)",
        }}
      />
      {enabled && inView && <HeroCanvas theme={theme} />}
    </div>
  );
}
