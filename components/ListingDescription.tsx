"use client";

import { useState } from "react";

interface ListingDescriptionProps {
  description: string;
}

export default function ListingDescription({ description }: ListingDescriptionProps) {
  const [expanded, setExpanded] = useState(false);

  const LIMIT = 280;
  const isLong = description.length > LIMIT;
  const displayed = expanded ? description : description.slice(0, LIMIT) + (isLong ? "…" : "");

  return (
    <div>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.75, margin: 0 }}>
        {displayed}
        {isLong && (
          <button
            onClick={() => setExpanded(e => !e)}
            style={{
              marginLeft: 6, background: "none", border: "none",
              color: "var(--accent)", fontSize: 13, fontWeight: 600,
              cursor: "pointer", fontFamily: "inherit", padding: 0,
            }}
          >
            {expanded ? "Show less" : "Show more"}
          </button>
        )}
      </p>
    </div>
  );
}
