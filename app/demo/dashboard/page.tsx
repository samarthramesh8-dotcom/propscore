import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import PropertyCard from "@/components/PropertyCard";
import { MOCK_PROPERTIES } from "@/lib/mock-data";

export default function DemoDashboardPage() {
  const list  = MOCK_PROPERTIES;
  const count = list.length;
  const avg   = Math.round(list.reduce((s, p) => s + p.overall_score, 0) / count);
  const best  = Math.max(...list.map((p) => p.overall_score));

  const stats = [
    { label: "Analyzed", value: count },
    { label: "Avg score", value: avg },
    { label: "Best score", value: best },
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg-base)" }}>
      <Sidebar />

      <main className="ps-page-main" style={{ flex: 1, minWidth: 0 }}>

        {/* ── Guest banner ────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "10px 20px",
            background: "rgba(91,91,214,0.08)",
            borderBottom: "1px solid rgba(91,91,214,0.2)",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <svg width="13" height="13" fill="none" stroke="var(--accent)" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", lineHeight: 1.5 }}>
              <strong style={{ color: "var(--accent)", fontWeight: 700 }}>Demo mode</strong>
              {" — "}these are sample analyses. Create a free account to score real properties.
            </span>
          </div>
          <Link
            href="/login"
            style={{
              fontSize: 11, fontWeight: 700, color: "#fff",
              background: "var(--accent)", borderRadius: 6,
              padding: "5px 12px", textDecoration: "none",
              flexShrink: 0, letterSpacing: "-0.01em",
              transition: "background 0.15s ease",
            }}
          >
            Get started free →
          </Link>
        </div>

        {/* ── Header ──────────────────────────────────────────── */}
        <div
          className="ps-dashboard-header"
          style={{ padding: "28px 36px 24px", borderBottom: "1px solid var(--border-subtle)" }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
            <div>
              <h1 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.015em", marginBottom: 4 }}>
                Sample Portfolio
              </h1>
              <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
                Three real-market examples — Austin, Houston, and Dallas
              </p>
            </div>
            <Link
              href="/login"
              className="ps-btn-accent"
              style={{
                display: "flex", alignItems: "center", gap: 6,
                color: "#fff", fontSize: 12, fontWeight: 600,
                padding: "8px 14px", borderRadius: 7,
                textDecoration: "none", flexShrink: 0,
              }}
            >
              <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 5v14m7-7H5" />
              </svg>
              Analyze your own
            </Link>
          </div>

          {/* Stats */}
          <div className="ps-stats-row" style={{ display: "flex", gap: 32, marginTop: 24 }}>
            {stats.map(({ label, value }) => (
              <div key={label}>
                <p className="font-mono" style={{ fontSize: 24, fontWeight: 600, color: "var(--text-primary)", letterSpacing: "-0.02em", lineHeight: 1, marginBottom: 5 }}>
                  {value}
                </p>
                <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-muted)" }}>
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Property list ────────────────────────────────────── */}
        <div className="ps-dashboard-content" style={{ padding: "24px 36px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {list.map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
                basePath="/demo/property"
              />
            ))}
          </div>
        </div>

      </main>
    </div>
  );
}
