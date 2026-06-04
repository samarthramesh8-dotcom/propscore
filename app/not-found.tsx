import Link from "next/link";

export default function NotFound() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg-base)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
    }}>
      <div style={{ maxWidth: 400, textAlign: "center" }}>
        <div style={{
          width: 48, height: 48, borderRadius: 10,
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          display: "flex", alignItems: "center",
          justifyContent: "center", margin: "0 auto 20px",
        }}>
          <svg width="22" height="22" fill="none" stroke="var(--text-muted)" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 style={{
          fontSize: 16, fontWeight: 700,
          color: "var(--text-primary)",
          letterSpacing: "-0.015em", marginBottom: 8,
        }}>
          Page not found
        </h2>
        <p style={{
          fontSize: 13, color: "var(--text-muted)",
          lineHeight: 1.6, marginBottom: 24,
        }}>
          This page doesn&apos;t exist or you don&apos;t have access to it.
        </p>
        <Link
          href="/dashboard"
          style={{
            display: "inline-block",
            padding: "8px 16px", borderRadius: 7, fontSize: 13,
            fontWeight: 600, textDecoration: "none",
            background: "var(--accent)", color: "#fff",
          }}
        >
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}
