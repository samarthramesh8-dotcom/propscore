"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

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
          <svg width="22" height="22" fill="none" stroke="var(--score-red)" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 style={{
          fontSize: 16, fontWeight: 700,
          color: "var(--text-primary)",
          letterSpacing: "-0.015em", marginBottom: 8,
        }}>
          Something went wrong
        </h2>
        <p style={{
          fontSize: 13, color: "var(--text-muted)",
          lineHeight: 1.6, marginBottom: 24,
        }}>
          {error.digest ? `Error ID: ${error.digest}` : "An unexpected error occurred."}
        </p>
        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          <button
            onClick={reset}
            style={{
              padding: "8px 16px", borderRadius: 7, fontSize: 13,
              fontWeight: 600, cursor: "pointer",
              border: "1px solid var(--border-subtle)",
              background: "transparent", color: "var(--text-secondary)",
              fontFamily: "inherit",
            }}
          >
            Try again
          </button>
          <Link
            href="/dashboard"
            style={{
              padding: "8px 16px", borderRadius: 7, fontSize: 13,
              fontWeight: 600, textDecoration: "none",
              background: "var(--accent)", color: "#fff",
            }}
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
