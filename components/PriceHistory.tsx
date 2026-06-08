import { PriceHistoryEntry } from "@/lib/analysis";

interface PriceHistoryProps {
  history: PriceHistoryEntry[];
}

function dotColor(event: string): string {
  const e = event.toLowerCase();
  if (e.includes("sold")) return "var(--score-green)";
  if (e.includes("cut") || e.includes("reduc") || e.includes("decreas"))
    return "var(--score-red)";
  if (e.includes("list")) return "var(--accent)";
  if (e.includes("increas") || e.includes("rais"))
    return "var(--score-amber)";
  return "var(--text-muted)";
}

export default function PriceHistory({ history }: PriceHistoryProps) {
  if (history.length === 0) return null;

  return (
    <div
      style={{
        background: "var(--bg-surface)", border: "1px solid var(--border-subtle)",
        borderRadius: 10, padding: "0 18px", overflow: "hidden",
      }}
    >
      {history.map((entry, i) => {
        const formattedDate = new Date(entry.date).toLocaleDateString("en-US", {
          month: "short", day: "numeric", year: "numeric",
        });
        const formattedPrice = "$" + entry.price.toLocaleString();
        const rate = entry.priceChangeRate
          ? ` (${entry.priceChangeRate > 0 ? "+" : ""}${(entry.priceChangeRate * 100).toFixed(1)}%)`
          : "";

        return (
          <div
            key={i}
            style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "10px 0",
              borderBottom: i < history.length - 1
                ? "1px solid var(--border-subtle)"
                : "none",
            }}
          >
            <div
              style={{
                width: 8, height: 8, borderRadius: "50%",
                background: dotColor(entry.event), flexShrink: 0,
              }}
            />

            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 12, color: "var(--text-primary)", fontWeight: 500 }}>
                {entry.event}
              </span>
              {rate && (
                <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 6 }}>
                  {rate}
                </span>
              )}
            </div>

            <span
              className="font-mono"
              style={{ fontSize: 12, color: "var(--text-primary)", fontWeight: 600, flexShrink: 0 }}
            >
              {formattedPrice}
            </span>

            <span
              className="font-mono"
              style={{
                fontSize: 11, color: "var(--text-muted)", flexShrink: 0,
                width: 96, textAlign: "right",
              }}
            >
              {formattedDate}
            </span>
          </div>
        );
      })}
    </div>
  );
}
