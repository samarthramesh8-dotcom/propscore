"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function SignOutButton() {
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={signOut}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 9,
        width: "100%",
        padding: "7px 10px",
        borderRadius: 7,
        fontSize: 13,
        fontWeight: 500,
        color: "var(--text-secondary)",
        background: "transparent",
        border: "none",
        cursor: "pointer",
        transition: "background 0.12s ease, color 0.12s ease",
        textAlign: "left",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)";
        (e.currentTarget as HTMLElement).style.color = "var(--text-primary)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = "transparent";
        (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)";
      }}
    >
      <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
      </svg>
      Sign out
    </button>
  );
}
