"use client";

import { useState } from "react";

interface Props {
  listingText: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function grab(text: string, re: RegExp): string | null {
  const m = text.match(re);
  return m ? m[1].trim() : null;
}

function getSection(text: string, name: string): string {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = text.match(new RegExp(`===\\s*${escaped}\\s*===[\\s\\S]*?(?====|$)`));
  return m ? m[0] : "";
}

function parseKV(sectionText: string): [string, string][] {
  return sectionText
    .split("\n")
    .map((l) => l.trim())
    .filter(
      (l) =>
        l &&
        l.includes(":") &&
        !l.startsWith("===") &&
        !l.startsWith("(") &&
        !l.startsWith("NOTE") &&
        !l.startsWith("•") &&
        !l.startsWith("Comparable")
    )
    .map((l) => {
      const i = l.indexOf(":");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().split(/\s{2,}/)[0].trim()] as [string, string];
    })
    .filter(([k, v]) => k && v && v !== "not listed" && v !== "$0" && v !== "0");
}

// ── Sub-components ────────────────────────────────────────────────────────────

const LABEL: React.CSSProperties = {
  fontSize: 9, fontWeight: 600, letterSpacing: "0.12em",
  textTransform: "uppercase", color: "var(--text-muted)",
};

function SectionHeader({ title }: { title: string }) {
  return (
    <p style={{ ...LABEL, marginBottom: 8, marginTop: 20 }}>{title}</p>
  );
}

function KVRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div
      style={{
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8,
        padding: "7px 0", borderBottom: "1px solid var(--border-subtle)",
      }}
    >
      <span style={LABEL}>{label}</span>
      <span
        className="font-mono"
        style={{ fontSize: 12, color: color ?? "var(--text-primary)", fontWeight: 500 }}
      >
        {value}
      </span>
    </div>
  );
}

