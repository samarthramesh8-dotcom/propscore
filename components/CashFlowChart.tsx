"use client";

import { useState, useMemo } from "react";
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
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const RATE_OPTIONS        = [5.5, 6.0, 6.5, 7.0, 7.5, 8.0] as const;
const DOWN_OPTIONS        = [20, 25, 30]                     as const;
const RENT_GROWTH_OPTIONS = [1, 2, 3, 4, 5]                 as const;
const APPRECIATION_OPTIONS = [1, 2, 3, 4, 5]                as const;
const DEFAULT_RATE         = 7.0;
const DEFAULT_DOWN         = 25;
const DEFAULT_RENT_GROWTH  = 3;
const DEFAULT_APPRECIATION = 3;
const AMORT_MONTHS         = 360; // 30-year fixed

const LINES = [
  { key: "Gross Income", color: "#00D26A" },
  { key: "NOI",          color: "#F5A623" },
  { key: "Cash Flow",    color: "#E8384F" },
  { key: "Appreciation", color: "#818CF8" },
] as const;

const MUD_LINE = { key: "MUD Tax", color: "#F5A623" } as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
  const abs  = Math.abs(v);
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
      <p style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "#3D3D5C", marginBottom: 8 }}>
        Year {label}
      </p>
      {payload.map((p) => (
        <div key={p.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, marginBottom: 5 }}>
          <span style={{ fontSize: 11, color: p.color }}>{p.name}</span>
          <span className="font-mono" style={{ fontSize: 11, color: "#F0F0FF", letterSpacing: "-0.01em" }}>
            {usd.format(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Selector chip ────────────────────────────────────────────────────────────

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        height: 24,
        padding: "0 8px",
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 600,
        cursor: "pointer",
        border: `1px solid ${active ? "var(--accent)" : "var(--border-subtle)"}`,
        background: active ? "rgba(var(--accent-rgb),0.12)" : "transparent",
        color: active ? "var(--accent)" : "var(--text-muted)",
        fontFamily: "var(--font-dm-mono, monospace)",
        letterSpacing: "-0.01em",
        transition: "all 0.12s ease",
      }}
    >
      {label}
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  listingText: string;
  rentcastEstimate?: number | null;
  mudRate?: number | null;
}

export default function CashFlowChart({ listingText, rentcastEstimate, mudRate }: Props) {
  const [rate,           setRate]           = useState<number>(DEFAULT_RATE);
  const [downPct,        setDownPct]        = useState<number>(DEFAULT_DOWN);
  const [rentGrowthPct,  setRentGrowthPct]  = useState<number>(DEFAULT_RENT_GROWTH);
  const [appreciationPct, setAppreciationPct] = useState<number>(DEFAULT_APPRECIATION);

  // ── Parse stored listing_text ────────────────────────────────────────────
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

  const rentSource: "rentcast" | "zillow" | "estimated" =
    rentcastEstimate ? "rentcast" :
    rentZestimate    ? "zillow"   :
    "estimated";
  const rentIsEstimated = rentSource === "estimated";
  const monthlyRent =
    rentcastEstimate ??
    rentZestimate    ??
    (listPrice ? Math.round(listPrice * 0.0075) : null);

  // ── Reactive calculations (must be called before any conditional return) ─
  const computed = useMemo(() => {
    if (!listPrice || !monthlyRent) return null;

    const hasMud_  = !!(mudRate && mudRate > 0);
    const annualMudTaxYr1_ = hasMud_ ? Math.round((mudRate! * listPrice) / 100) : 0;

    const loanAmount_   = listPrice * (1 - downPct / 100);
    const r_monthly     = rate / 100 / 12;
    const monthlyMort_  = loanAmount_ * (r_monthly * Math.pow(1 + r_monthly, AMORT_MONTHS)) /
                          (Math.pow(1 + r_monthly, AMORT_MONTHS) - 1);
    const annualMort_   = monthlyMort_ * 12;

    const chartData_: ChartRow[] = Array.from({ length: 15 }, (_, i) => {
      const annualGross  = monthlyRent * 12 * Math.pow(1 + rentGrowthPct / 100, i);
      const noi          = annualGross * 0.55;
      const appreciation = listPrice * Math.pow(1 + appreciationPct / 100, i) * (appreciationPct / 100);
      const mudTax       = hasMud_ ? annualMudTaxYr1_ : 0;
      const cashFlow     = noi - annualMort_ - mudTax;

      const row: ChartRow = {
        year:           i + 1,
        "Gross Income": Math.round(annualGross),
        NOI:            Math.round(noi),
        "Cash Flow":    Math.round(cashFlow),
        "Appreciation": Math.round(appreciation),
      };
      if (hasMud_) row["MUD Tax"] = -mudTax;
      return row;
    });

    const totalCF           = chartData_.reduce((s, d) => s + d["Cash Flow"], 0);
    const totalAppreciation = chartData_.reduce((s, d) => s + d["Appreciation"], 0);
    const totalReturn       = totalCF + totalAppreciation;
    const breakEvenYear_    = chartData_.find((d) => d["Cash Flow"] > 0)?.year ?? null;

    const summaryStats_ = [
      { label: "15-Year Cash Flow",    value: usd.format(totalCF),           positive: totalCF >= 0 },
      { label: "15-Year Appreciation", value: usd.format(totalAppreciation), positive: true },
      { label: "Total Return",         value: usd.format(totalReturn),        positive: totalReturn >= 0 },
      ...(hasMud_
        ? [{ label: "MUD Tax / Year", value: usd.format(annualMudTaxYr1_), positive: false }]
        : [{ label: "Break-Even Year", value: breakEvenYear_ ? `Year ${breakEvenYear_}` : "Not in 15 yrs", positive: breakEvenYear_ !== null }]
      ),
    ];

    return {
      chartData:       chartData_,
      annualMort:      annualMort_,
      loanAmount:      loanAmount_,
      annualMudTaxYr1: annualMudTaxYr1_,
      hasMud:          hasMud_,
      summaryStats:    summaryStats_,
      breakEvenYear:   breakEvenYear_,
    };
  }, [rate, downPct, rentGrowthPct, appreciationPct, listPrice, monthlyRent, mudRate]);

  // ── Hard stop: no list price ─────────────────────────────────────────────
  if (!computed) {
    return (
      <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: 10, padding: "24px", textAlign: "center" }}>
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

  const { chartData, annualMort, loanAmount, annualMudTaxYr1, hasMud, summaryStats, breakEvenYear } = computed;
  const showBreakEvenSeparately = hasMud;

  return (
    <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: 10, padding: "20px 24px" }}>
      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="ps-chart-header" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 14 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
            <p style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-muted)", margin: 0 }}>
              15-Year Cash Flow Projection
            </p>
            {rentIsEstimated && (
              <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#F5A623", background: "rgba(245,166,35,0.1)", border: "1px solid rgba(245,166,35,0.25)", borderRadius: 4, padding: "1px 6px" }}>
                Rent estimated
              </span>
            )}
            {rentSource === "rentcast" && (
              <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#818CF8", background: "rgba(129,140,248,0.1)", border: "1px solid rgba(129,140,248,0.25)", borderRadius: 4, padding: "1px 6px" }}>
                Rentcast
              </span>
            )}
            {hasMud && (
              <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#F5A623", background: "rgba(245,166,35,0.08)", border: "1px solid rgba(245,166,35,0.3)", borderRadius: 4, padding: "1px 6px" }}>
                MUD ${mudRate}/100
              </span>
            )}
          </div>
          <p style={{ fontSize: 11, color: "var(--text-secondary)" }}>
            {rentSource === "rentcast" ? (
              <>
                <span style={{ color: "#818CF8" }}>${rentcastEstimate!.toLocaleString()}/mo</span>
                {" "}(Rentcast estimate)
                {rentZestimate && (
                  <span style={{ color: "var(--text-muted)" }}>{" · "}Zillow: ${rentZestimate.toLocaleString()}/mo</span>
                )}
              </>
            ) : rentSource === "zillow" ? (
              <>${rentZestimate!.toLocaleString()}/mo (Zillow Rent Zestimate)</>
            ) : (
              <>${monthlyRent!.toLocaleString()}/mo (0.75% of list price — no rent data)</>
            )}
            {" · "}${(listPrice! / 1000).toFixed(0)}k purchase · {downPct}% down · {rate}%/30yr
          </p>
        </div>

        {/* Legend chips */}
        <div className="ps-chart-legend" style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", flexShrink: 0, justifyContent: "flex-end", maxWidth: 260 }}>
          {LINES.map(({ key, color }) => (
            <div key={key} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 16, height: 2, background: color, borderRadius: 1 }} />
              <span style={{ fontSize: 10, color: "#7A7A9A" }}>{key}</span>
            </div>
          ))}
          {hasMud && (
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <svg width="16" height="4" viewBox="0 0 16 4">
                <line x1="0" y1="2" x2="16" y2="2" stroke="#F5A623" strokeWidth="2" strokeDasharray="4 3" />
              </svg>
              <span style={{ fontSize: 10, color: "#7A7A9A" }}>MUD Tax</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Rate / Down controls ─────────────────────────────────────── */}
      <div
        className="ps-chart-controls"
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
          marginBottom: 16,
          padding: "10px 12px",
          background: "var(--bg-elevated)",
          borderRadius: 7,
          border: "1px solid var(--border-subtle)",
        }}
      >
        <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-muted)", flexShrink: 0 }}>
          Rate
        </span>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {RATE_OPTIONS.map((r) => (
            <Chip key={r} label={`${r}%`} active={rate === r} onClick={() => setRate(r)} />
          ))}
        </div>
        <div style={{ width: 1, height: 20, background: "var(--border-subtle)", flexShrink: 0 }} />
        <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-muted)", flexShrink: 0 }}>
          Down
        </span>
        <div style={{ display: "flex", gap: 4 }}>
          {DOWN_OPTIONS.map((d) => (
            <Chip key={d} label={`${d}%`} active={downPct === d} onClick={() => setDownPct(d)} />
          ))}
        </div>
        <div style={{ width: 1, height: 20, background: "var(--border-subtle)", flexShrink: 0 }} />
        <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-muted)", flexShrink: 0 }}>
          Rent Growth
        </span>
        <div style={{ display: "flex", gap: 4 }}>
          {RENT_GROWTH_OPTIONS.map((g) => (
            <Chip key={g} label={`${g}%`} active={rentGrowthPct === g} onClick={() => setRentGrowthPct(g)} />
          ))}
        </div>
        <div style={{ width: 1, height: 20, background: "var(--border-subtle)", flexShrink: 0 }} />
        <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-muted)", flexShrink: 0 }}>
          Appreciation
        </span>
        <div style={{ display: "flex", gap: 4 }}>
          {APPRECIATION_OPTIONS.map((a) => (
            <Chip key={a} label={`${a}%`} active={appreciationPct === a} onClick={() => setAppreciationPct(a)} />
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
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#252535", strokeWidth: 1 }} />
          {LINES.map(({ key, color }) => (
            <Line key={key} type="monotone" dataKey={key} stroke={color} strokeWidth={1.75} dot={false} activeDot={{ r: 3.5, strokeWidth: 0, fill: color }} />
          ))}
          {hasMud && (
            <Line key={MUD_LINE.key} type="monotone" dataKey={MUD_LINE.key} stroke={MUD_LINE.color} strokeWidth={1.5} strokeDasharray="5 4" dot={false} activeDot={{ r: 3, strokeWidth: 0, fill: MUD_LINE.color }} />
          )}
        </LineChart>
      </ResponsiveContainer>

      {/* ── Assumptions footnote ─────────────────────────────────────── */}
      <p style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 8, marginBottom: 20 }}>
        {rentGrowthPct}% annual rent growth · {appreciationPct}% annual appreciation · 45% expense ratio ·{" "}
        <span className="font-mono">${Math.round(annualMort / 12).toLocaleString()}/mo</span>{" "}
        mortgage ({usd.format(loanAmount)} loan · {downPct}% down · {rate}%/30yr)
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
        className="ps-chart-stats-grid"
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
          <div key={label} style={{ background: "var(--bg-elevated)", padding: "14px 16px", textAlign: "center" }}>
            <p className="font-mono" style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.02em", color: positive ? "var(--text-primary)" : "#E8384F", marginBottom: 5 }}>
              {value}
            </p>
            <p style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-muted)" }}>
              {label}
            </p>
          </div>
        ))}
      </div>

      {/* Break-even row — beneath the grid when MUD is active */}
      {showBreakEvenSeparately && (
        <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", borderTop: "none", borderRadius: "0 0 8px 8px", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <p style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-muted)" }}>
            Break-Even Year (incl. MUD)
          </p>
          <p className="font-mono" style={{ fontSize: 13, fontWeight: 600, letterSpacing: "-0.02em", color: breakEvenYear ? "var(--text-primary)" : "#E8384F" }}>
            {breakEvenYear ? `Year ${breakEvenYear}` : "Not in 15 yrs"}
          </p>
        </div>
      )}
    </div>
  );
}
