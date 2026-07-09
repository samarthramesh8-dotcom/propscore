"use client";

import { useState, useEffect, useRef } from "react";
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

interface StreamSummary {
  total_found: number;
  total_analyzed: number;
  errors: number;
  message?: string;
}

// Fallback shape for non-streaming responses
interface FindResponse {
  results: FindResult[];
  total_found: number;
  total_analyzed: number;
  errors: number;
  message?: string;
  error?: string;
}

interface GeoResult extends FindResult {
  lat?: number;
  lon?: number;
  geocoded?: boolean;
}

// Shape returned by GET /api/find/[runId] — recovers state after navigation
interface RunInfo {
  status: "running" | "done" | "error";
  total_found: number | null;
  total_analyzed: number | null;
}

interface FindRunResponse {
  run: RunInfo | null;
  results: FindResult[];
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

async function geocodeAddress(address: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const params = new URLSearchParams({ q: address, format: "json", limit: "1" });
    const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: { "User-Agent": "propscore/1.0" },
    });
    if (!res.ok) return null;
    const results = await res.json();
    if (!results?.length) return null;
    return { lat: parseFloat(results[0].lat), lon: parseFloat(results[0].lon) };
  } catch {
    return null;
  }
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

// ─── Map view ─────────────────────────────────────────────────────────────────

