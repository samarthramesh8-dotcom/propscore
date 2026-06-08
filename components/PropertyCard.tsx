"use client";

import { useState } from "react";
import Link from "next/link";
import { Property, PropertyStatus } from "@/lib/types";
import ScoreRing from "./ScoreRing";
import { createClient } from "@/lib/supabase/client";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function barColor(score: number): string {
  if (score >= 75) return "var(--score-green)";
  if (score >= 50) return "var(--score-amber)";
  return "var(--score-red)";
}

function daysSince(p: Property): number {
  const ref = p.updated_at ?? p.created_at;
  return Math.floor((Date.now() - new Date(ref).getTime()) / 86_400_000);
}

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<PropertyStatus, string> = {
  watching:         "Watching",
  offer_submitted:  "Offer Sent",
  passed:           "Passed",
  acquired:         "Acquired",
};

const STATUS_COLORS: Record<PropertyStatus, { text: string; bg: string; border: string }> = {
  watching:        { text: "var(--text-muted)",   bg: "transparent",             border: "var(--border-subtle)" },
  offer_submitted: { text: "var(--score-amber)",   bg: "rgba(245,166,35,0.08)",   border: "rgba(245,166,35,0.25)" },
  passed:          { text: "var(--score-red)",     bg: "rgba(232,56,79,0.08)",    border: "rgba(232,56,79,0.25)" },
  acquired:        { text: "var(--score-green)",   bg: "rgba(0,210,106,0.08)",    border: "rgba(0,210,106,0.25)" },
};

const ALL_STATUSES: PropertyStatus[] = ["watching", "offer_submitted", "passed", "acquired"];

