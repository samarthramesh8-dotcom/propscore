"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";

export default function AnalyzePage() {
  const [listingText, setListingText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const isUrl = /^https?:\/\/\S+$/.test(listingText.trim());
  const isZillow = isUrl && /zillow\.com/.test(listingText);

  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault();
    if (!listingText.trim()) return;
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listing_text: listingText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Analysis failed");
      router.push(`/property/${data.property_id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen" style={{ background: "var(--bg-base)" }}>
      <Sidebar />

      <main className="flex-1 flex min-w-0">
        {/* Form panel */}
        <div className="flex-1 px-8 py-8 max-w-2xl">
          <div className="mb-7">
            <h1 className="text-xl font-semibold text-white">New analysis</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Paste a Zillow URL or full listing text to get an investment score.
            </p>
          </div>

          <form onSubmit={handleAnalyze} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                  Listing
                </label>
                {isZillow && (
                  <span className="flex items-center gap-1.5 text-xs text-indigo-400 font-medium">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Zillow URL detected — fetching live data
                  </span>
                )}
                {isUrl && !isZillow && (
                  <span className="text-xs text-slate-500">URL detected</span>
                )}
              </div>
              <textarea
                value={listingText}
                onChange={(e) => setListingText(e.target.value)}
                placeholder="https://www.zillow.com/homedetails/...&#10;&#10;or paste listing text — address, price, beds, baths, description, etc."
                rows={12}
                className="w-full rounded-xl px-4 py-3.5 text-sm text-white placeholder-slate-600 border transition-colors focus:outline-none focus:border-indigo-500/60 resize-none leading-relaxed"
                style={{ background: "var(--bg-surface)", borderColor: "var(--border-default)" }}
              />
            </div>

            {error && (
              <div className="flex items-start gap-2.5 rounded-xl px-4 py-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !listingText.trim()}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium rounded-xl py-3 text-sm transition-colors shadow-lg shadow-indigo-900/30 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {isZillow ? "Fetching Zillow data…" : "Analyzing with Claude…"}
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10" />
                  </svg>
                  Analyze investment
                </>
              )}
            </button>
          </form>
        </div>

        {/* Tips panel */}
        <div className="hidden xl:block w-72 shrink-0 px-6 py-8 border-l" style={{ borderColor: "var(--border-subtle)" }}>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-4">What we analyze</p>
          <div className="space-y-4">
            {[
              { icon: "💰", title: "Price & Value", desc: "List vs Zestimate, price/sqft vs market, days on market" },
              { icon: "🏘️", title: "Location", desc: "GreatSchools ratings, neighborhood trends, job market" },
              { icon: "📈", title: "Rental yield", desc: "1% rule, cap rate calculation, rent Zestimate" },
              { icon: "🔧", title: "Condition", desc: "Year built, estimated maintenance cost, deferred risk" },
              { icon: "📊", title: "Market trends", desc: "Buyer vs seller market, appreciation direction" },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="flex gap-3">
                <span className="text-base leading-none mt-0.5">{icon}</span>
                <div>
                  <p className="text-sm font-medium text-slate-200">{title}</p>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-xl p-4 border" style={{ background: "var(--bg-elevated)", borderColor: "var(--border-subtle)" }}>
            <p className="text-xs font-medium text-slate-300 mb-2">Pro tip</p>
            <p className="text-xs text-slate-500 leading-relaxed">
              Zillow URLs give the richest data — list price, Zestimate, rent estimate, school ratings, and price history all pulled automatically.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
