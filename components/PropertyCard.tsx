import Link from "next/link";
import { Property } from "@/lib/types";
import ScoreRing from "./ScoreRing";

function barColor(score: number): string {
  if (score >= 75) return "var(--score-green)";
  if (score >= 50) return "var(--score-amber)";
  return "var(--score-red)";
}

export default function PropertyCard({ property }: { property: Property }) {
  const date = new Date(property.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <Link
      href={`/property/${property.id}`}
      className="ps-prop-card"
      style={{
        display: "block",
        background: "var(--bg-surface)",
        borderRadius: 10,
        padding: "20px 24px",
        textDecoration: "none",
      }}
    >
      <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
        {/* Score ring */}
        <div style={{ flexShrink: 0 }}>
          <ScoreRing score={property.overall_score} size={64} strokeWidth={6} glow={false} />
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Address */}
          <p
            className="ps-prop-address"
            style={{
              fontSize: 14,
              fontWeight: 600,
              margin: "0 0 12px 0",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              letterSpacing: "-0.01em",
            }}
          >
            {property.address}
          </p>

          {/* Compact subscore bars */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
            {property.subscores.map((s) => (
              <div key={s.category} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {/* Category label — single line, truncated */}
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "var(--text-muted)",
                    width: 100,
                    flexShrink: 0,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {s.category}
                </span>

                {/* Bar */}
                <div
                  style={{
                    flex: 1,
                    height: 4,
                    background: "var(--border-subtle)",
                    borderRadius: 999,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${s.score}%`,
                      background: barColor(s.score),
                      borderRadius: 999,
                    }}
                  />
                </div>

                {/* Score */}
                <span
                  className="font-mono tabular-nums"
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    color: "var(--text-secondary)",
                    width: 22,
                    textAlign: "right",
                    flexShrink: 0,
                  }}
                >
                  {s.score}
                </span>
              </div>
            ))}
          </div>

          {/* Verdict + date */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <p
              style={{
                fontSize: 12,
                color: "var(--text-muted)",
                margin: 0,
                flex: 1,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                fontStyle: "italic",
                lineHeight: 1.4,
              }}
            >
              {property.verdict}
            </p>
            <span
              className="font-mono"
              style={{
                fontSize: 11,
                color: "var(--text-muted)",
                flexShrink: 0,
              }}
            >
              {date}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
