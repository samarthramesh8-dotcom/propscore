"use client";

interface ScoreRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  /** Render the glow halo (default true, set false for tiny variants) */
  glow?: boolean;
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

export default function ScoreRing({
  score,
  size = 140,
  strokeWidth = 10,
  glow = true,
}: ScoreRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = scoreHex(score);
  const rgb = glowRgb(score);

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
        {/* Progress arc */}
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
            transition: "stroke-dashoffset 0.7s cubic-bezier(0.4, 0, 0.2, 1)",
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
          {score}
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
