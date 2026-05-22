"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AnalyzePage() {
  const [listingText, setListingText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const isUrl = /^https?:\/\/\S+$/.test(listingText.trim());

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
    <div className="min-h-screen">
      <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/dashboard" className="text-gray-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="font-semibold text-white">Analyze Property</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-white">Paste a listing or URL</h2>
          <p className="text-gray-400 text-sm mt-1">
            Drop a Zillow, Redfin, or MLS link — or paste the listing text directly.
          </p>
        </div>

        <form onSubmit={handleAnalyze} className="space-y-4">
          <textarea
            value={listingText}
            onChange={(e) => setListingText(e.target.value)}
            placeholder="https://www.zillow.com/homedetails/... or paste listing text"
            rows={14}
            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm resize-none leading-relaxed"
          />

          {isUrl && !loading && (
            <div className="bg-blue-900/30 border border-blue-700 rounded-lg px-4 py-3 text-blue-300 text-sm">
              URL detected — we&apos;ll fetch the listing data automatically.
            </div>
          )}

          {error && (
            <div className="bg-red-900/30 border border-red-700 rounded-lg px-4 py-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !listingText.trim()}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl py-3 text-sm transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {isUrl ? "Fetching listing…" : "Analyzing with Claude…"}
              </>
            ) : (
              "Analyze investment"
            )}
          </button>
        </form>
      </main>
    </div>
  );
}
