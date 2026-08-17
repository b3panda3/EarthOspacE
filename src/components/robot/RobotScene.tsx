"use client";

/**
 * RobotScene.tsx
 *
 * React Three Fiber Canvas containing:
 *   - ASTRO robot character (RobotCharacter)
 *   - DataTransferEffect particle animation
 *   - Environment lighting (ambient + directional + rim)
 *   - OrbitControls (limited to keep robot centred)
 *   - Stars background (Drei <Stars />)
 *
 * Graceful degradation:
 *   - Detects WebGL2 support at mount; renders a fallback message if unavailable
 *     (primarily for Safari on older hardware).
 *   - On mobile, reduces star count and uses lower-poly geometry smoothness
 *     to keep frame rate acceptable.
 *
 * This is always "use client" and must be dynamically imported with ssr:false.
 */

import { Suspense, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stars, Float } from "@react-three/drei";
import RobotCharacter, { type RobotState } from "./RobotCharacter";
import DataTransferEffect from "./DataTransferEffect";

interface RobotSceneProps {
  robotState:      RobotState;
  dataTransfer:    boolean;
  onTransferDone?: () => void;
  gender?:          "male" | "female";
}

// ─── WebGL2 feature detection ─────────────────────────────────────────────────

function detectWebGL2(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!canvas.getContext("webgl2");
  } catch {
    return false;
  }
}

// ─── Mobile detection (≤ 768 px viewport width) ───────────────────────────────

function isMobileViewport(): boolean {
  return typeof window !== "undefined" && window.innerWidth <= 768;
}

// ─── WebGL2 unavailable — shown on Safari / old hardware ─────────────────────

function WebGLFallback() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-[#0a0908]">
      <div className="text-center max-w-xs px-6">
        {/* Robot emoji as a static stand-in */}
        <div className="text-5xl mb-4 select-none" aria-hidden="true">🤖</div>
        <h2 className="text-sm font-semibold text-[#e8e7e5] mb-2">3D Rendering Unavailable</h2>
        <p className="text-xs text-[#96938d] leading-relaxed">
          Your browser does not support WebGL2, which is required for the ASTRO 3D scene.
          Try Chrome, Firefox, or Edge for the full experience.
        </p>
        <p className="text-[10px] text-[#605943] mt-3">
          Safari users: ensure GPU Process is enabled in Advanced Settings.
        </p>
      </div>
    </div>
  );
}

// ─── Scene ────────────────────────────────────────────────────────────────────

export default function RobotScene({
  robotState,
  dataTransfer,
  onTransferDone,
  gender = "male",
}: RobotSceneProps) {
  const [webgl2Supported, setWebgl2Supported] = useState<boolean | null>(null);
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    setWebgl2Supported(detectWebGL2());
    setMobile(isMobileViewport());
  }, []);

  // Still checking — render nothing to avoid layout shift
  if (webgl2Supported === null) return null;

  // WebGL2 not available — graceful fallback
  if (!webgl2Supported) return <WebGLFallback />;

  // On mobile: reduce star count and disable anti-aliasing to save GPU
  const starCount  = mobile ? 600  : 2200;
  const starRadius = mobile ? 40   : 60;
  const antialias  = !mobile;

  return (
    <Canvas
      camera={{ position: [0, 0.6, 2.6], fov: 40 }}
      gl={{ antialias, alpha: true, powerPreference: mobile ? "low-power" : "high-performance" }}
      className="w-full h-full"
    >
      {/* ── Lights ──────────────────────────────────────────────────────── */}
      <ambientLight intensity={0.35} color="#c8d4e0" />
      <directionalLight
        position={[2, 4, 3]}
        intensity={1.2}
        color="#ffffff"
        castShadow={false}
      />
      {/* Warm rim light from below-left */}
      <pointLight position={[-1.5, -0.5, 1]} color="#e6c974" intensity={0.6} distance={5} />
      {/* Cool fill from right — skip on mobile to reduce draw calls */}
      {!mobile && (
        <pointLight position={[2, 0.5, -1]} color="#8369ce" intensity={0.4} distance={5} />
      )}

      {/* ── Star field ──────────────────────────────────────────────────── */}
      <Stars
        radius={starRadius}
        depth={40}
        count={starCount}
        factor={3.5}
        saturation={0}
        fade
        speed={0.4}
      />

      {/* ── Robot (wrapped in Drei Float for extra subtle bobbing) ─────── */}
      <Suspense fallback={null}>
        <Float
          speed={1.6}
          rotationIntensity={0.05}
          floatIntensity={0.3}
          floatingRange={[-0.04, 0.04]}
        >
          <RobotCharacter state={robotState} gender={gender} />
        </Float>
      </Suspense>

      {/* ── Data transfer particle effect ───────────────────────────────── */}
      <DataTransferEffect active={dataTransfer} onDone={onTransferDone} />

      {/* ── Camera controls ─────────────────────────────────────────────── */}
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        minPolarAngle={Math.PI * 0.25}
        maxPolarAngle={Math.PI * 0.7}
        minAzimuthAngle={-Math.PI * 0.35}
        maxAzimuthAngle={Math.PI * 0.35}
        autoRotate={false}
        dampingFactor={0.08}
        enableDamping
      />
    </Canvas>
  );
}
