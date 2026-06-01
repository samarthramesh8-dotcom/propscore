"use client";

import "./login.css";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

/* ── Particle canvas ───────────────────────────────────────── */
function ParticleCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let raf: number;
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    window.addEventListener("resize", resize);
    type P = { x: number; y: number; vx: number; vy: number; r: number; a: number };
    const pts: P[] = Array.from({ length: 55 }, () => ({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.18, vy: (Math.random() - 0.5) * 0.18,
      r: Math.random() * 1.4 + 0.3, a: Math.random(),
    }));
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of pts) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;  if (p.x > canvas.width)  p.x = 0;
        if (p.y < 0) p.y = canvas.height; if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(157,78,221,${0.15 + p.a * 0.25})`;
        ctx.fill();
      }
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 110) {
            ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y);
            ctx.strokeStyle = `rgba(124,58,237,${0.12 * (1 - d / 110)})`; ctx.lineWidth = 0.6; ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={ref} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} />;
}

/* ── House SVG ─────────────────────────────────────────────── */
function HouseSVG({ drawn }: { drawn: boolean }) {
  const p = (delay = 0, len = 2000): { style: React.CSSProperties } => ({
    style: {
      strokeDasharray: len,
      strokeDashoffset: drawn ? 0 : len,
      transition: `stroke-dashoffset 2.6s cubic-bezier(.25,.46,.45,.94) ${delay}s`,
    },
  });
  return (
    <svg viewBox="0 0 420 360" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ width: "min(520px,95%)", filter: "drop-shadow(0 0 36px rgba(157,78,221,0.45))" }}>
      <defs>
        <filter id="ng" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="sg" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <radialGradient id="wg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(157,78,221,0.18)"/>
          <stop offset="100%" stopColor="rgba(157,78,221,0)"/>
        </radialGradient>
      </defs>
      <ellipse cx="210" cy="340" rx="130" ry="9" fill="rgba(124,58,237,0.1)"/>
      <path d="M90 210 L90 318 L330 318 L330 210 L210 105 Z" fill="rgba(157,78,221,0.04)"/>
      <path {...p(0,900)} d="M55 218 L210 82 L365 218" stroke="#9D4EDD" strokeWidth="2.8" strokeLinecap="round" filter="url(#ng)"/>
      <path {...p(0.25,700)} d="M95 218 L210 112 L325 218" stroke="rgba(157,78,221,0.28)" strokeWidth="1" strokeLinecap="round"/>
      <rect {...p(0.35,900)} x="90" y="218" width="240" height="100" stroke="#9D4EDD" strokeWidth="2.2" filter="url(#ng)"/>
      <path {...p(0.55,300)} d="M278 162 L278 126 L304 126 L304 172" stroke="#9D4EDD" strokeWidth="2" strokeLinecap="round" filter="url(#sg)"/>
      <path {...p(1.5,200)} d="M284 120 Q278 108 285 97 Q292 86 286 75" stroke="rgba(157,78,221,0.3)" strokeWidth="1.5" strokeLinecap="round"/>
      <path {...p(1.7,200)} d="M294 118 Q301 105 294 94 Q287 83 294 72" stroke="rgba(157,78,221,0.18)" strokeWidth="1" strokeLinecap="round"/>
      <rect {...p(0.75,300)} x="108" y="230" width="52" height="46" rx="4" stroke="#9D4EDD" strokeWidth="1.8" filter="url(#sg)"/>
      <rect x="109" y="231" width="50" height="44" rx="3" fill="url(#wg)"/>
      <line {...p(0.85,100)} x1="134" y1="230" x2="134" y2="276" stroke="rgba(157,78,221,0.4)" strokeWidth="1"/>
      <line {...p(0.85,100)} x1="108" y1="253" x2="160" y2="253" stroke="rgba(157,78,221,0.4)" strokeWidth="1"/>
      <rect {...p(0.9,300)} x="260" y="230" width="52" height="46" rx="4" stroke="#9D4EDD" strokeWidth="1.8" filter="url(#sg)"/>
      <rect x="261" y="231" width="50" height="44" rx="3" fill="url(#wg)"/>
      <line {...p(1.0,100)} x1="286" y1="230" x2="286" y2="276" stroke="rgba(157,78,221,0.4)" strokeWidth="1"/>
      <line {...p(1.0,100)} x1="260" y1="253" x2="312" y2="253" stroke="rgba(157,78,221,0.4)" strokeWidth="1"/>
      <path {...p(0.8,400)} d="M184 318 L184 267 Q184 259 192 259 L228 259 Q236 259 236 267 L236 318" stroke="#9D4EDD" strokeWidth="2" strokeLinecap="round" filter="url(#sg)"/>
      <path {...p(0.95,200)} d="M184 267 Q210 249 236 267" stroke="rgba(157,78,221,0.45)" strokeWidth="1.2" strokeLinecap="round"/>
      <circle {...p(1.1,30)} cx="231" cy="289" r="3.5" stroke="#9D4EDD" strokeWidth="1.5"/>
      <path {...p(1.15,300)} d="M170 318 L170 326 L250 326 L250 318" stroke="rgba(157,78,221,0.5)" strokeWidth="1.5" strokeLinecap="round"/>
      <path {...p(1.2,350)} d="M178 326 L178 334 L242 334 L242 326" stroke="rgba(157,78,221,0.3)" strokeWidth="1.2" strokeLinecap="round"/>
      <rect {...p(1.0,400)} x="90" y="265" width="72" height="53" rx="2" stroke="rgba(157,78,221,0.55)" strokeWidth="1.5"/>
      <line {...p(1.1,75)} x1="90" y1="283" x2="162" y2="283" stroke="rgba(157,78,221,0.22)" strokeWidth="1"/>
      <line {...p(1.1,75)} x1="90" y1="299" x2="162" y2="299" stroke="rgba(157,78,221,0.22)" strokeWidth="1"/>
      <path {...p(1.3,100)} d="M203 82 L210 68 L217 82" stroke="rgba(157,78,221,0.6)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle {...p(1.4,20)} cx="210" cy="64" r="3.5" stroke="#9D4EDD" strokeWidth="1.5" filter="url(#sg)"/>
      {([[28,38],[380,55],[18,195],[388,155],[350,300],[48,300],[210,48],[380,220]] as [number,number][]).map(([x,y],i) => (
        <circle key={i} cx={x} cy={y} r={i%2===0?1.8:1.2} fill={`rgba(157,78,221,${i%2===0?.4:.22})`}/>
      ))}
    </svg>
  );
}

/* ── Floating label field ──────────────────────────────────── */
function FloatField({ id, label, type, value, onChange, autoComplete, paddingRight = 14 }: {
  id: string; label: string; type: string; value: string;
  onChange: (v: string) => void; autoComplete?: string; paddingRight?: number;
}) {
  const [focused, setFocused] = useState(false);
  const raised = focused || value.length > 0;
  return (
    <div className="psl-ff">
      <input
        id={id} type={type} value={value} required placeholder=" "
        autoComplete={autoComplete}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className={`psl-ff-input${focused ? " psl-ff-focused" : ""}`}
        style={{ paddingRight }}
      />
      <label htmlFor={id} className={`psl-ff-label${raised ? " psl-ff-raised" : ""}`}>{label}</label>
      <span className={`psl-ff-line${focused ? " psl-ff-line-on" : ""}`} />
    </div>
  );
}

/* ── Alert ─────────────────────────────────────────────────── */
function Alert({ kind, children }: { kind: "error" | "ok"; children: React.ReactNode }) {
  return (
    <div className={`psl-alert ${kind === "error" ? "psl-alert-err" : "psl-alert-ok"}`}>
      {kind === "error"
        ? <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        : <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
      }
      {children}
    </div>
  );
}

/* ── Main page ─────────────────────────────────────────────── */
export default function LoginPage() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [mode, setMode]         = useState<"signin" | "signup">("signin");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [message, setMessage]   = useState("");
  const [mounted, setMounted]   = useState(false);
  const router = useRouter();

  useEffect(() => { const t = setTimeout(() => setMounted(true), 60); return () => clearTimeout(t); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(""); setMessage(""); setLoading(true);
    const sb = createClient();
    try {
      if (mode === "signup") {
        const { error } = await sb.auth.signUp({ email, password });
        if (error) throw error;
        setMessage("Check your email to confirm your account.");
      } else {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/dashboard"); router.refresh();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally { setLoading(false); }
  }

  return (
    <div className="psl-root">

      {/* ══ LEFT PANEL ══════════════════════════════════════ */}
      <div className={`psl-lp${mounted ? " psl-lp-in" : ""}`}>
        <ParticleCanvas />
        <div className="psl-lp-inner">

          <div className="psl-logo" style={{ position: "absolute", top: 40, left: 52, zIndex: 2 }}>
            <div className="psl-logo-icon"><HomeIcon size={18} /></div>
            <span className="psl-logo-text">PropScore</span>
          </div>

          <div className="psl-house-wrap">
            <div className={mounted ? "psl-floating" : ""}>
              <HouseSVG drawn={mounted} />
            </div>
          </div>

          <div>
            <h2 className="psl-lp-headline">Know exactly what<br />a property is worth<br />as an investment.</h2>
            <p className="psl-lp-sub">Paste a Zillow URL. Get a brutally honest investment score powered by real data — cap rate, rent yield, school ratings, price history.</p>
            <div className="psl-pills">
              {["Live Zillow data", "Cap rate & 1% rule", "5-category scoring"].map(f => (
                <span className="psl-pill" key={f}>
                  <svg width="8" height="8" viewBox="0 0 8 8"><circle cx="4" cy="4" r="3" fill="#9D4EDD" /></svg>
                  {f}
                </span>
              ))}
            </div>
            <p className="psl-copy-footer">© 2026 PropScore</p>
          </div>
        </div>
      </div>

      {/* ══ RIGHT PANEL ═════════════════════════════════════ */}
      <div className="psl-rp">
        <div className="psl-rp-orb" />
        <div className={`psl-form-wrap${mounted ? " psl-form-in" : ""}`}>

          <div className="psl-mobile-logo">
            <div className="psl-logo-icon"><HomeIcon size={18} /></div>
            <span className="psl-logo-text">PropScore</span>
          </div>

          <div className="psl-rp-head">
            <h1 className="psl-rp-title">{mode === "signin" ? "Welcome back" : "Create account"}</h1>
            <p className="psl-rp-sub">{mode === "signin" ? "Sign in to your property portfolio" : "Start analyzing properties for free"}</p>
          </div>

          <div className="psl-seg">
            {(["signin", "signup"] as const).map(m => (
              <button key={m}
                className={`psl-seg-btn${mode === m ? " psl-seg-active" : ""}`}
                onClick={() => { setMode(m); setError(""); setMessage(""); }}>
                {m === "signin" ? "Sign in" : "Sign up"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="psl-form">
            <FloatField id="email" label="Email address" type="email"
              value={email} onChange={setEmail} autoComplete="email" />

            <div>
              <div style={{ position: "relative" }}>
                <FloatField id="password" label="Password"
                  type={showPw ? "text" : "password"}
                  value={password} onChange={setPassword}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  paddingRight={44} />
                <button type="button" className="psl-pw-eye"
                  onClick={() => setShowPw(!showPw)} tabIndex={-1}>
                  {showPw ? <EyeOff /> : <EyeOn />}
                </button>
              </div>
              {mode === "signin" && (
                <div style={{ textAlign: "right", marginTop: 6 }}>
                  <Link href="/forgot-password" className="psl-forgot">Forgot password?</Link>
                </div>
              )}
            </div>

            {error   && <Alert kind="error">{error}</Alert>}
            {message && <Alert kind="ok">{message}</Alert>}

            <button type="submit" disabled={loading} className="psl-cta">
              {loading
                ? <span className="psl-cta-loading">
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" viewBox="0 0 24 24" className="psl-spin"><path d="M21 12a9 9 0 11-6.219-8.56" /></svg>
                    Loading…
                  </span>
                : <span className="psl-cta-label">
                    {mode === "signin" ? "Sign in" : "Create account"}
                    <span className="psl-cta-arrow">→</span>
                  </span>
              }
              <span className="psl-cta-shimmer" />
            </button>
          </form>

          {/* ── Guest divider + button ───────────────────────── */}
          <div className="psl-divider"><span>or</span></div>
          <Link href="/demo/dashboard" className="psl-guest-btn">
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" viewBox="0 0 24 24">
              <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Explore as Guest
            <span className="psl-guest-arrow">→</span>
          </Link>

          <p className="psl-tos">
            By continuing you agree to our{" "}
            <span className="psl-tos-link">Terms</span> &amp;{" "}
            <span className="psl-tos-link">Privacy Policy</span>
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── Icon helpers ───────────────────────────────────────────── */
function HomeIcon({ size = 16 }: { size?: number }) {
  return <svg width={size} height={size} fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>;
}
function EyeOn() {
  return <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>;
}
function EyeOff() {
  return <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>;
}
