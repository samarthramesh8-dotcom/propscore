export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import ScoreRing from "@/components/ScoreRing";
import { Property } from "@/lib/types";

function barColor(score: number): string {
  if (score >= 75) return "var(--score-green)";
  if (score >= 50) return "var(--score-amber)";
  return "var(--score-red)";
}

/** Pull the first match for a regex from listing_text, return "—" if not found. */
function metric(text: string, re: RegExp): string {
  const m = text.match(re);
  return m ? m[1].trim() : "—";
}

function getMetrics(p: Property) {
  const t = p.listing_text;
  return {
    price:    metric(t, /List price:\s*\$?([\d,]+)/i),
    capRate:  metric(t, /Cap rate:\s*([\d.]+%)/i),
    cashFlow: metric(t, /Monthly cash flow:\s*([+\-$\d,]+(?:\s*\(NEGATIVE\))?)/i),
    onePct:   metric(t, /1% rule:\s*([\d.]+%\s*[—\-]\s*(?:PASSES|FAILS)\s*[✓✗]?)/i),
    rent:     metric(t, /(?:Estimated monthly rent|Rent Zestimate):\s*\$?([\d,]+)/i) !== "—"
                ? metric(t, /(?:Estimated monthly rent|Rent Zestimate):\s*\$?([\d,]+)/i)
                : "—",
    dom:      metric(t, /Days on market:\s*(\d+)/i),
  };
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>;
}) {
  const params = await searchParams;
  const raw = params.ids ?? "";
  const ids = raw.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 3);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let properties: Property[] = [];

  if (ids.length >= 2) {
    const { data } = await supabase
      .from("properties")
      .select(
        "id, user_id, address, listing_text, overall_score, subscores, " +
        "verdict, bull_case, bear_case, rentcast_estimate, rentcast_comps, " +
        "mud_rate, notes, created_at, updated_at, source, zillow_url"
      )
      .in("id", ids)
      .eq("user_id", user.id);

    if (data) {
      // Preserve the URL order so column positions match what the user selected
      properties = ids
        .map((id) => (data as unknown as Property[]).find((p) => p.id === id))
        .filter((p): p is Property => !!p);
    }
  }

  const hasData = properties.length >= 2;

  // All category names from first property (consistent ordering assumed)
  const categories = hasData ? properties[0].subscores.map((s) => s.category) : [];

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg-base)" }}>
      <Sidebar />

      <main className="ps-page-main" style={{ flex: 1, minWidth: 0, paddingBottom: 40 }}>
        {/* ── Top bar ──────────────────────────────────────── */}
        <div
          className="ps-property-topbar"
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
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 28, height: 28, borderRadius: 6,
              background: "var(--bg-surface)", textDecoration: "none", flexShrink: 0,
            }}
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>
            Property Comparison
          </h1>
        </div>

        {/* ── Empty / invalid state ─────────────────────── */}
        {!hasData ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 24px", textAlign: "center" }}>
            <div style={{ width: 48, height: 48, borderRadius: 10, background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
              <svg width="22" height="22" fill="none" stroke="var(--text-muted)" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" />
              </svg>
            </div>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>
              Select properties to compare
            </h3>
            <p style={{ fontSize: 12, color: "var(--text-muted)", maxWidth: 300, lineHeight: 1.6, marginBottom: 20 }}>
              Check 2–3 properties on your dashboard, then click the "Compare" button to see a side-by-side breakdown.
            </p>
            <Link href="/dashboard" className="ps-btn-accent" style={{ color: "#fff", fontSize: 12, fontWeight: 600, padding: "9px 18px", borderRadius: 7, textDecoration: "none" }}>
              Go to Dashboard
            </Link>
          </div>
        ) : (
          <div style={{ padding: "24px 28px", overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
              <colgroup>
                <col style={{ width: 160 }} />
                {properties.map((p) => <col key={p.id} />)}
              </colgroup>

              <thead>
                <tr>
                  <th style={{ padding: "0 0 20px 0" }} />
                  {properties.map((p) => (
                    <th key={p.id} style={{ padding: "0 12px 20px 12px", textAlign: "center", verticalAlign: "top" }}>
                      <Link
                        href={`/property/${p.id}`}
                        style={{
                          fontSize: 12, fontWeight: 600, color: "var(--text-primary)",
                          textDecoration: "none", display: "block",
                          letterSpacing: "-0.01em", lineHeight: 1.4,
                        }}
                      >
                        {p.address}
                      </Link>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {/* Overall score */}
                <tr>
                  <td style={{ padding: "16px 0", borderTop: "1px solid var(--border-subtle)" }}>
                    <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-muted)" }}>
                      Overall Score
                    </span>
                  </td>
                  {properties.map((p) => (
                    <td key={p.id} style={{ padding: "16px 12px", borderTop: "1px solid var(--border-subtle)", textAlign: "center" }}>
                      <ScoreRing score={p.overall_score} size={80} strokeWidth={7} glow={false} />
                    </td>
                  ))}
                </tr>

                {/* Subscores */}
                {categories.map((cat) => (
                  <tr key={cat}>
                    <td style={{ padding: "12px 0", borderTop: "1px solid var(--border-subtle)" }}>
                      <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)" }}>
                        {cat}
                      </span>
                    </td>
                    {properties.map((p) => {
                      const sub = p.subscores.find((s) => s.category === cat);
                      const score = sub?.score ?? 0;
                      return (
                        <td key={p.id} style={{ padding: "12px 12px", borderTop: "1px solid var(--border-subtle)", textAlign: "center" }}>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                            <span className="font-mono" style={{ fontSize: 16, fontWeight: 700, color: barColor(score), letterSpacing: "-0.02em" }}>
                              {score}
                            </span>
                            <div style={{ width: "100%", maxWidth: 80, height: 4, background: "var(--border-subtle)", borderRadius: 999, overflow: "hidden" }}>
                              <div style={{ height: "100%", width: `${score}%`, background: barColor(score), borderRadius: 999 }} />
                            </div>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}

                {/* Key metrics section */}
                <tr>
                  <td colSpan={properties.length + 1} style={{ padding: "20px 0 8px 0", borderTop: "2px solid var(--border-default)" }}>
                    <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-muted)" }}>
                      Key Metrics
                    </span>
                  </td>
                </tr>

                {([
                  { key: "price",    label: "List Price" },
                  { key: "rent",     label: "Est. Rent / mo" },
                  { key: "capRate",  label: "Cap Rate" },
                  { key: "cashFlow", label: "Monthly Cash Flow" },
                  { key: "onePct",   label: "1% Rule" },
                  { key: "dom",      label: "Days on Market" },
                ] as { key: keyof ReturnType<typeof getMetrics>; label: string }[]).map(({ key, label }) => (
                  <tr key={key}>
                    <td style={{ padding: "10px 0", borderTop: "1px solid var(--border-subtle)" }}>
                      <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)" }}>
                        {label}
                      </span>
                    </td>
                    {properties.map((p) => {
                      const val = getMetrics(p)[key];
                      return (
                        <td key={p.id} style={{ padding: "10px 12px", borderTop: "1px solid var(--border-subtle)", textAlign: "center" }}>
                          <span className="font-mono" style={{ fontSize: 12, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>
                            {val === "—" ? <span style={{ color: "var(--text-muted)" }}>—</span> : val}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}

                {/* Verdict */}
                <tr>
                  <td style={{ padding: "16px 0", borderTop: "2px solid var(--border-default)", verticalAlign: "top" }}>
                    <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-muted)" }}>
                      Verdict
                    </span>
                  </td>
                  {properties.map((p) => (
                    <td key={p.id} style={{ padding: "16px 12px", borderTop: "2px solid var(--border-default)", verticalAlign: "top" }}>
                      <p style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.6, margin: 0 }}>
                        {p.verdict}
                      </p>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
