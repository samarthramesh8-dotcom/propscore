"use client";

interface Props {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  danger?: boolean;
}

export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  loading = false,
  danger = false,
}: Props) {
  if (!open) return null;

  return (
    <div
      className="ps-modal-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="ps-modal">
        {/* Title */}
        <h2
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: "var(--text-primary)",
            letterSpacing: "-0.015em",
            marginBottom: 10,
          }}
        >
          {title}
        </h2>

        {/* Message */}
        <p
          style={{
            fontSize: 13,
            color: "var(--text-secondary)",
            lineHeight: 1.6,
            marginBottom: 24,
          }}
        >
          {message}
        </p>

        {/* Actions */}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            onClick={onCancel}
            disabled={loading}
            style={{
              padding: "8px 16px",
              borderRadius: 7,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              border: "1px solid var(--border-subtle)",
              background: "transparent",
              color: "var(--text-secondary)",
              fontFamily: "inherit",
              transition: "border-color 0.12s, color 0.12s",
            }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{
              padding: "8px 16px",
              borderRadius: 7,
              fontSize: 13,
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              border: "none",
              background: danger ? "var(--score-red)" : "var(--accent)",
              color: "#fff",
              fontFamily: "inherit",
              opacity: loading ? 0.6 : 1,
              transition: "opacity 0.12s",
              display: "flex",
              alignItems: "center",
              gap: 7,
            }}
          >
            {loading && (
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24"
                style={{ animation: "spin 0.8s linear infinite" }}>
                <circle cx={12} cy={12} r={10} stroke="currentColor" strokeWidth={4} opacity={0.25} />
                <path fill="currentColor" opacity={0.75} d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {loading ? "Deleting…" : confirmLabel}
          </button>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
