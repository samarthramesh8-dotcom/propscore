"use client";

import { useState } from "react";

interface CollapsibleSourceProps {
  listingText: string;
}

export default function CollapsibleSource({ listingText }: CollapsibleSourceProps) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          background: "none", border: "none", cursor: "pointer",
          padding: 0, fontFamily: "inherit", marginBottom: open ? 12 : 0,
        }}
      >
        <p
          style={{
            fontSize: 9, fontWeight: 600, letterSpacing: "0.14em",
            textTransform: "uppercase", color: "var(--text-muted)", margin: 0,
          }}
        >
          {open ? "Hide raw listing data" : "Show raw listing data"}
        </p>
        <svg
          width="12"
          height="12"
          fill="none"
          stroke="var(--text-muted)"
          viewBox="0 0 24 24"
          style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s ease" }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
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
              fontSize: 11, lineHeight: 1.7,
              color: "var(--text-muted)", whiteSpace: "pre-wrap", margin: 0,
            }}
          >
            {listingText}
          </pre>
        </div>
      )}
    </div>
  );
}
