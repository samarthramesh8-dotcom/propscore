"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import Link from "next/link";
import PropertyCard from "./PropertyCard";
import ConfirmModal from "./ConfirmModal";
import { createClient } from "@/lib/supabase/client";
import { Property, PropertyStatus } from "@/lib/types";

// ─── Types ────────────────────────────────────────────────────────────────────

type SortKey    = "score-desc" | "score-asc" | "date-desc" | "date-asc" | "address-asc";
type FilterBand = "all" | "strong" | "conditional" | "pass";

// ─── Financial parsing helpers ────────────────────────────────────────────────

function parseCashFlow(listingText: string): number | null {
  const m = listingText.match(/Monthly cash flow:\s*([+-]?)\$?([\d,]+)/i);
  if (!m) return null;
  const n = parseInt(m[2].replace(/,/g, ""), 10);
  return isNaN(n) ? null : m[1] === "-" ? -n : n;
}

function parseCapRate(listingText: string): number | null {
  const m = listingText.match(/Cap rate:\s*([\d.]+)%/i);
  if (!m) return null;
  const n = parseFloat(m[1]);
  return isNaN(n) ? null : n;
}

function verdictBand(verdict: string): "buy" | "conditional" | "pass" {
  const v = verdict.toUpperCase().trimStart();
  if (v.startsWith("STRONG BUY") || v.startsWith("BUY")) return "buy";
  if (v.startsWith("CONDITIONAL")) return "conditional";
  return "pass";
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function readUrlParam(key: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  return new URLSearchParams(window.location.search).get(key) ?? fallback;
}

function sortList(list: Property[], key: SortKey): Property[] {
  return [...list].sort((a, b) => {
    switch (key) {
      case "score-desc":  return b.overall_score - a.overall_score;
      case "score-asc":   return a.overall_score - b.overall_score;
      case "date-desc":   return +new Date(b.created_at) - +new Date(a.created_at);
      case "date-asc":    return +new Date(a.created_at) - +new Date(b.created_at);
      case "address-asc": return a.address.localeCompare(b.address);
    }
  });
}

function applyFilter(
  list: Property[],
  band: FilterBand,
  statusFilter: PropertyStatus | "all",
  q: string,
): Property[] {
  return list.filter((p) => {
    const inBand =
      band === "all"         ? true :
      band === "strong"      ? p.overall_score >= 70 :
      band === "conditional" ? p.overall_score >= 50 && p.overall_score < 70 :
      /* pass */               p.overall_score < 50;

    const inStatus = statusFilter === "all" || (p.status ?? "watching") === statusFilter;
    const inSearch = !q.trim() || p.address.toLowerCase().includes(q.toLowerCase());
    return inBand && inStatus && inSearch;
  });
}

function exportCSV(properties: Property[]) {
  const headers = [
    "Address", "Overall Score",
    "Location Score", "Price Score", "Rental Score", "Condition Score", "Market Score",
    "Verdict", "Status", "Date Analyzed",
  ];

  const rows = properties.map((p) => {
    const byCategory: Record<string, number> = {};
    p.subscores.forEach((s) => { byCategory[s.category] = s.score; });
    return [
      p.address,
      p.overall_score,
      byCategory["Location & Neighborhood"] ?? "",
      byCategory["Price & Value"]           ?? "",
      byCategory["Rental Income Potential"] ?? "",
      byCategory["Condition & Maintenance"] ?? "",
      byCategory["Market Trends"]           ?? "",
      p.verdict,
      p.status ?? "watching",
      new Date(p.created_at).toLocaleDateString(),
    ];
  });

  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [headers, ...rows].map((r) => r.map(esc).join(",")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
  a.download = `propscore-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}

// ─── URL param validation sets ────────────────────────────────────────────────

const VALID_SORT_KEYS    = new Set(["score-desc", "score-asc", "date-desc", "date-asc", "address-asc"]);
const VALID_FILTER_BANDS = new Set(["all", "strong", "conditional", "pass"]);
const VALID_STATUSES     = new Set<string>(["all", "watching", "offer_submitted", "passed", "acquired"]);

// ─── Portfolio summary bar ────────────────────────────────────────────────────

function SummaryBar({ properties }: { properties: Property[] }) {
  const count = properties.length;
  if (count === 0) return null;

  const avgScore = Math.round(properties.reduce((s, p) => s + p.overall_score, 0) / count);

  const cashFlows = properties.map((p) => parseCashFlow(p.listing_text)).filter((v): v is number => v !== null);
  const totalCF = cashFlows.length > 0 ? cashFlows.reduce((s, v) => s + v, 0) : null;

  const capRates = properties.map((p) => parseCapRate(p.listing_text)).filter((v): v is number => v !== null);
  const avgCapRate = capRates.length > 0 ? capRates.reduce((s, v) => s + v, 0) / capRates.length : null;

  const buy         = properties.filter((p) => verdictBand(p.verdict) === "buy").length;
  const conditional = properties.filter((p) => verdictBand(p.verdict) === "conditional").length;
  const pass        = properties.filter((p) => verdictBand(p.verdict) === "pass").length;

  const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

  return (
    <div
      className="ps-summary-bar"
      style={{
        display: "flex",
        gap: 0,
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-subtle)",
        borderRadius: 8,
        overflow: "hidden",
        flexWrap: "wrap",
        marginBottom: 8,
      }}
    >
      {[
        { label: "Properties",   value: count.toString() },
        { label: "Avg Score",    value: avgScore.toString() },
        {
          label: "Monthly CF",
          value: totalCF !== null
            ? `${totalCF >= 0 ? "+" : ""}${usd.format(totalCF)}`
            : "—",
          color: totalCF === null ? undefined : totalCF >= 0 ? "var(--score-green)" : "var(--score-red)",
        },
        {
          label: "Avg Cap Rate",
          value: avgCapRate !== null ? `${avgCapRate.toFixed(2)}%` : "—",
        },
      ].map(({ label, value, color }, i, arr) => (
        <div
          key={label}
          style={{
            flex: "1 1 80px",
            padding: "12px 16px",
            borderRight: i < arr.length - 1 ? "1px solid var(--border-subtle)" : "none",
          }}
        >
          <p
            className="font-mono"
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: color ?? "var(--text-primary)",
              letterSpacing: "-0.02em",
              lineHeight: 1,
              marginBottom: 4,
            }}
          >
            {value}
          </p>
          <p style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-muted)" }}>
            {label}
          </p>
        </div>
      ))}

      {/* Verdict split */}
      <div
        style={{
          flex: "2 1 160px",
          padding: "12px 16px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          gap: 6,
        }}
      >
        <p style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-muted)" }}>
          Verdict Split
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {[
            { label: "BUY", count: buy, color: "var(--score-green)" },
            { label: "CONDITIONAL", count: conditional, color: "var(--score-amber)" },
            { label: "PASS", count: pass, color: "var(--score-red)" },
          ].map(({ label, count: c, color }) => (
            <span
              key={label}
              className="font-mono"
              style={{ fontSize: 11, fontWeight: 600, color }}
            >
              {c} <span style={{ fontWeight: 400, fontSize: 10, color: "var(--text-muted)" }}>{label}</span>
            </span>
          ))}
        </div>
        {/* Stacked bar */}
        <div
          style={{
            height: 4,
            display: "flex",
            borderRadius: 999,
            overflow: "hidden",
            gap: 1,
            background: "var(--border-subtle)",
          }}
        >
          {buy > 0 && (
            <div style={{ flex: buy, background: "var(--score-green)", borderRadius: "999px 0 0 999px" }} />
          )}
          {conditional > 0 && (
            <div style={{ flex: conditional, background: "var(--score-amber)" }} />
          )}
          {pass > 0 && (
            <div style={{ flex: pass, background: "var(--score-red)", borderRadius: "0 999px 999px 0" }} />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DashboardClient({ initialList }: { initialList: Property[] }) {
  const [list, setList]               = useState<Property[]>(initialList);
  const [deleteTargetId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting]       = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [toast, setToast]             = useState<{ msg: string; ok: boolean } | null>(null);
  const [page, setPage]               = useState(1);

  const [sortKey,      setSortKey]      = useState<SortKey>(()   => { const v = readUrlParam("sort", "score-desc"); return (VALID_SORT_KEYS.has(v) ? v : "score-desc") as SortKey; });
  const [filterBand,   setFilterBand]   = useState<FilterBand>(() => { const v = readUrlParam("band", "all");       return (VALID_FILTER_BANDS.has(v) ? v : "all") as FilterBand; });
  const [statusFilter, setStatusFilter] = useState<PropertyStatus | "all">(() => { const v = readUrlParam("status", "all"); return (VALID_STATUSES.has(v) ? v : "all") as PropertyStatus | "all"; });
  const [search,       setSearch]       = useState(() => readUrlParam("q", ""));

  useEffect(() => {
    const url = new URL(window.location.href);
    sortKey    !== "score-desc" ? url.searchParams.set("sort", sortKey)       : url.searchParams.delete("sort");
    filterBand !== "all"        ? url.searchParams.set("band", filterBand)    : url.searchParams.delete("band");
    statusFilter !== "all"      ? url.searchParams.set("status", statusFilter): url.searchParams.delete("status");
    search.trim()               ? url.searchParams.set("q",    search)        : url.searchParams.delete("q");
    window.history.replaceState({}, "", url.toString());
    setPage(1);
  }, [sortKey, filterBand, statusFilter, search]);

  const visible = useMemo(
    () => sortList(applyFilter(list, filterBand, statusFilter, search), sortKey),
    [list, sortKey, filterBand, statusFilter, search]
  );

  const count    = list.length;
  const avgScore = count ? Math.round(list.reduce((s, p) => s + p.overall_score, 0) / count) : null;
  const best     = count ? Math.max(...list.map((p) => p.overall_score)) : null;

  const showToast = useCallback((msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 2500);
  }, []);

  // ── Delete ─────────────────────────────────────────────────────────────────

  async function confirmDelete() {
    if (!deleteTargetId) return;
    setDeleting(true);
    const supabase = createClient();
    const targetId = deleteTargetId;
    const { error } = await supabase.from("properties").delete().eq("id", targetId);
    if (error) {
      showToast("Failed to delete — try again", false);
      setDeleting(false);
      return;
    }
    setList((prev) => prev.filter((p) => p.id !== targetId));
    setSelectedIds((prev) => { const next = new Set(prev); next.delete(targetId); return next; });
    showToast("Property deleted");
    setDeleting(false);
    setDeleteId(null);
  }

  // ── Compare selection ──────────────────────────────────────────────────────

  function toggleCompare(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size >= 3) {
        showToast("Select up to 3 properties", false);
        return prev;
      } else {
        next.add(id);
      }
      return next;
    });
  }

  // ── Reanalyzed callback ────────────────────────────────────────────────────

  function handleReanalyzed(id: string, updated: Partial<Property>) {
    setList((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updated, updated_at: new Date().toISOString() } : p))
    );
    showToast("Re-analysis complete");
  }

  // ── Status change callback ─────────────────────────────────────────────────

  function handleStatusChange(id: string, newStatus: PropertyStatus) {
    setList((prev) => prev.map((p) => (p.id === id ? { ...p, status: newStatus } : p)));
  }

  const compareIds  = [...selectedIds];
  const canCompare  = compareIds.length >= 2;
  const deleteTarget = list.find((p) => p.id === deleteTargetId);

  const STATUS_FILTER_OPTIONS: { value: PropertyStatus | "all"; label: string }[] = [
    { value: "all",            label: "All status" },
    { value: "watching",       label: "Watching" },
    { value: "offer_submitted", label: "Offer Sent" },
    { value: "passed",         label: "Passed" },
    { value: "acquired",       label: "Acquired" },
  ];

  return (
    <>
      <main className="ps-page-main" style={{ flex: 1, minWidth: 0 }}>

        {/* ── Header ──────────────────────────────────────────────── */}
        <div
          className="ps-dashboard-header"
          style={{ padding: "28px 36px 24px", borderBottom: "1px solid var(--border-subtle)" }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
            <div>
              <h1 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.015em", marginBottom: 4 }}>
                Portfolio
              </h1>
              <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
                Analyzed properties, ranked by investment score
              </p>
            </div>

            <div style={{ display: "flex", gap: 8, flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end" }}>
              {count > 0 && (
                <button
                  onClick={() => exportCSV(visible)}
                  className="ps-btn-ghost"
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    fontSize: 12, fontWeight: 600, padding: "8px 14px",
                    borderRadius: 7, cursor: "pointer",
                  }}
                >
                  <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Export CSV
                </button>
              )}
              <Link
                href="/analyze"
                className="ps-btn-accent"
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  color: "#fff", fontSize: 12, fontWeight: 600,
                  padding: "8px 14px", borderRadius: 7, textDecoration: "none",
                }}
              >
                <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 5v14m7-7H5" />
                </svg>
                New analysis
              </Link>
            </div>
          </div>

          {/* Legacy stats (full portfolio) */}
          {count > 0 && (
            <div className="ps-stats-row" style={{ display: "flex", gap: 32, marginTop: 24 }}>
              {[
                { label: "Analyzed",   value: count },
                { label: "Avg score",  value: avgScore },
                { label: "Best score", value: best },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="font-mono" style={{ fontSize: 24, fontWeight: 600, color: "var(--text-primary)", letterSpacing: "-0.02em", lineHeight: 1, marginBottom: 5 }}>
                    {value ?? "—"}
                  </p>
                  <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-muted)" }}>
                    {label}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Sort / Filter bar ────────────────────────────────────── */}
        {count > 0 && (
          <div
            className="ps-filter-bar"
            style={{
              padding: "10px 36px",
              borderBottom: "1px solid var(--border-subtle)",
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            {/* Search */}
            <div style={{ position: "relative", flex: "1 1 140px", maxWidth: 220, minWidth: 0 }}>
              <svg width="12" height="12" fill="none" stroke="var(--text-muted)" viewBox="0 0 24 24"
                style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
                <circle cx={11} cy={11} r={8} strokeWidth={2}/>
                <path d="M21 21l-4.35-4.35" strokeWidth={2} strokeLinecap="round"/>
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search address…"
                style={{
                  width: "100%", height: 30, paddingLeft: 28, paddingRight: 10,
                  background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)",
                  borderRadius: 6, fontSize: 12, color: "var(--text-primary)",
                  outline: "none", fontFamily: "inherit",
                }}
              />
            </div>

            {/* Band filter */}
            <div style={{ display: "flex", gap: 4 }}>
              {(["all", "strong", "conditional", "pass"] as FilterBand[]).map((band) => (
                <button
                  key={band}
                  onClick={() => setFilterBand(band)}
                  style={{
                    height: 30, padding: "0 10px", borderRadius: 5, fontSize: 11, fontWeight: 600,
                    cursor: "pointer", letterSpacing: "0.04em",
                    border: `1px solid ${filterBand === band ? "var(--accent)" : "var(--border-subtle)"}`,
                    background: filterBand === band ? "rgba(91,91,214,0.12)" : "transparent",
                    color: filterBand === band ? "var(--accent)" : "var(--text-muted)",
                    fontFamily: "inherit",
                    transition: "all 0.12s ease",
                  }}
                >
                  {band === "all" ? "All" : band === "strong" ? "70+" : band === "conditional" ? "50–69" : "<50"}
                </button>
              ))}
            </div>

            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as PropertyStatus | "all")}
              style={{
                height: 30, padding: "0 8px", borderRadius: 6, fontSize: 12,
                background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)",
                color: statusFilter !== "all" ? "var(--accent)" : "var(--text-secondary)",
                fontFamily: "inherit", cursor: "pointer", outline: "none",
              }}
            >
              {STATUS_FILTER_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>

            {/* Sort */}
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              style={{
                height: 30, padding: "0 8px", borderRadius: 6, fontSize: 12,
                background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)",
                color: "var(--text-secondary)", fontFamily: "inherit", cursor: "pointer", outline: "none",
              }}
            >
              <option value="score-desc">Score: High → Low</option>
              <option value="score-asc">Score: Low → High</option>
              <option value="date-desc">Date: Newest first</option>
              <option value="date-asc">Date: Oldest first</option>
              <option value="address-asc">Address: A → Z</option>
            </select>

            {/* Result count when filtered */}
            {(search.trim() || filterBand !== "all" || statusFilter !== "all") && (
              <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: "auto" }}>
                {visible.length} of {count}
                {visible.length < count && (
                  <button
                    onClick={() => { setSearch(""); setFilterBand("all"); setStatusFilter("all"); }}
                    style={{ marginLeft: 8, color: "var(--accent)", background: "none", border: "none", cursor: "pointer", fontSize: 11, fontFamily: "inherit" }}
                  >
                    Clear
                  </button>
                )}
              </span>
            )}
          </div>
        )}

        {/* ── Property list ─────────────────────────────────────────── */}
        <div className="ps-dashboard-content" style={{ padding: "24px 36px" }}>
          {!count ? (
            /* ── Welcome / onboarding ─────────────────────────────── */
            <div style={{ padding: "48px 0 32px" }}>
              <div style={{ textAlign: "center", marginBottom: 32 }}>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.025em", marginBottom: 8 }}>
                  Welcome to PropScore
                </h2>
                <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                  Analyze any U.S. rental property in under 30 seconds.
                </p>
              </div>
              <div className="ps-onboarding-grid">
                <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: 10, padding: 20 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: "var(--bg-elevated)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                    <svg width="18" height="18" fill="none" stroke="var(--accent)" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>Analyze a property</p>
                  <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 16 }}>Paste a Zillow URL to get a full investment score.</p>
                  <Link href="/analyze" className="ps-btn-accent" style={{ display: "inline-block", color: "#fff", fontSize: 12, fontWeight: 600, padding: "8px 14px", borderRadius: 7, textDecoration: "none" }}>
                    Start analyzing →
                  </Link>
                </div>
                <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: 10, padding: 20 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: "var(--bg-elevated)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                    <svg width="18" height="18" fill="none" stroke="var(--accent)" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>Find deals in a market</p>
                  <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 16 }}>Search active listings and score them in bulk.</p>
                  <Link href="/find" className="ps-btn-accent" style={{ display: "inline-block", color: "#fff", fontSize: 12, fontWeight: 600, padding: "8px 14px", borderRadius: 7, textDecoration: "none" }}>
                    Open deal finder →
                  </Link>
                </div>
                <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: 10, padding: 20 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: "var(--bg-elevated)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                    <svg width="18" height="18" fill="none" stroke="var(--accent)" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                  </div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>Set up weekly alerts</p>
                  <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 16 }}>Get emailed when new deals match your criteria.</p>
                  <Link href="/alerts" className="ps-btn-accent" style={{ display: "inline-block", color: "#fff", fontSize: 12, fontWeight: 600, padding: "8px 14px", borderRadius: 7, textDecoration: "none" }}>
                    Create an alert →
                  </Link>
                </div>
              </div>
            </div>
          ) : visible.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0" }}>
              <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 12 }}>
                No properties match your filters.
              </p>
              <button
                onClick={() => { setSearch(""); setFilterBand("all"); setStatusFilter("all"); }}
                style={{ fontSize: 12, color: "var(--accent)", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}
              >
                Clear filters
              </button>
            </div>
          ) : (
            <>
              {/* Portfolio summary bar — reactive to current filter */}
              <SummaryBar properties={visible} />

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {visible.slice(0, page * 20).map((property) => (
                  <PropertyCard
                    key={property.id}
                    property={property}
                    onDelete={(id) => setDeleteId(id)}
                    onCompareToggle={toggleCompare}
                    isCompareSelected={selectedIds.has(property.id)}
                    onReanalyzed={handleReanalyzed}
                    onStatusChange={handleStatusChange}
                  />
                ))}
              </div>
              {visible.length > page * 20 && (
                <div style={{ display: "flex", justifyContent: "center", marginTop: 16 }}>
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    style={{
                      padding: "8px 20px",
                      borderRadius: 7,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      border: "1px solid var(--border-subtle)",
                      background: "transparent",
                      color: "var(--text-secondary)",
                      fontFamily: "inherit",
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
                    Load more ({visible.length - page * 20} remaining)
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* ── Compare sticky bar ────────────────────────────────────── */}
      {selectedIds.size > 0 && (
        <div
          className="ps-compare-bar"
          style={{
            background: "rgba(17,17,24,0.96)",
            backdropFilter: "blur(12px)",
            borderTop: "1px solid var(--border-subtle)",
            padding: "12px 28px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
            <span className="font-mono" style={{ color: "var(--text-primary)", fontWeight: 700 }}>
              {selectedIds.size}
            </span>
            {" "}propert{selectedIds.size === 1 ? "y" : "ies"} selected
            {!canCompare && (
              <span style={{ color: "var(--text-muted)" }}>
                {" — "}select {2 - selectedIds.size} more to compare
              </span>
            )}
          </span>

          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <button
              onClick={() => setSelectedIds(new Set())}
              style={{
                padding: "7px 14px", borderRadius: 7, fontSize: 12, fontWeight: 600,
                cursor: "pointer", border: "1px solid var(--border-subtle)",
                background: "transparent", color: "var(--text-secondary)", fontFamily: "inherit",
              }}
            >
              Clear
            </button>
            <Link
              href={canCompare ? `/compare?ids=${compareIds.join(",")}` : "#"}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "7px 16px", borderRadius: 7, fontSize: 12, fontWeight: 600,
                textDecoration: "none",
                background: canCompare ? "var(--accent)" : "var(--bg-elevated)",
                color: canCompare ? "#fff" : "var(--text-muted)",
                pointerEvents: canCompare ? "auto" : "none",
                transition: "background 0.15s ease",
              }}
            >
              Compare ({selectedIds.size})
            </Link>
          </div>
        </div>
      )}

      {/* ── Delete confirm modal ─────────────────────────────────── */}
      <ConfirmModal
        open={!!deleteTargetId}
        title="Delete property?"
        message={`This will permanently remove "${deleteTarget?.address ?? "this property"}" from your portfolio. This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
        loading={deleting}
        danger
      />

      {/* ── Toast ────────────────────────────────────────────────── */}
      {toast && (
        <div
          className="ps-toast"
          style={{ color: toast.ok ? "var(--score-green)" : "var(--score-red)" }}
        >
          {toast.msg}
        </div>
      )}
    </>
  );
}
