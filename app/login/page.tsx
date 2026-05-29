"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

const features = [
  { label: "Live Zillow data", desc: "Price, Zestimate, rent estimate, DOM — pulled automatically via API." },
  { label: "Cap rate & 1% rule", desc: "Full rental math calculated with a 45% expense ratio assumption." },
  { label: "Five-category breakdown", desc: "Location, Price, Rental, Condition, and Market scored separately." },
];

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--bg-elevated)",
  border: "1px solid var(--border-subtle)",
  borderRadius: 8,
  padding: "10px 13px",
  fontSize: 13,
  color: "var(--text-primary)",
  outline: "none",
  transition: "border-color 0.15s ease",
  fontFamily: "inherit",
};

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    const supabase = createClient();

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage("Check your email to confirm your account.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        background: "var(--bg-base)",
      }}
    >
      {/* ── Left panel ─────────────────────────────────────── */}
      <div
        className="hidden lg:flex lg:flex-col lg:justify-between"
        style={{
          width: "44%",
          flexShrink: 0,
          padding: "40px 48px",
          background: "var(--bg-surface)",
          borderRight: "1px solid var(--border-subtle)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 7,
              background: "var(--accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="14" height="14" fill="none" stroke="white" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </div>
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>
            PropScore
          </span>
        </div>

        {/* Hero copy */}
        <div>
          <h2
            style={{
              fontSize: 28,
              fontWeight: 800,
              color: "var(--text-primary)",
              letterSpacing: "-0.03em",
              lineHeight: 1.2,
              marginBottom: 16,
            }}
          >
            Know exactly what a<br />property is worth<br />as an investment.
          </h2>
          <p
            style={{
              fontSize: 13,
              color: "var(--text-secondary)",
              lineHeight: 1.7,
              marginBottom: 28,
              maxWidth: 340,
            }}
          >
            Paste a Zillow URL. Get a brutally honest investment score powered by real data — cap rate, rent yield, school ratings, price history.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {features.map(({ label, desc }) => (
              <div key={label} style={{ display: "flex", gap: 12 }}>
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 5,
                    border: "1px solid rgba(91,91,214,0.4)",
                    background: "rgba(91,91,214,0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    marginTop: 1,
                  }}
                >
                  <svg width="9" height="9" fill="none" stroke="var(--accent)" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 2 }}>
                    {label}
                  </p>
                  <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.55 }}>
                    {desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p style={{ fontSize: 11, color: "var(--text-muted)" }}>© 2026 PropScore</p>
      </div>

      {/* ── Right panel ────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 24px",
        }}
      >
        <div style={{ width: "100%", maxWidth: 340 }}>
          {/* Mobile logo */}
          <div
            className="lg:hidden"
            style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 32 }}
          >
            <div style={{ width: 26, height: 26, borderRadius: 6, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="13" height="13" fill="none" stroke="white" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2}
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>PropScore</span>
          </div>

          {/* Heading */}
          <div style={{ marginBottom: 24 }}>
            <h1
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: "var(--text-primary)",
                letterSpacing: "-0.025em",
                marginBottom: 6,
              }}
            >
              {mode === "signin" ? "Welcome back" : "Create account"}
            </h1>
            <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              {mode === "signin" ? "Sign in to your portfolio" : "Start analyzing properties for free"}
            </p>
          </div>

          {/* Mode toggle */}
          <div
            style={{
              display: "flex",
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-subtle)",
              borderRadius: 8,
              padding: 3,
              marginBottom: 20,
            }}
          >
            {(["signin", "signup"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                style={{
                  flex: 1,
                  padding: "6px 0",
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  border: "none",
                  transition: "all 0.15s ease",
                  background: mode === m ? "var(--accent)" : "transparent",
                  color: mode === m ? "#fff" : "var(--text-secondary)",
                  fontFamily: "inherit",
                }}
              >
                {m === "signin" ? "Sign in" : "Sign up"}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "var(--text-muted)",
                  marginBottom: 6,
                }}
              >
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                style={inputStyle}
                onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = "var(--accent)"; }}
                onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = "var(--border-subtle)"; }}
              />
            </div>

            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <label
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "var(--text-muted)",
                  }}
                >
                  Password
                </label>
                {mode === "signin" && (
                  <Link
                    href="/forgot-password"
                    style={{ fontSize: 11, color: "var(--accent)", textDecoration: "none" }}
                  >
                    Forgot password?
                  </Link>
                )}
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                style={inputStyle}
                onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = "var(--accent)"; }}
                onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = "var(--border-subtle)"; }}
              />
            </div>

            {error && (
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                  padding: "10px 12px",
                  background: "rgba(232, 56, 79, 0.08)",
                  border: "1px solid rgba(232, 56, 79, 0.2)",
                  borderRadius: 8,
                  fontSize: 12,
                  color: "var(--score-red)",
                }}
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ flexShrink: 0, marginTop: 1 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}

            {message && (
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                  padding: "10px 12px",
                  background: "rgba(0, 210, 106, 0.08)",
                  border: "1px solid rgba(0, 210, 106, 0.2)",
                  borderRadius: 8,
                  fontSize: 12,
                  color: "var(--score-green)",
                }}
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ flexShrink: 0, marginTop: 1 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                background: "var(--accent)",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "10px 0",
                fontSize: 13,
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.5 : 1,
                transition: "opacity 0.15s ease, background 0.15s ease",
                fontFamily: "inherit",
              }}
              onMouseEnter={(e) => { if (!loading) (e.currentTarget as HTMLElement).style.background = "var(--accent-hover)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--accent)"; }}
            >
              {loading ? "Loading…" : mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