function StatusBadge({
  status,
  propertyId,
  onStatusChange,
}: {
  status: PropertyStatus;
  propertyId: string;
  onStatusChange?: (id: string, newStatus: PropertyStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const { text, bg, border } = STATUS_COLORS[status];

  async function changeStatus(newStatus: PropertyStatus) {
    if (newStatus === status) { setOpen(false); return; }
    setSaving(true);
    try {
      const supabase = createClient();
      await supabase.from("properties").update({ status: newStatus }).eq("id", propertyId);
      onStatusChange?.(propertyId, newStatus);
    } finally {
      setSaving(false);
      setOpen(false);
    }
  }

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (!saving) setOpen((o) => !o); }}
        style={{
          fontSize: 9,
          fontWeight: 600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: saving ? "var(--text-muted)" : text,
          background: bg,
          border: `1px solid ${border}`,
          borderRadius: 4,
          padding: "2px 7px",
          cursor: saving ? "wait" : "pointer",
          fontFamily: "inherit",
          flexShrink: 0,
          whiteSpace: "nowrap",
        }}
      >
        {STATUS_LABELS[status]}
      </button>

      {open && (
        <>
          <div
            style={{ position: "fixed", inset: 0, zIndex: 10 }}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(false); }}
          />
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 4px)",
              left: 0,
              zIndex: 20,
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-default)",
              borderRadius: 7,
              padding: "4px",
              minWidth: 130,
              boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {ALL_STATUSES.map((s) => {
              const c = STATUS_COLORS[s];
              return (
                <button
                  key={s}
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); changeStatus(s); }}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "6px 8px",
                    fontSize: 11,
                    fontWeight: s === status ? 700 : 500,
                    color: s === status ? c.text : "var(--text-secondary)",
                    background: s === status ? c.bg : "transparent",
                    border: "none",
                    borderRadius: 4,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  {STATUS_LABELS[s]}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PropertyCard({
  property: initialProperty,
  basePath = "/property",
  onDelete,
  onCompareToggle,
  isCompareSelected = false,
  onReanalyzed,
  onStatusChange,
}: {
  property: Property;
  basePath?: string;
  onDelete?: (id: string) => void;
  onCompareToggle?: (id: string) => void;
  isCompareSelected?: boolean;
  onReanalyzed?: (id: string, updated: Partial<Property>) => void;
  onStatusChange?: (id: string, newStatus: PropertyStatus) => void;
}) {
  const [property, setProperty] = useState(initialProperty);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [scoreDelta, setScoreDelta] = useState<number | null>(null);

  const date = new Date(property.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const age = daysSince(property);
  const isStale = age > 30;

  const hasCompare = !!onCompareToggle;
  const hasDelete  = !!onDelete;

  async function handleReanalyze(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (reanalyzing) return;
    setReanalyzing(true);
    try {
      const input = property.zillow_url || property.listing_text;
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listing_text: input,
          mud_rate: property.mud_rate,
          reanalyze_id: property.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) return;
      const delta = data.overall_score - property.overall_score;
      setScoreDelta(delta);
      setTimeout(() => setScoreDelta(null), 3000);
      const updated: Partial<Property> = {
        overall_score: data.overall_score,
        subscores: data.subscores,
        verdict: data.verdict,
        bull_case: data.bull_case,
        bear_case: data.bear_case,
      };
      setProperty((p) => ({ ...p, ...updated, updated_at: new Date().toISOString() }));
      onReanalyzed?.(property.id, updated);
    } finally {
      setReanalyzing(false);
    }
  }

  return (
    <div
      className="ps-prop-card"
      style={{
        position: "relative",
        background: "var(--bg-surface)",
        borderRadius: 10,
        outline: isCompareSelected ? "2px solid var(--accent)" : "none",
        outlineOffset: -2,
        transition: "outline 0.12s ease",
      }}
    >
      {/* ── Compare checkbox ─────────────────────────── */}
      {hasCompare && (
        <label
          style={{
            position: "absolute",
            top: 12,
            left: 12,
            zIndex: 2,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={isCompareSelected}
            onChange={() => onCompareToggle(property.id)}
            onClick={(e) => e.stopPropagation()}
            style={{ position: "absolute", opacity: 0, width: 0, height: 0 }}
          />
          <div
            style={{
              width: 16,
              height: 16,
              borderRadius: 4,
              border: `1.5px solid ${isCompareSelected ? "var(--accent)" : "var(--border-default)"}`,
              background: isCompareSelected ? "var(--accent)" : "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.12s ease",
            }}
          >
            {isCompareSelected && (
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none"
                stroke="white" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        </label>
      )}

      {/* ── Delete button ────────────────────────────── */}
      {hasDelete && (
        <button
          className="ps-delete-btn"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onDelete(property.id);
          }}
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            zIndex: 2,
            width: 26,
            height: 26,
            borderRadius: 6,
            border: "1px solid var(--border-subtle)",
            background: "var(--bg-base)",
            color: "var(--text-muted)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
          aria-label="Delete property"
        >
          <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      )}

      {/* ── Main card link ───────────────────────────── */}
      <Link
        href={`${basePath}/${property.id}`}
        style={{
          display: "block",
          padding: `20px ${hasDelete ? "44px" : "24px"} 20px ${hasCompare ? "36px" : "24px"}`,
          textDecoration: "none",
        }}
      >
        <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
          {/* Score ring */}
          <div style={{ flexShrink: 0, position: "relative" }}>
            <ScoreRing score={property.overall_score} size={64} strokeWidth={6} glow={false} />
            {scoreDelta !== null && (
              <div
                style={{
                  position: "absolute",
                  top: -6,
                  right: -10,
                  fontSize: 10,
                  fontWeight: 700,
                  color: scoreDelta >= 0 ? "var(--score-green)" : "var(--score-red)",
                  background: "var(--bg-elevated)",
                  border: `1px solid ${scoreDelta >= 0 ? "rgba(0,210,106,0.3)" : "rgba(232,56,79,0.3)"}`,
                  borderRadius: 4,
                  padding: "1px 4px",
                  whiteSpace: "nowrap",
                  fontFamily: "var(--font-dm-mono, monospace)",
                }}
              >
                {scoreDelta > 0 ? `+${scoreDelta}` : scoreDelta} pts
              </div>
            )}
          </div>

          {/* Content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Address row */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 8,
                minWidth: 0,
                flexWrap: "wrap",
              }}
            >
              <p
                className="ps-prop-address"
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  margin: 0,
                  flex: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  letterSpacing: "-0.01em",
                  minWidth: 100,
                }}
              >
                {property.address}
              </p>

              {/* Status badge */}
              <StatusBadge
                status={property.status ?? "watching"}
                propertyId={property.id}
                onStatusChange={onStatusChange}
              />

              {/* Stale badge + reanalyze button */}
              {isStale && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 9,
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: age > 90 ? "var(--score-red)" : "var(--score-amber)",
                    background: age > 90 ? "rgba(232,56,79,0.1)" : "rgba(245,166,35,0.1)",
                    border: `1px solid ${age > 90 ? "rgba(232,56,79,0.2)" : "rgba(245,166,35,0.2)"}`,
                    borderRadius: 4,
                    padding: "2px 6px",
                    flexShrink: 0,
                    whiteSpace: "nowrap",
                  }}
                >
                  {age}d ago
                  <button
                    onClick={handleReanalyze}
                    disabled={reanalyzing}
                    style={{
                      color: age > 90 ? "var(--score-red)" : "var(--score-amber)",
                      background: "none",
                      border: "none",
                      cursor: reanalyzing ? "wait" : "pointer",
                      fontFamily: "inherit",
                      fontSize: 9,
                      fontWeight: 700,
                      padding: 0,
                      letterSpacing: "0.08em",
                      textDecoration: "underline",
                      textTransform: "uppercase",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 3,
                    }}
                  >
                    {reanalyzing ? (
                      <svg width="9" height="9" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                        style={{ animation: "spin 0.8s linear infinite" }}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    ) : "Refresh"}
                  </button>
                </span>
              )}
            </div>

            {/* Subscore bars */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
              {property.subscores.map((s) => (
                <div key={s.category} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: "var(--text-muted)",
                      width: 100,
                      flexShrink: 0,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {s.category}
                  </span>
                  <div
                    style={{
                      flex: 1,
                      height: 4,
                      background: "var(--border-subtle)",
                      borderRadius: 999,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${s.score}%`,
                        background: barColor(s.score),
                        borderRadius: 999,
                      }}
                    />
                  </div>
                  <span
                    className="font-mono tabular-nums"
                    style={{
                      fontSize: 11,
                      fontWeight: 500,
                      color: "var(--text-secondary)",
                      width: 22,
                      textAlign: "right",
                      flexShrink: 0,
                    }}
                  >
                    {s.score}
                  </span>
                </div>
              ))}
            </div>

            {/* Verdict + date */}
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <p
                style={{
                  fontSize: 12,
                  color: "var(--text-muted)",
                  margin: 0,
                  flex: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  fontStyle: "italic",
                  lineHeight: 1.4,
                }}
              >
                {property.verdict}
              </p>
              <span
                className="font-mono"
                style={{ fontSize: 11, color: "var(--text-muted)", flexShrink: 0 }}
              >
                {date}
              </span>
            </div>
          </div>
        </div>
      </Link>

      {/* Spin keyframe */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
