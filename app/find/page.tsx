"use client";

import { useState } from "react";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FindResult {
  property_id: string;
  address: string;
  overall_score: number;
  verdict: string;
  list_price: number | null;
  monthly_cash_flow: number | null;
  cap_rate: string | null;
  subscores: Array<{ category: string; score: number; summary: string }>;
}

interface FindResponse {
  results: FindResult[];
  total_found: number;
  total_analyzed: number;
  errors: number;
  message?: string;
  error?: string;
}

// ─── Utilities ────────────────────────────────────────────────────────────────

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function scoreColor(score: number): string {
  if (score >= 75) return "#00D26A";
  if (score >= 50) return "#F5A623";
  return "#E8384F";
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) + "…" : str;
}

// ─── Shared input style ───────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--bg-elevated)",
  border: "1px solid var(--border-subtle)",
  borderRadius: 7,
  padding: "9px 12px",
  fontSize: 13,
  color: "var(--text-primary)",
  fontFamily: "inherit",
  outline: "none",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "var(--text-muted)",
  marginBottom: 6,
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FindPage() {
  // Form state
  const [location,   setLocation]   = useState("");
  const [status,     setStatus]     = useState("for_sale");
  const [maxPrice,   setMaxPrice]   = useState("");
  const [minBeds,    setMinBeds]    = useState("0");
  const [minBaths,   setMinBaths]   = useState("0");
  const [maxResults, setMaxResults] = useState("10");

  // UI state
  const [loading,   setLoading]   = useState(false);
  const [response,  setResponse]  = useState<FindResponse | null>(null);
  const [error,     setError]     = useState<string | null>(null);

  // Compare selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  function toggleCompare(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size >= 3) {
        return prev;
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!location.trim()) return;
    setLoading(true);
    setError(null);
    setResponse(null);
    setSelectedIds(new Set());

    try {
      const res = await fetch("/api/find", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: location.trim(),
          status,
          price_max:   maxPrice ? parseInt(maxPrice, 10) : null,
          beds_min:    parseInt(minBeds, 10),
          baths_min:   parseInt(minBaths, 10),
          max_results: parseInt(maxResults, 10),
        }),
      });

      const data: FindResponse = await res.json();

      if (!res.ok) {
        setError(data.error ?? `Server error ${res.status}`);
      } else {
        setResponse(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  const results = response?.results ?? [];
  const hasPartialFailure =
    response &&
    response.errors > 0 &&
    response.total_analyzed < response.total_found;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px 120px" }}>
      {/* ── Page header ────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 28 }}>
        <p style={{
          fontSize: 9, fontWeight: 600, letterSpacing: "0.14em",
          textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 6,
        }}>
          Deal Finder
        </p>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em", marginBottom: 8 }}>
          Find &amp; analyze investment properties
        </h1>
        <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          Search listings by location and criteria, then batch-analyze the top results with Claude.
        </p>
      </div>

      {/* ── Search form ─────────────────────────────────────────────────── */}
      <form
        onSubmit={handleSubmit}
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          borderRadius: 10,
          padding: "20px 24px",
          marginBottom: 24,
        }}
      >
        {/* Row 1: Location (full width) */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Location *</label>
          <input
            type="text"
            placeholder="Austin, TX  or  78759"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            required
            style={inputStyle}
          />
        </div>

        {/* Row 2: Status · Max price · Min beds · Min baths · Max results */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr",
          gap: 12,
          marginBottom: 20,
        }}>
          {/* Status */}
          <div>
            <label style={labelStyle}>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} style={inputStyle}>
              <option value="for_sale">For Sale</option>
              <option value="for_rent">For Rent</option>
            </select>
          </div>

          {/* Max price */}
          <div>
            <label style={labelStyle}>Max Price</label>
            <div style={{ position: "relative" }}>
              <span style={{
                position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)",
                fontSize: 13, color: "var(--text-muted)", pointerEvents: "none",
              }}>$</span>
              <input
                type="number"
                placeholder="500000"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                min={0}
                style={{ ...inputStyle, paddingLeft: 22 }}
              />
            </div>
          </div>

          {/* Min beds */}
          <div>
            <label style={labelStyle}>Min Beds</label>
            <select value={minBeds} onChange={(e) => setMinBeds(e.target.value)} style={inputStyle}>
              <option value="0">Any</option>
              <option value="1">1+</option>
              <option value="2">2+</option>
              <option value="3">3+</option>
              <option value="4">4+</option>
            </select>
          </div>

          {/* Min baths */}
          <div>
            <label style={labelStyle}>Min Baths</label>
            <select value={minBaths} onChange={(e) => setMinBaths(e.target.value)} style={inputStyle}>
              <option value="0">Any</option>
              <option value="1">1+</option>
              <option value="2">2+</option>
              <option value="3">3+</option>
            </select>
          </div>

          {/* Max results */}
          <div>
            <label style={labelStyle}>Max Results</label>
            <select value={maxResults} onChange={(e) => setMaxResults(e.target.value)} style={inputStyle}>
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="20">20</option>
            </select>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || !location.trim()}
          style={{
            height: 40,
            padding: "0 20px",
            background: loading || !location.trim() ? "rgba(91,91,214,0.4)" : "var(--accent)",
            color: "#fff",
            border: "none",
            borderRadius: 7,
            fontSize: 13,
            fontWeight: 700,
            cursor: loading || !location.trim() ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontFamily: "inherit",
            transition: "background 0.12s ease",
          }}
        >
          {loading && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5}
              style={{ animation: "spin 0.8s linear infinite" }}>
              <path strokeLinecap="round" d="M12 2a10 10 0 0 1 10 10" />
            </svg>
          )}
          {loading ? `Analyzing ${maxResults} properties…` : "Find & Analyze"}
        </button>

        <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 10 }}>
          Each result uses 1 Zillapi credit and 1 Claude analysis. Max 20 at a time.
        </p>
      </form>

      {/* ── Error box ────────────────────────────────────────────────────── */}
      {error && (
        <div style={{
          background: "rgba(232,56,79,0.08)",
          border: "1px solid rgba(232,56,79,0.3)",
          borderRadius: 8,
          padding: "14px 16px",
          display: "flex",
          gap: 10,
          alignItems: "flex-start",
          marginBottom: 20,
        }}>
          <svg width="16" height="16" fill="none" stroke="#E8384F" viewBox="0 0 24 24" style={{ flexShrink: 0, marginTop: 1 }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <p style={{ fontSize: 13, color: "#E8384F", margin: 0 }}>{error}</p>
        </div>
      )}

      {/* ── "No listings found" message ──────────────────────────────────── */}
      {response?.message && results.length === 0 && (
        <div style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          borderRadius: 8,
          padding: "20px 24px",
          textAlign: "center",
          marginBottom: 20,
        }}>
          <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>{response.message}</p>
        </div>
      )}

      {/* ── "All analyses failed" message ────────────────────────────────── */}
      {response && response.total_analyzed === 0 && response.total_found > 0 && (
        <div style={{
          background: "rgba(232,56,79,0.08)",
          border: "1px solid rgba(232,56,79,0.3)",
          borderRadius: 8,
          padding: "14px 16px",
          marginBottom: 20,
        }}>
          <p style={{ fontSize: 13, color: "#E8384F", margin: 0 }}>
            Analysis failed for all properties. Check your API keys.
          </p>
        </div>
      )}

      {/* ── Partial failure banner ────────────────────────────────────────── */}
      {hasPartialFailure && (
        <div style={{
          background: "rgba(245,166,35,0.08)",
          border: "1px solid rgba(245,166,35,0.3)",
          borderRadius: 8,
          padding: "12px 16px",
          marginBottom: 16,
        }}>
          <p style={{ fontSize: 12, color: "#F5A623", margin: 0 }}>
            {response.errors} {response.errors === 1 ? "property" : "properties"} could not be analyzed
            (Zillow data unavailable or parsing error)
          </p>
        </div>
      )}

      {/* ── Results table ─────────────────────────────────────────────────── */}
      {results.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          {/* Summary row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <p style={{ fontSize: 11, color: "var(--text-muted)" }}>
              {response!.total_analyzed} of {response!.total_found} properties analyzed
              {response!.errors > 0 && ` · ${response!.errors} failed`}
            </p>
            <Link
              href="/dashboard"
              style={{
                height: 30,
                padding: "0 12px",
                background: "rgba(91,91,214,0.10)",
                border: "1px solid rgba(91,91,214,0.25)",
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 600,
                color: "var(--accent)",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 6h16M4 10h16M4 14h10" />
              </svg>
              View in portfolio
            </Link>
          </div>

          {/* Table container */}
          <div style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
            borderRadius: 10,
            overflow: "hidden",
          }}>
            {/* Header */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "minmax(140px, 2fr) 56px 100px 76px 108px minmax(120px, 1fr) 130px",
              padding: "10px 16px",
              background: "var(--bg-elevated)",
              borderBottom: "1px solid var(--border-subtle)",
              gap: 12,
            }}>
              {["Address", "Score", "List Price", "Cap Rate", "Cash Flow/mo", "Verdict", "Actions"].map((h) => (
                <span key={h} style={{
                  fontSize: 9, fontWeight: 600, letterSpacing: "0.12em",
                  textTransform: "uppercase", color: "var(--text-muted)",
                }}>
                  {h}
                </span>
              ))}
            </div>

            {/* Rows */}
            {results.map((r, i) => (
              <div
                key={r.property_id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(140px, 2fr) 56px 100px 76px 108px minmax(120px, 1fr) 130px",
                  padding: "13px 16px",
                  gap: 12,
                  alignItems: "center",
                  borderBottom: i < results.length - 1 ? "1px solid var(--border-subtle)" : "none",
                  background: selectedIds.has(r.property_id) ? "rgba(91,91,214,0.05)" : "transparent",
                  transition: "background 0.1s ease",
                }}
              >
                {/* Address */}
                <span style={{ fontSize: 12, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {r.address}
                </span>

                {/* Score */}
                <span className="font-mono" style={{
                  fontSize: 14, fontWeight: 700,
                  color: scoreColor(r.overall_score),
                  letterSpacing: "-0.01em",
                }}>
                  {r.overall_score}
                </span>

                {/* List price */}
                <span className="font-mono" style={{ fontSize: 12, color: "var(--text-primary)", fontWeight: 600 }}>
                  {r.list_price ? usd.format(r.list_price) : "—"}
                </span>

                {/* Cap rate */}
                <span className="font-mono" style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                  {r.cap_rate ? `${r.cap_rate}%` : "—"}
                </span>

                {/* Cash flow */}
                <span className="font-mono" style={{
                  fontSize: 12,
                  color: r.monthly_cash_flow === null ? "var(--text-muted)"
                    : r.monthly_cash_flow >= 0 ? "#00D26A" : "#E8384F",
                  fontWeight: 600,
                }}>
                  {r.monthly_cash_flow === null
                    ? "—"
                    : (r.monthly_cash_flow >= 0 ? "+" : "") + usd.format(r.monthly_cash_flow) + "/mo"}
                </span>

                {/* Verdict */}
                <span style={{
                  fontSize: 11, color: "var(--text-secondary)",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }} title={r.verdict}>
                  {truncate(r.verdict, 80)}
                </span>

                {/* Actions */}
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <Link
                    href={`/property/${r.property_id}`}
                    style={{
                      height: 26, padding: "0 10px",
                      background: "rgba(91,91,214,0.10)",
                      border: "1px solid rgba(91,91,214,0.25)",
                      borderRadius: 5, fontSize: 11, fontWeight: 600,
                      color: "var(--accent)", textDecoration: "none",
                      display: "inline-flex", alignItems: "center",
                    }}
                  >
                    View
                  </Link>
                  <button
                    onClick={() => toggleCompare(r.property_id)}
                    style={{
                      height: 26, padding: "0 10px",
                      background: selectedIds.has(r.property_id)
                        ? "rgba(91,91,214,0.18)"
                        : "transparent",
                      border: `1px solid ${selectedIds.has(r.property_id) ? "var(--accent)" : "var(--border-subtle)"}`,
                      borderRadius: 5, fontSize: 11, fontWeight: 600,
                      color: selectedIds.has(r.property_id) ? "var(--accent)" : "var(--text-muted)",
                      cursor: "pointer", fontFamily: "inherit",
                      transition: "all 0.1s ease",
                    }}
                  >
                    {selectedIds.has(r.property_id) ? "✓ Compare" : "Compare"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Compare bar (sticky bottom) ───────────────────────────────────── */}
      {selectedIds.size > 0 && (
        <div style={{
          position: "fixed",
          bottom: 0,
          left: 216,
          right: 0,
          background: "rgba(11,11,18,0.92)",
          backdropFilter: "blur(12px)",
          borderTop: "1px solid var(--border-subtle)",
          padding: "12px 24px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          zIndex: 50,
        }}>
          <span style={{ fontSize: 12, color: "var(--text-secondary)", flex: 1 }}>
            {selectedIds.size} {selectedIds.size === 1 ? "property" : "properties"} selected
            {selectedIds.size < 2 && (
              <span style={{ color: "var(--text-muted)", marginLeft: 8 }}>
                — select at least 2 to compare
              </span>
            )}
          </span>

          <button
            onClick={() => setSelectedIds(new Set())}
            style={{
              height: 32, padding: "0 12px",
              background: "transparent",
              border: "1px solid var(--border-subtle)",
              borderRadius: 6, fontSize: 12, fontWeight: 600,
              color: "var(--text-muted)", cursor: "pointer", fontFamily: "inherit",
            }}
          >
            Clear
          </button>

          <Link
            href={`/compare?ids=${[...selectedIds].join(",")}`}
            style={{
              height: 32, padding: "0 16px",
              background: selectedIds.size >= 2 ? "var(--accent)" : "rgba(91,91,214,0.3)",
              borderRadius: 6, fontSize: 12, fontWeight: 700,
              color: "#fff", textDecoration: "none",
              display: "inline-flex", alignItems: "center",
              pointerEvents: selectedIds.size >= 2 ? "auto" : "none",
              transition: "background 0.12s ease",
            }}
          >
            Compare ({selectedIds.size})
          </Link>
        </div>
      )}

      {/* ── Spinner keyframes ─────────────────────────────────────────────── */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
