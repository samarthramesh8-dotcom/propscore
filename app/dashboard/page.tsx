export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import PropertyCard from "@/components/PropertyCard";
import Sidebar from "@/components/Sidebar";
import { Property } from "@/lib/types";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: properties } = await supabase
    .from("properties")
    .select("*")
    .eq("user_id", user.id)
    .order("overall_score", { ascending: false });

  const list = (properties as Property[]) ?? [];
  const count = list.length;
  const avgScore = count
    ? Math.round(list.reduce((s, p) => s + p.overall_score, 0) / count)
    : null;
  const best = count ? Math.max(...list.map((p) => p.overall_score)) : null;

  const stats = [
    { label: "Analyzed", value: count },
    { label: "Avg score", value: avgScore },
    { label: "Best score", value: best },
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg-base)" }}>
      <Sidebar />

      <main style={{ flex: 1, minWidth: 0 }}>
        {/* Header */}
        <div
          style={{
            padding: "28px 32px 24px",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
            <div>
              <h1
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  letterSpacing: "-0.015em",
                  marginBottom: 4,
                }}
              >
                Portfolio
              </h1>
              <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
                Analyzed properties, ranked by investment score
              </p>
            </div>

            <Link
              href="/analyze"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: "var(--accent)",
                color: "#fff",
                fontSize: 12,
                fontWeight: 600,
                padding: "8px 14px",
                borderRadius: 7,
                textDecoration: "none",
                flexShrink: 0,
                transition: "background 0.15s ease",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--accent-hover)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--accent)"; }}
            >
              <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 5v14m7-7H5" />
              </svg>
              New analysis
            </Link>
          </div>

          {/* Stats row */}
          {count > 0 && (
            <div style={{ display: "flex", gap: 32, marginTop: 24 }}>
              {stats.map(({ label, value }) => (
                <div key={label}>
                  <p
                    className="font-mono"
                    style={{
                      fontSize: 24,
                      fontWeight: 600,
                      color: "var(--text-primary)",
                      letterSpacing: "-0.02em",
                      lineHeight: 1,
                      marginBottom: 5,
                    }}
                  >
                    {value ?? "—"}
                  </p>
                  <p
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      color: "var(--text-muted)",
                    }}
                  >
                    {label}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <div style={{ padding: "24px 32px" }}>
          {!count ? (
            /* Empty state */
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "80px 0",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 10,
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-subtle)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 20,
                }}
              >
                <svg width="22" height="22" fill="none" stroke="var(--text-muted)" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  letterSpacing: "-0.01em",
                  marginBottom: 8,
                }}
              >
                No properties yet
              </h3>
              <p style={{ fontSize: 12, color: "var(--text-muted)", maxWidth: 280, lineHeight: 1.6, marginBottom: 20 }}>
                Paste a Zillow URL to get a data-backed investment score — cap rate, rent yield, school ratings and more.
              </p>
              <Link
                href="/analyze"
                style={{
                  background: "var(--accent)",
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 600,
                  padding: "9px 18px",
                  borderRadius: 7,
                  textDecoration: "none",
                }}
              >
                Analyze your first property
              </Link>
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                maxWidth: 720,
              }}
            >
              {list.map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
