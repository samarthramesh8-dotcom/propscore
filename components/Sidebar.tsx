"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import SignOutButton from "./SignOutButton";

// ── Nav items ────────────────────────────────────────────────────────────────

const NAV = [
  {
    href: "/dashboard",
    demoHref: "/demo/dashboard",
    label: "Portfolio",
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M4 6h16M4 10h16M4 14h10" />
      </svg>
    ),
    iconSm: (
      <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M4 6h16M4 10h16M4 14h10" />
      </svg>
    ),
  },
  {
    href: "/analyze",
    demoHref: "/login",
    label: "New analysis",
    demoLabel: "Analyze property",
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M12 5v14m7-7H5" />
      </svg>
    ),
    iconSm: (
      <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M12 5v14m7-7H5" />
      </svg>
    ),
  },
  {
    href: "/find",
    demoHref: "/login",
    label: "Deal Finder",
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
    iconSm: (
      <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
  },
  {
    href: "/compare",
    demoHref: "/login",
    label: "Compare",
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
      </svg>
    ),
    iconSm: (
      <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
      </svg>
    ),
  },
  {
    href: "/alerts",
    demoHref: "/login",
    label: "Alerts",
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
    iconSm: (
      <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
  },
];

const signOutIcon = (
  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
);

const signUpIcon = (
  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

// ── Component ────────────────────────────────────────────────────────────────

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const isDemo = pathname.startsWith("/demo");

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  // Active check works for both real and demo paths
  function isActive(item: typeof NAV[0]) {
    const href = isDemo ? item.demoHref : item.href;
    return pathname === href || (href !== "/" && pathname.startsWith(href));
  }

  return (
    <>
      {/* ── Desktop sidebar ──────────────────────────────────────────── */}
      <aside
        className="ps-desktop-only"
        style={{
          width: 216,
          flexShrink: 0,
          height: "100vh",
          position: "sticky",
          top: 0,
          flexDirection: "column",
          background: "var(--bg-surface)",
          borderRight: "1px solid var(--border-subtle)",
        }}
      >
        {/* Logo */}
        <div style={{ padding: "18px 16px", borderBottom: "1px solid var(--border-subtle)" }}>
          <Link
            href={isDemo ? "/demo/dashboard" : "/dashboard"}
            style={{ display: "flex", alignItems: "center", gap: 9, textDecoration: "none" }}
          >
            <div
              style={{
                width: 26, height: 26, borderRadius: 6, background: "var(--accent)",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}
            >
              <svg width="13" height="13" fill="none" stroke="white" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2}
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>
              PropScore
            </span>
          </Link>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "8px 8px" }}>
          {NAV.map((item) => {
            const href   = isDemo ? item.demoHref : item.href;
            const label  = isDemo && item.demoLabel ? item.demoLabel : item.label;
            const active = isActive(item);
            return (
              <Link
                key={item.href}
                href={href}
                style={{
                  display: "flex", alignItems: "center", gap: 9,
                  padding: "7px 10px", borderRadius: 7,
                  fontSize: 13, fontWeight: 500, textDecoration: "none",
                  color: active ? "var(--text-primary)" : "var(--text-secondary)",
                  background: active ? "rgba(91, 91, 214, 0.12)" : "transparent",
                  transition: "background 0.12s ease, color 0.12s ease",
                  marginBottom: 2,
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)";
                    (e.currentTarget as HTMLElement).style.color = "var(--text-primary)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                    (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)";
                  }
                }}
              >
                <span style={{ color: active ? "var(--accent)" : "currentcolor", display: "flex" }}>
                  {item.icon}
                </span>
                {label}
                {active && (
                  <span style={{ marginLeft: "auto", width: 5, height: 5, borderRadius: "50%", background: "var(--accent)", flexShrink: 0 }} />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer — "Create account" in demo mode, Sign Out otherwise */}
        <div style={{ padding: "8px 8px", borderTop: "1px solid var(--border-subtle)" }}>
          {isDemo ? (
            <Link
              href="/login"
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                gap: 7, padding: "8px 12px", borderRadius: 7,
                fontSize: 12, fontWeight: 700, textDecoration: "none",
                color: "#fff", background: "var(--accent)",
                letterSpacing: "-0.01em",
                transition: "background 0.15s ease",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--accent-hover)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--accent)"; }}
            >
              <svg width="13" height="13" fill="none" stroke="white" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Create free account
            </Link>
          ) : (
            <SignOutButton />
          )}
        </div>
      </aside>

      {/* ── Mobile bottom nav ────────────────────────────────────────── */}
      <nav className="ps-mobile-nav">
        {NAV.map((item) => {
          const href   = isDemo ? item.demoHref : item.href;
          const label  = isDemo && item.demoLabel ? item.demoLabel : item.label;
          const active = isActive(item);
          return (
            <Link
              key={item.href}
              href={href}
              style={{
                flex: 1, display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: 4,
                fontSize: 9, fontWeight: 600, letterSpacing: "0.06em",
                textTransform: "uppercase", textDecoration: "none",
                color: active ? "var(--text-primary)" : "var(--text-muted)",
                background: active ? "rgba(91,91,214,0.06)" : "transparent",
                borderTop: active ? "2px solid var(--accent)" : "2px solid transparent",
                transition: "color 0.12s ease, background 0.12s ease",
              }}
            >
              <span style={{ color: active ? "var(--accent)" : "currentcolor", display: "flex" }}>
                {item.iconSm}
              </span>
              {label}
            </Link>
          );
        })}

        {/* Sign out (real) / Sign up (demo) */}
        {isDemo ? (
          <Link
            href="/login"
            style={{
              flex: 1, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 4,
              fontSize: 9, fontWeight: 600, letterSpacing: "0.06em",
              textTransform: "uppercase", textDecoration: "none",
              color: "var(--accent)",
              background: "transparent",
              borderTop: "2px solid transparent",
              transition: "color 0.12s ease",
            }}
          >
            <span style={{ display: "flex" }}>{signUpIcon}</span>
            Sign up
          </Link>
        ) : (
          <button
            onClick={signOut}
            style={{
              flex: 1, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 4,
              fontSize: 9, fontWeight: 600, letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "var(--text-muted)", background: "transparent",
              border: "none", borderTop: "2px solid transparent",
              cursor: "pointer", fontFamily: "inherit",
              transition: "color 0.12s ease",
            }}
          >
            <span style={{ display: "flex" }}>{signOutIcon}</span>
            Sign out
          </button>
        )}
      </nav>
    </>
  );
}
