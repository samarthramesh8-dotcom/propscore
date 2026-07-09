import { PriceHistoryEntry } from "@/lib/types";

// Compact price-history sparkline for the dashboard instrument panel. Pure SVG,
// no client JS. Neutral slate — a price trajectory carries no verdict meaning,
// so it stays out of the score palette. Renders nothing below two points.

export default function Sparkline({
  history,
  width = 72,
  height = 22,
}: {
  history: PriceHistoryEntry[] | null | undefined;
  width?: number;
  height?: number;
}) {
  const prices = (history ?? [])
    .map((h) => h.price)
    .filter((p): p is number => typeof p === "number" && p > 0)
    .reverse(); // Zillow history is newest-first → oldest→newest, left→right

  if (prices.length < 2) return null;

  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const span = max - min || 1;
  const pad = 2;
  const w = width - pad * 2;
  const h = height - pad * 2;

  const pts = prices.map((p, i) => {
    const x = pad + (i / (prices.length - 1)) * w;
    const y = pad + (1 - (p - min) / span) * h;
    return [x, y] as const;
  });

  const line = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} ${pts[pts.length - 1][0].toFixed(1)},${height - pad} ${pad},${height - pad}`;
  const [lastX, lastY] = pts[pts.length - 1];
  const rising = prices[prices.length - 1] >= prices[0];
  // Endpoint dot hints direction without coloring the whole line
  const dot = rising ? "var(--score-green)" : "var(--score-red)";

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden
      style={{ display: "block", flexShrink: 0 }}
    >
      <polygon points={area} fill="rgba(var(--accent-rgb), 0.08)" />
      <polyline points={line} className="spark-path" stroke="var(--accent)" />
      <circle cx={lastX} cy={lastY} r={1.8} fill={dot} />
    </svg>
  );
}
