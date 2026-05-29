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
  "Appreciation": number;
  "MUD Tax"?: number;
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string; strokeDasharray?: string }>;
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
        minWidth: 190,
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
  /** Monthly rent estimate from Rentcast API (takes priority over Zillow Zestimate) */
  rentcastEstimate?: number | null;
  /**
   * MUD district rate in dollars per $100 of assessed value.
   * e.g. 0.95 means $0.95 per $100, so a $300k home pays $2,850/yr.
   */
  mudRate?: number | null;
}

const LINES = [
  { key: "Gross Income", color: "#00D26A", label: "Gross Income", dashed: false },
  { key: "NOI",          color: "#F5A623", label: "NOI",          dashed: false },
  { key: "Cash Flow",    color: "#E8384F", label: "Cash Flow",    dashed: false },
  { key: "Appreciation", color: "#818CF8", label: "Appreciation", dashed: false },
] as const;

// MUD line rendered separately (conditional)
const MUD_LINE = { key: "MUD Tax", color: "#F5A623", label: "MUD Tax" } as const;

export default function CashFlowChart({ listingText, rentcastEstimate, mudRate }: Props) {
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

  // ── Rent source priority: Rentcast → Zillow Zestimate → 0.75% estimate ──
  // Rentcast is derived from actual comparable rental listings and is the
  // most reliable figure. The 0.75% fallback is only used when neither
  // real-world data source has an estimate.
  const rentSource: "rentcast" | "zillow" | "estimated" =
    rentcastEstimate ? "rentcast" :
    rentZestimate    ? "zillow"   :
    "estimated";
  const rentIsEstimated = rentSource === "estimated";
  const monthlyRent =
    rentcastEstimate ??
    rentZestimate    ??
    (listPrice ? Math.round(listPrice * 0.0075) : null);

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

  // ── MUD tax ───────────────────────────────────────────────────────────────
  // Rate is in $/100 assessed value. We use list price as a proxy for
  // assessed value. We keep MUD tax flat across all 15 years — MUD rates
  // often decrease as district debt is paid off, so this is slightly conservative.
  const hasMud = !!(mudRate && mudRate > 0);
  const annualMudTaxYr1 = hasMud ? Math.round((mudRate! * listPrice) / 100) : 0;

  // ── Mortgage math ────────────────────────────────────────────────────────
  // 25% down, 7% fixed, 30-year amortisation
  const loanAmount   = listPrice * 0.75;
  const r            = 0.07 / 12;           // monthly rate
  const n            = 360;                  // 30 yr × 12
  const monthlyMort  = loanAmount * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  const annualMort   = monthlyMort * 12;

  // ── 15-year projections ──────────────────────────────────────────────────
  const chartData: ChartRow[] = Array.from({ length: 15 }, (_, i) => {
    const annualGross  = monthlyRent * 12 * Math.pow(1.03, i); // 3% rent growth
    const egi          = annualGross * 0.95;                    // 5% vacancy
    const noi          = egi * 0.65;                            // 35% expenses
    // Annual appreciation gain on current property value (3% compounding)
    const appreciation = listPrice * Math.pow(1.03, i) * 0.03;
    // MUD tax is flat (no growth assumed — rates often decline as bonds are paid off)
    const mudTax       = hasMud ? annualMudTaxYr1 : 0;
    const cashFlow     = noi - annualMort - mudTax;

    const row: ChartRow = {
      year: i + 1,
      "Gross Income": Math.round(annualGross),
      NOI:            Math.round(noi),
      "Cash Flow":    Math.round(cashFlow),
      "Appreciation": Math.round(appreciation),
    };
    if (hasMud) row["MUD Tax"] = -mudTax; // negative so it plots below zero axis
    return row;
  });

  // ── Summary stats ────────────────────────────────────────────────────────
  const totalCF           = chartData.reduce((s, d) => s + d["Cash Flow"], 0);
  const totalAppreciation = chartData.reduce((s, d) => s + d["Appreciation"], 0);
  const totalReturn       = totalCF + totalAppreciation;
  const breakEvenYear     = chartData.find((d) => d["Cash Flow"] > 0)?.year ?? null;

  const summaryStats = [
    {
      label: "15-Year Cash Flow",
      value: usd.format(totalCF),
      positive: totalCF >= 0,
    },
    {
      label: "15-Year Appreciation",
      value: usd.format(totalAppreciation),
      positive: true,
    },
    {
      label: "Total Return",
      value: usd.format(totalReturn),
      positive: totalReturn >= 0,
    },
    ...(hasMud
      ? [
          {
            label: "MUD Tax / Year",
            value: usd.format(annualMudTaxYr1),
            positive: false, // always shown in red — it's a cost
          },
        ]
      : [
          {
            label: "Break-Even Year",
            value: breakEvenYear ? `Year ${breakEvenYear}` : "Not in 15 yrs",
            positive: breakEvenYear !== null,
          },
        ]),
  ];

  // When MUD is active, show break-even in a 5th tile below
  const showBreakEvenSeparately = hasMud;

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
            {rentSource === "rentcast" && (
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 600,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "#818CF8",
                  background: "rgba(129,140,248,0.1)",
                  border: "1px solid rgba(129,140,248,0.25)",
                  borderRadius: 4,
                  padding: "1px 6px",
                }}
              >
                Rentcast
              </span>
            )}
            {hasMud && (
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 600,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "#F5A623",
                  background: "rgba(245,166,35,0.08)",
                  border: "1px solid rgba(245,166,35,0.3)",
                  borderRadius: 4,
                  padding: "1px 6px",
                }}
              >
                MUD ${mudRate}/100
              </span>
            )}
          </div>

          {/* Rent source line — shows both estimates when both are available */}
          <p style={{ fontSize: 11, color: "var(--text-secondary)" }}>
            {rentSource === "rentcast" ? (
              <>
                <span style={{ color: "#818CF8" }}>${rentcastEstimate!.toLocaleString()}/mo</span>
                {" "}(Rentcast estimate)
                {rentZestimate && (
                  <span style={{ color: "var(--text-muted)" }}>
                    {" · "}Zillow Zestimate: ${rentZestimate.toLocaleString()}/mo
                  </span>
                )}
              </>
            ) : rentSource === "zillow" ? (
              <>${rentZestimate!.toLocaleString()}/mo (Zillow Rent Zestimate)</>
            ) : (
              <>${monthlyRent!.toLocaleString()}/mo (0.75% of list price — no rent data available)</>
            )}
            {" · "}${(listPrice / 1000).toFixed(0)}k purchase · 25% down · 7% / 30yr
          </p>
        </div>

        {/* Legend chips */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", flexShrink: 0, justifyContent: "flex-end", maxWidth: 260 }}>
          {LINES.map(({ label, color }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 16, height: 2, background: color, borderRadius: 1 }} />
              <span style={{ fontSize: 10, color: "#7A7A9A" }}>{label}</span>
            </div>
          ))}
          {hasMud && (
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              {/* Dashed line preview for MUD */}
              <svg width="16" height="4" viewBox="0 0 16 4">
                <line x1="0" y1="2" x2="16" y2="2" stroke="#F5A623" strokeWidth="2" strokeDasharray="4 3" />
              </svg>
              <span style={{ fontSize: 10, color: "#7A7A9A" }}>MUD Tax</span>
            </div>
          )}
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

          {/* MUD Tax line — dashed amber, shown only when a rate was entered */}
          {hasMud && (
            <Line
              key={MUD_LINE.key}
              type="monotone"
              dataKey={MUD_LINE.key}
              stroke={MUD_LINE.color}
              strokeWidth={1.5}
              strokeDasharray="5 4"
              dot={false}
              activeDot={{ r: 3, strokeWidth: 0, fill: MUD_LINE.color }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>

      {/* ── Assumptions footnote ─────────────────────────────────────── */}
      <p style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 8, marginBottom: 20 }}>
        3% annual rent growth · 3% annual appreciation · 5% vacancy · 35% expense ratio ·{" "}
        <span className="font-mono">${Math.round(annualMort / 12).toLocaleString()}/mo</span>{" "}
        mortgage ({usd.format(loanAmount)} loan)
        {hasMud && (
          <>
            {" · "}
            <span style={{ color: "#F5A623" }}>
              MUD tax{" "}
              <span className="font-mono">${annualMudTaxYr1.toLocaleString()}/yr</span>
              {" "}(${mudRate}/100 · flat, no growth assumed)
            </span>
          </>
        )}
      </p>

      {/* ── Summary stats ─────────────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${summaryStats.length}, 1fr)`,
          gap: 1,
          background: "var(--border-subtle)",
          borderRadius: showBreakEvenSeparately ? "8px 8px 0 0" : 8,
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

      {/* Break-even row — rendered beneath the 4-stat grid when MUD is active */}
      {showBreakEvenSeparately && (
        <div
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-subtle)",
            borderTop: "none",
            borderRadius: "0 0 8px 8px",
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <p
            style={{
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
            }}
          >
            Break-Even Year (incl. MUD)
          </p>
          <p
            className="font-mono"
            style={{
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: "-0.02em",
              color: breakEvenYear ? "var(--text-primary)" : "#E8384F",
            }}
          >
            {breakEvenYear ? `Year ${breakEvenYear}` : "Not in 15 yrs"}
          </p>
        </div>
      )}
    </div>
  );
}
