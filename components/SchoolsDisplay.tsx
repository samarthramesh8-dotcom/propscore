import { SchoolInfo } from "@/lib/analysis";

interface SchoolsDisplayProps {
  schools: SchoolInfo[];
}

function ratingStyle(score: number): React.CSSProperties {
  if (score >= 8) {
    return {
      background: "rgba(0,210,106,0.12)",
      color: "var(--score-green)",
      border: "1px solid rgba(0,210,106,0.25)",
    };
  }
  if (score >= 6) {
    return {
      background: "rgba(245,166,35,0.12)",
      color: "var(--score-amber)",
      border: "1px solid rgba(245,166,35,0.25)",
    };
  }
  return {
    background: "rgba(232,56,79,0.12)",
    color: "var(--score-red)",
    border: "1px solid rgba(232,56,79,0.25)",
  };
}

export default function SchoolsDisplay({ schools }: SchoolsDisplayProps) {
  if (schools.length === 0) return null;

  return (
    <div className="ps-grid-3col">
      {schools.map((school, i) => (
        <div
          key={i}
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
            borderRadius: 10,
            padding: "16px 18px",
          }}
        >
          <div
            style={{
              display: "flex", justifyContent: "space-between",
              alignItems: "flex-start", marginBottom: 8,
            }}
          >
            <span
              style={{
                fontSize: 9, fontWeight: 600, letterSpacing: "0.14em",
                textTransform: "uppercase", color: "var(--text-muted)",
              }}
            >
              {school.type}
            </span>
            <span
              style={{
                fontSize: 13, fontWeight: 700, padding: "2px 8px",
                borderRadius: 6, flexShrink: 0,
                ...ratingStyle(school.rating),
              }}
            >
              {school.rating}/10
            </span>
          </div>

          <div
            style={{
              fontSize: 13, fontWeight: 600, color: "var(--text-primary)",
              marginBottom: 4, lineHeight: 1.3,
            }}
          >
            {school.name}
          </div>

          <div
            style={{
              fontSize: 11, color: "var(--text-secondary)",
              marginBottom: school.distance ? 6 : 0,
            }}
          >
            {school.grades}
          </div>

          {school.distance !== undefined && (
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
              {school.distance.toFixed(1)} mi away
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
