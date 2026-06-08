"use client";

import { useState } from "react";
import ReAnalyzeModal from "./ReAnalyzeModal";
import { createClient } from "@/lib/supabase/client";

interface Props {
  propertyId: string;
  listingText: string;
  mudRate: number | null;
  isStale: boolean;
  staleDays: number;
  hasRichData?: boolean;
}

export default function PropertyActions({
  propertyId,
  listingText,
  mudRate,
  isStale,
  staleDays,
  hasRichData = true,
}: Props) {
  const [reanalyzeOpen, setReanalyzeOpen] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 2500);
  }

  async function handleShare() {
    if (sharing) return;
    setSharing(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("shared_analyses")
        .insert({ property_id: propertyId })
        .select("token")
        .single();
      if (error) throw error;
      const url = `${window.location.origin}/share/${data.token}`;

      // Try modern clipboard API first, fall back to legacy execCommand
      let copied = false;
      try {
        await navigator.clipboard.writeText(url);
        copied = true;
      } catch {
        try {
          const el = document.createElement("textarea");
          el.value = url;
          el.style.cssText = "position:fixed;opacity:0;pointer-events:none";
          document.body.appendChild(el);
          el.select();
          copied = document.execCommand("copy");
          document.body.removeChild(el);
        } catch {
          copied = false;
        }
      }

      if (copied) {
        showToast("Share link copied to clipboard!");
      } else {
        // Link was created but clipboard not available — prompt user to copy manually
        prompt("Copy this link to share:", url);
        showToast("Share link created!");
      }
    } catch {
      showToast("Failed to create share link", false);
    } finally {
      setSharing(false);
    }
  }

  async function handleFetchData() {
    if (fetching) return;
    setFetching(true);
    try {
      const res = await fetch("/api/fetch-rich-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ property_id: propertyId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to fetch data");
      const count: number = json.photoCount ?? 0;
      showToast(count > 0 ? `${count} photos loaded!` : "Details loaded!");
      setTimeout(() => window.location.reload(), 900);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to fetch data", false);
    } finally {
      setFetching(false);
    }
  }

  const needsFetch = !hasRichData && listingText.toLowerCase().includes("zillow.com");

  return (
    <>
      {/* Staleness badge */}
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
            color: staleDays > 90 ? "var(--score-red)" : "var(--score-amber)",
            background: staleDays > 90 ? "rgba(232,56,79,0.08)" : "rgba(245,166,35,0.08)",
            border: `1px solid ${staleDays > 90 ? "rgba(232,56,79,0.2)" : "rgba(245,166,35,0.2)"}`,
            borderRadius: 5,
            padding: "3px 8px",
            flexShrink: 0,
            whiteSpace: "nowrap",
          }}
        >
          {staleDays}d ago
          <button
            onClick={() => setReanalyzeOpen(true)}
            style={{
              color: "var(--score-amber)",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: 9,
              fontWeight: 700,
              padding: 0,
              letterSpacing: "0.08em",
              textDecoration: "underline",
              textTransform: "uppercase",
            }}
          >
            Re-analyze
          </button>
        </span>
      )}

      {/* Fetch photos & data button — shown for Zillow properties without rich data */}
      {needsFetch && (
        <button
          onClick={handleFetchData}
          disabled={fetching}
          className="ps-topbar-btn"
          style={{
            display: "flex", alignItems: "center", gap: 5,
            height: 28, padding: "0 10px", borderRadius: 6,
            fontSize: 11, fontWeight: 600,
            border: "1px solid rgba(91,91,214,0.4)",
            background: "rgba(91,91,214,0.08)",
            color: fetching ? "var(--text-muted)" : "var(--accent)",
            cursor: fetching ? "wait" : "pointer",
            fontFamily: "inherit", flexShrink: 0,
            transition: "border-color 0.15s ease, color 0.15s ease, opacity 0.15s ease",
            opacity: fetching ? 0.6 : 1,
          }}
        >
          {fetching ? (
            <svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24"
              style={{ animation: "spin 0.8s linear infinite" }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          ) : (
            <svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          )}
          <span className="ps-topbar-btn-label">{fetching ? "Fetching…" : "Fetch photos"}</span>
        </button>
      )}

      {/* Re-analyze button */}
      <button
        onClick={() => setReanalyzeOpen(true)}
        className="ps-topbar-btn"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          height: 28,
          padding: "0 10px",
          borderRadius: 6,
          fontSize: 11,
          fontWeight: 600,
          border: "1px solid var(--border-subtle)",
          background: "transparent",
          color: "var(--text-secondary)",
          cursor: "pointer",
          fontFamily: "inherit",
          flexShrink: 0,
          transition: "border-color 0.15s ease, color 0.15s ease",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.borderColor = "var(--border-default)";
          (e.currentTarget as HTMLElement).style.color = "var(--text-primary)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.borderColor = "var(--border-subtle)";
          (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)";
        }}
      >
        <svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
        <span className="ps-topbar-btn-label">Re-analyze</span>
      </button>

      {/* Share button */}
      <button
        onClick={handleShare}
        disabled={sharing}
        className="ps-topbar-btn"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          height: 28,
          padding: "0 10px",
          borderRadius: 6,
          fontSize: 11,
          fontWeight: 600,
          border: "1px solid var(--border-subtle)",
          background: "transparent",
          color: "var(--text-secondary)",
          cursor: sharing ? "wait" : "pointer",
          fontFamily: "inherit",
          flexShrink: 0,
          opacity: sharing ? 0.5 : 1,
          transition: "border-color 0.15s ease, color 0.15s ease, opacity 0.15s ease",
        }}
        onMouseEnter={(e) => {
          if (!sharing) {
            (e.currentTarget as HTMLElement).style.borderColor = "var(--border-default)";
            (e.currentTarget as HTMLElement).style.color = "var(--text-primary)";
          }
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.borderColor = "var(--border-subtle)";
          (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)";
        }}
      >
        <svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
          />
        </svg>
        <span className="ps-topbar-btn-label">Share</span>
      </button>

      {/* Toast */}
      {toast && (
        <div
          className="ps-toast"
          style={{ color: toast.ok ? "var(--score-green)" : "var(--score-red)" }}
        >
          {toast.msg}
        </div>
      )}

      {/* Re-analyze slide-over */}
      <ReAnalyzeModal
        propertyId={propertyId}
        initialText={listingText}
        initialMudRate={mudRate}
        open={reanalyzeOpen}
        onClose={() => setReanalyzeOpen(false)}
      />
    </>
  );
}
