"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

/* ─────────────────────────────────────────────────────────────
   PARTICLE CANVAS — drawn once, runs forever
───────────────────────────────────────────────────────────── */
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

    const N = 55;
    type P = { x: number; y: number; vx: number; vy: number; r: number; a: number };
    const pts: P[] = Array.from({ length: N }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.18,
      vy: (Math.random() - 0.5) * 0.18,
      r: Math.random() * 1.4 + 0.3,
      a: Math.random(),
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of pts) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(157,78,221,${0.15 + p.a * 0.25})`;
        ctx.fill();
      }
      for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
          const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 110) {
            ctx.beginPath();
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[j].x, pts[j].y);
            ctx.strokeStyle = `rgba(124,58,237,${0.12 * (1 - d / 110)})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
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

/* ─────────────────────────────────────────────────────────────
   HOUSE SVG — paths animate in via stroke-dashoffset
───────────────────────────────────────────────────────────── */
function HouseSVG({ drawn }: { drawn: boolean }) {
  const pathProps = (delay = 0, len = 2000) => ({
    className: "hp",
    style: {
      strokeDasharray: len,
      strokeDashoffset: drawn ? 0 : len,
      transition: `stroke-dashoffset 2.6s cubic-bezier(.25,.46,.45,.94) ${delay}s`,
    } as React.CSSProperties,
  });
  return (
    <svg viewBox="0 0 420 360" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ width: "min(360px,85%)", filter: "drop-shadow(0 0 28px rgba(157,78,221,0.35))" }}>
      <defs>
        <filter id="ng" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="5" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="sg" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.5" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <radialGradient id="winGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(157,78,221,0.18)"/>
          <stop offset="100%" stopColor="rgba(157,78,221,0)"/>
        </radialGradient>
      </defs>

      {/* Ground ellipse */}
      <ellipse cx="210" cy="340" rx="130" ry="9" fill="rgba(124,58,237,0.1)"/>

      {/* Subtle fill */}
      <path d="M90 210 L90 318 L330 318 L330 210 L210 105 Z" fill="rgba(157,78,221,0.04)"/>

      {/* Roof */}
      <path {...pathProps(0,900)} d="M55 218 L210 82 L365 218"
        stroke="#9D4EDD" strokeWidth="2.8" strokeLinecap="round" filter="url(#ng)"/>
      <path {...pathProps(0.25,700)} d="M95 218 L210 112 L325 218"
        stroke="rgba(157,78,221,0.28)" strokeWidth="1" strokeLinecap="round"/>

      {/* Walls */}
      <rect {...pathProps(0.35,900)} x="90" y="218" width="240" height="100"
        stroke="#9D4EDD" strokeWidth="2.2" filter="url(#ng)"/>

      {/* Chimney */}
      <path {...pathProps(0.55,300)} d="M278 162 L278 126 L304 126 L304 172"
        stroke="#9D4EDD" strokeWidth="2" strokeLinecap="round" filter="url(#sg)"/>
      {/* Smoke */}
      <path {...pathProps(1.5,200)} d="M284 120 Q278 108 285 97 Q292 86 286 75"
        stroke="rgba(157,78,221,0.3)" strokeWidth="1.5" strokeLinecap="round"/>
      <path {...pathProps(1.7,200)} d="M294 118 Q301 105 294 94 Q287 83 294 72"
        stroke="rgba(157,78,221,0.18)" strokeWidth="1" strokeLinecap="round"/>

      {/* Left window */}
      <rect {...pathProps(0.75,300)} x="108" y="230" width="52" height="46" rx="4"
        stroke="#9D4EDD" strokeWidth="1.8" filter="url(#sg)"/>
      <rect x="109" y="231" width="50" height="44" rx="3" fill="url(#winGlow)"/>
      <line {...pathProps(0.85,100)} x1="134" y1="230" x2="134" y2="276" stroke="rgba(157,78,221,0.4)" strokeWidth="1"/>
      <line {...pathProps(0.85,100)} x1="108" y1="253" x2="160" y2="253" stroke="rgba(157,78,221,0.4)" strokeWidth="1"/>

      {/* Right window */}
      <rect {...pathProps(0.9,300)} x="260" y="230" width="52" height="46" rx="4"
        stroke="#9D4EDD" strokeWidth="1.8" filter="url(#sg)"/>
      <rect x="261" y="231" width="50" height="44" rx="3" fill="url(#winGlow)"/>
      <line {...pathProps(1.0,100)} x1="286" y1="230" x2="286" y2="276" stroke="rgba(157,78,221,0.4)" strokeWidth="1"/>
      <line {...pathProps(1.0,100)} x1="260" y1="253" x2="312" y2="253" stroke="rgba(157,78,221,0.4)" strokeWidth="1"/>

      {/* Door */}
      <path {...pathProps(0.8,400)} d="M184 318 L184 267 Q184 259 192 259 L228 259 Q236 259 236 267 L236 318"
        stroke="#9D4EDD" strokeWidth="2" strokeLinecap="round" filter="url(#sg)"/>
      <path {...pathProps(0.95,200)} d="M184 267 Q210 249 236 267"
        stroke="rgba(157,78,221,0.45)" strokeWidth="1.2" strokeLinecap="round"/>
      <circle {...pathProps(1.1,30)} cx="231" cy="289" r="3.5"
        stroke="#9D4EDD" strokeWidth="1.5"/>

      {/* Porch steps */}
      <path {...pathProps(1.15,300)} d="M170 318 L170 326 L250 326 L250 318"
        stroke="rgba(157,78,221,0.5)" strokeWidth="1.5" strokeLinecap="round"/>
      <path {...pathProps(1.2,350)} d="M178 326 L178 334 L242 334 L242 326"
        stroke="rgba(157,78,221,0.3)" strokeWidth="1.2" strokeLinecap="round"/>

      {/* Garage */}
      <rect {...pathProps(1.0,400)} x="90" y="265" width="72" height="53" rx="2"
        stroke="rgba(157,78,221,0.55)" strokeWidth="1.5"/>
      <line {...pathProps(1.1,75)} x1="90" y1="283" x2="162" y2="283" stroke="rgba(157,78,221,0.22)" strokeWidth="1"/>
      <line {...pathProps(1.1,75)} x1="90" y1="299" x2="162" y2="299" stroke="rgba(157,78,221,0.22)" strokeWidth="1"/>

      {/* Stars */}
      {[[28,38],[380,55],[18,195],[388,155],[350,300],[48,300],[210,48],[380,220]].map(([x,y],i) => (
        <circle key={i} cx={x} cy={y} r={i%2===0?1.8:1.2} fill={`rgba(157,78,221,${i%2===0?0.4:0.22})`}/>
      ))}

      {/* Rooftop ornament */}
      <path {...pathProps(1.3,100)} d="M203 82 L210 68 L217 82"
        stroke="rgba(157,78,221,0.6)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle {...pathProps(1.4,20)} cx="210" cy="64" r="3.5"
        stroke="#9D4EDD" strokeWidth="1.5" filter="url(#sg)"/>
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────────────────────── */
export default function LoginPage() {
  const [email, setEmail]           = useState("");
  const [password, setPassword]     = useState("");
  const [showPw, setShowPw]         = useState(false);
  const [mode, setMode]             = useState<"signin"|"signup">("signin");
  const [error, setError]           = useState("");
  const [loading, setLoading]       = useState(false);
  const [message, setMessage]       = useState("");
  const [mounted, setMounted]       = useState(false);
  const router = useRouter();

  useEffect(() => { const t = setTimeout(() => setMounted(true), 60); return () => clearTimeout(t); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setMessage(""); setLoading(true);
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
    <>
      <style>{CSS}</style>
      <div className="root">

        {/* ════════════ LEFT PANEL ════════════ */}
        <div className={`lp${mounted ? " lp-in" : ""}`}>
          <ParticleCanvas />
          <div className="lp-inner">

            {/* Logo */}
            <div className="logo">
              <div className="logo-icon">
                <IconHome size={16}/>
              </div>
              <span className="logo-text">PropScore</span>
            </div>

            {/* House */}
            <div className="house-wrap">
              <div className={`house-anim${mounted ? " floating" : ""}`}>
                <HouseSVG drawn={mounted}/>
              </div>
            </div>

            {/* Copy */}
            <div>
              <h2 className="lp-headline">Know exactly what<br/>a property is worth<br/>as an investment.</h2>
              <p className="lp-sub">Paste a Zillow URL. Get a brutally honest investment score powered by real data — cap rate, rent yield, school ratings, price history.</p>
              <div className="feature-pills">
                {["Live Zillow data","Cap rate & 1% rule","5-category scoring"].map(f => (
                  <span className="pill" key={f}>
                    <svg width="8" height="8" viewBox="0 0 8 8"><circle cx="4" cy="4" r="3" fill="#9D4EDD"/></svg>
                    {f}
                  </span>
                ))}
              </div>
              <p className="copy-footer">© 2026 PropScore</p>
            </div>
          </div>
        </div>

        {/* ════════════ RIGHT PANEL ════════════ */}
        <div className="rp">
          {/* ambient glow */}
          <div className="rp-orb"/>
          <div className={`form-wrap${mounted ? " form-in" : ""}`}>

            {/* Mobile logo */}
            <div className="mobile-logo">
              <div className="logo-icon"><IconHome size={15}/></div>
              <span className="logo-text">PropScore</span>
            </div>

            {/* Heading */}
            <div className="rp-head">
              <h1 className="rp-title">{mode==="signin" ? "Welcome back" : "Create account"}</h1>
              <p className="rp-sub">{mode==="signin" ? "Sign in to your property portfolio" : "Start analyzing properties for free"}</p>
            </div>

            {/* Mode toggle */}
            <div className="seg">
              {(["signin","signup"] as const).map(m => (
                <button key={m} className={`seg-btn${mode===m?" seg-active":""}`}
                  onClick={() => { setMode(m); setError(""); setMessage(""); }}>
                  {m==="signin" ? "Sign in" : "Sign up"}
                </button>
              ))}
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="form">

              {/* Email field */}
              <FloatField id="email" label="Email address" type="email"
                value={email} onChange={setEmail} autoComplete="email"/>

              {/* Password field */}
              <div>
                <div style={{position:"relative"}}>
                  <FloatField id="password" label="Password"
                    type={showPw ? "text" : "password"}
                    value={password} onChange={setPassword}
                    autoComplete={mode==="signin"?"current-password":"new-password"}
                    paddingRight={44}/>
                  <button type="button" className="pw-eye"
                    onClick={() => setShowPw(!showPw)} tabIndex={-1}
                    aria-label={showPw?"Hide":"Show"}>
                    {showPw ? <EyeOff/> : <EyeOn/>}
                  </button>
                </div>
                {mode==="signin" && (
                  <div style={{textAlign:"right",marginTop:6}}>
                    <Link href="/forgot-password" className="forgot">Forgot password?</Link>
                  </div>
                )}
              </div>

              {error && <Alert kind="error">{error}</Alert>}
              {message && <Alert kind="ok">{message}</Alert>}

              <button type="submit" disabled={loading} className="cta">
                {loading
                  ? <span className="cta-loading"><SpinIcon/>Loading…</span>
                  : <span className="cta-label">{mode==="signin"?"Sign in":"Create account"}<span className="cta-arrow">→</span></span>
                }
                <span className="cta-shimmer"/>
              </button>
            </form>

            <p className="tos">
              By continuing you agree to our{" "}
              <span className="tos-link">Terms</span> &amp;{" "}
              <span className="tos-link">Privacy Policy</span>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────
   FLOATING LABEL INPUT
───────────────────────────────────────────────────────────── */
function FloatField({ id, label, type, value, onChange, autoComplete, paddingRight=14 }: {
  id: string; label: string; type: string;
  value: string; onChange: (v:string)=>void;
  autoComplete?: string; paddingRight?: number;
}) {
  const [focused, setFocused] = useState(false);
  const raised = focused || value.length > 0;
  return (
    <div className="ff">
      <input
        id={id} type={type} value={value} required
        placeholder=" "
        autoComplete={autoComplete}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className={`ff-input${focused?" ff-focused":""}`}
        style={{paddingRight}}
      />
      <label htmlFor={id} className={`ff-label${raised?" ff-raised":""}`}>{label}</label>
      <span className={`ff-line${focused?" ff-line-on":""}`}/>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   ALERT
───────────────────────────────────────────────────────────── */
function Alert({ kind, children }: { kind:"error"|"ok"; children: React.ReactNode }) {
  return (
    <div className={`alert alert-${kind}`}>
      {kind==="error"
        ? <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        : <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
      }
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   ICON HELPERS
───────────────────────────────────────────────────────────── */
function IconHome({ size }: { size: number }) {
  return (
    <svg width={size} height={size} fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
    </svg>
  );
}
function EyeOn() {
  return <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
}
function EyeOff() {
  return <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>;
}
function SpinIcon() {
  return <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" viewBox="0 0 24 24" style={{animation:"spin .75s linear infinite"}}><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>;
}

/* ─────────────────────────────────────────────────────────────
   ALL CSS
───────────────────────────────────────────────────────────── */
const CSS = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}

/* ── Keyframes ── */
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes float{
  0%,100%{transform:translateY(0) rotate(0deg)}
  33%{transform:translateY(-12px) rotate(.5deg)}
  66%{transform:translateY(-5px) rotate(-.4deg)}
}
@keyframes glowBreath{
  0%,100%{filter:drop-shadow(0 0 14px rgba(157,78,221,.4))}
  50%{filter:drop-shadow(0 0 36px rgba(157,78,221,.85))}
}
@keyframes btnGlow{
  0%,100%{box-shadow:0 4px 20px rgba(124,58,237,.3)}
  50%{box-shadow:0 4px 40px rgba(124,58,237,.7),0 0 0 6px rgba(124,58,237,.12)}
}
@keyframes shimmer{
  0%{left:-100%}
  100%{left:200%}
}
@keyframes fadeUp{
  from{opacity:0;transform:translateY(30px)}
  to{opacity:1;transform:translateY(0)}
}
@keyframes orbPulse{
  0%,100%{transform:translate(-50%,-50%) scale(1)}
  50%{transform:translate(-50%,-50%) scale(1.15)}
}

/* ── Root ── */
.root{
  min-height:100vh;display:flex;
  background:#0A0A0A;
  font-family:'Inter',system-ui,-apple-system,sans-serif;
  color:#fff;
}

/* ── Left panel ── */
.lp{
  width:50%;flex-shrink:0;position:relative;overflow:hidden;
  background:linear-gradient(145deg,#0d0d12 0%,#0f0e17 100%);
  border-right:1px solid rgba(255,255,255,.055);
  opacity:0;transition:opacity .9s ease .1s;
  display:none;
}
@media(min-width:1024px){.lp{display:block}}
.lp-in{opacity:1}
.lp-inner{
  position:relative;z-index:1;
  height:100%;display:flex;flex-direction:column;
  justify-content:space-between;padding:44px 52px;
}

/* ── Floating house ── */
.house-wrap{flex:1;display:flex;align-items:center;justify-content:center;padding:20px 0}
.house-anim{}
.floating{animation:float 7s ease-in-out infinite,glowBreath 5s ease-in-out infinite}

/* ── Logo ── */
.logo{display:flex;align-items:center;gap:10px}
.logo-icon{
  width:33px;height:33px;border-radius:9px;
  background:linear-gradient(135deg,#7C3AED,#9D4EDD);
  display:flex;align-items:center;justify-content:center;
  box-shadow:0 0 18px rgba(124,58,237,.45);
  flex-shrink:0;
}
.logo-text{font-size:15px;font-weight:800;letter-spacing:-.025em;color:#fff}

/* ── Left copy ── */
.lp-headline{
  font-size:clamp(20px,2vw,28px);font-weight:800;
  letter-spacing:-.035em;line-height:1.22;margin-bottom:12px;
}
.lp-sub{font-size:12.5px;color:rgba(255,255,255,.38);line-height:1.75;max-width:340px;margin-bottom:22px}
.feature-pills{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:28px}
.pill{
  display:inline-flex;align-items:center;gap:6px;
  padding:4px 10px;border-radius:99px;
  background:rgba(124,58,237,.1);border:1px solid rgba(124,58,237,.25);
  font-size:11px;color:rgba(255,255,255,.55);font-weight:500;
}
.copy-footer{font-size:10.5px;color:rgba(255,255,255,.16)}

/* ── Right panel ── */
.rp{
  flex:1;display:flex;align-items:center;justify-content:center;
  padding:40px 24px;background:#0A0A0A;position:relative;overflow:hidden;
}
.rp-orb{
  position:absolute;width:500px;height:500px;border-radius:50%;
  background:radial-gradient(circle,rgba(124,58,237,.09) 0%,transparent 70%);
  filter:blur(70px);top:50%;left:50%;
  transform:translate(-50%,-50%);
  animation:orbPulse 12s ease-in-out infinite;
  pointer-events:none;
}

/* ── Form container ── */
.form-wrap{
  width:100%;max-width:368px;position:relative;z-index:1;
  opacity:0;transform:translateY(28px);
  transition:opacity .7s ease .35s,transform .7s ease .35s;
}
.form-in{opacity:1;transform:translateY(0)}
.mobile-logo{display:flex;align-items:center;gap:10px;margin-bottom:36px}
@media(min-width:1024px){.mobile-logo{display:none}}

/* ── Right panel heading ── */
.rp-head{margin-bottom:26px}
.rp-title{font-size:26px;font-weight:800;letter-spacing:-.035em;margin-bottom:7px;line-height:1.15}
.rp-sub{font-size:13px;color:rgba(255,255,255,.38);line-height:1.65}

/* ── Segment toggle ── */
.seg{
  display:flex;
  background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);
  border-radius:11px;padding:3px;margin-bottom:24px;
}
.seg-btn{
  flex:1;padding:7.5px 0;border-radius:8px;font-size:12.5px;font-weight:600;
  cursor:pointer;border:none;transition:all .2s ease;
  font-family:inherit;letter-spacing:.015em;
  background:transparent;color:rgba(255,255,255,.38);
}
.seg-active{
  background:linear-gradient(135deg,#7C3AED,#9D4EDD);color:#fff;
  box-shadow:0 2px 16px rgba(124,58,237,.38);
}

/* ── Form ── */
.form{display:flex;flex-direction:column;gap:16px}

/* ── Floating field ── */
.ff{position:relative}
.ff-input{
  width:100%;
  background:rgba(255,255,255,.04);
  border:1px solid rgba(255,255,255,.1);
  border-radius:12px;
  padding:22px 14px 9px;
  font-size:14px;color:#fff;outline:none;
  font-family:inherit;
  transition:border-color .22s ease,box-shadow .25s ease,background .22s ease;
  caret-color:#9D4EDD;
}
.ff-input::placeholder{color:transparent}
.ff-focused{
  border-color:#7C3AED !important;
  background:rgba(124,58,237,.06) !important;
  box-shadow:0 0 0 3px rgba(124,58,237,.16),0 0 20px rgba(157,78,221,.18) !important;
}
.ff-label{
  position:absolute;left:14px;top:50%;
  transform:translateY(-50%);
  font-size:13.5px;color:rgba(255,255,255,.32);
  pointer-events:none;font-weight:500;
  transition:top .21s ease,font-size .21s ease,color .21s ease,transform .21s ease,letter-spacing .21s ease;
}
.ff-raised{
  top:11px;transform:translateY(0);
  font-size:10px;letter-spacing:.09em;
  color:#9D4EDD;font-weight:600;text-transform:uppercase;
}
.ff-line{
  position:absolute;bottom:0;left:50%;
  width:0;height:2px;border-radius:2px;
  background:linear-gradient(90deg,#7C3AED,#9D4EDD);
  transform:translateX(-50%);
  transition:width .3s ease;
  border-radius:0 0 12px 12px;pointer-events:none;
}
.ff-line-on{width:calc(100% - 2px)}

/* ── Password eye ── */
.pw-eye{
  position:absolute;right:12px;top:50%;transform:translateY(-50%);
  background:none;border:none;cursor:pointer;
  color:rgba(255,255,255,.28);padding:5px;
  display:flex;align-items:center;
  transition:color .15s ease;
}
.pw-eye:hover{color:#9D4EDD}

/* ── Forgot link ── */
.forgot{
  font-size:11.5px;color:#9D4EDD;text-decoration:none;
  opacity:.75;transition:opacity .15s ease;
}
.forgot:hover{opacity:1}

/* ── Alert ── */
.alert{
  display:flex;align-items:flex-start;gap:9px;
  padding:11px 13px;border-radius:10px;
  font-size:12.5px;line-height:1.55;
}
.alert svg{flex-shrink:0;margin-top:1px}
.alert-error{background:rgba(232,56,79,.09);border:1px solid rgba(232,56,79,.22);color:#ff7484}
.alert-ok{background:rgba(0,210,106,.08);border:1px solid rgba(0,210,106,.2);color:#3dd68c}

/* ── CTA button ── */
.cta{
  position:relative;overflow:hidden;
  width:100%;
  background:linear-gradient(135deg,#7C3AED 0%,#9D4EDD 100%);
  color:#fff;border:none;border-radius:12px;
  padding:14px 0;font-size:14.5px;font-weight:700;
  cursor:pointer;font-family:inherit;letter-spacing:.025em;
  box-shadow:0 4px 20px rgba(124,58,237,.3);
  transition:transform .2s ease,box-shadow .2s ease,opacity .15s ease;
  margin-top:2px;
}
.cta:hover:not(:disabled){
  transform:scale(1.028) translateY(-1px);
  animation:btnGlow 1.5s ease-in-out infinite;
}
.cta:active:not(:disabled){transform:scale(.98);transition-duration:.08s}
.cta:disabled{opacity:.42;cursor:not-allowed}
.cta-shimmer{
  position:absolute;top:0;left:-100%;
  width:60%;height:100%;
  background:linear-gradient(90deg,transparent,rgba(255,255,255,.15),transparent);
  transform:skewX(-20deg);
  animation:shimmer 3.2s ease-in-out infinite;
  pointer-events:none;
}
.cta-label{display:flex;align-items:center;justify-content:center;gap:8px;position:relative;z-index:1}
.cta-arrow{transition:transform .2s ease}
.cta:hover .cta-arrow{transform:translateX(3px)}
.cta-loading{display:flex;align-items:center;justify-content:center;gap:8px;position:relative;z-index:1}

/* ── ToS ── */
.tos{font-size:11px;color:rgba(255,255,255,.18);text-align:center;margin-top:26px;line-height:1.65}
.tos-link{color:rgba(157,78,221,.7);cursor:pointer;transition:color .15s ease}
.tos-link:hover{color:#9D4EDD}

/* ── Scrollbar ── */
::-webkit-scrollbar{width:5px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:rgba(124,58,237,.3);border-radius:4px}
`;
