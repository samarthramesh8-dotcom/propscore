export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import ScoreRing from "@/components/ScoreRing";
import SubscoreCard from "@/components/SubscoreCard";
import Sidebar from "@/components/Sidebar";
import { Property } from "@/lib/types";

export default async function PropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("properties")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!data) notFound();

  const property = data as Property;
  const date = new Date(property.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg-base)" }}>
      <Sidebar />

      <main style={{ flex: 1, minWidth: 0, paddingBottom: 64 }}>
        {/* ── Top bar ──────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "16px 28px",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          <Link
            href="/dashboard"
            className="ps-icon-btn"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 28,
              height: 28,
              borderRadius: 6,
              background: "var(--bg-surface)",
              textDecoration: "none",
              flexShrink: 0,
            }}
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>

          <div style={{ minWidth: 0 }}>
            <h1
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "var(--text-primary)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                letterSpacing: "-0.01em",
              }}
            >
              {property.address}
            </h1>
          </div>

          <span
            className="font-mono"
            style={{
              marginLeft: "auto",
              fontSize: 11,
              color: "var(--text-muted)",
              flexShrink: 0,
            }}
          >
            {date}
          </span>
        </div>

        <div style={{ padding: "28px 28px", display: "flex", flexDirection: "column", gap: 24 }}>
          {/* ── Hero: score ring + address + verdict ─────── */}
          <div
            style={{
              display: "flex",
              gap: 32,
              alignItems: "flex-start",
              background: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
              borderRadius: 10,
              padding: "28px 28px",
            }}
          >
            {/* Score ring */}
            <div style={{ flexShrink: 0 }}>
              <ScoreRing score={property.overall_score} size={140} strokeWidth={10} glow={true} />
              <p
                style={{
                  textAlign: "center",
                  fontSize: 9,
                  fontWeight: 600,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "var(--text-muted)",
                  marginTop: 12,
                }}
              >
                Overall score
              </p>
            </div>

            {/* Right column */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  color: "var(--text-primary)",
                  letterSpacing: "-0.025em",
                  lineHeight: 1.25,
                  marginBottom: 12,
                }}
              >
                {property.address}
              </h2>

              <p
                style={{
                  fontSize: 9,
                  fontWeight: 600,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "var(--text-muted)",
                  marginBottom: 8,
                }}
              >
                Verdict
              </p>
              <p
                style={{
                  fontSize: 13,
                  lineHeight: 1.75,
                  color: "var(--text-secondary)",
                }}
              >
                {property.verdict}
              </p>
            </div>
          </div>

          {/* ── Subscores 2-col grid ──────────────────────── */}
          <div>
            <p
              style={{
                fontSize: 9,
                fontWeight: 600,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
                marginBottom: 12,
              }}
            >
              Category breakdown
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: 8,
              }}
            >
              {property.subscores.map((s) => (
                <SubscoreCard
                  key={s.category}
                  category={s.category}
                  score={s.score}
                  summary={s.summary}
                />
              ))}
            </div>
          </div>

          {/* ── Bull / Bear ───────────────────────────────── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: 8,
            }}
          >
            {/* Bull case */}
            <div
              style={{
                background: "rgba(0, 210, 106, 0.04)",
                border: "1px solid rgba(0, 210, 106, 0.15)",
                borderRadius: 10,
                padding: "18px 18px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    background: "rgba(0, 210, 106, 0.12)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg width="9" height="9" fill="none" stroke="var(--score-green)" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                </div>
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 600,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: "var(--score-green)",
                  }}
                >
                  Bull case
                </span>
              </div>
              <p style={{ fontSize: 12, lineHeight: 1.7, color: "var(--text-secondary)" }}>
                {property.bull_case}
              </p>
            </div>

            {/* Bear case */}
            <div
              style={{
                background: "rgba(232, 56, 79, 0.04)",
                border: "1px solid rgba(232, 56, 79, 0.15)",
                borderRadius: 10,
                padding: "18px 18px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    background: "rgba(232, 56, 79, 0.12)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg width="9" height="9" fill="none" stroke="var(--score-red)" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </div>
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 600,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: "var(--score-red)",
                  }}
                >
                  Bear case
                </span>
              </div>
              <p style={{ fontSize: 12, lineHeight: 1.7, color: "var(--text-secondary)" }}>
                {property.bear_case}
              </p>
            </div>
          </div>

          {/* ── Source data ───────────────────────────────── */}
          <div>
            <p
              style={{
                fontSize: 9,
                fontWeight: 600,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
                marginBottom: 12,
              }}
            >
              Source data
            </p>
            <div
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border-subtle)",
                borderRadius: 10,
                padding: "16px 18px",
                overflowX: "auto",
              }}
            >
              <pre
                className="font-mono"
                style={{
                  fontSize: 11,
                  lineHeight: 1.7,
                  color: "var(--text-muted)",
                  whiteSpace: "pre-wrap",
                  margin: 0,
                }}
              >
                {property.listing_text}
              </pre>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
