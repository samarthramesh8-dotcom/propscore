"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function CmdK() {
  const router = useRouter();
  const [toast, setToast] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isMac     = navigator.platform.toUpperCase().includes("MAC");
      const isPressed = isMac
        ? e.metaKey && e.key === "k"
        : e.ctrlKey && e.key === "k";

      if (!isPressed) return;
      e.preventDefault();

      setToast(true);
      setTimeout(() => setToast(false), 1600);
      router.push("/analyze");
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  if (!toast) return null;

  return (
    <div
      className="ps-toast"
      style={{ color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}
    >
      <kbd
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 3,
          padding: "1px 5px",
          borderRadius: 4,
          border: "1px solid var(--border-default)",
          background: "var(--bg-elevated)",
          fontSize: 10,
          fontFamily: "inherit",
          color: "var(--text-muted)",
        }}
      >
        {typeof window !== "undefined" && navigator.platform.toUpperCase().includes("MAC") ? "⌘" : "Ctrl"} K
      </kbd>
      New analysis
    </div>
  );
}
