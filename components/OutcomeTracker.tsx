"use client";

import { useEffect, useState } from "react";
import { OUTCOME_TYPES, OutcomeType, PropertyOutcome } from "@/lib/types";

interface Props {
  propertyId: string;
}

const OUTCOME_LABELS: Record<OutcomeType, string> = {
  still_watching: "Still watching",
  pursued:        "Pursued",
  passed:         "Passed",
  offer_made:     "Offer made",
  offer_accepted: "Offer accepted",
  offer_rejected: "Offer rejected",
  closed:         "Closed",
};

// Which optional fields make sense for each outcome
const SHOWS_SALE_FIELDS: OutcomeType[] = ["offer_accepted", "closed"];
const SHOWS_RENT_FIELD: OutcomeType[]  = ["closed"];

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--bg-base)",
  border: "1px solid var(--border-subtle)",
  borderRadius: 6,
  padding: "8px 10px",
  fontSize: 12,
  color: "var(--text-primary)",
  fontFamily: "inherit",
  outline: "none",
};

const fieldLabelStyle: React.CSSProperties = {
  fontSize: 9, fontWeight: 600, letterSpacing: "0.1em",
  textTransform: "uppercase", color: "var(--text-muted)",
  display: "block", marginBottom: 5,
};

export default function OutcomeTracker({ propertyId }: Props) {
  const [outcomeType, setOutcomeType] = useState<OutcomeType | "">("");
  const [salePrice, setSalePrice]     = useState("");
  const [rent, setRent]               = useState("");
  const [daysToClose, setDaysToClose] = useState("");
  const [notes, setNotes]             = useState("");
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);
  const [status, setStatus]           = useState<{ msg: string; ok: boolean } | null>(null);
  const [recordedAt, setRecordedAt]   = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/properties/${propertyId}/outcome`);
        const json = await res.json();
        if (cancelled || !res.ok) return;
        const o = json.outcome as PropertyOutcome | null;
        if (o) {
          setOutcomeType(o.outcome_type);
          setSalePrice(o.actual_sale_price ? String(o.actual_sale_price) : "");
          setRent(o.actual_rent_achieved ? String(o.actual_rent_achieved) : "");
          setDaysToClose(o.days_to_close ? String(o.days_to_close) : "");
          setNotes(o.outcome_notes ?? "");
          setRecordedAt(o.recorded_at);
        }
      } catch {
        // network error — leave the control usable in its empty state
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [propertyId]);

  async function save() {
    if (!outcomeType || saving) return;
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch(`/api/properties/${propertyId}/outcome`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outcome_type:         outcomeType,
          actual_sale_price:    salePrice ? parseInt(salePrice.replace(/[^0-9]/g, ""), 10) : null,
          actual_rent_achieved: rent ? parseInt(rent.replace(/[^0-9]/g, ""), 10) : null,
          days_to_close:        daysToClose ? parseInt(daysToClose, 10) : null,
          outcome_notes:        notes.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save outcome");
      setRecordedAt(json.outcome?.recorded_at ?? new Date().toISOString());
      setStatus({ msg: "Outcome saved", ok: true });
    } catch (err) {
      setStatus({ msg: err instanceof Error ? err.message : "Failed to save outcome", ok: false });
    } finally {
      setSaving(false);
      setTimeout(() => setStatus(null), 3500);
    }
  }

  const showSaleFields = outcomeType && SHOWS_SALE_FIELDS.includes(outcomeType);
  const showRentField  = outcomeType && SHOWS_RENT_FIELD.includes(outcomeType);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <p style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-muted)", margin: 0 }}>
          Outcome tracking
        </p>
        {recordedAt && (
          <span className="font-mono" style={{ fontSize: 10, color: "var(--text-muted)" }}>
            recorded {new Date(recordedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </span>
        )}
        {status && (
          <span style={{ fontSize: 10, color: status.ok ? "var(--score-green)" : "var(--score-red)" }}>
            {status.msg}
          </span>
        )}
      </div>

      <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: 10, padding: "16px 18px" }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ minWidth: 180 }}>
            <label style={fieldLabelStyle}>What happened with this property?</label>
            <select
              value={outcomeType}
              onChange={(e) => setOutcomeType(e.target.value as OutcomeType | "")}
              disabled={loading}
              style={{ ...inputStyle, cursor: loading ? "wait" : "pointer" }}
            >
              <option value="">— not tracked —</option>
              {OUTCOME_TYPES.map((t) => (
                <option key={t} value={t}>{OUTCOME_LABELS[t]}</option>
              ))}
            </select>
          </div>

          {showSaleFields && (
            <>
              <div style={{ width: 140 }}>
                <label style={fieldLabelStyle}>Sale price ($)</label>
                <input
                  type="text" inputMode="numeric" placeholder="e.g. 425000"
                  value={salePrice} onChange={(e) => setSalePrice(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div style={{ width: 120 }}>
                <label style={fieldLabelStyle}>Days to close</label>
                <input
                  type="text" inputMode="numeric" placeholder="e.g. 35"
                  value={daysToClose} onChange={(e) => setDaysToClose(e.target.value)}
                  style={inputStyle}
                />
              </div>
            </>
          )}

          {showRentField && (
            <div style={{ width: 150 }}>
              <label style={fieldLabelStyle}>Rent achieved ($/mo)</label>
              <input
                type="text" inputMode="numeric" placeholder="e.g. 2450"
                value={rent} onChange={(e) => setRent(e.target.value)}
                style={inputStyle}
              />
            </div>
          )}

          <button
            onClick={save}
            disabled={!outcomeType || saving || loading}
            style={{
              height: 33, padding: "0 14px", borderRadius: 6,
              fontSize: 11, fontWeight: 600, fontFamily: "inherit",
              border: "1px solid rgba(91,91,214,0.4)",
              background: "rgba(91,91,214,0.08)",
              color: !outcomeType || saving || loading ? "var(--text-muted)" : "var(--accent)",
              cursor: !outcomeType || saving || loading ? "default" : "pointer",
              opacity: !outcomeType || loading ? 0.5 : 1,
            }}
          >
            {saving ? "Saving…" : "Save outcome"}
          </button>
        </div>

        {outcomeType && (
          <div style={{ marginTop: 12 }}>
            <label style={fieldLabelStyle}>Outcome notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Why this outcome? e.g. inspection found foundation issues; seller took a higher cash offer…"
              rows={2}
              style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
            />
          </div>
        )}

        <p style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 10, marginBottom: 0 }}>
          Logging real outcomes builds your track record — PropScore uses it to show how its verdicts perform over time.
        </p>
      </div>
    </div>
  );
}
