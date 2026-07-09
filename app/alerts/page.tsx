"use client";

import { useState, useEffect } from "react";
import ConfirmModal from "@/components/ConfirmModal";
import { SavedSearch } from "@/lib/types";

// ─── Shared styles (match find/page.tsx exactly) ──────────────────────────────

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

// ─── Utilities ────────────────────────────────────────────────────────────────

function formatLastRun(last_run_at: string | null): string {
  if (!last_run_at) return "Never";
  const days = Math.floor((Date.now() - new Date(last_run_at).getTime()) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

function filterSummary(s: SavedSearch): string {
  const parts: string[] = [];
  if (s.price_max) parts.push(`≤$${(s.price_max / 1000).toFixed(0)}k`);
  if (s.beds_min)  parts.push(`${s.beds_min}bd`);
  if (s.baths_min) parts.push(`${s.baths_min}ba`);
  parts.push(`Score ≥${s.min_score}`);
  return parts.join(" · ");
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AlertsPage() {
  // Form state
  const [name,      setName]      = useState("");
  const [location,  setLocation]  = useState("");
  const [status,    setStatus]    = useState("for_sale");
  const [maxPrice,  setMaxPrice]  = useState("");
  const [minBeds,   setMinBeds]   = useState("0");
  const [minBaths,  setMinBaths]  = useState("0");
  const [minScore,  setMinScore]  = useState("60");

  // List state
  const [searches,    setSearches]    = useState<SavedSearch[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  // Form submission state
  const [creating,     setCreating]     = useState(false);
  const [createError,  setCreateError]  = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState(false);

  // Delete modal state
  const [deleteId,  setDeleteId]  = useState<string | null>(null);
  const [deleting,  setDeleting]  = useState(false);

  // Run now state
  const [runningId, setRunningId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 2500);
  }

  async function handleRunNow(id: string) {
    setRunningId(id);
    try {
      const res = await fetch(`/api/saved-searches/${id}/run`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) { showToast(data.error ?? "Run failed", false); return; }
      showToast(data.new_results > 0 ? `${data.new_results} new deal${data.new_results === 1 ? "" : "s"} found — check your email!` : "No new deals found matching your criteria.");
      // Refresh list to update last_run_at
      await loadSearches();
    } catch {
      showToast("Network error — please try again.", false);
    } finally {
      setRunningId(null);
    }
  }

  useEffect(() => {
    loadSearches();
  }, []);

  async function loadSearches() {
    setLoadingList(true);
    try {
      const res = await fetch("/api/saved-searches");
      if (res.ok) {
        const data = await res.json();
        setSearches(data.searches ?? []);
      }
    } finally {
      setLoadingList(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);

    try {
      const res = await fetch("/api/saved-searches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:      name.trim(),
          location:  location.trim(),
          status,
          price_max: maxPrice ? parseInt(maxPrice, 10) : null,
          beds_min:  parseInt(minBeds, 10) || null,
          baths_min: parseInt(minBaths, 10) || null,
          min_score: parseInt(minScore, 10),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setCreateError(data.error ?? "Failed to save search");
        return;
      }

      setSearches((prev) => [data.search, ...prev]);
      setName(""); setLocation(""); setStatus("for_sale");
      setMaxPrice(""); setMinBeds("0"); setMinBaths("0"); setMinScore("60");
      setCreateSuccess(true);
      setTimeout(() => setCreateSuccess(false), 3000);
    } catch {
      setCreateError("Network error — please try again.");
    } finally {
      setCreating(false);
    }
  }

  async function handleToggle(id: string, is_active: boolean) {
    const res = await fetch(`/api/saved-searches/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active }),
    });
    if (res.ok) {
      setSearches((prev) => prev.map((s) => (s.id === id ? { ...s, is_active } : s)));
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/saved-searches/${deleteId}`, { method: "DELETE" });
      if (res.ok) {
        setSearches((prev) => prev.filter((s) => s.id !== deleteId));
        setDeleteId(null);
      }
    } finally {
      setDeleting(false);
    }
  }

  const canSubmit = name.trim() && location.trim() && !creating;

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "32px 24px 120px" }}>

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 28 }}>
        <p style={{
          fontSize: 9, fontWeight: 600, letterSpacing: "0.14em",
          textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 6,
        }}>
          Alerts
        </p>
        <h1 style={{
          fontSize: 22, fontWeight: 700, color: "var(--text-primary)",
          letterSpacing: "-0.02em", marginBottom: 8,
        }}>
          Saved searches &amp; email alerts
        </h1>
        <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          Save a Deal Finder query and get a weekly email digest of new listings
          that match it, pre-scored by PropScore.
        </p>
      </div>

      {/* ── Create form ──────────────────────────────────────────────────── */}
      <form
        onSubmit={handleCreate}
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          borderRadius: 10,
          padding: "20px 24px",
          marginBottom: 32,
        }}
      >
        <h2 style={{
          fontSize: 13, fontWeight: 700, color: "var(--text-primary)",
          letterSpacing: "-0.01em", marginBottom: 16,
        }}>
          New saved search
        </h2>

        {/* Name */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Alert name *</label>
          <input
            type="text"
            placeholder="e.g. Austin under $400k"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={inputStyle}
          />
        </div>

        {/* Location */}
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

        {/* Row: Status · Max price · Min beds · Min baths · Min score */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr",
          gap: 12,
          marginBottom: 20,
        }}>
          <div>
            <label style={labelStyle}>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} style={inputStyle}>
              <option value="for_sale">For Sale</option>
              <option value="for_rent">For Rent</option>
            </select>
          </div>

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

          <div>
            <label style={labelStyle}>Min Baths</label>
            <select value={minBaths} onChange={(e) => setMinBaths(e.target.value)} style={inputStyle}>
              <option value="0">Any</option>
              <option value="1">1+</option>
              <option value="2">2+</option>
              <option value="3">3+</option>
            </select>
          </div>

          <div>
            <label style={labelStyle}>Min Score</label>
            <input
              type="number"
              placeholder="60"
              value={minScore}
              onChange={(e) => setMinScore(e.target.value)}
              min={0}
              max={100}
              style={inputStyle}
            />
          </div>
        </div>

        {/* Error */}
        {createError && (
          <div style={{
            background: "rgba(232,56,79,0.08)",
            border: "1px solid rgba(232,56,79,0.3)",
            borderRadius: 7,
            padding: "10px 14px",
            marginBottom: 16,
          }}>
            <p style={{ fontSize: 12, color: "#E8384F", margin: 0 }}>{createError}</p>
          </div>
        )}

        {/* Success */}
        {createSuccess && (
          <div style={{
            background: "rgba(0,210,106,0.08)",
            border: "1px solid rgba(0,210,106,0.25)",
            borderRadius: 7,
            padding: "10px 14px",
            marginBottom: 16,
          }}>
            <p style={{ fontSize: 12, color: "#00D26A", margin: 0 }}>
              Alert saved! You&apos;ll receive emails every Monday when new matches are found.
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          style={{
            height: 40,
            padding: "0 20px",
            background: !canSubmit ? "rgba(var(--agent-rgb),0.35)" : "var(--agent)",
            color: !canSubmit ? "var(--text-muted)" : "var(--agent-ink)",
            border: "none",
            borderRadius: 7,
            fontSize: 13,
            fontWeight: 700,
            cursor: !canSubmit ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontFamily: "inherit",
            transition: "background 0.12s ease",
          }}
        >
          {creating && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--agent-ink)" strokeWidth={2.5}
              style={{ animation: "spin 0.8s linear infinite" }}>
              <path strokeLinecap="round" d="M12 2a10 10 0 0 1 10 10" />
            </svg>
          )}
          {creating ? "Saving…" : "Save search & enable alerts"}
        </button>
      </form>

      {/* ── Saved searches list ──────────────────────────────────────────── */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{
          fontSize: 13, fontWeight: 700, color: "var(--text-primary)",
          letterSpacing: "-0.01em", marginBottom: 14,
        }}>
          Your alerts
          {searches.length > 0 && (
            <span style={{
              marginLeft: 8,
              padding: "2px 7px",
              background: "rgba(var(--accent-rgb),0.12)",
              borderRadius: 10,
              fontSize: 11,
              fontWeight: 600,
              color: "var(--accent)",
            }}>
              {searches.length}
            </span>
          )}
        </h2>

        {loadingList ? (
          <div style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
            borderRadius: 10,
            padding: "32px",
            textAlign: "center",
          }}>
            <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>Loading…</p>
          </div>
        ) : searches.length === 0 ? (
          <div style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
            borderRadius: 10,
            padding: "32px",
            textAlign: "center",
          }}>
            <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
              No saved searches yet. Create one above to start receiving alerts.
            </p>
          </div>
        ) : (
          <div style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
            borderRadius: 10,
            overflow: "hidden",
          }}>
            {searches.map((s, i) => (
              <div
                key={s.id}
                style={{
                  padding: "16px 20px",
                  borderBottom: i < searches.length - 1 ? "1px solid var(--border-subtle)" : "none",
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                }}
              >
                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{
                      fontSize: 13, fontWeight: 600, color: "var(--text-primary)",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {s.name}
                    </span>
                    <span style={{
                      flexShrink: 0,
                      padding: "2px 6px",
                      borderRadius: 4,
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      background: s.is_active ? "rgba(0,210,106,0.1)" : "rgba(122,122,154,0.1)",
                      color: s.is_active ? "#00D26A" : "var(--text-muted)",
                    }}>
                      {s.is_active ? "Active" : "Paused"}
                    </span>
                  </div>
                  <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: "0 0 2px" }}>
                    {s.location} · {filterSummary(s)}
                  </p>
                  <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}>
                    Last run: {formatLastRun(s.last_run_at)}
                  </p>
                </div>

                {/* Actions */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  {/* Run now */}
                  <button
                    onClick={() => handleRunNow(s.id)}
                    disabled={runningId === s.id}
                    title="Run now"
                    style={{
                      height: 30,
                      padding: "0 12px",
                      background: "transparent",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 600,
                      color: "var(--text-secondary)",
                      cursor: runningId === s.id ? "not-allowed" : "pointer",
                      fontFamily: "inherit",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      opacity: runningId !== null && runningId !== s.id ? 0.5 : 1,
                      transition: "border-color 0.12s, color 0.12s",
                    }}
                    onMouseEnter={(e) => {
                      if (runningId !== s.id) {
                        (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)";
                        (e.currentTarget as HTMLElement).style.color = "var(--accent)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = "var(--border-subtle)";
                      (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)";
                    }}
                  >
                    {runningId === s.id ? (
                      <svg width="11" height="11" fill="none" viewBox="0 0 24 24" style={{ animation: "spin 0.8s linear infinite" }}>
                        <circle cx={12} cy={12} r={10} stroke="currentColor" strokeWidth={4} opacity={0.25} />
                        <path fill="currentColor" opacity={0.75} d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    )}
                    {runningId === s.id ? "Running…" : "Run now"}
                  </button>

                  {/* Pause / Resume toggle */}
                  <button
                    onClick={() => handleToggle(s.id, !s.is_active)}
                    style={{
                      height: 30,
                      padding: "0 12px",
                      background: "transparent",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 600,
                      color: "var(--text-secondary)",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      transition: "border-color 0.12s, color 0.12s",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = "var(--text-muted)";
                      (e.currentTarget as HTMLElement).style.color = "var(--text-primary)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = "var(--border-subtle)";
                      (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)";
                    }}
                  >
                    {s.is_active ? "Pause" : "Resume"}
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => setDeleteId(s.id)}
                    style={{
                      height: 30,
                      padding: "0 12px",
                      background: "transparent",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 600,
                      color: "var(--text-muted)",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      transition: "border-color 0.12s, color 0.12s",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = "#E8384F";
                      (e.currentTarget as HTMLElement).style.color = "#E8384F";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = "var(--border-subtle)";
                      (e.currentTarget as HTMLElement).style.color = "var(--text-muted)";
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Footer note ──────────────────────────────────────────────────── */}
      <p style={{
        fontSize: 12,
        color: "var(--text-muted)",
        background: "var(--bg-surface)",
        border: "1px solid var(--border-subtle)",
        borderRadius: 8,
        padding: "12px 16px",
        lineHeight: 1.6,
      }}>
        Alerts run every Monday morning. New properties matching your criteria that score
        above your threshold will be emailed to your account email.
      </p>

      {/* ── Delete confirm modal ─────────────────────────────────────────── */}
      <ConfirmModal
        open={!!deleteId}
        title="Delete saved search?"
        message="This will permanently remove this alert. You won't receive any more emails for it."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        loading={deleting}
        danger
      />

      {/* ── Toast ────────────────────────────────────────────────────────── */}
      {toast && (
        <div className="ps-toast" style={{ color: toast.ok ? "var(--score-green)" : "var(--score-red)" }}>
          {toast.msg}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
