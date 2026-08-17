"use client";

/**
 * DataTransferEffect.tsx
 *
 * R3F particle animation: gold data points flow from the robot along a
 * CatmullRomCurve3 arc to a portable device icon on the right side.
 *
 * Props:
 *   active   — true while the animation is playing
 *   onDone   — called after ~2 seconds
 */

import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface DataTransferEffectProps {
  active:  boolean;
  onDone?: () => void;
}

const PARTICLE_COUNT  = 60;
const ANIMATION_SECS  = 2.2;

export default function DataTransferEffect({ active, onDone }: DataTransferEffectProps) {
  const pointsRef  = useRef<THREE.Points>(null);
  const startTime  = useRef<number | null>(null);
  const notifiedRef = useRef(false);

  // CatmullRom curve: robot chest → arc up → device icon position
  const curve = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0,    0.1,  0.18),  // robot chest
        new THREE.Vector3(0.4,  0.5,  0.3),   // arc apex
        new THREE.Vector3(0.9,  0.2,  0.0),   // mid point
        new THREE.Vector3(1.4,  -0.1, 0.0),   // device position
      ]),
    []
  );

  // Pre-compute positions (static at t=0; we animate t per-particle in useFrame)
  const { geometry, offsets } = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const offs      = new Float32Array(PARTICLE_COUNT); // stagger 0-1

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      offs[i] = i / PARTICLE_COUNT;
      const pt = curve.getPoint(offs[i]);
      positions[i * 3]     = pt.x;
      positions[i * 3 + 1] = pt.y;
      positions[i * 3 + 2] = pt.z;
    }
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return { geometry: geo, offsets: offs };
  }, [curve]);

  // Gold point material
  const material = useMemo(
    () =>
      new THREE.PointsMaterial({
        color:       0xe6c974,
        size:        0.035,
        transparent: true,
        opacity:     0.9,
        sizeAttenuation: true,
        blending: THREE.AdditiveBlending,
        depthWrite:  false,
      }),
    []
  );

  useEffect(() => {
    if (active) {
      startTime.current  = null;
      notifiedRef.current = false;
    }
  }, [active]);

  useFrame((_, delta) => {
    if (!active || !pointsRef.current) return;

    // Capture start time on first frame of animation
    if (startTime.current === null) {
      startTime.current = performance.now();
    }

    const elapsed = (performance.now() - startTime.current) / 1000; // seconds
    const progress = Math.min(elapsed / ANIMATION_SECS, 1);

    const posArr = pointsRef.current.geometry.attributes.position.array as Float32Array;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // Each particle progresses along the curve; stagger by offset
      const t = (progress + offsets[i]) % 1;
      const pt = curve.getPoint(t);
      posArr[i * 3]     = pt.x;
      posArr[i * 3 + 1] = pt.y + Math.sin(t * Math.PI * 4) * 0.03; // subtle scatter
      posArr[i * 3 + 2] = pt.z;
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true;

    // Fade out in last 20% of animation
    material.opacity = progress > 0.8 ? (1 - progress) / 0.2 * 0.9 : 0.9;

    if (progress >= 1 && !notifiedRef.current) {
      notifiedRef.current = true;
      onDone?.();
    }
  });

  if (!active) return null;

  return (
    <>
      {/* Device target icon (simple flat box) */}
      <mesh position={[1.4, -0.1, 0]}>
        <boxGeometry args={[0.12, 0.18, 0.015]} />
        <meshStandardMaterial
          color={0xe6c974}
          emissive={new THREE.Color(0xe6c974)}
          emissiveIntensity={0.5}
          metalness={0.8}
          roughness={0.1}
        />
      </mesh>
      <mesh position={[1.4, -0.1, 0.01]}>
        <planeGeometry args={[0.07, 0.1]} />
        <meshStandardMaterial
          color={0x1a1816}
          emissive={new THREE.Color(0x8369ce)}
          emissiveIntensity={0.6}
        />
      </mesh>

      {/* Particles */}
      <points ref={pointsRef} geometry={geometry} material={material} />
    </>
  );
}
