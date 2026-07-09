import { notFound } from "next/navigation";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import ScoreRing from "@/components/ScoreRing";
import SubscoreCard from "@/components/SubscoreCard";
import CashFlowChart from "@/components/CashFlowChart";
import PhotoGallery from "@/components/PhotoGallery";
import ListingDescription from "@/components/ListingDescription";
import PriceHistory from "@/components/PriceHistory";
import SchoolsDisplay from "@/components/SchoolsDisplay";
import PropertyFacts from "@/components/PropertyFacts";
import ListingDataSection from "@/components/ListingDataSection";
import { MOCK_PROPERTIES } from "@/lib/mock-data";

export default async function DemoPropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const property = MOCK_PROPERTIES.find((p) => p.id === id);
  if (!property) notFound();

  const date = new Date(property.created_at).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });

  const labelStyle = {
    fontSize: 9, fontWeight: 600, letterSpacing: "0.14em",
    textTransform: "uppercase" as const, color: "var(--text-muted)", marginBottom: 12,
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg-base)" }}>
      <Sidebar />

      <main className="ps-page-main" style={{ flex: 1, minWidth: 0, paddingBottom: 64 }}>

        {/* ── Guest banner ────────────────────────────────────── */}
        <div
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            gap: 12, padding: "10px 20px",
            background: "rgba(var(--accent-rgb),0.08)", borderBottom: "1px solid rgba(var(--accent-rgb),0.2)",
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
              {" — "}sample analysis. Create a free account to score real Zillow listings.
            </span>
          </div>
          <Link
            href="/login"
            style={{
              fontSize: 11, fontWeight: 700, color: "#fff",
              background: "var(--accent)", borderRadius: 6,
              padding: "5px 12px", textDecoration: "none",
              flexShrink: 0, letterSpacing: "-0.01em",
            }}
          >
            Get started free →
          </Link>
        </div>

        {/* ── Top bar ─────────────────────────────────────────── */}
        <div
          className="ps-property-topbar"
          style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "16px 28px", borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          <Link
            href="/demo/dashboard"
            className="ps-icon-btn"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 28, height: 28, borderRadius: 6,
              background: "var(--bg-surface)", textDecoration: "none", flexShrink: 0,
            }}
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div style={{ minWidth: 0 }}>
            <h1
              style={{
                fontSize: 13, fontWeight: 600, color: "var(--text-primary)",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                letterSpacing: "-0.01em",
              }}
            >
              {property.address}
            </h1>
          </div>

          {property.zillow_url && (
            <a
              href={property.zillow_url}
              target="_blank"
              rel="noopener noreferrer"
              className="ps-zillow-link"
              style={{
                display: "flex", alignItems: "center", gap: 5,
                height: 28, padding: "0 10px", borderRadius: 6,
                fontSize: 11, fontWeight: 600,
                background: "transparent", textDecoration: "none", flexShrink: 0,
              }}
            >
              <svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              <span className="ps-topbar-btn-label">Zillow</span>
            </a>
          )}

          <span
            className="font-mono"
            style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-muted)", flexShrink: 0 }}
          >
            {date}
          </span>
        </div>

        <div className="ps-property-content" style={{ padding: "28px 28px", display: "flex", flexDirection: "column", gap: 24 }}>

          {/* 1. Photo gallery */}
          {property.rich_data?.photos && property.rich_data.photos.length > 0 && (
            <div className="ps-gallery-breakout">
              <PhotoGallery
                photos={property.rich_data.photos}
                address={property.address}
              />
            </div>
          )}

          {/* 2. Hero */}
          <div
            className="ps-hero-layout"
            style={{
              display: "flex", gap: 32, alignItems: "flex-start",
              background: "var(--bg-surface)", border: "1px solid var(--border-subtle)",
              borderRadius: 10, padding: "28px 28px",
            }}
          >
            <div style={{ flexShrink: 0 }}>
              <ScoreRing score={property.overall_score} size={140} strokeWidth={10} glow={true} />
              <p style={{ textAlign: "center", fontSize: 9, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-muted)", marginTop: 12 }}>
                Overall score
              </p>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.025em", lineHeight: 1.25, marginBottom: 12 }}>
                {property.address}
              </h2>
              <p style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 8 }}>
                Verdict
              </p>
              <p style={{ fontSize: 13, lineHeight: 1.75, color: "var(--text-secondary)" }}>
                {property.verdict}
              </p>
            </div>
          </div>

          {/* 3. Description */}
          {property.rich_data?.description && (
            <div>
              <p style={labelStyle}>Description</p>
              <ListingDescription description={property.rich_data.description} />
            </div>
          )}

          {/* 4. Property facts */}
          {property.rich_data && (
            <div>
              <p style={labelStyle}>Property details</p>
              <PropertyFacts
                richData={property.rich_data}
                listingText={property.listing_text}
                mudRate={property.mud_rate}
              />
            </div>
          )}

          {/* 5. Schools */}
          {property.rich_data?.schools && property.rich_data.schools.length > 0 && (
            <div>
              <p style={labelStyle}>Assigned schools</p>
              <SchoolsDisplay schools={property.rich_data.schools} />
            </div>
          )}

          {/* 6. Subscores */}
          <div>
            <p style={labelStyle}>Category breakdown</p>
            <div className="ps-grid-2col" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
              {property.subscores.map((s) => (
                <SubscoreCard key={s.category} category={s.category} score={s.score} summary={s.summary} />
              ))}
            </div>
          </div>

          {/* 7. Cash flow */}
          <div>
            <p style={labelStyle}>Cash Flow Projection</p>
            <CashFlowChart
              listingText={property.listing_text}
              rentcastEstimate={property.rentcast_estimate}
              mudRate={property.mud_rate}
            />
          </div>

          {/* 8. Comparable rentals */}
          {property.rentcast_comps && property.rentcast_comps.length > 0 && (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <p style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-muted)", margin: 0 }}>
                  Comparable Rentals
                </p>
                <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#818CF8", background: "rgba(129,140,248,0.1)", border: "1px solid rgba(129,140,248,0.25)", borderRadius: 4, padding: "1px 6px" }}>
                  Rentcast
                </span>
              </div>
              <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: 10, overflowX: "auto" }}>
                <div style={{ minWidth: 460 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 88px 88px 72px 56px", padding: "10px 18px", borderBottom: "1px solid var(--border-subtle)" }}>
                    {["Address", "Rent / mo", "Bed / Ba", "Sqft", "Dist"].map((h) => (
                      <span key={h} style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-muted)" }}>{h}</span>
                    ))}
                  </div>
                  {property.rentcast_comps.map((comp, i) => (
                    <div
                      key={i}
                      style={{
                        display: "grid", gridTemplateColumns: "1fr 88px 88px 72px 56px",
                        padding: "12px 18px",
                        borderBottom: i < property.rentcast_comps!.length - 1 ? "1px solid var(--border-subtle)" : "none",
                        alignItems: "center",
                      }}
                    >
                      <span style={{ fontSize: 11, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 12 }}>{comp.address}</span>
                      <span className="font-mono" style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>${comp.rent.toLocaleString()}</span>
                      <span className="font-mono" style={{ fontSize: 11, color: "var(--text-secondary)" }}>{comp.bedrooms}bd / {comp.bathrooms}ba</span>
                      <span className="font-mono" style={{ fontSize: 11, color: "var(--text-secondary)" }}>{comp.squareFootage ? comp.squareFootage.toLocaleString() : "—"}</span>
                      <span className="font-mono" style={{ fontSize: 11, color: "var(--text-muted)" }}>{comp.distanceMi}mi</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 9. Price history */}
          {property.rich_data?.priceHistory && property.rich_data.priceHistory.length > 0 && (
            <div>
              <p style={labelStyle}>Price history</p>
              <PriceHistory history={property.rich_data.priceHistory} />
            </div>
          )}

          {/* 10. Bull / Bear */}
          <div className="ps-grid-2col" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
            <div style={{ background: "rgba(0,210,106,0.04)", border: "1px solid rgba(0,210,106,0.15)", borderRadius: 10, padding: "18px 18px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <div style={{ width: 20, height: 20, borderRadius: "50%", background: "rgba(0,210,106,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="9" height="9" fill="none" stroke="var(--score-green)" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                </div>
                <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--score-green)" }}>Bull case</span>
              </div>
              <p style={{ fontSize: 12, lineHeight: 1.7, color: "var(--text-secondary)" }}>{property.bull_case}</p>
            </div>
            <div style={{ background: "rgba(232,56,79,0.04)", border: "1px solid rgba(232,56,79,0.15)", borderRadius: 10, padding: "18px 18px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <div style={{ width: 20, height: 20, borderRadius: "50%", background: "rgba(232,56,79,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="9" height="9" fill="none" stroke="var(--score-red)" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </div>
                <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--score-red)" }}>Bear case</span>
              </div>
              <p style={{ fontSize: 12, lineHeight: 1.7, color: "var(--text-secondary)" }}>{property.bear_case}</p>
            </div>
          </div>

          {/* 11. Analysis data */}
          <ListingDataSection listingText={property.listing_text} />

          {/* ── CTA ──────────────────────────────────────────── */}
          <div
            style={{
              background: "rgba(var(--agent-rgb),0.06)", border: "1px solid rgba(var(--agent-rgb),0.18)",
              borderRadius: 10, padding: "20px 24px",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              gap: 16, flexWrap: "wrap",
            }}
          >
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
                Ready to score your own properties?
              </p>
              <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
                Paste any Zillow URL — get a full analysis in under a minute.
              </p>
            </div>
            <Link
              href="/login"
              style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "10px 20px", borderRadius: 8,
                background: "var(--accent)", color: "#fff",
                fontSize: 13, fontWeight: 700, textDecoration: "none",
                flexShrink: 0, letterSpacing: "-0.01em",
              }}
            >
              Create free account →
            </Link>
          </div>

        </div>
      </main>
    </div>
  );
}
