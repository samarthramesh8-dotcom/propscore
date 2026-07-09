import { ConfidenceFlag } from "@/lib/types";

// "This tool shows its work." Wraps a financial figure so hovering (or focusing)
// reveals where it came from — Zillow / Rentcast / comparables — and any deep-
// verify disagreement on that field. Pure markup + CSS hover (see .prov in
// globals.css), so it works in server components with no client JS.

type Source = "Zillow" | "Rentcast" | "Comparables" | "Computed";

const SOURCE_COLOR: Record<Source, string> = {
  Zillow:       "var(--text-secondary)",
  Rentcast:     "var(--text-secondary)",
  Comparables:  "var(--text-secondary)",
  Computed:     "var(--text-secondary)",
};

export default function Provenance({
  children,
  source,
  detail,
  flag,
}: {
  children: React.ReactNode;
  source: Source;
  detail?: string;
  flag?: ConfidenceFlag | null;
}) {
  return (
    <span className="prov" tabIndex={0}>
      {children}
      <span className="prov-pop" role="tooltip">
        <span className="prov-source" style={{ color: SOURCE_COLOR[source], display: "block", marginBottom: detail || flag ? 5 : 0 }}>
          Source · {source}
        </span>
        {detail && (
          <span style={{ display: "block", fontSize: 11, lineHeight: 1.5, color: "var(--text-secondary)" }}>
            {detail}
          </span>
        )}
        {flag && flag.sources.length >= 2 && (
          <span style={{ display: "block", marginTop: detail ? 6 : 0, paddingTop: 6, borderTop: "1px solid var(--border-subtle)" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
              <svg width="9" height="9" fill="none" stroke="var(--score-amber)" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                  d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--score-amber)" }}>
                Sources disagree · {flag.discrepancy_pct}%
              </span>
            </span>
            {flag.sources.map((s, i) => (
              <span key={i} className="font-mono" style={{ display: "block", fontSize: 10, color: "var(--text-secondary)" }}>
                {s.name}: {s.value >= 1000 ? `$${Math.round(s.value).toLocaleString()}` : s.value}
              </span>
            ))}
          </span>
        )}
      </span>
    </span>
  );
}
