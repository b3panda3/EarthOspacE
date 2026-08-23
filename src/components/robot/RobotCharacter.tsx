"use client";

/**
 * RobotCharacter.tsx — Human-like AI Companion (ASTRO)
 *
 * A stylised humanoid figure built from Three.js primitives.
 * Gender-aware: physique adapts based on user profile (male/female),
 * always race-neutral with a warm gray skin tone.
 *
 * Structure:
 *   <group> root (floats on sine wave)
 *     Head       — sphere with visible face (eyes, nose, mouth)
 *     Neck       — cylinder
 *     Torso      — capsule (gender-adaptive width)
 *     Arms       — upper + lower + human-like hands (gender-adaptive)
 *     Legs       — upper + lower + feet (shoe-shaped)
 *     Chest light — emissive panel (AI indicator)
 *     Ear pieces — communication arrays
 */

import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export type RobotState = "idle" | "thinking" | "speaking" | "wave";

interface RobotCharacterProps {
  state?: RobotState;
  gender?: "male" | "female";
}

// ─── Materials (memoised) ─────────────────────────────────────────────────

const SKIN_MAT = new THREE.MeshStandardMaterial({
  color:     0x9e9e9e,
  roughness: 0.65,
  metalness: 0.02,
});

const SUIT_MAT = new THREE.MeshStandardMaterial({
  color:     0xdde8f0,
  roughness: 0.25,
  metalness: 0.4,
});

const SUIT_DARK_MAT = new THREE.MeshStandardMaterial({
  color:     0x1a2a3a,
  roughness: 0.5,
  metalness: 0.3,
});

const ACCENT_MAT = new THREE.MeshStandardMaterial({
  color:     0x38bdf8,
  roughness: 0.1,
  metalness: 0.85,
  emissive:  new THREE.Color(0x38bdf8),
  emissiveIntensity: 0.15,
});

const EYE_MAT = new THREE.MeshStandardMaterial({
  color:     0x111111,
  roughness: 0.05,
  metalness: 0.1,
  emissive:  new THREE.Color(0x000000),
  emissiveIntensity: 0.0,
});

const EYE_WHITE_MAT = new THREE.MeshStandardMaterial({
  color:     0xf0f0f0,
  roughness: 0.2,
  metalness: 0.0,
});

const LIP_MAT = new THREE.MeshStandardMaterial({
  color:     0xb07a6a,
  roughness: 0.4,
  metalness: 0.0,
});

const NOSE_MAT = new THREE.MeshStandardMaterial({
  color:     0x8a8a8a,
  roughness: 0.6,
  metalness: 0.0,
});

const HAIR_MAT = new THREE.MeshStandardMaterial({
  color:     0x2a2a2a,
  roughness: 0.8,
  metalness: 0.0,
});

const JOINT_MAT = new THREE.MeshStandardMaterial({
  color:     0x888888,
  roughness: 0.3,
  metalness: 0.8,
});

const BOOT_MAT = new THREE.MeshStandardMaterial({
  color:     0x1a1a2e,
  roughness: 0.4,
  metalness: 0.5,
});

const EAR_MAT = new THREE.MeshStandardMaterial({
  color:     0x38bdf8,
  roughness: 0.2,
  metalness: 0.6,
  emissive:  new THREE.Color(0x38bdf8),
  emissiveIntensity: 0.3,
});

// ─── Component ────────────────────────────────────────────────────────────

