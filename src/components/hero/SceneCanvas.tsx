'use client';

import { useEffect, useRef } from 'react';

import { VERTEX_SHADER, fragmentShader, type SceneName } from './scenes';

/**
 * لوحة المشهد ثلاثي الأبعاد — واحدة لكل الصفحات، والشادر يتبدّل بـ`scene`.
 *
 * ثلاثة قيود بنيناه عليها:
 * ١. لا يعمل إطلاقاً إذا طلب الزائر تقليل الحركة أو كان جهازه ضعيفاً.
 * ٢. يتوقف كلياً عند خروجه من الشاشة أو انتقال الزائر لتبويب آخر.
 * ٣. كثافة البكسل مقيّدة بـ 1.5 مهما كانت دقة الشاشة — الفرق البصري فوق ذلك
 *    معدوم تقريباً، وكلفته على بطارية الجوال ليست كذلك.
 */

function readThemeColors() {
  const styles = getComputedStyle(document.documentElement);
  return {
    bg: styles.getPropertyValue('--bg').trim() || '#08080a',
    line: styles.getPropertyValue('--fg-subtle').trim() || '#6b6b7a',
    accent: styles.getPropertyValue('--red').trim() || '#ff2015',
  };
}

export function SceneCanvas({ scene = 'grid' }: { scene?: SceneName }) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // جهاز ضعيف: نكتفي بالخلفية الثابتة بدل تشغيل معالج الرسوم بلا داعٍ
    const cores = navigator.hardwareConcurrency ?? 4;
    const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
    if (cores <= 2 || memory <= 2) return;

    let disposed = false;
    let cleanup: (() => void) | undefined;

    // مكتبة three تُحمّل هنا فقط، فلا تدخل الحزمة الأولى للصفحة
    void import('three').then((THREE) => {
      if (disposed) return;

      let renderer: InstanceType<typeof THREE.WebGLRenderer>;
      try {
        renderer = new THREE.WebGLRenderer({
          antialias: false,
          alpha: false,
          powerPreference: 'low-power',
        });
      } catch {
        return; // لا دعم لـ WebGL: الخلفية الثابتة تكفي
      }

      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      renderer.domElement.style.display = 'block';
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      host.appendChild(renderer.domElement);

      const stage = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      const colors = readThemeColors();

      const uniforms = {
        uRes: { value: new THREE.Vector2(1, 1) },
        uTime: { value: 0 },
        uPointer: { value: new THREE.Vector2(0, 0) },
        uBg: { value: new THREE.Color(colors.bg) },
        uLine: { value: new THREE.Color(colors.line) },
        uAccent: { value: new THREE.Color(colors.accent) },
      };

      const material = new THREE.ShaderMaterial({
        vertexShader: VERTEX_SHADER,
        fragmentShader: fragmentShader(scene),
        uniforms,
      });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
      stage.add(mesh);

      const resize = () => {
        const w = host.clientWidth;
        const h = host.clientHeight;
        if (w === 0 || h === 0) return;
        renderer.setSize(w, h, false);
        uniforms.uRes.value.set(w, h);
      };
      resize();

      const resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(host);

      // الحركة تتبع المؤشر بتنعيم، بلا قفزات مفاجئة
      const target = { x: 0, y: 0 };
      const onPointer = (event: PointerEvent) => {
        const rect = host.getBoundingClientRect();
        target.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        target.y = ((event.clientY - rect.top) / rect.height) * 2 - 1;
      };
      // على الجوال لا مؤشر، ونتركه ثابتاً بدل ربطه بحركة اللمس
      const hasPointer = window.matchMedia('(pointer: fine)').matches;
      if (hasPointer) window.addEventListener('pointermove', onPointer, { passive: true });

      let onScreen = true;
      const intersection = new IntersectionObserver(
        ([entry]) => {
          onScreen = entry.isIntersecting;
        },
        { threshold: 0 },
      );
      intersection.observe(host);

      // تبديل الثيم يغيّر الألوان فوراً بلا إعادة تهيئة المشهد
      const themeObserver = new MutationObserver(() => {
        const next = readThemeColors();
        uniforms.uBg.value.set(next.bg);
        uniforms.uLine.value.set(next.line);
        uniforms.uAccent.value.set(next.accent);
      });
      themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme'],
      });

      let frame = 0;
      const clock = new THREE.Clock();

      const loop = () => {
        frame = requestAnimationFrame(loop);
        if (!onScreen || document.hidden) return;

        uniforms.uTime.value = clock.getElapsedTime();
        uniforms.uPointer.value.x += (target.x - uniforms.uPointer.value.x) * 0.045;
        uniforms.uPointer.value.y += (target.y - uniforms.uPointer.value.y) * 0.045;
        renderer.render(stage, camera);
      };
      loop();

      cleanup = () => {
        cancelAnimationFrame(frame);
        resizeObserver.disconnect();
        intersection.disconnect();
        themeObserver.disconnect();
        if (hasPointer) window.removeEventListener('pointermove', onPointer);
        mesh.geometry.dispose();
        material.dispose();
        renderer.dispose();
        renderer.domElement.remove();
      };
    });

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [scene]);

  return <div ref={hostRef} className="absolute inset-0" aria-hidden="true" />;
}