function MapView({ results }: { results: GeoResult[] }) {
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstance = useRef<any>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) {
      setMapError("Mapbox token not configured (NEXT_PUBLIC_MAPBOX_TOKEN).");
      setLoading(false);
      return;
    }

    // Load Mapbox GL JS from CDN
    const existing = document.getElementById("mapbox-script");

    function initMap() {
      if (!mapRef.current) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mapboxgl = (window as any).mapboxgl;
      if (!mapboxgl) { setMapError("Mapbox failed to load."); setLoading(false); return; }

      try {
        mapboxgl.accessToken = token;
        const geocoded = results.filter((r) => r.lat !== undefined && r.lon !== undefined);
        const center: [number, number] =
          geocoded.length > 0
            ? [geocoded[0].lon!, geocoded[0].lat!]
            : [-98.5795, 39.8283]; // center of US

        const map = new mapboxgl.Map({
          container: mapRef.current,
          style: "mapbox://styles/mapbox/dark-v11",
          center,
          zoom: geocoded.length > 0 ? 11 : 4,
        });
        mapInstance.current = map;

        map.on("load", () => {
          setLoading(false);

          geocoded.forEach((r) => {
            const color =
              r.overall_score >= 75 ? "#00D26A" : r.overall_score >= 50 ? "#F5A623" : "#E8384F";

            // Custom marker
            const el = document.createElement("div");
            el.style.cssText = `
              width:36px;height:36px;border-radius:50%;
              background:${color};border:2.5px solid #0A0A0F;
              display:flex;align-items:center;justify-content:center;
              font-family:var(--font-dm-mono,monospace);font-size:11px;font-weight:700;
              color:#0A0A0F;cursor:pointer;box-shadow:0 2px 12px rgba(0,0,0,0.5);
            `;
            el.textContent = String(r.overall_score);

            const cfLine =
              r.monthly_cash_flow !== null
                ? `<div style="font-size:11px;color:${r.monthly_cash_flow >= 0 ? "#00D26A" : "#E8384F"};margin-top:4px">
                    ${r.monthly_cash_flow >= 0 ? "+" : ""}${usd.format(r.monthly_cash_flow)}/mo
                   </div>`
                : "";

            const popup = new mapboxgl.Popup({ offset: 20, maxWidth: "240px" }).setHTML(`
              <div style="background:#111118;border-radius:8px;padding:12px;font-family:inherit;color:#F0F0FF;">
                <div style="font-size:11px;font-weight:600;margin-bottom:6px;line-height:1.4;">${r.address}</div>
                <div style="display:flex;gap:10px;align-items:center;margin-bottom:6px;">
                  <span style="font-size:18px;font-weight:700;color:${color}">${r.overall_score}</span>
                  <span style="font-size:10px;color:#7A7A9A;text-transform:uppercase;letter-spacing:0.08em">${
                    r.overall_score >= 70 ? "Strong Buy" : r.overall_score >= 50 ? "Conditional" : "Pass"
                  }</span>
                </div>
                ${cfLine}
                <a href="/property/${r.property_id}" style="display:inline-block;margin-top:8px;font-size:11px;font-weight:600;color:#2FD6BE;text-decoration:none;">
                  View Analysis →
                </a>
              </div>
            `);

            new mapboxgl.Marker({ element: el })
              .setLngLat([r.lon!, r.lat!])
              .setPopup(popup)
              .addTo(map);
          });

          // Fit bounds to all markers
          if (geocoded.length > 1) {
            const bounds = new mapboxgl.LngLatBounds();
            geocoded.forEach((r) => bounds.extend([r.lon!, r.lat!]));
            map.fitBounds(bounds, { padding: 60, maxZoom: 14 });
          }
        });

        map.on("error", () => {
          setMapError("Map failed to render. Check your Mapbox token.");
          setLoading(false);
        });
      } catch {
        setMapError("Failed to initialize map.");
        setLoading(false);
      }
    }

    if (!existing) {
      const css = document.createElement("link");
      css.id = "mapbox-css";
      css.rel = "stylesheet";
      css.href = "https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.css";
      document.head.appendChild(css);

      const script = document.createElement("script");
      script.id = "mapbox-script";
      script.src = "https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.js";
      script.onload = initMap;
      script.onerror = () => { setMapError("Failed to load Mapbox."); setLoading(false); };
      document.head.appendChild(script);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((window as any).mapboxgl) {
        initMap();
      } else {
        existing.addEventListener("load", initMap);
      }
    }

    return () => {
      mapInstance.current?.remove();
      mapInstance.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (mapError) {
    return (
      <div
        style={{
          height: 480,
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          borderRadius: 10,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
        }}
      >
        <p style={{ fontSize: 12, color: "var(--score-red)" }}>{mapError}</p>
        <p style={{ fontSize: 11, color: "var(--text-muted)" }}>
          Showing list view instead.
        </p>
      </div>
    );
  }

  return (
    <div style={{ position: "relative", height: 480, borderRadius: 10, overflow: "hidden", border: "1px solid var(--border-subtle)" }}>
      {loading && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "var(--bg-surface)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1,
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth={2}
            style={{ animation: "spin 0.8s linear infinite" }}>
            <path strokeLinecap="round" d="M12 2a10 10 0 0 1 10 10" />
          </svg>
        </div>
      )}
      <div ref={mapRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FindPage() {
  // Form state
  const [location,   setLocation]   = useState("");
  const [status,     setStatus]     = useState("for_sale");
  const [maxPrice,   setMaxPrice]   = useState("");
  const [minBeds,    setMinBeds]    = useState("0");
  const [minBaths,   setMinBaths]   = useState("0");
  const [maxResults, setMaxResults] = useState("10");

  // UI state — starts true when a ?run= param is present so the mount-hydration
  // effect below doesn't need to flip it synchronously in its own body
  const [loading,       setLoading]       = useState(() =>
    typeof window !== "undefined" && new URLSearchParams(window.location.search).has("run")
  );
  const [streaming,     setStreaming]     = useState(false);
  const [agentSteps,    setAgentSteps]    = useState<string[]>([]);
  const [progress,      setProgress]      = useState<{ current: number; total: number; address: string } | null>(null);
  const [results,       setResults]       = useState<FindResult[]>([]);
  const [streamSummary, setStreamSummary] = useState<StreamSummary | null>(null);
  const [error,         setError]         = useState<string | null>(null);
  const [failureReasons, setFailureReasons] = useState<string[]>([]);
  const [viewMode,      setViewMode]      = useState<"list" | "map">("list");

  // Geocoded results for map
  const [geoResults, setGeoResults] = useState<GeoResult[]>([]);
  const [geocoding,  setGeocoding]  = useState(false);

  // Compare selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Save as alert modal
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saveName,      setSaveName]      = useState("");
  const [saveMinScore,  setSaveMinScore]  = useState("60");
  const [saving,        setSaving]        = useState(false);
  const [saveError,     setSaveError]     = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  // Active stream reader — kept so we can cancel on re-submit or unmount
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);

  // Poll interval for recovering an in-progress search after navigation
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Agent trace: live while streaming, then collapses to a "how this was
  // found" artifact the user can re-open. Kept in the agent register (mono,
  // cyan) so it stays visually distinct from the calm verdict results below.
  const traceRef = useRef<HTMLDivElement | null>(null);
  const [traceExpanded, setTraceExpanded] = useState(false);
  useEffect(() => {
    traceRef.current?.scrollTo({ top: traceRef.current.scrollHeight, behavior: "smooth" });
  }, [agentSteps]);

  // Cancel any live stream read on unmount — the DB write (not this client read)
  // is the source of truth, so abandoning the reader can't lose data.
  useEffect(() => {
    return () => {
      readerRef.current?.cancel().catch(() => undefined);
    };
  }, []);

  // On mount, recover an in-progress or completed search addressed by ?run=
  // in the URL — e.g. after navigating away mid-search and coming back.
  useEffect(() => {
    const runId = new URLSearchParams(window.location.search).get("run");
    if (!runId) return;

    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch(`/api/find/${runId}`);
        if (cancelled) return;
        if (!res.ok) {
          setLoading(false);
          return;
        }
        const data: FindRunResponse = await res.json();
        if (cancelled) return;

        setResults(data.results ?? []);
        setGeoResults((data.results ?? []).map((r) => ({ ...r })));
        setLoading(false);

        if (data.run?.status === "running") {
          setStreaming(true);
          if (!pollIntervalRef.current) {
            pollIntervalRef.current = setInterval(poll, 2500);
          }
        } else {
          setStreaming(false);
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          if (data.run) {
            setStreamSummary({
              total_found:    data.run.total_found    ?? data.results.length,
              total_analyzed: data.run.total_analyzed ?? data.results.length,
              errors: 0,
              ...(data.run.status === "error"
                ? { message: "This search stopped before finishing — showing what was found so far." }
                : {}),
            });
          }
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    }

    poll();

    return () => {
      cancelled = true;
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, []);

  function openSaveModal() {
    setSaveName(location.trim() ? `${location.trim()} deals` : "My search");
    setSaveMinScore("60");
    setSaveError(null);
    setSaveModalOpen(true);
  }

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 2500);
  }

  async function handleSaveAlert() {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/saved-searches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:      saveName.trim() || `${location.trim()} deals`,
          location:  location.trim(),
          status,
          price_max: maxPrice ? parseInt(maxPrice, 10) : null,
          beds_min:  parseInt(minBeds, 10) || null,
          baths_min: parseInt(minBaths, 10) || null,
          min_score: parseInt(saveMinScore, 10) || 60,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setSaveError(data.error ?? "Failed to save"); return; }
      setSaveModalOpen(false);
      showToast("Search saved! We'll email you new deals weekly.");
    } catch {
      setSaveError("Network error — please try again.");
    } finally {
      setSaving(false);
    }
  }

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

    // Cancel any in-progress stream before starting a new one
    if (readerRef.current) {
      await readerRef.current.cancel().catch(() => undefined);
      readerRef.current = null;
    }
    // A recovered run's polling loop shouldn't keep running once a fresh search starts
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    // Address this search in the URL immediately — before the network round
    // trip even completes — so it's recoverable if the tab closes right away.
    const runId = crypto.randomUUID();
    const runUrl = new URL(window.location.href);
    runUrl.searchParams.set("run", runId);
    window.history.replaceState({}, "", runUrl.toString());

    setLoading(true);
    setStreaming(false);
    setError(null);
    setResults([]);
    setStreamSummary(null);
    setFailureReasons([]);
    setAgentSteps([]);
    setProgress(null);
    setSelectedIds(new Set());
    setGeoResults([]);
    setViewMode("list");

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
          search_run_id: runId,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: `Server error ${res.status}` }));
        setError((data as FindResponse).error ?? `Server error ${res.status}`);
        // Nothing was actually persisted server-side for a request that
        // failed outright — drop the now-invalid run id from the URL.
        const failedUrl = new URL(window.location.href);
        failedUrl.searchParams.delete("run");
        window.history.replaceState({}, "", failedUrl.toString());
        return;
      }

      // Fallback: no streaming body (shouldn't happen in practice)
      if (!res.body) {
        const data: FindResponse = await res.json();
        setResults(data.results ?? []);
        setGeoResults((data.results ?? []).map((r) => ({ ...r })));
        setStreamSummary({
          total_found:    data.total_found,
          total_analyzed: data.total_analyzed,
          errors:         data.errors,
          message:        data.message,
        });
        return;
      }

      const reader = res.body.getReader();
      readerRef.current = reader;
      const decoder = new TextDecoder();
      let buffer = "";

      setStreaming(true);
      setLoading(false);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event = JSON.parse(line);
            if (event.type === "agent_step") {
              setAgentSteps((prev) => [...prev, event.message as string]);
            } else if (event.type === "progress") {
              setProgress(event);
            } else if (event.type === "result") {
              setResults((prev) => [...prev, event as FindResult]);
              setGeoResults((prev) => [...prev, { ...(event as FindResult) }]);
            } else if (event.type === "done") {
              setStreamSummary({
                total_found:    event.total_found,
                total_analyzed: event.total_analyzed,
                errors:         event.errors,
                message:        event.message,
              });
              setStreaming(false);
              setProgress(null);
            } else if (event.type === "error") {
              setFailureReasons((prev) => [...prev, `${event.address}: ${event.message}`]);
            }
          } catch {
            // malformed line — skip
          }
        }
      }

      setStreaming(false);

    } catch (err) {
      // Ignore cancellation errors from re-submit
      if (err instanceof Error && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Network error — please try again.");
    } finally {
      setLoading(false);
      readerRef.current = null;
    }
  }

  // Geocode results when switching to map view
  async function handleMapToggle() {
    if (viewMode === "map") { setViewMode("list"); return; }
    setViewMode("map");

    const toGeocode = geoResults.filter((r) => !r.geocoded);
    if (toGeocode.length === 0) return;

    setGeocoding(true);
    const updated = [...geoResults];
    for (const r of toGeocode) {
      const coords = await geocodeAddress(r.address);
      const idx = updated.findIndex((u) => u.property_id === r.property_id);
      if (idx >= 0) {
        updated[idx] = { ...updated[idx], geocoded: true, ...(coords ?? {}) };
      }
    }
    setGeoResults(updated);
    setGeocoding(false);
  }

  const hasPartialFailure =
    streamSummary &&
    streamSummary.errors > 0 &&
    streamSummary.total_analyzed < streamSummary.total_found;

  const busy = loading || streaming;

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
          disabled={busy || !location.trim()}
          style={{
            height: 40,
            padding: "0 20px",
            background: busy || !location.trim() ? "rgba(var(--agent-rgb),0.35)" : "var(--agent)",
            color: busy || !location.trim() ? "var(--text-muted)" : "var(--agent-ink)",
            border: "none",
            borderRadius: 7,
            fontSize: 13,
            fontWeight: 700,
            cursor: busy || !location.trim() ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontFamily: "inherit",
            transition: "background 0.12s ease",
          }}
        >
          {loading && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--agent-ink)" strokeWidth={2.5}
              style={{ animation: "spin 0.8s linear infinite" }}>
              <path strokeLinecap="round" d="M12 2a10 10 0 0 1 10 10" />
            </svg>
          )}
          {loading ? "Searching…" : "Find & Analyze"}
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

      {streamSummary?.message && results.length === 0 && !streaming && (
        <div style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          borderRadius: 8,
          padding: "20px 24px",
          textAlign: "center",
          marginBottom: 20,
        }}>
          <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>{streamSummary.message}</p>
        </div>
      )}

      {streamSummary && streamSummary.total_analyzed === 0 && streamSummary.total_found > 0 && !streaming && (
        <div style={{
          background: "rgba(232,56,79,0.08)",
          border: "1px solid rgba(232,56,79,0.3)",
          borderRadius: 8,
          padding: "14px 16px",
          marginBottom: 20,
        }}>
          <p style={{ fontSize: 13, color: "#E8384F", margin: "0 0 6px" }}>
            Analysis failed for all properties.
          </p>
          {failureReasons.length > 0 && (
            <ul style={{ fontSize: 12, color: "#E8384F", opacity: 0.85, margin: 0, paddingLeft: 18 }}>
              {[...new Set(failureReasons)].slice(0, 5).map((reason, i) => (
                <li key={i}>{reason}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {hasPartialFailure && !streaming && (
        <div style={{
          background: "rgba(245,166,35,0.08)",
          border: "1px solid rgba(245,166,35,0.3)",
          borderRadius: 8,
          padding: "12px 16px",
          marginBottom: 16,
        }}>
          <p style={{ fontSize: 12, color: "#F5A623", margin: failureReasons.length > 0 ? "0 0 6px" : 0 }}>
            {streamSummary!.errors} {streamSummary!.errors === 1 ? "property" : "properties"} could not be analyzed
          </p>
          {failureReasons.length > 0 && (
            <ul style={{ fontSize: 12, color: "#F5A623", opacity: 0.85, margin: 0, paddingLeft: 18 }}>
              {[...new Set(failureReasons)].slice(0, 5).map((reason, i) => (
                <li key={i}>{reason}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ── Progress bar ─────────────────────────────────────────────────── */}
      {streaming && (
        <div style={{ marginBottom: 16 }}>
          <div style={{
            width: "100%",
            height: 3,
            background: "var(--bg-elevated)",
            borderRadius: 2,
            overflow: "hidden",
          }}>
            <div style={{
              height: "100%",
              background: "var(--accent)",
              borderRadius: 2,
              width: progress ? `${(progress.current / progress.total) * 100}%` : "0%",
              transition: "width 0.4s ease",
            }} />
          </div>
          {progress && (
            <p style={{
              fontSize: 11,
              color: "var(--text-muted)",
              fontFamily: "var(--font-mono), monospace",
              marginTop: 6,
            }}>
              Analyzing {progress.current} of {progress.total} — {progress.address}
            </p>
          )}
        </div>
      )}

      {/* ── Agent register — the machine working ──────────────────────────── */}
      {agentSteps.length > 0 && streaming && (
        // Live trace: full terminal panel, distinct from the calm results below
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span className="font-mono" style={{
              fontSize: 9, fontWeight: 600, letterSpacing: "0.16em",
              textTransform: "uppercase", color: "var(--agent)",
            }}>
              ▸ agent working
            </span>
            <span className="agent-pulse" style={{ width: 6, height: 6, borderRadius: "50%" }} />
          </div>
          <div
            ref={traceRef}
            className="agent-surface"
            style={{
              padding: "12px 16px",
              maxHeight: 220,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            {agentSteps.map((step, i) => {
              const isLast = i === agentSteps.length - 1;
              return (
                <p
                  key={i}
                  className={`agent-log${isLast ? " agent-log-active agent-caret" : ""}`}
                  style={{ margin: 0, whiteSpace: "pre-wrap" }}
                >
                  {step}
                </p>
              );
            })}
          </div>
        </div>
      )}

      {/* Persistent artifact: once the run is done the trace collapses into an
          expandable "how this was found" strip so the reasoning isn't lost. */}
      {agentSteps.length > 0 && !streaming && (
        <div style={{ marginBottom: 20 }}>
          <button
            className="agent-strip"
            onClick={() => setTraceExpanded((v) => !v)}
            aria-expanded={traceExpanded}
            style={{
              display: "inline-flex", alignItems: "center", gap: 7,
              padding: "5px 11px", cursor: "pointer", fontFamily: "inherit",
            }}
          >
            <span style={{ transform: traceExpanded ? "rotate(90deg)" : "none", transition: "transform 0.15s ease", display: "inline-block" }}>▸</span>
            how this was found · {agentSteps.length} steps
          </button>
          {traceExpanded && (
            <div
              className="agent-surface"
              style={{
                marginTop: 8, padding: "12px 16px",
                maxHeight: 300, overflowY: "auto",
                display: "flex", flexDirection: "column", gap: 6,
              }}
            >
              {agentSteps.map((step, i) => (
                <p key={i} className="agent-log" style={{ margin: 0, whiteSpace: "pre-wrap" }}>
                  {step}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Results ───────────────────────────────────────────────────────── */}
      {results.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          {/* Summary row + view toggle — only after streaming completes */}
          {!streaming && streamSummary && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
              <p style={{ fontSize: 11, color: "var(--text-muted)" }}>
                {streamSummary.total_analyzed} of {streamSummary.total_found} properties analyzed
                {streamSummary.errors > 0 && ` · ${streamSummary.errors} failed`}
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {/* Map / List toggle */}
                <div
                  style={{
                    display: "flex",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: 6,
                    overflow: "hidden",
                  }}
                >
                  {(["list", "map"] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={mode === "map" ? handleMapToggle : () => setViewMode("list")}
                      style={{
                        height: 30,
                        padding: "0 12px",
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: "pointer",
                        border: "none",
                        background: viewMode === mode ? "rgba(var(--accent-rgb),0.15)" : "transparent",
                        color: viewMode === mode ? "var(--accent)" : "var(--text-muted)",
                        fontFamily: "inherit",
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        transition: "background 0.1s, color 0.1s",
                      }}
                    >
                      {mode === "list" ? (
                        <svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h10" />
                        </svg>
                      ) : (
                        <svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                        </svg>
                      )}
                      {mode === "list" ? "List" : geocoding ? "Loading…" : "Map"}
                    </button>
                  ))}
                </div>

                <button
                  onClick={openSaveModal}
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
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    transition: "border-color 0.12s, color 0.12s",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)";
                    (e.currentTarget as HTMLElement).style.color = "var(--accent)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = "var(--border-subtle)";
                    (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)";
                  }}
                >
                  <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  Save as alert
                </button>
                <Link
                  href="/dashboard"
                  style={{
                    height: 30,
                    padding: "0 12px",
                    background: "rgba(var(--accent-rgb),0.1)",
                    border: "1px solid rgba(var(--accent-rgb),0.25)",
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
                  View in portfolio
                </Link>
              </div>
            </div>
          )}

          {/* Map view — only after streaming completes */}
          {viewMode === "map" && !streaming && (
            <MapView results={geoResults} />
          )}

          {/* List view */}
          {viewMode === "list" && (
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

              {/* Rows — animate in as they arrive */}
              {results.map((r, i) => (
                <div
                  key={r.property_id}
                  className="ps-result-enter"
                  style={{
                    animationDelay: `${Math.min(i * 0.05, 0.3)}s`,
                    display: "grid",
                    gridTemplateColumns: "minmax(140px, 2fr) 56px 100px 76px 108px minmax(120px, 1fr) 130px",
                    padding: "13px 16px",
                    gap: 12,
                    alignItems: "center",
                    borderBottom: i < results.length - 1 ? "1px solid var(--border-subtle)" : "none",
                    background: selectedIds.has(r.property_id) ? "rgba(var(--accent-rgb),0.05)" : "transparent",
                    transition: "background 0.1s ease",
                  }}
                >
                  <span style={{ fontSize: 12, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {r.address}
                  </span>
                  <span className="font-mono" style={{
                    fontSize: 14, fontWeight: 700,
                    color: scoreColor(r.overall_score),
                    letterSpacing: "-0.01em",
                  }}>
                    {r.overall_score}
                  </span>
                  <span className="font-mono" style={{ fontSize: 12, color: "var(--text-primary)", fontWeight: 600 }}>
                    {r.list_price ? usd.format(r.list_price) : "—"}
                  </span>
                  <span className="font-mono" style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                    {r.cap_rate ? `${r.cap_rate}%` : "—"}
                  </span>
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
                  <span style={{
                    fontSize: 11, color: "var(--text-secondary)",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }} title={r.verdict}>
                    {truncate(r.verdict, 80)}
                  </span>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <Link
                      href={`/property/${r.property_id}`}
                      style={{
                        height: 26, padding: "0 10px",
                        background: "rgba(var(--accent-rgb),0.1)",
                        border: "1px solid rgba(var(--accent-rgb),0.25)",
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
                          ? "rgba(var(--accent-rgb),0.18)"
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
          )}
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
              background: selectedIds.size >= 2 ? "var(--agent)" : "rgba(var(--agent-rgb),0.25)",
              borderRadius: 6, fontSize: 12, fontWeight: 700,
              color: selectedIds.size >= 2 ? "var(--agent-ink)" : "var(--text-muted)", textDecoration: "none",
              display: "inline-flex", alignItems: "center",
              pointerEvents: selectedIds.size >= 2 ? "auto" : "none",
              transition: "background 0.12s ease",
            }}
          >
            Compare ({selectedIds.size})
          </Link>
        </div>
      )}

      {/* ── Save as alert modal ───────────────────────────────────────────── */}
      {saveModalOpen && (
        <div
          className="ps-modal-backdrop"
          onClick={(e) => { if (e.target === e.currentTarget) setSaveModalOpen(false); }}
        >
          <div className="ps-modal">
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.015em", marginBottom: 16 }}>
              Save search as alert
            </h2>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 6 }}>
                Alert name
              </label>
              <input
                type="text"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                style={{ width: "100%", background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", borderRadius: 7, padding: "9px 12px", fontSize: 13, color: "var(--text-primary)", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
                autoFocus
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 6 }}>
                Min score (0–100)
              </label>
              <input
                type="number"
                value={saveMinScore}
                onChange={(e) => setSaveMinScore(e.target.value)}
                min={0}
                max={100}
                style={{ width: "100%", background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", borderRadius: 7, padding: "9px 12px", fontSize: 13, color: "var(--text-primary)", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
              />
            </div>

            {saveError && (
              <p style={{ fontSize: 12, color: "var(--score-red)", marginBottom: 14 }}>{saveError}</p>
            )}

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                onClick={() => setSaveModalOpen(false)}
                disabled={saving}
                style={{ padding: "8px 16px", borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: "pointer", border: "1px solid var(--border-subtle)", background: "transparent", color: "var(--text-secondary)", fontFamily: "inherit" }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAlert}
                disabled={saving || !saveName.trim()}
                style={{ padding: "8px 16px", borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: saving || !saveName.trim() ? "not-allowed" : "pointer", border: "none", background: saving || !saveName.trim() ? "rgba(var(--agent-rgb),0.35)" : "var(--agent)", color: saving || !saveName.trim() ? "var(--text-muted)" : "var(--agent-ink)", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 7 }}
              >
                {saving && (
                  <svg width="12" height="12" fill="none" viewBox="0 0 24 24" style={{ animation: "spin 0.8s linear infinite" }}>
                    <circle cx={12} cy={12} r={10} stroke="currentColor" strokeWidth={4} opacity={0.25} />
                    <path fill="currentColor" opacity={0.75} d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ─────────────────────────────────────────────────────────── */}
      {toast && (
        <div className="ps-toast" style={{ color: toast.ok ? "var(--score-green)" : "var(--score-red)" }}>
          {toast.msg}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
