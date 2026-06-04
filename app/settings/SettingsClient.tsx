"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import ConfirmModal from "@/components/ConfirmModal";
import { SavedSearch } from "@/lib/types";

// ─── Section header style ─────────────────────────────────────────────────────

const sectionLabel: React.CSSProperties = {
  fontSize: 9,
  fontWeight: 600,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "var(--text-muted)",
  marginBottom: 14,
};

const cardStyle: React.CSSProperties = {
  background: "var(--bg-surface)",
  border: "1px solid var(--border-subtle)",
  borderRadius: 10,
  padding: "20px 24px",
  marginBottom: 24,
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function SettingsClient({
  email,
  propertyCount,
}: {
  email: string;
  propertyCount: number;
}) {
  const router = useRouter();
  const supabase = createClient();

  // Password reset
  const [pwSent,    setPwSent]    = useState(false);
  const [pwSending, setPwSending] = useState(false);

  // Notifications
  const [searches,         setSearches]         = useState<SavedSearch[]>([]);
  const [alertsEnabled,    setAlertsEnabled]    = useState(false);
  const [togglingAlerts,   setTogglingAlerts]   = useState(false);

  // Delete account
  const [deleteOpen,    setDeleteOpen]    = useState(false);
  const [deleting,      setDeleting]      = useState(false);

  // Toast
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 2500);
  }

  const loadSearches = useCallback(async () => {
    const res = await fetch("/api/saved-searches");
    if (res.ok) {
      const data = await res.json();
      const list: SavedSearch[] = data.searches ?? [];
      setSearches(list);
      setAlertsEnabled(list.some((s) => s.is_active));
    }
  }, []);

  useEffect(() => { loadSearches(); }, [loadSearches]);

  async function handlePasswordReset() {
    setPwSending(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setPwSending(false);
    if (error) { showToast(error.message, false); return; }
    setPwSent(true);
  }

  async function handleToggleAlerts(enable: boolean) {
    setTogglingAlerts(true);
    try {
      await Promise.all(
        searches.map((s) =>
          fetch(`/api/saved-searches/${s.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ is_active: enable }),
          })
        )
      );
      setAlertsEnabled(enable);
      setSearches((prev) => prev.map((s) => ({ ...s, is_active: enable })));
      showToast(enable ? "Alerts enabled" : "Alerts paused");
    } catch {
      showToast("Failed to update alerts", false);
    } finally {
      setTogglingAlerts(false);
    }
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      const res = await fetch("/api/account/delete", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        showToast(data.error ?? "Failed to delete account", false);
        setDeleting(false);
        setDeleteOpen(false);
        return;
      }
      await supabase.auth.signOut();
      router.push("/login");
    } catch {
      showToast("Network error — please try again.", false);
      setDeleting(false);
      setDeleteOpen(false);
    }
  }

  const activeCount = searches.filter((s) => s.is_active).length;

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "32px 24px 120px" }}>

      {/* ── Page header ───────────────────────────────────────────────── */}
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 6 }}>
          Settings
        </p>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
          Account settings
        </h1>
      </div>

      {/* ── Section 1: Account ────────────────────────────────────────── */}
      <p style={sectionLabel}>Account</p>
      <div style={cardStyle}>
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4 }}>Email</p>
          <p style={{ fontSize: 13, color: "var(--text-primary)", fontFamily: "var(--font-mono, monospace)" }}>{email}</p>
        </div>
        <div>
          <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>Password</p>
          {pwSent ? (
            <p style={{ fontSize: 12, color: "var(--score-green)" }}>
              Password reset email sent to {email}.
            </p>
          ) : (
            <button
              onClick={handlePasswordReset}
              disabled={pwSending}
              style={{
                height: 34, padding: "0 14px",
                background: "transparent",
                border: "1px solid var(--border-subtle)",
                borderRadius: 7, fontSize: 12, fontWeight: 600,
                color: "var(--text-secondary)", cursor: pwSending ? "not-allowed" : "pointer",
                fontFamily: "inherit", opacity: pwSending ? 0.6 : 1,
                transition: "border-color 0.12s, color 0.12s",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border-default)"; (e.currentTarget as HTMLElement).style.color = "var(--text-primary)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border-subtle)"; (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)"; }}
            >
              {pwSending ? "Sending…" : "Change password"}
            </button>
          )}
        </div>
      </div>

      {/* ── Section 2: Notifications ──────────────────────────────────── */}
      <p style={sectionLabel}>Notifications</p>
      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>Weekly deal alerts</p>
            <p style={{ fontSize: 11, color: "var(--text-muted)" }}>
              {searches.length === 0
                ? "No saved searches yet"
                : `${activeCount} of ${searches.length} search${searches.length === 1 ? "" : "es"} active`}
            </p>
          </div>

          {/* Toggle — same pattern as MUD toggle in analyze/page.tsx */}
          <button
            role="switch"
            aria-checked={alertsEnabled}
            onClick={() => searches.length > 0 && handleToggleAlerts(!alertsEnabled)}
            disabled={togglingAlerts || searches.length === 0}
            style={{
              position: "relative",
              width: 40, height: 22,
              borderRadius: 11,
              background: alertsEnabled ? "var(--accent)" : "var(--bg-elevated)",
              border: `1px solid ${alertsEnabled ? "var(--accent)" : "var(--border-default)"}`,
              cursor: searches.length === 0 ? "not-allowed" : "pointer",
              transition: "background 0.2s, border-color 0.2s",
              flexShrink: 0,
              padding: 0,
              opacity: searches.length === 0 ? 0.4 : 1,
            }}
          >
            <span style={{
              position: "absolute",
              top: 2, left: alertsEnabled ? 19 : 2,
              width: 16, height: 16,
              borderRadius: "50%",
              background: "#fff",
              transition: "left 0.2s",
              boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
            }} />
          </button>
        </div>
        {searches.length === 0 && (
          <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 12 }}>
            <a href="/alerts" style={{ color: "var(--accent)", textDecoration: "none" }}>Create a saved search</a> to enable email alerts.
          </p>
        )}
      </div>

      {/* ── Section 3: Danger zone ────────────────────────────────────── */}
      <p style={sectionLabel}>Danger zone</p>
      <div style={{ ...cardStyle, borderColor: "rgba(232,56,79,0.2)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>Delete account</p>
            <p style={{ fontSize: 11, color: "var(--text-muted)" }}>Permanently removes your account and all analyzed properties.</p>
          </div>
          <button
            onClick={() => setDeleteOpen(true)}
            style={{
              height: 34, padding: "0 14px",
              background: "transparent",
              border: "1px solid rgba(232,56,79,0.4)",
              borderRadius: 7, fontSize: 12, fontWeight: 600,
              color: "var(--score-red)", cursor: "pointer",
              fontFamily: "inherit", flexShrink: 0, marginLeft: 16,
              transition: "background 0.12s, border-color 0.12s",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(232,56,79,0.08)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(232,56,79,0.7)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(232,56,79,0.4)"; }}
          >
            Delete account
          </button>
        </div>
      </div>

      {/* ── Delete confirm modal ──────────────────────────────────────── */}
      <ConfirmModal
        open={deleteOpen}
        title="Delete account?"
        message={`This will permanently delete your account and all ${propertyCount} analyzed ${propertyCount === 1 ? "property" : "properties"}. This cannot be undone.`}
        confirmLabel="Delete account"
        cancelLabel="Cancel"
        onConfirm={handleDeleteAccount}
        onCancel={() => setDeleteOpen(false)}
        loading={deleting}
        danger
      />

      {/* ── Toast ─────────────────────────────────────────────────────── */}
      {toast && (
        <div className="ps-toast" style={{ color: toast.ok ? "var(--score-green)" : "var(--score-red)" }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