export default function RobotCharacter({ state = "idle", gender = "male" }: RobotCharacterProps) {
  const rootRef      = useRef<THREE.Group>(null);
  const headRef      = useRef<THREE.Group>(null);
  const rightArmRef  = useRef<THREE.Group>(null);
  const leftArmRef   = useRef<THREE.Group>(null);
  const leftEyeRef   = useRef<THREE.Mesh>(null);
  const rightEyeRef  = useRef<THREE.Mesh>(null);
  const mouthRef     = useRef<THREE.Mesh>(null);
  const glowLightRef = useRef<THREE.PointLight>(null);
  const chestLightRef = useRef<THREE.Mesh>(null);

  const timer = useMemo(() => new THREE.Timer(), []);
  const stateRef = useRef(state);
  const genderRef = useRef(gender);
  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { genderRef.current = gender; }, [gender]);

  // Gender-adaptive dimensions
  const dims = useMemo(() => {
    if (gender === "female") {
      return {
        shoulderW: 0.28, torsoW: 0.28, torsoH: 0.48, hipW: 0.32,
        armThick: 0.038, thighThick: 0.068, totalH: -0.03,
        chestY: 0.13, bustScale: 1.0,
        waistW: 0.22,
      };
    }
    return {
      shoulderW: 0.36, torsoW: 0.34, torsoH: 0.50, hipW: 0.28,
      armThick: 0.048, thighThick: 0.062, totalH: 0.02,
      chestY: 0.16, bustScale: 0,
      waistW: 0.28,
    };
  }, [gender]);

  useFrame(() => {
    const t   = timer.getElapsed();
    const cur = stateRef.current;
    const root = rootRef.current;
    const head = headRef.current;
    const rArm = rightArmRef.current;
    const lArm = leftArmRef.current;
    const glow = glowLightRef.current;
    const chest = chestLightRef.current;

    if (!root) return;

    // ── Idle float ───────────────────────────────────────────────────────
    root.position.y = Math.sin(t * 1.2) * 0.04 + dims.totalH;

    // ── Slow idle rotation toward camera ────────────────────────────────
    if (cur === "idle") {
      root.rotation.y += (Math.sin(t * 0.3) * 0.15 - root.rotation.y) * 0.02;
    }

    // ── Head animations ──────────────────────────────────────────────────
    if (head) {
      if (cur === "thinking") {
        head.rotation.z = Math.sin(t * 2.5) * 0.06;
        head.rotation.x = -0.08;
        // Occasional head tilt
        head.rotation.y = Math.sin(t * 0.8) * 0.1;
      } else if (cur === "speaking") {
        head.rotation.x = Math.sin(t * 8) * 0.03;
        head.rotation.z = 0;
        head.rotation.y = Math.sin(t * 1.2) * 0.06;
      } else {
        head.rotation.x += (0 - head.rotation.x) * 0.05;
        head.rotation.z += (0 - head.rotation.z) * 0.05;
        head.rotation.y += (0 - head.rotation.y) * 0.05;
      }
    }

    // ── Eye blink animation ──────────────────────────────────────────────
    const lEye = leftEyeRef.current;
    const rEye = rightEyeRef.current;
    if (lEye && rEye) {
      // Blink every ~3 seconds
      const blinkCycle = t % 3.0;
      const blinkScale = blinkCycle < 0.15 ? 1.0 - Math.sin(blinkCycle / 0.15 * Math.PI) * 0.9 : 1.0;
      lEye.scale.y = blinkScale;
      rEye.scale.y = blinkScale;

      // Look at direction based on state
      if (cur === "thinking") {
        lEye.rotation.y = Math.sin(t * 0.5) * 0.15;
        rEye.rotation.y = Math.sin(t * 0.5) * 0.15;
      } else {
        lEye.rotation.y += (0 - lEye.rotation.y) * 0.05;
        rEye.rotation.y += (0 - rEye.rotation.y) * 0.05;
      }
    }

    // ── Mouth animation for speaking ─────────────────────────────────────
    if (mouthRef.current) {
      if (cur === "speaking") {
        mouthRef.current.scale.y = 1.0 + Math.sin(t * 15) * 0.4;
      } else {
        mouthRef.current.scale.y += (1.0 - mouthRef.current.scale.y) * 0.1;
      }
    }

    // ── Arm animations ───────────────────────────────────────────────────
    if (rArm) {
      if (cur === "wave") {
        rArm.rotation.z = -0.8 + Math.sin(t * 6) * 0.5;
        rArm.rotation.x = -0.4;
      } else if (cur === "speaking") {
        // Gesturing while speaking
        rArm.rotation.z = -0.15 + Math.sin(t * 3) * 0.15;
        rArm.rotation.x += (0 - rArm.rotation.x) * 0.05;
      } else {
        rArm.rotation.z += (-0.08 - rArm.rotation.z) * 0.04;
        rArm.rotation.x += (0 - rArm.rotation.x) * 0.04;
      }
    }

    if (lArm) {
      if (cur === "speaking") {
        lArm.rotation.z = 0.12 + Math.sin(t * 2.8 + 0.8) * 0.12;
      } else {
        lArm.rotation.z += (0.08 - lArm.rotation.z) * 0.04;
      }
    }

    // ── Chest AI indicator light ─────────────────────────────────────────
    if (chest) {
      const mat = chest.material as THREE.MeshStandardMaterial;
      const pulse = cur === "thinking"
        ? 0.3 + Math.sin(t * 3) * 0.2
        : cur === "speaking"
        ? 0.5 + Math.sin(t * 8) * 0.3
        : 0.3 + Math.sin(t * 1.5) * 0.1;
      mat.emissiveIntensity = pulse;
    }

    // ── Point light intensity ────────────────────────────────────────────
    if (glow) {
      glow.intensity = cur === "thinking" ? 1.2 + Math.sin(t * 4) * 0.6
        : cur === "speaking" ? 1.8 + Math.sin(t * 10) * 0.5
        : 1.0 + Math.sin(t * 1.5) * 0.15;
    }
  });

  return (
    <group ref={rootRef} position={[0, 0, 0]}>

      {/* ── Glow point light ────────────────────────────────────────────── */}
      <pointLight
        ref={glowLightRef}
        position={[0, 1.0, 0.3]}
        color="#38bdf8"
        intensity={1.0}
        distance={3.5}
        decay={2}
      />

      {/* ═══ HEAD GROUP ═══ */}
      <group ref={headRef} position={[0, 1.22, 0]}>
        {/* Skull */}
        <mesh>
          <sphereGeometry args={[0.15, 24, 24]} />
          <primitive object={SKIN_MAT} attach="material" />
        </mesh>

        {/* ── Face features ────────────────────────────────────────────── */}

        {/* Left eye white */}
        <mesh position={[-0.048, 0.025, 0.12]}>
          <sphereGeometry args={[0.03, 12, 12]} />
          <primitive object={EYE_WHITE_MAT} attach="material" />
        </mesh>
        {/* Left iris/pupil */}
        <mesh ref={leftEyeRef} position={[-0.048, 0.025, 0.145]}>
          <sphereGeometry args={[0.016, 12, 12]} />
          <primitive object={EYE_MAT} attach="material" />
        </mesh>

        {/* Right eye white */}
        <mesh position={[0.048, 0.025, 0.12]}>
          <sphereGeometry args={[0.03, 12, 12]} />
          <primitive object={EYE_WHITE_MAT} attach="material" />
        </mesh>
        {/* Right iris/pupil */}
        <mesh ref={rightEyeRef} position={[0.048, 0.025, 0.145]}>
          <sphereGeometry args={[0.016, 12, 12]} />
          <primitive object={EYE_MAT} attach="material" />
        </mesh>

        {/* Eyebrows */}
        <mesh position={[-0.048, 0.06, 0.125]} rotation={[0, 0, 0.1]}>
          <boxGeometry args={[0.035, 0.006, 0.012]} />
          <primitive object={HAIR_MAT} attach="material" />
        </mesh>
        <mesh position={[0.048, 0.06, 0.125]} rotation={[0, 0, -0.1]}>
          <boxGeometry args={[0.035, 0.006, 0.012]} />
          <primitive object={HAIR_MAT} attach="material" />
        </mesh>

        {/* Nose */}
        <mesh position={[0, -0.01, 0.145]}>
          <sphereGeometry args={[0.015, 8, 8]} />
          <primitive object={NOSE_MAT} attach="material" />
        </mesh>
        {/* Nose bridge */}
        <mesh position={[0, 0.01, 0.14]} rotation={[0.2, 0, 0]}>
          <boxGeometry args={[0.018, 0.035, 0.01]} />
          <primitive object={NOSE_MAT} attach="material" />
        </mesh>

        {/* Mouth */}
        <mesh ref={mouthRef} position={[0, -0.05, 0.13]}>
          <boxGeometry args={[0.05, 0.01, 0.015]} />
          <primitive object={LIP_MAT} attach="material" />
        </mesh>

        {/* Chin */}
        <mesh position={[0, -0.09, 0.08]}>
          <sphereGeometry args={[0.04, 12, 12]} />
          <primitive object={SKIN_MAT} attach="material" />
        </mesh>

        {/* Ears (communication pieces) */}
        <mesh position={[-0.16, 0.02, 0]} rotation={[0, 0, 0.2]}>
          <capsuleGeometry args={[0.02, 0.04, 4, 8]} />
          <primitive object={EAR_MAT} attach="material" />
        </mesh>
        <mesh position={[0.16, 0.02, 0]} rotation={[0, 0, -0.2]}>
          <capsuleGeometry args={[0.02, 0.04, 4, 8]} />
          <primitive object={EAR_MAT} attach="material" />
        </mesh>

        {/* Hair (simple cap for male, longer for female) */}
        {gender === "male" ? (
          <>
            <mesh position={[0, 0.06, -0.01]}>
              <sphereGeometry args={[0.155, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
              <primitive object={HAIR_MAT} attach="material" />
            </mesh>
          </>
        ) : (
          <>
            <mesh position={[0, 0.06, -0.01]}>
              <sphereGeometry args={[0.155, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
              <primitive object={HAIR_MAT} attach="material" />
            </mesh>
            {/* Longer hair back */}
            <mesh position={[0, -0.04, -0.08]}>
              <capsuleGeometry args={[0.12, 0.12, 6, 12]} />
              <primitive object={HAIR_MAT} attach="material" />
            </mesh>
          </>
        )}

        {/* Helmet visor ring (subtle, non-obscuring) */}
        <mesh position={[0, -0.13, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.155, 0.008, 8, 32]} />
          <primitive object={ACCENT_MAT} attach="material" />
        </mesh>

        {/* Small antenna nub */}
        <mesh position={[0.08, 0.16, 0]}>
          <cylinderGeometry args={[0.004, 0.004, 0.06, 6]} />
          <primitive object={JOINT_MAT} attach="material" />
        </mesh>
        <mesh position={[0.08, 0.2, 0]}>
          <sphereGeometry args={[0.01, 6, 6]} />
          <primitive object={ACCENT_MAT} attach="material" />
        </mesh>
      </group>

      {/* ═══ NECK ═══ */}
      <mesh position={[0, 1.02, 0]}>
        <cylinderGeometry args={[0.048, 0.055, 0.08, 10]} />
        <primitive object={SKIN_MAT} attach="material" />
      </mesh>

      {/* ═══ TORSO ═══ */}
      <mesh position={[0, 0.68, 0]}>
        <capsuleGeometry args={[dims.torsoW / 2, dims.torsoH, 8, 16]} />
        <primitive object={SUIT_MAT} attach="material" />
      </mesh>

      {/* Blue accent stripes on chest */}
      <mesh position={[0, dims.chestY, dims.torsoW / 2 + 0.005]}>
        <boxGeometry args={[dims.torsoW * 0.75, 0.025, 0.008]} />
        <primitive object={ACCENT_MAT} attach="material" />
      </mesh>
      <mesh position={[0, dims.chestY - 0.09, dims.torsoW / 2 + 0.005]}>
        <boxGeometry args={[dims.torsoW * 0.55, 0.02, 0.008]} />
        <primitive object={ACCENT_MAT} attach="material" />
      </mesh>

      {/* Chest AI indicator panel */}
      <mesh ref={chestLightRef} position={[0, dims.chestY - 0.2, dims.torsoW / 2 + 0.005]}>
        <circleGeometry args={[0.035, 16]} />
        <meshStandardMaterial
          color={0x38bdf8}
          emissive={new THREE.Color(0x38bdf8)}
          emissiveIntensity={0.4}
          roughness={0.1}
        />
      </mesh>

      {/* Female bust contour */}
      {gender === "female" && dims.bustScale > 0 && (
        <>
          <mesh position={[-0.06, dims.chestY - 0.02, dims.torsoW / 2 + 0.01]}>
            <sphereGeometry args={[0.05, 10, 10]} />
            <primitive object={SUIT_MAT} attach="material" />
          </mesh>
          <mesh position={[0.06, dims.chestY - 0.02, dims.torsoW / 2 + 0.01]}>
            <sphereGeometry args={[0.05, 10, 10]} />
            <primitive object={SUIT_MAT} attach="material" />
          </mesh>
        </>
      )}

      {/* ═══ RIGHT ARM ═══ */}
      <group ref={rightArmRef} position={[dims.shoulderW / 2 + 0.04, 0.84, 0]}>
        {/* Shoulder joint */}
        <mesh><sphereGeometry args={[0.048, 8, 8]} /><primitive object={JOINT_MAT} attach="material" /></mesh>
        {/* Upper arm */}
        <mesh position={[0.0, -0.14, 0]} rotation={[0, 0, -0.12]}>
          <capsuleGeometry args={[dims.armThick, 0.18, 4, 8]} />
          <primitive object={SUIT_MAT} attach="material" />
        </mesh>
        {/* Elbow joint */}
        <mesh position={[0.02, -0.30, 0]}>
          <sphereGeometry args={[0.036, 8, 8]} /><primitive object={JOINT_MAT} attach="material" />
        </mesh>
        {/* Forearm */}
        <mesh position={[0.01, -0.43, 0]} rotation={[0, 0, -0.06]}>
          <capsuleGeometry args={[dims.armThick * 0.8, 0.16, 4, 8]} />
          <primitive object={SUIT_MAT} attach="material" />
        </mesh>
        {/* Wrist */}
        <mesh position={[0.0, -0.54, 0]}>
          <sphereGeometry args={[0.028, 8, 8]} /><primitive object={JOINT_MAT} attach="material" />
        </mesh>
        {/* Human-like hand (5 fingers) */}
        <group position={[0.0, -0.60, 0]}>
          {/* Palm */}
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[0.05, 0.055, 0.02]} />
            <primitive object={SKIN_MAT} attach="material" />
          </mesh>
          {/* Thumb */}
          <mesh position={[-0.035, 0.005, 0.01]} rotation={[0, 0, 0.5]}>
            <capsuleGeometry args={[0.008, 0.035, 3, 6]} />
            <primitive object={SKIN_MAT} attach="material" />
          </mesh>
          {/* Index */}
          <mesh position={[-0.018, 0.035, 0.005]}>
            <capsuleGeometry args={[0.006, 0.03, 3, 6]} />
            <primitive object={SKIN_MAT} attach="material" />
          </mesh>
          {/* Middle */}
          <mesh position={[-0.004, 0.038, 0.005]}>
            <capsuleGeometry args={[0.006, 0.033, 3, 6]} />
            <primitive object={SKIN_MAT} attach="material" />
          </mesh>
          {/* Ring */}
          <mesh position={[0.01, 0.033, 0.005]}>
            <capsuleGeometry args={[0.006, 0.028, 3, 6]} />
            <primitive object={SKIN_MAT} attach="material" />
          </mesh>
          {/* Pinky */}
          <mesh position={[0.022, 0.027, 0.005]}>
            <capsuleGeometry args={[0.005, 0.022, 3, 6]} />
            <primitive object={SKIN_MAT} attach="material" />
          </mesh>
        </group>
      </group>

      {/* ═══ LEFT ARM ═══ */}
      <group ref={leftArmRef} position={[-(dims.shoulderW / 2 + 0.04), 0.84, 0]}>
        <mesh><sphereGeometry args={[0.048, 8, 8]} /><primitive object={JOINT_MAT} attach="material" /></mesh>
        <mesh position={[0.0, -0.14, 0]} rotation={[0, 0, 0.12]}>
          <capsuleGeometry args={[dims.armThick, 0.18, 4, 8]} />
          <primitive object={SUIT_MAT} attach="material" />
        </mesh>
        <mesh position={[-0.02, -0.30, 0]}>
          <sphereGeometry args={[0.036, 8, 8]} /><primitive object={JOINT_MAT} attach="material" />
        </mesh>
        <mesh position={[-0.01, -0.43, 0]} rotation={[0, 0, 0.06]}>
          <capsuleGeometry args={[dims.armThick * 0.8, 0.16, 4, 8]} />
          <primitive object={SUIT_MAT} attach="material" />
        </mesh>
        <mesh position={[0.0, -0.54, 0]}>
          <sphereGeometry args={[0.028, 8, 8]} /><primitive object={JOINT_MAT} attach="material" />
        </mesh>
        {/* Human-like hand (5 fingers) */}
        <group position={[0.0, -0.60, 0]}>
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[0.05, 0.055, 0.02]} />
            <primitive object={SKIN_MAT} attach="material" />
          </mesh>
          <mesh position={[0.035, 0.005, 0.01]} rotation={[0, 0, -0.5]}>
            <capsuleGeometry args={[0.008, 0.035, 3, 6]} />
            <primitive object={SKIN_MAT} attach="material" />
          </mesh>
          <mesh position={[0.018, 0.035, 0.005]}>
            <capsuleGeometry args={[0.006, 0.03, 3, 6]} />
            <primitive object={SKIN_MAT} attach="material" />
          </mesh>
          <mesh position={[0.004, 0.038, 0.005]}>
            <capsuleGeometry args={[0.006, 0.033, 3, 6]} />
            <primitive object={SKIN_MAT} attach="material" />
          </mesh>
          <mesh position={[-0.01, 0.033, 0.005]}>
            <capsuleGeometry args={[0.006, 0.028, 3, 6]} />
            <primitive object={SKIN_MAT} attach="material" />
          </mesh>
          <mesh position={[-0.022, 0.027, 0.005]}>
            <capsuleGeometry args={[0.005, 0.022, 3, 6]} />
            <primitive object={SKIN_MAT} attach="material" />
          </mesh>
        </group>
      </group>

      {/* ═══ HIP / BELT ═══ */}
      <mesh position={[0, 0.35, 0]}>
        <capsuleGeometry args={[dims.hipW / 2, 0.05, 6, 12]} />
        <primitive object={SUIT_DARK_MAT} attach="material" />
      </mesh>
      {/* Belt accent */}
      <mesh position={[0, 0.38, dims.hipW / 2 + 0.005]}>
        <boxGeometry args={[dims.hipW * 0.85, 0.02, 0.008]} />
        <primitive object={ACCENT_MAT} attach="material" />
      </mesh>

      {/* ═══ RIGHT LEG ═══ */}
      <group position={[dims.hipW / 3, 0.30, 0]}>
        {/* Thigh */}
        <mesh position={[0, -0.16, 0]}>
          <capsuleGeometry args={[dims.thighThick, 0.20, 4, 8]} />
          <primitive object={SUIT_MAT} attach="material" />
        </mesh>
        {/* Knee joint */}
        <mesh position={[0, -0.36, 0]}>
          <sphereGeometry args={[0.038, 8, 8]} /><primitive object={JOINT_MAT} attach="material" />
        </mesh>
        {/* Shin */}
        <mesh position={[0, -0.50, 0]}>
          <capsuleGeometry args={[dims.thighThick * 0.82, 0.18, 4, 8]} />
          <primitive object={SUIT_MAT} attach="material" />
        </mesh>
        {/* Ankle joint */}
        <mesh position={[0, -0.62, 0]}>
          <sphereGeometry args={[0.025, 8, 8]} /><primitive object={JOINT_MAT} attach="material" />
        </mesh>
        {/* Foot (shoe-shaped) */}
        <group position={[0, -0.68, 0.02]}>
          {/* Sole */}
          <mesh position={[0, -0.02, 0.02]}>
            <boxGeometry args={[0.07, 0.03, 0.13]} />
            <primitive object={BOOT_MAT} attach="material" />
          </mesh>
          {/* Upper shoe */}
          <mesh position={[0, 0.01, -0.01]}>
            <boxGeometry args={[0.065, 0.04, 0.10]} />
            <primitive object={BOOT_MAT} attach="material" />
          </mesh>
          {/* Toe cap */}
          <mesh position={[0, 0.0, 0.06]}>
            <sphereGeometry args={[0.032, 8, 8]} />
            <primitive object={BOOT_MAT} attach="material" />
          </mesh>
        </group>
      </group>

      {/* ═══ LEFT LEG ═══ */}
      <group position={[-(dims.hipW / 3), 0.30, 0]}>
        <mesh position={[0, -0.16, 0]}>
          <capsuleGeometry args={[dims.thighThick, 0.20, 4, 8]} />
          <primitive object={SUIT_MAT} attach="material" />
        </mesh>
        <mesh position={[0, -0.36, 0]}>
          <sphereGeometry args={[0.038, 8, 8]} /><primitive object={JOINT_MAT} attach="material" />
        </mesh>
        <mesh position={[0, -0.50, 0]}>
          <capsuleGeometry args={[dims.thighThick * 0.82, 0.18, 4, 8]} />
          <primitive object={SUIT_MAT} attach="material" />
        </mesh>
        <mesh position={[0, -0.62, 0]}>
          <sphereGeometry args={[0.025, 8, 8]} /><primitive object={JOINT_MAT} attach="material" />
        </mesh>
        {/* Foot (shoe-shaped) */}
        <group position={[0, -0.68, 0.02]}>
          <mesh position={[0, -0.02, 0.02]}>
            <boxGeometry args={[0.07, 0.03, 0.13]} />
            <primitive object={BOOT_MAT} attach="material" />
          </mesh>
          <mesh position={[0, 0.01, -0.01]}>
            <boxGeometry args={[0.065, 0.04, 0.10]} />
            <primitive object={BOOT_MAT} attach="material" />
          </mesh>
          <mesh position={[0, 0.0, 0.06]}>
            <sphereGeometry args={[0.032, 8, 8]} />
            <primitive object={BOOT_MAT} attach="material" />
          </mesh>
        </group>
      </group>

    </group>
  );
}
