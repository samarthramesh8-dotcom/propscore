interface SubscoreCardProps {
  category: string;
  score: number;
  summary: string;
  /** Position in the breakdown — staggers the verdict-reveal assemble. */
  index?: number;
}

function barColor(score: number): string {
  if (score >= 75) return "var(--score-green)";
  if (score >= 50) return "var(--score-amber)";
  return "var(--score-red)";
}

export default function SubscoreCard({ category, score, summary, index = 0 }: SubscoreCardProps) {
  const color = barColor(score);
  const delay = `${index * 70}ms`;

  return (
    <div
      className="verdict-rise"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-subtle)",
        borderRadius: 10,
        padding: "16px 18px",
        animationDelay: delay,
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

      {/* Progress bar — fills left-to-right as part of the verdict reveal */}
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
          className="verdict-bar-fill"
          style={{
            height: "100%",
            width: `${score}%`,
            background: color,
            borderRadius: 999,
            animationDelay: `calc(${delay} + 80ms)`,
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
