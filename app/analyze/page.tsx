"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";

const analysisPoints = [
  {
    label: "Price & Value",
    desc: "List vs Zestimate, price/sqft vs market, days on market",
  },
  {
    label: "Location",
    desc: "GreatSchools ratings, neighborhood trends, job market proximity",
  },
  {
    label: "Rental yield",
    desc: "1% rule test, cap rate with 45% expense ratio, rent Zestimate",
  },
  {
    label: "Condition",
    desc: "Year built, estimated maintenance cost, deferred risk signals",
  },
  {
    label: "Market trends",
    desc: "Buyer vs seller market, price appreciation direction, DOM trend",
  },
];

export default function AnalyzePage() {
  const [listingText, setListingText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const isUrl = /^https?:\/\/\S+$/.test(listingText.trim());
  const isZillow = isUrl && /zillow\.com/.test(listingText);

  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault();
    if (!listingText.trim()) return;
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listing_text: listingText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Analysis failed");
      router.push(`/property/${data.property_id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg-base)" }}>
      <Sidebar />

      <main style={{ flex: 1, minWidth: 0, display: "flex" }}>
        {/* ── Form panel ─────────────────────────────────── */}
        <div style={{ flex: 1, padding: "28px 32px", maxWidth: 640 }}>
          <div style={{ marginBottom: 24 }}>
            <h1
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: "var(--text-primary)",
                letterSpacing: "-0.015em",
                marginBottom: 4,
              }}
            >
              New analysis
            </h1>
            <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Paste a Zillow URL or listing text to score the investment potential.
            </p>
          </div>

          <form onSubmit={handleAnalyze}>
            {/* Label + badge row */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <label
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "var(--text-muted)",
                }}
              >
                Listing
              </label>

              {isZillow && (
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    fontSize: 10,
                    fontWeight: 600,
                    color: "var(--score-green)",
                    letterSpacing: "0.04em",
                  }}
                >
                  <svg width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Zillow URL — live data
                </span>
              )}
              {isUrl && !isZillow && (
                <span style={{ fontSize: 10, color: "var(--text-muted)" }}>URL detected</span>
              )}
            </div>

            <textarea
              value={listingText}
              onChange={(e) => setListingText(e.target.value)}
              placeholder={
                "https://www.zillow.com/homedetails/…\n\nor paste listing text — address, price, beds, baths, description"
              }
              rows={11}
              style={{
                width: "100%",
                background: "var(--bg-surface)",
                border: "1px solid var(--border-subtle)",
                borderRadius: 8,
                padding: "12px 14px",
                fontSize: 13,
                color: "var(--text-primary)",
                fontFamily: "inherit",
                resize: "none",
                outline: "none",
                lineHeight: 1.6,
                transition: "border-color 0.15s ease",
                marginBottom: 12,
                display: "block",
              }}
              onFocus={(e) => { e.target.style.borderColor = "var(--border-default)"; }}
              onBlur={(e) => { e.target.style.borderColor = "var(--border-subtle)"; }}
            />

            {error && (
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                  padding: "10px 12px",
                  background: "rgba(232, 56, 79, 0.08)",
                  border: "1px solid rgba(232, 56, 79, 0.2)",
                  borderRadius: 8,
                  fontSize: 12,
                  color: "var(--score-red)",
                  marginBottom: 12,
                }}
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ flexShrink: 0, marginTop: 1 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !listingText.trim()}
              style={{
                width: "100%",
                background: "var(--accent)",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "11px 0",
                fontSize: 13,
                fontWeight: 600,
                cursor: loading || !listingText.trim() ? "not-allowed" : "pointer",
                opacity: !listingText.trim() ? 0.4 : 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 7,
                fontFamily: "inherit",
                transition: "opacity 0.15s ease, background 0.15s ease",
              }}
              onMouseEnter={(e) => { if (!loading && listingText.trim()) (e.currentTarget as HTMLElement).style.background = "var(--accent-hover)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--accent)"; }}
            >
              {loading ? (
                <>
                  <svg width="13" height="13" fill="none" viewBox="0 0 24 24" style={{ animation: "spin 0.8s linear infinite" }}>
                    <circle opacity={0.25} cx={12} cy={12} r={10} stroke="currentColor" strokeWidth={4} />
                    <path opacity={0.75} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {isZillow ? "Fetching Zillow data…" : "Analyzing with Claude…"}
                </>
              ) : (
                <>
                  <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10" />
                  </svg>
                  Analyze investment
                </>
              )}
            </button>
          </form>

          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>

        {/* ── Tips panel ─────────────────────────────────── */}
        <div
          className="hidden xl:flex xl:flex-col"
          style={{
            width: 256,
            flexShrink: 0,
            padding: "28px 24px",
            borderLeft: "1px solid var(--border-subtle)",
          }}
        >
          <p
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
              marginBottom: 16,
            }}
          >
            What we score
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {analysisPoints.map(({ label, desc }) => (
              <div key={label}>
                <p
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--text-primary)",
                    marginBottom: 3,
                  }}
                >
                  {label}
                </p>
                <p style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.6 }}>
                  {desc}
                </p>
              </div>
            ))}
          </div>

          <div
            style={{
              marginTop: 24,
              padding: "14px 14px",
              background: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
              borderRadius: 8,
            }}
          >
            <p
              style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--accent)",
                marginBottom: 6,
              }}
            >
              Pro tip
            </p>
            <p style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.6 }}>
              Zillow URLs give the richest analysis — list price, Zestimate, rent estimate, school ratings, and price history all pulled live.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
