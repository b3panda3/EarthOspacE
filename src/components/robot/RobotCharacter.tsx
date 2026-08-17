"use client";

/**
 * RobotCharacter.tsx — Human-like AI Companion (ORB-I)
 *
 * A stylised humanoid figure built from Three.js primitives.
 * Gender-aware: physique adapts based on user profile (male/female),
 * always race-neutral with a warm bronze skin tone.
 *
 * Structure:
 *   <group> root (floats on sine wave)
 *     Head       — sphere with face plate (visor)
 *     Neck       — cylinder
 *     Torso      — capsule (gender-adaptive width)
 *     Arms       — upper + lower + hands (gender-adaptive)
 *     Legs       — upper + lower + feet
 *     Chest light — emissive panel (AI indicator)
 *     Antenna    — head-mounted communication array
 */

import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Sphere, MeshDistortMaterial } from "@react-three/drei";
import * as THREE from "three";

export type RobotState = "idle" | "thinking" | "speaking" | "wave";

interface RobotCharacterProps {
  state?: RobotState;
  gender?: "male" | "female";
}

// ─── Materials (memoised) ─────────────────────────────────────────────────

const SKIN_MAT = new THREE.MeshStandardMaterial({
  color:     0xc68642,
  roughness: 0.55,
  metalness: 0.05,
});

const SUIT_MAT = new THREE.MeshStandardMaterial({
  color:     0xdde8f0,
  roughness: 0.25,
  metalness: 0.4,
});

const SUIT_DARK_MAT = new THREE.MeshStandardMaterial({
  color:     0x2a2820,
  roughness: 0.5,
  metalness: 0.3,
});

const GOLD_MAT = new THREE.MeshStandardMaterial({
  color:     0xe6c974,
  roughness: 0.1,
  metalness: 0.85,
  emissive:  new THREE.Color(0xe6c974),
  emissiveIntensity: 0.15,
});

const VISOR_MAT = new THREE.MeshStandardMaterial({
  color:     0xe6c974,
  roughness: 0.0,
  metalness: 1.0,
  emissive:  new THREE.Color(0xe6a030),
  emissiveIntensity: 0.6,
  side: THREE.FrontSide,
});

const JOINT_MAT = new THREE.MeshStandardMaterial({
  color:     0x888888,
  roughness: 0.3,
  metalness: 0.8,
});

const BOOT_MAT = new THREE.MeshStandardMaterial({
  color:     0x1a1816,
  roughness: 0.4,
  metalness: 0.5,
});

// ─── Component ────────────────────────────────────────────────────────────