function BigMetric({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div
      style={{
        flex: 1,
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-subtle)",
        borderRadius: 8,
        padding: "12px 14px",
      }}
    >
      <p style={{ ...LABEL, marginBottom: 6 }}>{label}</p>
      <p
        className="font-mono"
        style={{ fontSize: 15, fontWeight: 700, color, letterSpacing: "-0.02em", lineHeight: 1.2 }}
      >
        {value}
      </p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ListingDataSection({ listingText: t }: Props) {
  const [open, setOpen] = useState(false);

  // ── Extract key metrics ───────────────────────────────────────────────────
  const cashFlow     = grab(t, /Monthly cash flow:\s+([^\n]+)/);
  const capRate      = grab(t, /Cap rate:\s+([\d.]+%)/);
  const onePct       = grab(t, /1% rule:\s+([\d.]+%)/);
  const onePctResult = grab(t, /1% rule:.*?—\s*(PASSES|FAILS)/);
  const grossYield   = grab(t, /Gross yield:\s+([\d.]+%)/);
  const monthlyPI    = grab(t, /Monthly P&I:\s+(\$[\d,]+\/mo)/);
  const downPayment  = grab(t, /Down payment:\s+(\$[\d,]+)/);
  const loanAmount   = grab(t, /Loan amount:\s+(\$[\d,]+)/);
  const annualDebt   = grab(t, /Annual debt service:\s+(\$[\d,]+\/yr)/);
  const breakEven    = grab(t, /Break-even monthly rent[^:]*:\s+(\$[\d,]+\/mo)/);
  const maint        = grab(t, /Age-based budget:\s+(~?\$[\d,]+\/yr)/);
  const noi          = grab(t, /NOI \(45% exp\. ratio\):\s+(\$[\d,]+\/yr)/);
  const annualCF     = grab(t, /Annual cash flow:\s+([^\n]+)/);
  const rentBasis    = grab(t, /rent basis:\s*([^)]+)\)/);

  const cfNeg    = !!cashFlow && (cashFlow.includes("NEGATIVE") || cashFlow.startsWith("-"));
  const cfPos    = !!cashFlow && cashFlow.startsWith("+");
  const cfColor  = cfNeg ? "var(--score-red)" : cfPos ? "var(--score-green)" : "var(--text-primary)";
  const failsOne = onePctResult === "FAILS";
  const passOne  = onePctResult === "PASSES";

  // ── Parse named sections ─────────────────────────────────────────────────
  const factKV  = parseKV(getSection(t, "PROPERTY FACTS"));
  const valKV   = parseKV(getSection(t, "VALUATION"));
  const hasMUD  = t.includes("MUD TAX") || t.includes("MUD rate");
  const mudRate = grab(t, /MUD rate:\s+(\$[\d.]+\s+per[^\n]+)/);
  const mudAnn  = grab(t, /Annual MUD tax:\s+(\$[\d,]+\/yr[^\n]*)/);
  const effCap  = grab(t, /Effective cap rate:\s+([\d.]+%[^\n]*)/);

  // Rentcast
  const rcEst   = grab(t, /Estimated monthly rent:\s+(\$[\d,]+\/mo)/);
  const rcRange = grab(t, /Confidence range:\s+([^\n]+)/);

  // Zestimate vs list — add color
  const zVsList = valKV.find(([k]) => k.toLowerCase().includes("zestimate vs"));
  const zVsListColor = zVsList
    ? zVsList[1].startsWith("-") ? "var(--score-red)" : "var(--score-green)"
    : undefined;

  const hasData = factKV.length > 0 || cashFlow || capRate;

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          background: "none", border: "none", cursor: "pointer",
          padding: 0, fontFamily: "inherit", marginBottom: open ? 16 : 0,
        }}
      >
        <p style={{ ...LABEL, margin: 0 }}>
          {open ? "Hide analysis data" : "Show analysis data"}
        </p>
        <svg
          width="12" height="12" fill="none" stroke="var(--text-muted)" viewBox="0 0 24 24"
          style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s ease", flexShrink: 0 }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && hasData && (
        <div
          style={{
            background: "var(--bg-surface)", border: "1px solid var(--border-subtle)",
            borderRadius: 10, padding: "18px 20px",
          }}
        >
          {/* ── Key metric chips ─────────────────────────────────────── */}
          {(cashFlow || capRate || onePct) && (
            <>
              <p style={{ ...LABEL, marginBottom: 10 }}>Key numbers</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                {cashFlow && (
                  <BigMetric
                    label="Monthly cash flow"
                    value={cashFlow.replace(" (NEGATIVE)", "")}
                    color={cfColor}
                  />
                )}
                {capRate && (
                  <BigMetric
                    label="Cap rate"
                    value={capRate}
                    color="var(--text-primary)"
                  />
                )}
                {onePct && (
                  <BigMetric
                    label={`1% rule — ${onePctResult ?? ""}`}
                    value={onePct}
                    color={failsOne ? "var(--score-red)" : passOne ? "var(--score-green)" : "var(--text-primary)"}
                  />
                )}
                {grossYield && (
                  <BigMetric
                    label="Gross yield"
                    value={grossYield}
                    color="var(--text-primary)"
                  />
                )}
              </div>
            </>
          )}

          {/* ── Property facts ───────────────────────────────────────── */}
          {factKV.length > 0 && (
            <>
              <SectionHeader title="Property" />
              {factKV
                .filter(([k]) => !k.toLowerCase().includes("address"))
                .map(([k, v]) => (
                  <KVRow key={k} label={k} value={v} />
                ))}
            </>
          )}

          {/* ── Valuation ────────────────────────────────────────────── */}
          {valKV.length > 0 && (
            <>
              <SectionHeader title="Valuation" />
              {valKV.map(([k, v]) => (
                <KVRow
                  key={k}
                  label={k}
                  value={v}
                  color={
                    zVsList && k === zVsList[0]
                      ? zVsListColor
                      : undefined
                  }
                />
              ))}
            </>
          )}

          {/* ── Rent estimate ─────────────────────────────────────────── */}
          {(rcEst || rentBasis) && (
            <>
              <SectionHeader title="Rent estimate" />
              {rcEst    && <KVRow label="Estimated rent" value={rcEst} />}
              {rcRange  && <KVRow label="Confidence range" value={rcRange} />}
              {rentBasis && !rcEst && <KVRow label="Rent basis" value={rentBasis} />}
            </>
          )}

          {/* ── Financing ─────────────────────────────────────────────── */}
          {(downPayment || monthlyPI) && (
            <>
              <SectionHeader title="Financing  (25% down · 7.0% · 30-yr)" />
              {downPayment && <KVRow label="Down payment" value={downPayment} />}
              {loanAmount  && <KVRow label="Loan amount"  value={loanAmount} />}
              {monthlyPI   && <KVRow label="Monthly P&I"  value={monthlyPI} />}
              {annualDebt  && <KVRow label="Annual P&I"   value={annualDebt} />}
            </>
          )}

          {/* ── Yield & cash flow ─────────────────────────────────────── */}
          {(noi || annualCF || breakEven) && (
            <>
              <SectionHeader title="Cash flow" />
              {noi && <KVRow label="NOI (45% expenses)" value={noi} />}
              {cashFlow && (
                <KVRow
                  label="Monthly cash flow"
                  value={cashFlow.replace(" (NEGATIVE)", "")}
                  color={cfColor}
                />
              )}
              {annualCF && (
                <KVRow
                  label="Annual cash flow"
                  value={annualCF.split("  ")[0].replace(" (NEGATIVE)", "")}
                  color={cfColor}
                />
              )}
              {breakEven && <KVRow label="Break-even rent" value={breakEven} />}
            </>
          )}

          {/* ── Maintenance ───────────────────────────────────────────── */}
          {maint && (
            <>
              <SectionHeader title="Maintenance" />
              <KVRow label="Annual budget" value={maint} />
            </>
          )}

          {/* ── MUD tax ───────────────────────────────────────────────── */}
          {hasMUD && (mudRate || mudAnn) && (
            <>
              <SectionHeader title="MUD tax (Municipal Utility District)" />
              <div
                style={{
                  background: "rgba(245,166,35,0.06)", border: "1px solid rgba(245,166,35,0.2)",
                  borderRadius: 8, padding: "10px 14px", marginTop: 8,
                }}
              >
                {mudRate && <KVRow label="MUD rate" value={mudRate} color="var(--score-amber)" />}
                {mudAnn  && <KVRow label="Annual MUD tax" value={mudAnn} color="var(--score-amber)" />}
                {effCap  && <KVRow label="Effective cap rate (after MUD)" value={effCap} color="var(--score-amber)" />}
              </div>
            </>
          )}
        </div>
      )}

      {open && !hasData && (
        <div
          style={{
            background: "var(--bg-surface)", border: "1px solid var(--border-subtle)",
            borderRadius: 10, padding: "16px 20px",
          }}
        >
          <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
            No structured data available for this property.
          </p>
        </div>
      )}
    </div>
  );
}
