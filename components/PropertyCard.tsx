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
        padding: "18px 20px",
        textDecoration: "none",
      }}
    >
      <div className="flex gap-5 items-start">
        {/* Score ring — no glow on cards to keep density */}
        <div className="shrink-0 mt-0.5">
          <ScoreRing score={property.overall_score} size={56} strokeWidth={5} glow={false} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Address */}
          <p
            className="ps-prop-address"
            style={{
              fontSize: 13,
              fontWeight: 600,
              margin: "0 0 10px 0",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {property.address}
          </p>

          {/* Compact subscore bars */}
          <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 12 }}>
            {property.subscores.map((s) => (
              <div key={s.category} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 600,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "var(--text-muted)",
                    width: 64,
                    flexShrink: 0,
                  }}
                >
                  {s.category}
                </span>
                <div
                  style={{
                    flex: 1,
                    height: 3,
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
                <span
                  className="font-mono tabular-nums"
                  style={{
                    fontSize: 10,
                    color: "var(--text-secondary)",
                    width: 20,
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
          <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
            <p
              style={{
                fontSize: 11,
                color: "var(--text-muted)",
                margin: 0,
                flex: 1,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                fontStyle: "italic",
              }}
            >
              {property.verdict}
            </p>
            <span
              className="font-mono"
              style={{
                fontSize: 10,
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
