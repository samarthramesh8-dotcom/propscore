"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Props {
  propertyId: string;
  initialText: string;
  initialMudRate: number | null;
  open: boolean;
  onClose: () => void;
}

export default function ReAnalyzeModal({
  propertyId,
  initialText,
  initialMudRate,
  open,
  onClose,
}: Props) {
  const router = useRouter();
  const [text, setText]         = useState(initialText);
  const [mudEnabled, setMudEnabled] = useState(!!initialMudRate);
  const [mudRate, setMudRate]   = useState(initialMudRate ? String(initialMudRate) : "");
  const [loading, setLoading]     = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]         = useState("");

  // Reset on open
  useEffect(() => {
    if (open) {
      setText(initialText);
      setMudEnabled(!!initialMudRate);
      setMudRate(initialMudRate ? String(initialMudRate) : "");
      setError("");
    }
  }, [open, initialText, initialMudRate]);

  if (!open) return null;

  const mudRateNum = mudEnabled && mudRate ? parseFloat(mudRate) : null;
  const isUrl = /^https?:\/\/\S+$/.test(text.trim());

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listing_text: text,
          mud_rate: mudRateNum && mudRateNum > 0 ? mudRateNum : null,
          reanalyze_id: propertyId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Re-analysis failed");

      // Keep modal open, show "Refreshing…" while Next.js reloads server data
      setLoading(false);
      setRefreshing(true);
      router.refresh();
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="ps-slideover-backdrop"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="ps-slideover">
        <div style={{ padding: "24px 24px 0" }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.015em" }}>
              Re-analyze property
            </h2>
            <button
              onClick={onClose}
              style={{
                width: 28, height: 28, borderRadius: 6, border: "1px solid var(--border-subtle)",
                background: "transparent", color: "var(--text-muted)", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6, marginBottom: 20 }}>
            Paste an updated Zillow URL or edit the listing text. The existing record will be updated in place.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: "0 24px 24px" }}>
          {/* Listing input */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <label style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-muted)" }}>
                Listing
              </label>
              {isUrl && /zillow\.com/.test(text) && (
                <span style={{ fontSize: 10, fontWeight: 600, color: "var(--score-green)", display: "flex", alignItems: "center", gap: 5 }}>
                  <svg width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Zillow URL
                </span>
              )}
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={20000}
              rows={10}
              style={{
                width: "100%", background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)",
                borderRadius: 8, padding: "12px 14px", fontSize: 12,
                color: "var(--text-primary)", fontFamily: "inherit", resize: "vertical",
                outline: "none", lineHeight: 1.6,
              }}
            />
          </div>

          {/* MUD toggle */}
          <div style={{
            background: "var(--bg-elevated)",
            border: `1px solid ${mudEnabled ? "rgba(245,166,35,0.3)" : "var(--border-subtle)"}`,
            borderRadius: 8, padding: "12px 14px", marginBottom: 12,
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>MUD District</p>
              <button
                type="button"
                onClick={() => { setMudEnabled(!mudEnabled); if (mudEnabled) setMudRate(""); }}
                style={{
                  flexShrink: 0, width: 34, height: 18, borderRadius: 9, border: "none",
                  background: mudEnabled ? "#F5A623" : "var(--border-default)",
                  position: "relative", cursor: "pointer", padding: 0, transition: "background 0.2s",
                }}
              >
                <span style={{
                  position: "absolute", top: 2, left: mudEnabled ? 17 : 2,
                  width: 14, height: 14, borderRadius: "50%", background: "#fff", transition: "left 0.2s",
                }} />
              </button>
            </div>
            {mudEnabled && (
              <div style={{ marginTop: 10 }}>
                <input
                  type="number" step="0.01" min="0" max="10"
                  placeholder="0.95"
                  value={mudRate}
                  onChange={(e) => setMudRate(e.target.value)}
                  style={{
                    width: "100%", height: 34, padding: "0 12px",
                    background: "var(--bg-base)", border: "1px solid var(--border-subtle)",
                    borderRadius: 6, fontSize: 13, color: "var(--text-primary)",
                    fontFamily: "var(--font-dm-mono, monospace)", outline: "none",
                  }}
                />
                <p style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 5 }}>
                  $ per $100 assessed value
                </p>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div style={{
              padding: "10px 12px", background: "rgba(232,56,79,0.08)",
              border: "1px solid rgba(232,56,79,0.2)", borderRadius: 8,
              fontSize: 12, color: "var(--score-red)", marginBottom: 12,
            }}>
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || refreshing || !text.trim()}
            style={{
              width: "100%", background: "var(--accent)", color: "#fff", border: "none",
              borderRadius: 8, padding: "11px 0", fontSize: 13, fontWeight: 600,
              cursor: loading || refreshing || !text.trim() ? "not-allowed" : "pointer",
              opacity: !text.trim() ? 0.4 : 1, fontFamily: "inherit",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
              transition: "opacity 0.15s, background 0.15s",
            }}
          >
            {refreshing ? (
              <>
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" style={{ animation: "spin 0.8s linear infinite" }}>
                  <circle cx={12} cy={12} r={10} stroke="currentColor" strokeWidth={4} opacity={0.25} />
                  <path fill="currentColor" opacity={0.75} d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Refreshing…
              </>
            ) : loading ? (
              <>
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" style={{ animation: "spin 0.8s linear infinite" }}>
                  <circle cx={12} cy={12} r={10} stroke="currentColor" strokeWidth={4} opacity={0.25} />
                  <path fill="currentColor" opacity={0.75} d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {isUrl ? "Fetching + analyzing…" : "Analyzing…"}
              </>
            ) : "Re-analyze"}
          </button>
        </form>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
