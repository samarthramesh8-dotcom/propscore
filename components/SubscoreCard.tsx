interface SubscoreCardProps {
  category: string;
  score: number;
  summary: string;
}

function barColor(score: number): string {
  if (score >= 75) return "var(--score-green)";
  if (score >= 50) return "var(--score-amber)";
  return "var(--score-red)";
}

export default function SubscoreCard({ category, score, summary }: SubscoreCardProps) {
  const color = barColor(score);

  return (
    <div
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-subtle)",
        borderRadius: 10,
        padding: "16px 18px",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
          }}
        >
          {category}
        </span>
        <span
          className="font-mono font-medium tabular-nums"
          style={{ fontSize: 17, lineHeight: 1, color, letterSpacing: "-0.01em" }}
        >
          {score}
        </span>
      </div>

      {/* Progress bar */}
      <div
        style={{
          height: 3,
          background: "var(--border-subtle)",
          borderRadius: 999,
          overflow: "hidden",
          marginBottom: 12,
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${score}%`,
            background: color,
            borderRadius: 999,
            transition: "width 0.65s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        />
      </div>

      {/* Summary */}
      <p
        style={{
          fontSize: 12,
          lineHeight: 1.65,
          color: "var(--text-secondary)",
          margin: 0,
        }}
      >
        {summary}
      </p>
    </div>
  );
}
