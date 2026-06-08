"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  propertyId: string;
  initialNotes: string | null;
}

export default function NotesField({ propertyId, initialNotes }: Props) {
  const [notes, setNotes]   = useState(initialNotes ?? "");
  const [saved, setSaved]   = useState(false);
  const [error, setError]   = useState(false);
  const [saving, setSaving] = useState(false);

  const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notesRef     = useRef(notes);
  const hasMounted   = useRef(false);

  // Keep ref in sync so `save` always writes the latest text
  notesRef.current = notes;

  const save = useCallback(async () => {
    setSaving(true);
    setError(false);
    const supabase = createClient();
    const { error: err } = await supabase
      .from("properties")
      .update({ notes: notesRef.current.trim() || null })
      .eq("id", propertyId);

    setSaving(false);
    if (err) {
      setError(true);
      setTimeout(() => setError(false), 3000);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }, [propertyId]);

  // Debounced auto-save: fires 500 ms after the user stops typing.
  // Skipped on first render so opening a property page doesn't trigger a write.
  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(save, 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [notes, save]);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <p style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-muted)", margin: 0 }}>
          Notes
        </p>
        {saving && (
          <span style={{ fontSize: 10, color: "var(--text-muted)" }}>Saving…</span>
        )}
        {saved && !saving && (
          <span style={{ fontSize: 10, color: "var(--score-green)", display: "flex", alignItems: "center", gap: 4 }}>
            <svg width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
            Saved
          </span>
        )}
        {error && !saving && (
          <span style={{ fontSize: 10, color: "var(--score-red)" }}>Failed to save</span>
        )}
      </div>

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onFocus={(e) => { (e.target as HTMLTextAreaElement).style.borderColor = "var(--border-default)"; }}
        onBlur={(e) => {
          (e.target as HTMLTextAreaElement).style.borderColor = "var(--border-subtle)";
          save();
        }}
        placeholder="Add private notes about this property — investment thesis, inspection findings, offer strategy…"
        rows={4}
        style={{
          width: "100%",
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          borderRadius: 8,
          padding: "12px 14px",
          fontSize: 13,
          color: "var(--text-primary)",
          fontFamily: "inherit",
          resize: "vertical",
          outline: "none",
          lineHeight: 1.65,
          transition: "border-color 0.15s ease",
        }}
      />

      <p style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 6 }}>
        Auto-saves when you click away. Visible only to you.
      </p>
    </div>
  );
}
