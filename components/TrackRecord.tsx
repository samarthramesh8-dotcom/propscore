import { OutcomeStats } from "@/lib/types";

// Dashboard track-record summary (Phase 4) — how PropScore's verdicts have
// actually performed, from the property_outcomes table. Below MIN_TRACKED
// outcomes we show a progress message instead of a misleading small-sample
// percentage.

const MIN_TRACKED = 5;

export default function TrackRecord({ stats }: { stats: OutcomeStats }) {
  if (stats.totalTracked === 0) return null; // nothing tracked — stay out of the way

  const labelStyle: React.CSSProperties = {
    fontSize: 9, fontWeight: 600, letterSpacing: "0.12em",
    textTransform: "uppercase", color: "var(--text-muted)",
  };

  return (
    <div
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-subtle)",
        borderRadius: 8,
        padding: "12px 16px",
        marginBottom: 8,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 10 }}>
        <p style={labelStyle}>Verdict track record</p>
        <span className="font-mono" style={{ fontSize: 10, color: "var(--text-muted)" }}>
          {stats.totalTracked} tracked {stats.totalTracked === 1 ? "outcome" : "outcomes"}
        </span>
      </div>

      {stats.totalTracked < MIN_TRACKED ? (
        <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0, lineHeight: 1.6 }}>
          Not enough data yet — log {MIN_TRACKED - stats.totalTracked} more{" "}
          {MIN_TRACKED - stats.totalTracked === 1 ? "outcome" : "outcomes"} on your properties to see
          win rates by verdict tier.
        </p>
      ) : (
        <div style={{ display: "flex", gap: 0, flexWrap: "wrap" }}>
          {stats.byVerdictTier
            .filter((t) => t.tracked > 0)
            .map((t, i, arr) => (
              <div
                key={t.tier}
                style={{
                  flex: "1 1 110px",
                  padding: "0 14px",
                  borderRight: i < arr.length - 1 ? "1px solid var(--border-subtle)" : "none",
                  ...(i === 0 ? { paddingLeft: 0 } : {}),
                }}
              >
                <p
                  className="font-mono"
                  style={{
                    fontSize: 16, fontWeight: 600, lineHeight: 1.2, marginBottom: 2,
                    color: t.winRate === null
                      ? "var(--text-muted)"
                      : t.winRate >= 0.5 ? "var(--score-green)" : "var(--score-amber)",
                  }}
                >
                  {t.winRate === null ? "—" : `${Math.round(t.winRate * 100)}%`}
                </p>
                <p style={{ ...labelStyle, marginBottom: 2 }}>{t.tier}</p>
                <p className="font-mono" style={{ fontSize: 10, color: "var(--text-muted)", margin: 0 }}>
                  {t.wins}/{t.resolved} won · {t.tracked} tracked
                </p>
              </div>
            ))}

          {stats.scoreOutcomeCorrelation !== null && (
            <div style={{ flex: "1 1 130px", padding: "0 0 0 14px" }}>
              <p className="font-mono" style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.2, marginBottom: 2, color: "var(--text-primary)" }}>
                {stats.scoreOutcomeCorrelation.toFixed(2)}
              </p>
              <p style={{ ...labelStyle, marginBottom: 2 }}>Score ↔ pursuit</p>
              <p style={{ fontSize: 10, color: "var(--text-muted)", margin: 0 }}>
                correlation of scores with your pursue/pass calls
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
