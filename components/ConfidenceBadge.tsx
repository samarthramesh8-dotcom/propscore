"use client";

import { useState } from "react";
import { ConfidenceFlag } from "@/lib/types";

// Warning badge shown when deep verification (Phase 3) found data sources
// disagreeing on a property. Rendered compact on cards, expandable on the
// detail view. Never rendered when flags are empty — a property that wasn't
// deep-verified (or verified clean) shows nothing.

const FIELD_LABELS: Record<string, string> = {
  monthly_rent:  "rent",
  rent:          "rent",
  valuation:     "valuation",
  list_price:    "list price",
  price_history: "price history",
};

function fieldLabel(field: string): string {
  return FIELD_LABELS[field] ?? field.replace(/_/g, " ");
}

function formatValue(v: number): string {
  return v >= 1000
    ? `$${Math.round(v).toLocaleString()}`
    : `${Math.round(v * 100) / 100}`;
}

export default function ConfidenceBadge({
  flags,
  expandable = false,
}: {
  flags: ConfidenceFlag[];
  expandable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  if (!flags || flags.length === 0) return null;

  const fieldsText = [...new Set(flags.map((f) => fieldLabel(f.field)))].join(", ");

  const chip = (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        fontSize: 9,
        fontWeight: 600,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "var(--score-amber)",
        background: "rgba(245,166,35,0.08)",
        border: "1px solid rgba(245,166,35,0.25)",
        borderRadius: 4,
        padding: "2px 7px",
        flexShrink: 0,
        whiteSpace: "nowrap",
        cursor: expandable ? "pointer" : "default",
      }}
      title={`Data sources disagree on: ${fieldsText}`}
    >
      <svg width="9" height="9" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
          d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
      {expandable
        ? `Sources disagree on ${fieldsText} — ${open ? "hide" : "see"} details`
        : "Sources disagree"}
    </span>
  );

  if (!expandable) return chip;

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: "inherit" }}
        aria-expanded={open}
      >
        {chip}
      </button>

      {open && (
        <div
          style={{
            marginTop: 10,
            background: "rgba(245,166,35,0.04)",
            border: "1px solid rgba(245,166,35,0.2)",
            borderRadius: 8,
            padding: "14px 16px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {flags.map((flag, i) => (
            <div key={i}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                <span style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: "0.1em",
                  textTransform: "uppercase", color: "var(--score-amber)",
                }}>
                  {fieldLabel(flag.field)}
                </span>
                <span className="font-mono" style={{ fontSize: 10, color: "var(--text-muted)" }}>
                  {flag.discrepancy_pct}% apart
                </span>
              </div>
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: flag.note ? 4 : 0 }}>
                {flag.sources.map((s, j) => (
                  <span key={j} style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                    {s.name}: <span className="font-mono" style={{ fontWeight: 600, color: "var(--text-primary)" }}>{formatValue(s.value)}</span>
                  </span>
                ))}
              </div>
              {flag.note && (
                <p style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.6, margin: 0 }}>
                  {flag.note}
                </p>
              )}
            </div>
          ))}
          <p style={{ fontSize: 10, color: "var(--text-muted)", margin: 0 }}>
            Found by deep verification — the verdict above was scored before these disagreements were resolved.
          </p>
        </div>
      )}
    </div>
  );
}
