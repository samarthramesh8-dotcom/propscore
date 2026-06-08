export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import ScoreRing from "@/components/ScoreRing";
import SubscoreCard from "@/components/SubscoreCard";
import CashFlowChart from "@/components/CashFlowChart";
import PhotoGallery from "@/components/PhotoGallery";
import ListingDescription from "@/components/ListingDescription";
import PriceHistory from "@/components/PriceHistory";
import SchoolsDisplay from "@/components/SchoolsDisplay";
import PropertyFacts from "@/components/PropertyFacts";
import ListingDataSection from "@/components/ListingDataSection";
import { Property } from "@/lib/types";

function barColor(score: number): string {
  if (score >= 75) return "var(--score-green)";
  if (score >= 50) return "var(--score-amber)";
  return "var(--score-red)";
}

export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase  = await createClient();

  const { data: share } = await supabase
    .from("shared_analyses")
    .select("property_id, created_at, expires_at")
    .eq("token", token)
    .single();

  if (!share) notFound();
  if (share.expires_at && new Date(share.expires_at) < new Date()) notFound();

  const { data } = await supabase
    .from("properties")
    .select("*")
    .eq("id", share.property_id)
    .single();

  if (!data) notFound();

  const property = data as Property;
  const analyzedDate = new Date(property.updated_at ?? property.created_at).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });
  const sharedDate = new Date(share.created_at).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });

  const labelStyle = {
    fontSize: 9, fontWeight: 600, letterSpacing: "0.14em",
    textTransform: "uppercase" as const, color: "var(--text-muted)", marginBottom: 12,
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)" }}>
      {/* ── Shared-by banner ──────────────────────────────────────── */}
      <div
        style={{
          background: "var(--bg-surface)", borderBottom: "1px solid var(--border-subtle)",
          padding: "12px 28px", display: "flex", alignItems: "center",
          justifyContent: "space-between", gap: 16, flexWrap: "wrap",
        }}
      >
        <Link href="/login" style={{ display: "flex", alignItems: "center", gap: 9, textDecoration: "none", flexShrink: 0 }}>
          <div style={{ width: 24, height: 24, borderRadius: 6, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="12" height="12" fill="none" stroke="white" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>PropScore</span>
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--accent)", background: "rgba(91,91,214,0.1)", border: "1px solid rgba(91,91,214,0.2)", borderRadius: 4, padding: "2px 7px" }}>
            Shared analysis · {sharedDate}
          </span>
          <Link
            href="/login"
            style={{
              display: "flex", alignItems: "center", gap: 6,
              height: 30, padding: "0 14px", borderRadius: 6,
              fontSize: 12, fontWeight: 600, textDecoration: "none",
              background: "var(--accent)", color: "#fff",
            }}
          >
            Create your own analysis →
          </Link>
        </div>
      </div>

      <main style={{ maxWidth: 860, margin: "0 auto", padding: "32px 24px 80px" }}>
        {/* ── Address + date ─────────────────────────────────────── */}
        <div style={{ marginBottom: 28 }}>
          <h1
            style={{
              fontSize: 20, fontWeight: 800, color: "var(--text-primary)",
              letterSpacing: "-0.025em", lineHeight: 1.2, marginBottom: 6,
            }}
          >
            {property.address}
          </h1>
          <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
            Analyzed {analyzedDate} · PropScore investment analysis
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

          {/* 1. Photo gallery */}
          {property.rich_data?.photos && property.rich_data.photos.length > 0 && (
            <div className="ps-gallery-breakout">
              <PhotoGallery
                photos={property.rich_data.photos}
                address={property.address}
              />
            </div>
          )}

          {/* 2. Hero: score ring + verdict */}
          <div
            style={{
              display: "flex", gap: 28, alignItems: "flex-start",
              background: "var(--bg-surface)", border: "1px solid var(--border-subtle)",
              borderRadius: 10, padding: "24px 24px", flexWrap: "wrap",
            }}
          >
            <div style={{ flexShrink: 0 }}>
              <ScoreRing score={property.overall_score} size={120} strokeWidth={9} glow={true} />
              <p style={{ textAlign: "center", fontSize: 9, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-muted)", marginTop: 10 }}>
                Overall score
              </p>
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
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
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
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
                    <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 88px 88px 72px 56px", padding: "12px 18px", borderBottom: i < property.rentcast_comps!.length - 1 ? "1px solid var(--border-subtle)" : "none", alignItems: "center" }}>
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
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
            <div style={{ background: "rgba(0,210,106,0.04)", border: "1px solid rgba(0,210,106,0.15)", borderRadius: 10, padding: "18px 18px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <div style={{ width: 20, height: 20, borderRadius: "50%", background: "rgba(0,210,106,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="9" height="9" fill="none" stroke="var(--score-green)" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                </div>
                <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--score-green)" }}>Bull case</span>
              </div>
              <p style={{ fontSize: 12, lineHeight: 1.7, color: "var(--text-secondary)" }}>{property.bull_case}</p>
            </div>
            <div style={{ background: "rgba(232,56,79,0.04)", border: "1px solid rgba(232,56,79,0.15)", borderRadius: 10, padding: "18px 18px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <div style={{ width: 20, height: 20, borderRadius: "50%", background: "rgba(232,56,79,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="9" height="9" fill="none" stroke="var(--score-red)" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                </div>
                <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--score-red)" }}>Bear case</span>
              </div>
              <p style={{ fontSize: 12, lineHeight: 1.7, color: "var(--text-secondary)" }}>{property.bear_case}</p>
            </div>
          </div>

          {/* ── Score breakdown bar list ──────────────────────── */}
          <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: 10, overflow: "hidden" }}>
            {property.subscores.map((s, i) => (
              <div
                key={s.category}
                style={{
                  display: "flex", alignItems: "center", gap: 16, padding: "12px 18px",
                  borderBottom: i < property.subscores.length - 1 ? "1px solid var(--border-subtle)" : "none",
                }}
              >
                <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)", width: 180, flexShrink: 0 }}>
                  {s.category}
                </span>
                <div style={{ flex: 1, height: 4, background: "var(--border-subtle)", borderRadius: 999, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${s.score}%`, background: barColor(s.score), borderRadius: 999 }} />
                </div>
                <span className="font-mono" style={{ fontSize: 13, fontWeight: 700, color: barColor(s.score), width: 28, textAlign: "right", flexShrink: 0 }}>
                  {s.score}
                </span>
              </div>
            ))}
          </div>

          {/* ── Analysis data ────────────────────────────────── */}
          <ListingDataSection listingText={property.listing_text} />

          {/* ── CTA footer ───────────────────────────────────── */}
          <div
            style={{
              background: "var(--bg-surface)", border: "1px solid var(--border-subtle)",
              borderRadius: 10, padding: "24px 24px", textAlign: "center",
            }}
          >
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <svg width="18" height="18" fill="none" stroke="white" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2}
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.015em", marginBottom: 8 }}>
              Analyze your own properties
            </h3>
            <p style={{ fontSize: 12, color: "var(--text-muted)", maxWidth: 340, margin: "0 auto 20px", lineHeight: 1.6 }}>
              Paste any Zillow URL to get a data-backed investment score — cap rate, rent yield, school ratings, and cash flow projections.
            </p>
            <Link
              href="/login"
              style={{
                display: "inline-flex", alignItems: "center", gap: 7,
                padding: "10px 22px", borderRadius: 8,
                fontSize: 13, fontWeight: 600, textDecoration: "none",
                background: "var(--accent)", color: "#fff",
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
