"use client";

/**
 * /src/components/ui/Skeleton.tsx
 *
 * Reusable shimmer skeleton components for loading states.
 * Uses the .skeleton CSS class defined in globals.css.
 */

import { type ReactNode } from "react";

interface SkeletonProps {
  className?: string;
  width?:     string | number;
  height?:    string | number;
  rounded?:   boolean;
}

/** Single skeleton bar */
export default function Skeleton({ className = "", width, height, rounded }: SkeletonProps) {
  return (
    <div
      className={`skeleton ${rounded ? "rounded-full" : "rounded"} ${className}`}
      style={{
        width:  width  ?? "100%",
        height: height ?? "1rem",
      }}
      aria-hidden="true"
    />
  );
}

/** Card skeleton with title + body lines */
export function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="rounded-xl border border-[#1e3a5f] bg-[#050a14] p-4 space-y-3" aria-busy="true" aria-label="Loading">
      <Skeleton height="1rem" width="60%" />
      <Skeleton height="0.625rem" width="40%" />
      <div className="space-y-2 pt-1">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} height="0.75rem" width={i === lines - 1 ? "70%" : "100%"} />
        ))}
      </div>
    </div>
  );
}

/** News card skeleton */
export function NewsCardSkeleton() {
  return (
    <div className="rounded-xl border border-[#1e3a5f] bg-[#050a14] p-4 space-y-3" aria-busy="true">
      <div className="flex gap-2">
        <Skeleton height="1.5rem" width="3rem" rounded />
        <Skeleton height="1.5rem" width="4rem" rounded />
      </div>
      <Skeleton height="1.1rem" width="90%" />
      <Skeleton height="1.1rem" width="75%" />
      <Skeleton height="0.75rem" width="100%" />
      <Skeleton height="0.75rem" width="85%" />
      <Skeleton height="0.75rem" width="60%" />
    </div>
  );
}

/** Stat card skeleton */
export function StatCardSkeleton() {
  return (
    <div className="rounded-xl border border-[#1e3a5f] bg-[#050a14] p-4 space-y-2" aria-busy="true">
      <Skeleton height="0.625rem" width="50%" />
      <Skeleton height="2rem" width="40%" />
      <Skeleton height="0.5rem" width="30%" />
    </div>
  );
}

/** Table row skeletons */
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2" aria-busy="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-3">
          <Skeleton height="2.5rem" width="2.5rem" rounded />
          <div className="flex-1 space-y-1.5">
            <Skeleton height="0.875rem" width="60%" />
            <Skeleton height="0.625rem" width="40%" />
          </div>
          <Skeleton height="0.875rem" width="4rem" />
        </div>
      ))}
    </div>
  );
}

/** Full-page loading overlay */
export function PageSkeleton({ title }: { title?: string }) {
  return (
    <div className="min-h-screen bg-[#000000] p-6 md:p-8 space-y-5" aria-busy="true" aria-label={`Loading ${title ?? "page"}`}>
      {title && (
        <div className="space-y-2">
          <Skeleton height="2rem" width="12rem" />
          <Skeleton height="0.875rem" width="20rem" />
        </div>
      )}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => <NewsCardSkeleton key={i} />)}
      </div>
    </div>
  );
}

/** Inline loading spinner */
export function Spinner({ size = 20, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className={`animate-spin text-[#1e3a5f] ${className}`}
      aria-label="Loading"
    >
      <path d="M12 2a10 10 0 1 0 10 10" strokeLinecap="round" />
    </svg>
  );
}

/** WebGL not supported fallback */
export function WebGLFallback({ message }: { message?: string }) {
  return (
    <div className="w-full h-full flex items-center justify-center bg-[#000000] rounded-xl border border-[#1e3a5f]">
      <div className="text-center p-6 max-w-xs">
        <div className="text-3xl mb-3">🤖</div>
        <p className="text-sm font-semibold text-[#e0f2fe] mb-1">3D Scene Unavailable</p>
        <p className="text-xs text-[#7dd3fc] leading-relaxed">
          {message ??
            "WebGL2 is required for the 3D robot companion. Try Chrome, Firefox, or Edge for the full experience."}
        </p>
      </div>
    </div>
  );
}

/** Suspense-compatible error boundary wrapper */
export function SuspenseFallback({ children }: { children?: ReactNode }) {
  return (
    <div className="w-full animate-pulse">
      {children ?? <Skeleton height="8rem" />}
    </div>
  );
}
