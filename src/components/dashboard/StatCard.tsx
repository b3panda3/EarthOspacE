"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import Card from "@/components/ui/Card";

interface StatCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  /** Badge accent colour token */
  accentColor?: string;
  delta?: string; // e.g. "+3 since yesterday"
}

/** Smooth animated count from 0 → target */
function useAnimatedCount(target: number, duration = 900) {
  const [count, setCount] = useState(0);
  const raf = useRef<number>(0);

  useEffect(() => {
    const start = performance.now();
    const from = 0;
    function step(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out-cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(from + (target - from) * eased));
      if (progress < 1) raf.current = requestAnimationFrame(step);
    }
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);

  return count;
}

export default function StatCard({
  label,
  value,
  icon: Icon,
  accentColor = "#38bdf8",
  delta,
}: StatCardProps) {
  const animated = useAnimatedCount(value);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <Card variant="elevated" className="flex items-center gap-4">
        {/* Icon bucket */}
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
          style={{ background: `${accentColor}18` }}
          aria-hidden="true"
        >
          <Icon size={22} style={{ color: accentColor }} />
        </div>

        {/* Text */}
        <div className="min-w-0">
          <p
            className="text-2xl font-bold tabular-nums"
            style={{ color: accentColor }}
            aria-label={`${label}: ${value}`}
          >
            {animated}
          </p>
          <p className="text-xs text-[#7dd3fc] truncate mt-0.5">{label}</p>
          {delta && (
            <p className="text-[10px] text-[#1e3a5f] mt-0.5">{delta}</p>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
