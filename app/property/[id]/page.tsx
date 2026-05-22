export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import ScoreRing from "@/components/ScoreRing";
import SubscoreCard from "@/components/SubscoreCard";
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
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="min-h-screen">
      <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/dashboard" className="text-gray-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="font-semibold text-white truncate">{property.address}</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {/* Hero score */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-6">
          <ScoreRing score={property.overall_score} size={130} strokeWidth={12} />
          <div className="text-center sm:text-left">
            <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Overall score</p>
            <h2 className="text-xl font-bold text-white">{property.address}</h2>
            <p className="text-gray-400 text-sm mt-1">Analyzed {date}</p>
          </div>
        </div>

        {/* Verdict */}
        <section>
          <h3 className="text-xs uppercase tracking-widest text-gray-500 mb-3">Verdict</h3>
          <p className="text-gray-200 leading-relaxed">{property.verdict}</p>
        </section>

        {/* Bull / Bear */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="bg-green-900/20 border border-green-800/40 rounded-xl p-4">
            <p className="text-xs uppercase tracking-widest text-green-500 mb-2">Bull case</p>
            <p className="text-gray-200 text-sm leading-relaxed">{property.bull_case}</p>
          </div>
          <div className="bg-red-900/20 border border-red-800/40 rounded-xl p-4">
            <p className="text-xs uppercase tracking-widest text-red-400 mb-2">Bear case</p>
            <p className="text-gray-200 text-sm leading-relaxed">{property.bear_case}</p>
          </div>
        </div>

        {/* Subscores */}
        <section>
          <h3 className="text-xs uppercase tracking-widest text-gray-500 mb-3">Breakdown</h3>
          <div className="space-y-3">
            {property.subscores.map((s) => (
              <SubscoreCard
                key={s.category}
                category={s.category}
                score={s.score}
                summary={s.summary}
              />
            ))}
          </div>
        </section>

        {/* Original listing */}
        <section>
          <h3 className="text-xs uppercase tracking-widest text-gray-500 mb-3">Original listing</h3>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-gray-400 text-sm leading-relaxed whitespace-pre-wrap">
              {property.listing_text}
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
