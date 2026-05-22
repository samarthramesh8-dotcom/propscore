"use client";

interface ScoreRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
}

function scoreColor(score: number) {
  if (score >= 75) return { stroke: "#10b981", text: "#10b981", label: "Strong buy" };
  if (score >= 60) return { stroke: "#f59e0b", text: "#f59e0b", label: "Neutral" };
  if (score >= 40) return { stroke: "#f97316", text: "#f97316", label: "Caution" };
  return { stroke: "#ef4444", text: "#ef4444", label: "Avoid" };
}

export default function ScoreRing({ score, size = 140, strokeWidth = 9 }: ScoreRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const { stroke, text, label } = scoreColor(score);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          {/* Track */}
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth={strokeWidth}
          />
          {/* Progress */}
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none"
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)", filter: `drop-shadow(0 0 6px ${stroke}60)` }}
          />
        </svg>
        {/* Center text */}
        <div className="absolute flex flex-col items-center leading-none">
          <span className="text-3xl font-bold tabular-nums" style={{ color: text }}>{score}</span>
          <span className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest">/ 100</span>
        </div>
      </div>
      <span className="text-xs font-medium uppercase tracking-widest" style={{ color: text }}>{label}</span>
    </div>
  );
}
