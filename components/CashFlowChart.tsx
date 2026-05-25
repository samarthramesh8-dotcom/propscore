"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChartRow {
  year: number;
  "Gross Income": number;
  NOI: number;
  "Cash Flow": number;
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Parse the first matching dollar amount from listing_text.
 * The stored format from Zillapi is e.g. "List price: $159,900 ($160k)"
 * and "Rent Zestimate: $1,295/mo".
 */
function parseDollar(text: string, ...patterns: RegExp[]): number | null {
  for (const re of patterns) {
    const m = text.match(re);
    if (m) {
      const n = parseInt(m[1].replace(/,/g, ""), 10);
      if (!isNaN(n) && n > 0) return n;
    }
  }
  return null;
}

function fmtK(v: number): string {
  const abs = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(0)}k`;
  return `${sign}$${abs}`;
}

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

// ─── Custom tooltip ───────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
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
          fontSize: 9,
          fontWeight: 600,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "#3D3D5C",
          marginBottom: 8,
        }}
      >
        Year {label}
      </p>
      {payload.map((p) => (
        <div
          key={p.name}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 20,
            marginBottom: 5,
          }}
        >
          <span style={{ fontSize: 11, color: p.color }}>{p.name}</span>
          <span
            className="font-mono"
            style={{ fontSize: 11, color: "#F0F0FF", letterSpacing: "-0.01em" }}
          >
            {usd.format(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  listingText: string;
}

const LINES = [
  { key: "Gross Income", color: "#00D26A", label: "Gross Income" },
  { key: "NOI",          color: "#F5A623", label: "NOI" },
  { key: "Cash Flow",    color: "#E8384F", label: "Cash Flow" },
] as const;

export default function CashFlowChart({ listingText }: Props) {
  // ── Parse stored listing_text ────────────────────────────────────────────
  // formatZillapiForClaude() writes raw numbers (no commas), e.g.:
  //   "List price: $159900 ($160k)"
  //   "Rent Zestimate: $1295/mo"   ← or "not listed" if Zillow has no estimate
  const listPrice = parseDollar(
    listingText,
    /List price:\s*\$?([\d,]+)/i,
    /Asking price:\s*\$?([\d,]+)/i,
  );

  const rentZestimate = parseDollar(
    listingText,
    /Rent Zestimate:\s*\$?([\d,]+)/i,
    /Rent estimate:\s*\$?([\d,]+)/i,
    /Monthly rent:\s*\$?([\d,]+)/i,
  );

  // ── Rent fallback ─────────────────────────────────────────────────────────
  // Zillow doesn't provide a Rent Zestimate for every property. When it's
  // missing, estimate at 0.75% of list price per month (a conservative
  // benchmark commonly used in real estate analysis).
  const rentIsEstimated = !rentZestimate && !!listPrice;
  const monthlyRent = rentZestimate ?? (listPrice ? Math.round(listPrice * 0.0075) : null);

  // ── Hard stop: no list price ─────────────────────────────────────────────
  if (!listPrice || !monthlyRent) {
    return (
      <div
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          borderRadius: 10,
          padding: "24px",
          textAlign: "center",
        }}
      >
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>
          Cash flow projection unavailable
        </p>
        <p style={{ fontSize: 11, color: "var(--text-muted)" }}>
          List price not found in stored listing data. Re-analyze this property
          with a Zillow URL to generate the projection.
        </p>
      </div>
    );
  }

  // ── Mortgage math ────────────────────────────────────────────────────────
  // 25% down, 7% fixed, 30-year amortisation
  const loanAmount   = listPrice * 0.75;
  const r            = 0.07 / 12;           // monthly rate
  const n            = 360;                  // 30 yr × 12
  const monthlyMort  = loanAmount * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  const annualMort   = monthlyMort * 12;

  // ── 15-year projections ──────────────────────────────────────────────────
  const chartData: ChartRow[] = Array.from({ length: 15 }, (_, i) => {
    const annualGross = monthlyRent * 12 * Math.pow(1.03, i); // 3% rent growth
    const egi         = annualGross * 0.95;                    // 5% vacancy
    const noi         = egi * 0.65;                            // 35% expenses
    const cashFlow    = noi - annualMort;
    return {
      year: i + 1,
      "Gross Income": Math.round(annualGross),
      NOI:            Math.round(noi),
      "Cash Flow":    Math.round(cashFlow),
    };
  });

  // ── Summary stats ────────────────────────────────────────────────────────
  const totalCF       = chartData.reduce((s, d) => s + d["Cash Flow"], 0);
  const avgCF         = totalCF / 15;
  const breakEvenYear = chartData.find((d) => d["Cash Flow"] > 0)?.year ?? null;

  const summaryStats = [
    {
      label: "15-Year Cash Flow",
      value: usd.format(totalCF),
      positive: totalCF >= 0,
    },
    {
      label: "Avg Annual Cash Flow",
      value: usd.format(avgCF),
      positive: avgCF >= 0,
    },
    {
      label: "Break-Even Year",
      value: breakEvenYear ? `Year ${breakEvenYear}` : "Not in 15 yrs",
      positive: breakEvenYear !== null,
    },
  ];

  return (
    <div
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-subtle)",
        borderRadius: 10,
        padding: "20px 24px",
      }}
    >
      {/* ── Header ───────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 20,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
            <p
              style={{
                fontSize: 9,
                fontWeight: 600,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
                margin: 0,
              }}
            >
              15-Year Cash Flow Projection
            </p>
            {rentIsEstimated && (
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 600,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "#F5A623",
                  background: "rgba(245,166,35,0.1)",
                  border: "1px solid rgba(245,166,35,0.25)",
                  borderRadius: 4,
                  padding: "1px 6px",
                }}
              >
                Rent estimated
              </span>
            )}
          </div>
          <p style={{ fontSize: 11, color: "var(--text-secondary)" }}>
            ${monthlyRent.toLocaleString()}/mo rent
            {rentIsEstimated ? " (0.75% of list price — no Zillow rent estimate available)" : " (Zillow Rent Zestimate)"}
            {" · "}${(listPrice / 1000).toFixed(0)}k purchase · 25% down · 7% / 30yr
          </p>
        </div>

        {/* Legend chips */}
        <div style={{ display: "flex", gap: 14, alignItems: "center", flexShrink: 0 }}>
          {LINES.map(({ label, color }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 18, height: 2, background: color, borderRadius: 1 }} />
              <span style={{ fontSize: 10, color: "#7A7A9A" }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Chart ────────────────────────────────────────────────────── */}
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="4 4" stroke="#1E1E2E" vertical={false} />
          <ReferenceLine y={0} stroke="#252535" strokeDasharray="5 3" />

          <XAxis
            dataKey="year"
            axisLine={{ stroke: "#1E1E2E" }}
            tickLine={false}
            tick={{ fill: "#3D3D5C", fontSize: 10, fontFamily: "var(--font-dm-mono, monospace)" }}
            tickFormatter={(v: number) => `Y${v}`}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#3D3D5C", fontSize: 10, fontFamily: "var(--font-dm-mono, monospace)" }}
            tickFormatter={fmtK}
            width={48}
          />

          <Tooltip
            content={<CustomTooltip />}
            cursor={{ stroke: "#252535", strokeWidth: 1 }}
          />

          {LINES.map(({ key, color }) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              stroke={color}
              strokeWidth={1.75}
              dot={false}
              activeDot={{ r: 3.5, strokeWidth: 0, fill: color }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>

      {/* ── Assumptions footnote ─────────────────────────────────────── */}
      <p style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 8, marginBottom: 20 }}>
        3% annual rent growth · 5% vacancy · 35% expense ratio ·{" "}
        <span className="font-mono">${Math.round(annualMort / 12).toLocaleString()}/mo</span>{" "}
        mortgage ({usd.format(loanAmount)} loan)
      </p>

      {/* ── Summary stats ─────────────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 1,
          background: "var(--border-subtle)",
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
        {summaryStats.map(({ label, value, positive }) => (
          <div
            key={label}
            style={{
              background: "var(--bg-elevated)",
              padding: "14px 16px",
              textAlign: "center",
            }}
          >
            <p
              className="font-mono"
              style={{
                fontSize: 15,
                fontWeight: 600,
                letterSpacing: "-0.02em",
                color: positive ? "var(--text-primary)" : "#E8384F",
                marginBottom: 5,
              }}
            >
              {value}
            </p>
            <p
              style={{
                fontSize: 9,
                fontWeight: 600,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
              }}
            >
              {label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
