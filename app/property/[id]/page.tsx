export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import ScoreRing from "@/components/ScoreRing";
import SubscoreCard from "@/components/SubscoreCard";
import Sidebar from "@/components/Sidebar";
import { Property } from "@/lib/types";

export default async function PropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("properties")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!data) notFound();

  const property = data as Property;
  const date = new Date(property.created_at).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });

  return (
    <div className="flex min-h-screen" style={{ background: "var(--bg-base)" }}>
      <Sidebar />

      <main className="flex-1 min-w-0 pb-12">
        {/* Header */}
        <div className="px-8 pt-8 pb-6 border-b flex items-center gap-4" style={{ borderColor: "var(--border-subtle)" }}>
          <Link href="/dashboard" className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-white truncate">{property.address}</h1>
            <p className="text-slate-500 text-xs mt-0.5">Analyzed {date}</p>
          </div>
        </div>

        <div className="px-8 py-8 space-y-8">
          {/* Hero row: score + verdict */}
          <div className="grid lg:grid-cols-[auto,1fr] gap-6">
            {/* Score card */}
            <div className="rounded-2xl p-8 flex flex-col items-center justify-center border min-w-[200px]"
              style={{ background: "var(--bg-surface)", borderColor: "var(--border-subtle)" }}>
              <ScoreRing score={property.overall_score} size={150} strokeWidth={10} />
              <p className="text-xs text-slate-500 mt-5 text-center uppercase tracking-widest">Overall score</p>
            </div>

            {/* Verdict + bull/bear */}
            <div className="space-y-4 flex flex-col">
              <div className="rounded-2xl p-6 border flex-1"
                style={{ background: "var(--bg-surface)", borderColor: "var(--border-subtle)" }}>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">Verdict</p>
                <p className="text-slate-200 leading-relaxed">{property.verdict}</p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="rounded-xl p-5 border border-emerald-500/15 bg-emerald-500/[0.05]">
                  <div className="flex items-center gap-2 mb-2.5">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <svg className="w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                      </svg>
                    </div>
                    <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">Bull case</p>
                  </div>
                  <p className="text-slate-300 text-sm leading-relaxed">{property.bull_case}</p>
                </div>
                <div className="rounded-xl p-5 border border-red-500/15 bg-red-500/[0.05]">
                  <div className="flex items-center gap-2 mb-2.5">
                    <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center">
                      <svg className="w-3 h-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                      </svg>
                    </div>
                    <p className="text-xs font-semibold text-red-400 uppercase tracking-wide">Bear case</p>
                  </div>
                  <p className="text-slate-300 text-sm leading-relaxed">{property.bear_case}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Subscores */}
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-4">Category breakdown</p>
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {property.subscores.map((s) => (
                <SubscoreCard key={s.category} category={s.category} score={s.score} summary={s.summary} />
              ))}
            </div>
          </div>

          {/* Original listing */}
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-4">Source data</p>
            <div className="rounded-xl p-5 border" style={{ background: "var(--bg-surface)", borderColor: "var(--border-subtle)" }}>
              <pre className="text-slate-500 text-xs leading-relaxed whitespace-pre-wrap font-mono overflow-x-auto">
                {property.listing_text}
              </pre>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