export default function RobotCharacter({ state = "idle", gender = "male" }: RobotCharacterProps) {
  const rootRef      = useRef<THREE.Group>(null);
  const headRef      = useRef<THREE.Group>(null);
  const rightArmRef  = useRef<THREE.Group>(null);
  const leftArmRef   = useRef<THREE.Group>(null);
  const visorMeshRef = useRef<THREE.Mesh>(null);
  const glowLightRef = useRef<THREE.PointLight>(null);
  const chestLightRef = useRef<THREE.Mesh>(null);

  const clock = useMemo(() => new THREE.Clock(), []);
  const stateRef = useRef(state);
  const genderRef = useRef(gender);
  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { genderRef.current = gender; }, [gender]);

  // Gender-adaptive dimensions
  const dims = useMemo(() => {
    if (gender === "female") {
      return {
        shoulderW: 0.30, torsoW: 0.32, torsoH: 0.50, hipW: 0.34,
        armThick: 0.048, thighThick: 0.072, totalH: -0.05,
        chestY: 0.15,
      };
    }
    return {
      shoulderW: 0.38, torsoW: 0.38, torsoH: 0.52, hipW: 0.30,
      armThick: 0.058, thighThick: 0.068, totalH: 0.0,
      chestY: 0.18,
    };
  }, [gender]);

  useFrame(() => {
    const t   = clock.getElapsedTime();
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
      } else if (cur === "speaking") {
        head.rotation.x = Math.sin(t * 8) * 0.03;
        head.rotation.z = 0;
      } else {
        head.rotation.x += (0 - head.rotation.x) * 0.05;
        head.rotation.z += (0 - head.rotation.z) * 0.05;
      }
    }

    // ── Arm animations ───────────────────────────────────────────────────
    if (rArm) {
      if (cur === "wave") {
        rArm.rotation.z = -0.6 + Math.sin(t * 6) * 0.5;
        rArm.rotation.x = -0.3;
      } else if (cur === "speaking") {
        rArm.rotation.z = -0.1 + Math.sin(t * 3) * 0.12;
        rArm.rotation.x += (0 - rArm.rotation.x) * 0.05;
      } else {
        rArm.rotation.z += (-0.08 - rArm.rotation.z) * 0.04;
        rArm.rotation.x += (0 - rArm.rotation.x) * 0.04;
      }
    }

    if (lArm) {
      if (cur === "speaking") {
        lArm.rotation.z = 0.1 + Math.sin(t * 2.8 + 0.8) * 0.1;
      } else {
        lArm.rotation.z += (0.08 - lArm.rotation.z) * 0.04;
      }
    }

    // ── Visor glow ───────────────────────────────────────────────────────
    if (visorMeshRef.current) {
      const mat = visorMeshRef.current.material as THREE.MeshStandardMaterial;
      if (cur === "thinking") {
        mat.emissiveIntensity = 0.4 + Math.sin(t * 4) * 0.3;
        mat.emissive.set(0xff8800);
      } else if (cur === "speaking") {
        mat.emissiveIntensity = 0.6 + Math.sin(t * 12) * 0.25;
        mat.emissive.set(0xe6c974);
      } else {
        mat.emissiveIntensity += (0.6 - mat.emissiveIntensity) * 0.04;
        mat.emissive.lerp(new THREE.Color(0xe6a030), 0.05);
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
        color="#e6c974"
        intensity={1.0}
        distance={3.5}
        decay={2}
      />

      {/* ═══ HEAD GROUP ═══ */}
      <group ref={headRef} position={[0, 1.18, 0]}>
        {/* Skull */}
        <Sphere args={[0.16, 20, 20]}>
          <primitive object={SKIN_MAT} attach="material" />
        </Sphere>

        {/* Visor / face plate */}
        <mesh ref={visorMeshRef} position={[0, -0.01, 0.11]} rotation={[0.15, 0, 0]}>
          <sphereGeometry args={[0.12, 18, 18, 0, Math.PI * 2, 0, Math.PI * 0.48]} />
          <primitive object={VISOR_MAT} attach="material" />
        </mesh>

        {/* Helmet shell (transparent-ish white) */}
        <Sphere args={[0.19, 20, 20]}>
          <meshStandardMaterial
            color={0xdde8f0}
            transparent
            opacity={0.18}
            roughness={0.1}
            metalness={0.3}
            side={THREE.FrontSide}
          />
        </Sphere>

        {/* Helmet rim */}
        <mesh position={[0, -0.12, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.17, 0.014, 8, 32]} />
          <primitive object={GOLD_MAT} attach="material" />
        </mesh>

        {/* Antenna */}
        <mesh position={[0.08, 0.18, 0]}>
          <cylinderGeometry args={[0.006, 0.006, 0.12, 6]} />
          <primitive object={JOINT_MAT} attach="material" />
        </mesh>
        <mesh position={[0.08, 0.26, 0]}>
          <sphereGeometry args={[0.015, 6, 6]} />
          <primitive object={GOLD_MAT} attach="material" />
        </mesh>
      </group>

      {/* ═══ NECK ═══ */}
      <mesh position={[0, 0.98, 0]}>
        <cylinderGeometry args={[0.055, 0.065, 0.08, 10]} />
        <primitive object={SKIN_MAT} attach="material" />
      </mesh>

      {/* ═══ TORSO ═══ */}
      <mesh position={[0, 0.65, 0]}>
        <capsuleGeometry args={[dims.torsoW / 2, dims.torsoH, 8, 16]} />
        <primitive object={SUIT_MAT} attach="material" />
      </mesh>

      {/* Gold chest stripes */}
      <mesh position={[0, dims.chestY, dims.torsoW / 2 + 0.005]}>
        <boxGeometry args={[dims.torsoW * 0.75, 0.03, 0.008]} />
        <primitive object={GOLD_MAT} attach="material" />
      </mesh>
      <mesh position={[0, dims.chestY - 0.1, dims.torsoW / 2 + 0.005]}>
        <boxGeometry args={[dims.torsoW * 0.55, 0.025, 0.008]} />
        <primitive object={GOLD_MAT} attach="material" />
      </mesh>

      {/* Chest AI indicator panel */}
      <mesh ref={chestLightRef} position={[0, dims.chestY - 0.22, dims.torsoW / 2 + 0.005]}>
        <circleGeometry args={[0.04, 16]} />
        <meshStandardMaterial
          color={0x8369ce}
          emissive={new THREE.Color(0x8369ce)}
          emissiveIntensity={0.4}
          roughness={0.1}
        />
      </mesh>

      {/* ═══ RIGHT ARM ═══ */}
      <group ref={rightArmRef} position={[dims.shoulderW / 2 + 0.05, 0.82, 0]}>
        <mesh><sphereGeometry args={[0.055, 8, 8]} /><primitive object={JOINT_MAT} attach="material" /></mesh>
        <mesh position={[0.0, -0.15, 0]} rotation={[0, 0, -0.15]}>
          <capsuleGeometry args={[dims.armThick, 0.20, 4, 8]} />
          <primitive object={SUIT_MAT} attach="material" />
        </mesh>
        <mesh position={[0.02, -0.32, 0]}>
          <sphereGeometry args={[0.042, 8, 8]} /><primitive object={JOINT_MAT} attach="material" />
        </mesh>
        <mesh position={[0.01, -0.46, 0]} rotation={[0, 0, -0.08]}>
          <capsuleGeometry args={[dims.armThick * 0.82, 0.18, 4, 8]} />
          <primitive object={SUIT_MAT} attach="material" />
        </mesh>
        <mesh position={[0.0, -0.58, 0]}>
          <sphereGeometry args={[0.04, 8, 8]} /><primitive object={SKIN_MAT} attach="material" />
        </mesh>
      </group>

      {/* ═══ LEFT ARM ═══ */}
      <group ref={leftArmRef} position={[-(dims.shoulderW / 2 + 0.05), 0.82, 0]}>
        <mesh><sphereGeometry args={[0.055, 8, 8]} /><primitive object={JOINT_MAT} attach="material" /></mesh>
        <mesh position={[0.0, -0.15, 0]} rotation={[0, 0, 0.15]}>
          <capsuleGeometry args={[dims.armThick, 0.20, 4, 8]} />
          <primitive object={SUIT_MAT} attach="material" />
        </mesh>
        <mesh position={[-0.02, -0.32, 0]}>
          <sphereGeometry args={[0.042, 8, 8]} /><primitive object={JOINT_MAT} attach="material" />
        </mesh>
        <mesh position={[-0.01, -0.46, 0]} rotation={[0, 0, 0.08]}>
          <capsuleGeometry args={[dims.armThick * 0.82, 0.18, 4, 8]} />
          <primitive object={SUIT_MAT} attach="material" />
        </mesh>
        <mesh position={[0.0, -0.58, 0]}>
          <sphereGeometry args={[0.04, 8, 8]} /><primitive object={SKIN_MAT} attach="material" />
        </mesh>
      </group>

      {/* ═══ HIP / BELT ═══ */}
      <mesh position={[0, 0.33, 0]}>
        <capsuleGeometry args={[dims.hipW / 2, 0.06, 6, 12]} />
        <primitive object={SUIT_DARK_MAT} attach="material" />
      </mesh>

      {/* ═══ RIGHT LEG ═══ */}
      <group position={[dims.hipW / 3, 0.28, 0]}>
        <mesh position={[0, -0.16, 0]}>
          <capsuleGeometry args={[dims.thighThick, 0.22, 4, 8]} />
          <primitive object={SUIT_MAT} attach="material" />
        </mesh>
        <mesh position={[0, -0.36, 0]}>
          <sphereGeometry args={[0.04, 8, 8]} /><primitive object={JOINT_MAT} attach="material" />
        </mesh>
        <mesh position={[0, -0.50, 0]}>
          <capsuleGeometry args={[dims.thighThick * 0.85, 0.20, 4, 8]} />
          <primitive object={SUIT_MAT} attach="material" />
        </mesh>
        {/* Boot */}
        <mesh position={[0, -0.64, 0.03]}>
          <boxGeometry args={[dims.thighThick * 2.2, 0.10, 0.12]} />
          <primitive object={BOOT_MAT} attach="material" />
        </mesh>
      </group>

      {/* ═══ LEFT LEG ═══ */}
      <group position={[-(dims.hipW / 3), 0.28, 0]}>
        <mesh position={[0, -0.16, 0]}>
          <capsuleGeometry args={[dims.thighThick, 0.22, 4, 8]} />
          <primitive object={SUIT_MAT} attach="material" />
        </mesh>
        <mesh position={[0, -0.36, 0]}>
          <sphereGeometry args={[0.04, 8, 8]} /><primitive object={JOINT_MAT} attach="material" />
        </mesh>
        <mesh position={[0, -0.50, 0]}>
          <capsuleGeometry args={[dims.thighThick * 0.85, 0.20, 4, 8]} />
          <primitive object={SUIT_MAT} attach="material" />
        </mesh>
        <mesh position={[0, -0.64, 0.03]}>
          <boxGeometry args={[dims.thighThick * 2.2, 0.10, 0.12]} />
          <primitive object={BOOT_MAT} attach="material" />
        </mesh>
      </group>

    </group>
  );
}
