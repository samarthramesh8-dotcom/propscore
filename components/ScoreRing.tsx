"use client";

import { useEffect, useRef, useState } from "react";

interface ScoreRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  /** Render the glow halo (default true, set false for tiny variants) */
  glow?: boolean;
  /** Count the number up and draw the arc on mount (default true).
   *  The verdict-reveal moment. Disable on dense lists to stay scannable. */
  animate?: boolean;
}

export function scoreHex(score: number): string {
  if (score >= 75) return "var(--score-green)";
  if (score >= 50) return "var(--score-amber)";
  return "var(--score-red)";
}

function glowRgb(score: number): string {
  if (score >= 75) return "0, 210, 106";
  if (score >= 50) return "245, 166, 35";
  return "232, 56, 79";
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

export default function ScoreRing({
  score,
  size = 140,
  strokeWidth = 10,
  glow = true,
  animate = true,
}: ScoreRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // The displayed value tweens 0 → score on mount; the arc + number both read
  // from it so they rise together. Colour is pinned to the FINAL score so it
  // never flickers through green/amber/red on the way up.
  const [display, setDisplay] = useState(animate ? 0 : score);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!animate || prefersReducedMotion()) {
      setDisplay(score);
      return;
    }
    const DURATION = 520;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / DURATION, 1);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setDisplay(score * eased);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [score, animate]);

  const color = scoreHex(score);
  const rgb = glowRgb(score);
  const offset = circumference - (display / 100) * circumference;

  return (
    <div
      className="relative inline-flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      {/* Ambient glow ring */}
      {glow && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            boxShadow: `0 0 ${Math.round(size * 0.28)}px rgba(${rgb}, 0.2), 0 0 ${Math.round(size * 0.55)}px rgba(${rgb}, 0.07)`,
            pointerEvents: "none",
          }}
        />
      )}

      <svg
        width={size}
        height={size}
        className="-rotate-90"
        style={{ position: "relative", zIndex: 1 }}
      >
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border-subtle)"
          strokeWidth={strokeWidth}
        />
        {/* Progress arc — offset driven by the count-up so no CSS transition needed */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{
            filter: glow
              ? `drop-shadow(0 0 4px rgba(${rgb}, 0.75)) drop-shadow(0 0 10px rgba(${rgb}, 0.35))`
              : undefined,
          }}
        />
      </svg>

      {/* Center label */}
      <div
        className="absolute flex flex-col items-center leading-none"
        style={{ zIndex: 2 }}
      >
        <span
          className="font-mono font-medium tabular-nums"
          style={{
            color,
            fontSize: Math.round(size * 0.22),
            letterSpacing: "-0.02em",
          }}
        >
          {Math.round(display)}
        </span>
        <span
          style={{
            fontSize: Math.round(size * 0.095),
            color: "var(--text-muted)",
            marginTop: Math.round(size * 0.03),
            letterSpacing: "0.06em",
          }}
        >
          / 100
        </span>
      </div>
    </div>
  );
}
