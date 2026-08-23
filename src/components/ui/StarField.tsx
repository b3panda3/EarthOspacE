"use client";

import { useMemo } from "react";

interface Star {
  id: number;
  top: string;
  left: string;
  size: number;
  animationDelay: string;
  animationDuration: string;
  opacity: number;
}

/** Deterministic pseudo-random seeded by index so SSR/CSR match. */
function seededRand(seed: number): number {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

function generateStars(count: number): Star[] {
  return Array.from({ length: count }, (_, i) => {
    const r1 = seededRand(i * 3);
    const r2 = seededRand(i * 3 + 1);
    const r3 = seededRand(i * 3 + 2);
    const r4 = seededRand(i * 3 + 3);
    const r5 = seededRand(i * 3 + 4);
    return {
      id: i,
      top: `${(r1 * 100).toFixed(2)}%`,
      left: `${(r2 * 100).toFixed(2)}%`,
      size: 1 + Math.floor(r3 * 3), // 1-3 px
      animationDelay: `${(r4 * 8).toFixed(2)}s`,
      animationDuration: `${(3 + r5 * 5).toFixed(2)}s`,
      opacity: Math.round((0.3 + r1 * 0.7) * 10000) / 10000,
    };
  });
}

export default function StarField() {
  const stars = useMemo(() => generateStars(220), []);

  return (
    <>
      {/* CSS keyframe definitions injected once */}
      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: var(--star-op); transform: scale(1); }
          50%       { opacity: calc(var(--star-op) * 0.2); transform: scale(0.7); }
        }
        @keyframes drift {
          0%   { transform: translateY(0px) translateX(0px); }
          33%  { transform: translateY(-4px) translateX(2px); }
          66%  { transform: translateY(2px) translateX(-3px); }
          100% { transform: translateY(0px) translateX(0px); }
        }
      `}</style>

      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 overflow-hidden"
        style={{ zIndex: 0 }}
      >
        {stars.map((star) => (
          <span
            key={star.id}
            style={
              {
                position: "absolute",
                top: star.top,
                left: star.left,
                width: `${star.size}px`,
                height: `${star.size}px`,
                borderRadius: "50%",
                backgroundColor: "#ffffff",
                "--star-op": String(star.opacity.toFixed(4)),
                opacity: star.opacity,
                animation: `twinkle ${star.animationDuration} ${star.animationDelay} ease-in-out infinite, drift ${(parseFloat(star.animationDuration) * 2).toFixed(2)}s ${star.animationDelay} ease-in-out infinite`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>
    </>
  );
}
