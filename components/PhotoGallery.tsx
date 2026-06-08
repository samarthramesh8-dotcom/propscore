"use client";

import { useState, useEffect, useRef } from "react";
import { PropertyPhoto } from "@/lib/analysis";

interface PhotoGalleryProps {
  photos: PropertyPhoto[];
  address: string;
}

export default function PhotoGallery({ photos, address }: PhotoGalleryProps) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [errored, setErrored] = useState<Set<number>>(new Set());
  const thumbnailRefs = useRef<(HTMLImageElement | null)[]>([]);

  const valid = photos.filter((_, i) => !errored.has(i));

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft")
        setActiveIdx(i => Math.max(0, i - 1));
      if (e.key === "ArrowRight")
        setActiveIdx(i => Math.min(valid.length - 1, i + 1));
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [valid.length]);

  useEffect(() => {
    thumbnailRefs.current[activeIdx]?.scrollIntoView({
      behavior: "smooth", block: "nearest", inline: "center",
    });
  }, [activeIdx]);

  if (valid.length === 0) {
    return (
      <div
        style={{
          height: 420, background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)", borderRadius: 10,
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", gap: 12,
        }}
      >
        <svg width="24" height="24" fill="none" stroke="var(--text-muted)" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>No photos available</span>
      </div>
    );
  }

  return (
    <div>
      {/* Main image */}
      <div style={{ position: "relative", height: 420, borderRadius: 10, overflow: "hidden" }}>
        <img
          src={valid[activeIdx]?.url}
          alt={address}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          onError={() =>
            setErrored(prev => new Set(prev).add(photos.indexOf(valid[activeIdx])))
          }
        />

        {/* Counter badge */}
        <div
          style={{
            position: "absolute", top: 12, right: 12,
            background: "rgba(0,0,0,0.6)", borderRadius: 6,
            padding: "4px 10px", fontSize: 11, color: "#fff", fontWeight: 600,
          }}
        >
          {activeIdx + 1} / {valid.length}
        </div>

        {/* Left arrow */}
        {activeIdx > 0 && (
          <button
            onClick={() => setActiveIdx(prev => prev - 1)}
            style={{
              position: "absolute", left: 12, top: "50%",
              transform: "translateY(-50%)",
              width: 36, height: 36, borderRadius: "50%",
              background: "rgba(0,0,0,0.6)", border: "none",
              cursor: "pointer", color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}

        {/* Right arrow */}
        {activeIdx < valid.length - 1 && (
          <button
            onClick={() => setActiveIdx(prev => prev + 1)}
            style={{
              position: "absolute", right: 12, top: "50%",
              transform: "translateY(-50%)",
              width: 36, height: 36, borderRadius: "50%",
              background: "rgba(0,0,0,0.6)", border: "none",
              cursor: "pointer", color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>

      {/* Thumbnail strip */}
      <div
        style={{
          display: "flex", gap: 6, overflowX: "auto",
          padding: "8px 0", scrollbarWidth: "none",
        }}
      >
        {valid.map((photo, i) => (
          <img
            key={i}
            ref={(el) => { thumbnailRefs.current[i] = el; }}
            src={photo.url}
            alt={address}
            width={96}
            height={64}
            style={{
              width: 96, height: 64, borderRadius: 6, objectFit: "cover",
              cursor: "pointer", flexShrink: 0,
              border: activeIdx === i ? "2px solid var(--accent)" : "2px solid transparent",
              opacity: activeIdx === i ? 1 : 0.65,
              transition: "opacity 0.12s, border-color 0.12s",
            }}
            onClick={() => setActiveIdx(i)}
            onError={() =>
              setErrored(prev => new Set(prev).add(photos.indexOf(photo)))
            }
          />
        ))}
      </div>
    </div>
  );
}
