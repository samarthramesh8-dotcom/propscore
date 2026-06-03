"use client";

import Link from "next/link";
import { Property } from "@/lib/types";
import ScoreRing from "./ScoreRing";

function barColor(score: number): string {
  if (score >= 75) return "var(--score-green)";
  if (score >= 50) return "var(--score-amber)";
  return "var(--score-red)";
}

/** Days since the property was last analyzed (or created). */
function daysSince(p: Property): number {
  const ref = p.updated_at ?? p.created_at;
  return Math.floor((Date.now() - new Date(ref).getTime()) / 86_400_000);
}

export default function PropertyCard({
  property,
  basePath = "/property",
  onDelete,
  onCompareToggle,
  isCompareSelected = false,
}: {
  property: Property;
  basePath?: string;
  onDelete?: (id: string) => void;
  onCompareToggle?: (id: string) => void;
  isCompareSelected?: boolean;
}) {
  const date = new Date(property.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const age = daysSince(property);
  const isStale = age > 30;

  const hasCompare = !!onCompareToggle;
  const hasDelete  = !!onDelete;

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
          <div style={{ flexShrink: 0 }}>
            <ScoreRing score={property.overall_score} size={64} strokeWidth={6} glow={false} />
          </div>

          {/* Content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Address row */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 12,
                minWidth: 0,
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
                }}
              >
                {property.address}
              </p>
              {/* Staleness badge */}
              {isStale && (
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--score-amber)",
                    background: "rgba(245,166,35,0.1)",
                    border: "1px solid rgba(245,166,35,0.2)",
                    borderRadius: 4,
                    padding: "2px 6px",
                    flexShrink: 0,
                    whiteSpace: "nowrap",
                  }}
                >
                  {age}d ago
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
    </div>
  );
}
