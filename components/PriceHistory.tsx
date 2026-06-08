"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Dot,
} from "recharts";
import { PriceHistoryEntry } from "@/lib/analysis";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dotColor(event: string): string {
  const e = event.toLowerCase();
  if (e.includes("sold")) return "var(--score-green)";
  if (e.includes("cut") || e.includes("reduc") || e.includes("decreas"))
    return "var(--score-red)";
  if (e.includes("list")) return "var(--accent)";
  if (e.includes("increas") || e.includes("rais")) return "var(--score-amber)";
  return "#7A7A9A";
}

function dotColorHex(event: string): string {
  const e = event.toLowerCase();
  if (e.includes("sold")) return "#00D26A";
  if (e.includes("cut") || e.includes("reduc") || e.includes("decreas")) return "#E8384F";
  if (e.includes("list")) return "#5B5BD6";
  if (e.includes("increas") || e.includes("rais")) return "#F5A623";
  return "#7A7A9A";
}

function fmtPrice(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}k`;
  return `$${v}`;
}

// ─── Custom dot ───────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function EventDot(props: any) {
  const { cx, cy, payload } = props;
  if (cx === undefined || cy === undefined) return null;
  const fill = dotColorHex(payload.event ?? "");
  return (
    <Dot
      cx={cx}
      cy={cy}
      r={5}
      fill={fill}
      stroke="#111118"
      strokeWidth={1.5}
    />
  );
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ payload: PriceHistoryEntry }>;
}

function CustomTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const entry = payload[0].payload;
  const formattedDate = new Date(entry.date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const rate = entry.priceChangeRate
    ? ` (${entry.priceChangeRate > 0 ? "+" : ""}${(entry.priceChangeRate * 100).toFixed(1)}%)`
    : "";
  return (
    <div
      style={{
        background: "#16161F",
        border: "1px solid #252535",
        borderRadius: 8,
        padding: "10px 14px",
        minWidth: 180,
      }}
    >
      <p
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: dotColorHex(entry.event ?? ""),
          marginBottom: 4,
        }}
      >
        {entry.event}
        {rate && (
          <span style={{ fontSize: 11, color: "#7A7A9A", marginLeft: 4 }}>{rate}</span>
        )}
      </p>
      <p className="font-mono" style={{ fontSize: 14, fontWeight: 700, color: "#F0F0FF", marginBottom: 4 }}>
        ${entry.price.toLocaleString()}
      </p>
      <p style={{ fontSize: 11, color: "#7A7A9A" }}>{formattedDate}</p>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface PriceHistoryProps {
  history: PriceHistoryEntry[];
}

export default function PriceHistory({ history }: PriceHistoryProps) {
  if (history.length === 0) {
    return (
      <div
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          borderRadius: 10,
          padding: "28px",
          textAlign: "center",
        }}
      >
        <p style={{ fontSize: 12, color: "var(--text-muted)" }}>No price history available</p>
      </div>
    );
  }

  // Sort ascending by date for the chart
  const sorted = [...history].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Format for chart
  const chartData = sorted.map((h) => ({
    ...h,
    dateLabel: new Date(h.date).toLocaleDateString("en-US", {
      month: "short",
      year: "2-digit",
    }),
  }));

  return (
    <div
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-subtle)",
        borderRadius: 10,
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      {/* Line chart */}
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="4 4" stroke="#1E1E2E" vertical={false} />
          <XAxis
            dataKey="dateLabel"
            axisLine={{ stroke: "#1E1E2E" }}
            tickLine={false}
            tick={{ fill: "#3D3D5C", fontSize: 10, fontFamily: "var(--font-dm-mono, monospace)" }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#3D3D5C", fontSize: 10, fontFamily: "var(--font-dm-mono, monospace)" }}
            tickFormatter={fmtPrice}
            width={52}
            domain={["auto", "auto"]}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#252535", strokeWidth: 1 }} />
          <Line
            type="monotone"
            dataKey="price"
            stroke="var(--accent)"
            strokeWidth={2}
            dot={<EventDot />}
            activeDot={{ r: 5, fill: "#5B5BD6", stroke: "#111118", strokeWidth: 1.5 }}
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Timeline list */}
      <div
        style={{
          background: "var(--bg-elevated)",
          borderRadius: 8,
          padding: "0 14px",
          overflow: "hidden",
        }}
      >
        {history.map((entry, i) => {
          const formattedDate = new Date(entry.date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          });
          const formattedPrice = "$" + entry.price.toLocaleString();
          const rate = entry.priceChangeRate
            ? ` (${entry.priceChangeRate > 0 ? "+" : ""}${(entry.priceChangeRate * 100).toFixed(1)}%)`
            : "";

          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "9px 0",
                borderBottom: i < history.length - 1 ? "1px solid var(--border-subtle)" : "none",
              }}
            >
              <div
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: dotColor(entry.event),
                  flexShrink: 0,
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
                style={{ fontSize: 11, color: "var(--text-muted)", flexShrink: 0, width: 96, textAlign: "right" }}
              >
                {formattedDate}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
