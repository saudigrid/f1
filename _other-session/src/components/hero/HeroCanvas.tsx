"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

/**
 * مشهد الهيرو: مستوى أرضي بشيدر يرسم شبكة حلبة متلاشية نحو الأفق
 * مع شريط ضوئي أحمر يمسح للأمام، وشريط علم منقّط يتموّج فوقه.
 *
 * التكلفة: رسمتان فقط (draw calls) بلا أي نسيج خارجي — لهذا يعمل بسلاسة
 * على الجوال. كل الحمايات (حركة مخفّضة، جهاز ضعيف، خارج الشاشة) في Hero3D.
 */

const GROUND_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const GROUND_FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform vec3  uAccent;
  uniform vec3  uLine;
  uniform float uIntensity;

  // خط شبكة بعرض ثابت على الشاشة مهما بعد عن الكاميرا
  float gridLine(float coord, float w) {
    float d = abs(fract(coord - 0.5) - 0.5) / max(fwidth(coord), 1e-5);
    return 1.0 - min(d / w, 1.0);
  }

  void main() {
    // خطوط طولية ثابتة (مسارات الحلبة) + خطوط عرضية تندفع نحو المشاهد
    float lonLines = gridLine(vUv.x * 26.0, 1.15);
    float latLines = gridLine(vUv.y * 110.0 - uTime * 1.35, 1.15);
    float lines = max(lonLines * 0.55, latLines);

    // تلاشٍ نحو الأفق ونحو الحواف — يمنع الحافة الحادة للمستوى
    float depthFade = smoothstep(1.0, 0.12, vUv.y);
    float edgeFade  = smoothstep(0.0, 0.16, vUv.x) * smoothstep(1.0, 0.84, vUv.x);
    float fade = depthFade * edgeFade;

    // نبضة حمراء تمسح للأمام كأنها سيارة مارّة
    float s = fract(vUv.y * 1.6 - uTime * 0.16);
    float streak = smoothstep(0.0, 0.015, s) * (1.0 - smoothstep(0.015, 0.16, s));

    vec3 color = uLine * lines + uAccent * streak * 1.6;
    float alpha = (lines * 0.5 + streak * 0.7) * fade * uIntensity;

    gl_FragColor = vec4(color, alpha);
  }
`;

const RIBBON_VERT = /* glsl */ `
  varying vec2 vUv;
  uniform float uTime;
  void main() {
    vUv = uv;
    vec3 p = position;
    // تموّج العلم: موجتان بترددين مختلفين حتى لا تبدو الحركة آلية
    p.z += sin(p.x * 1.15 + uTime * 1.4) * 0.34 + sin(p.y * 2.6 - uTime * 0.9) * 0.07;
    p.y += cos(p.x * 0.85 + uTime * 1.05) * 0.13;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const RIBBON_FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform vec3 uAccent;
  uniform float uIntensity;
  void main() {
    // مربعات العلم — 12 عمود × 3 صفوف
    float c = mod(floor(vUv.x * 12.0) + floor(vUv.y * 3.0), 2.0);
    float tail = smoothstep(0.0, 0.22, vUv.x) * smoothstep(1.0, 0.72, vUv.x);
    float alpha = c * tail * uIntensity * 0.85;
    gl_FragColor = vec4(uAccent, alpha);
  }
`;

function Scene({ accent, line }: { accent: THREE.Color; line: THREE.Color }) {
  const groundRef = useRef<THREE.ShaderMaterial>(null);
  const ribbonRef = useRef<THREE.ShaderMaterial>(null);
  const groupRef = useRef<THREE.Group>(null);
  const { viewport } = useThree();

  const groundUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uAccent: { value: accent },
      uLine: { value: line },
      uIntensity: { value: 1 },
    }),
    [accent, line],
  );

  const ribbonUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uAccent: { value: accent },
      uIntensity: { value: 1 },
    }),
    [accent],
  );

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    if (groundRef.current) groundRef.current.uniforms.uTime.value = t;
    if (ribbonRef.current) ribbonRef.current.uniforms.uTime.value = t;

    // انزياح لطيف يتبع المؤشر — يُلغى فعلياً على الجوال لأن pointer يبقى 0
    if (groupRef.current) {
      const targetX = state.pointer.x * 0.16;
      const targetY = state.pointer.y * 0.06;
      groupRef.current.rotation.y += (targetX - groupRef.current.rotation.y) * delta * 2;
      groupRef.current.rotation.x += (-targetY - groupRef.current.rotation.x) * delta * 2;
    }
  });

  // على الشاشات الضيقة نرفع الشريط ونقرّبه حتى يبقى داخل الإطار
  const narrow = viewport.width < 6;

  return (
    <group ref={groupRef}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.15, -14]}>
        <planeGeometry args={[46, 90]} />
        <shaderMaterial
          ref={groundRef}
          vertexShader={GROUND_VERT}
          fragmentShader={GROUND_FRAG}
          uniforms={groundUniforms}
          transparent
          depthWrite={false}
        />
      </mesh>

      <mesh
        position={narrow ? [0, 1.5, -4.5] : [2.4, 1.15, -3.2]}
        rotation={[0.12, -0.34, -0.09]}
      >
        <planeGeometry args={[7.5, 1.9, 48, 12]} />
        <shaderMaterial
          ref={ribbonRef}
          vertexShader={RIBBON_VERT}
          fragmentShader={RIBBON_FRAG}
          uniforms={ribbonUniforms}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

export default function HeroCanvas({ theme }: { theme: "dark" | "light" }) {
  const accent = useMemo(() => new THREE.Color("#ff1e00"), []);
  const line = useMemo(
    () => new THREE.Color(theme === "light" ? "#6b7280" : "#8f98a6"),
    [theme],
  );

  return (
    <Canvas
      // سقف كثافة البكسل عند 1.5 — الفرق البصري فوقها معدوم والكلفة تتضاعف
      dpr={[1, 1.5]}
      gl={{ antialias: false, alpha: true, powerPreference: "low-power" }}
      camera={{ position: [0, 0.9, 5.2], fov: 52 }}
      style={{ position: "absolute", inset: 0 }}
    >
      <Scene accent={accent} line={line} />
    </Canvas>
  );
}
