export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import PropertyCard from "@/components/PropertyCard";
import Sidebar from "@/components/Sidebar";
import { Property } from "@/lib/types";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: properties } = await supabase
    .from("properties")
    .select("*")
    .eq("user_id", user.id)
    .order("overall_score", { ascending: false });

  const count = properties?.length ?? 0;
  const avgScore = count
    ? Math.round((properties as Property[]).reduce((s, p) => s + p.overall_score, 0) / count)
    : null;
  const best = count ? Math.max(...(properties as Property[]).map((p) => p.overall_score)) : null;

  return (
    <div className="flex min-h-screen" style={{ background: "var(--bg-base)" }}>
      <Sidebar />

      <main className="flex-1 min-w-0">
        {/* Header */}
        <div className="px-8 pt-8 pb-6 border-b" style={{ borderColor: "var(--border-subtle)" }}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-white">Portfolio</h1>
              <p className="text-slate-500 text-sm mt-0.5">Your analyzed properties, ranked by score</p>
            </div>
            <Link
              href="/analyze"
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors shadow-lg shadow-indigo-900/30"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New analysis
            </Link>
          </div>

          {/* Stats */}
          {count > 0 && (
            <div className="flex gap-6 mt-6">
              {[
                { label: "Analyzed", value: count },
                { label: "Avg score", value: avgScore },
                { label: "Best score", value: best },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-2xl font-bold text-white tabular-nums">{value}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="px-8 py-6">
          {!count ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 border"
                style={{ background: "var(--bg-elevated)", borderColor: "var(--border-subtle)" }}>
                <svg className="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-white font-semibold mb-2">No properties yet</h3>
              <p className="text-slate-500 text-sm mb-6 max-w-xs">
                Paste a Zillow URL or listing text to get a data-backed investment score in seconds.
              </p>
              <Link
                href="/analyze"
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
              >
                Analyze your first property
              </Link>
            </div>
          ) : (
            <div className="space-y-2 max-w-2xl">
              {(properties as Property[]).map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
