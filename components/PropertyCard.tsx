import Link from "next/link";
import { Property } from "@/lib/types";

function scoreMeta(score: number) {
  if (score >= 75) return { color: "text-emerald-400", bg: "bg-emerald-500/10", ring: "ring-emerald-500/20" };
  if (score >= 60) return { color: "text-amber-400", bg: "bg-amber-500/10", ring: "ring-amber-500/20" };
  if (score >= 40) return { color: "text-orange-400", bg: "bg-orange-500/10", ring: "ring-orange-500/20" };
  return { color: "text-red-400", bg: "bg-red-500/10", ring: "ring-red-500/20" };
}

export default function PropertyCard({ property }: { property: Property }) {
  const { color, bg, ring } = scoreMeta(property.overall_score);
  const date = new Date(property.created_at).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });

  return (
    <Link
      href={`/property/${property.id}`}
      className="group flex items-center gap-4 px-5 py-4 rounded-xl border transition-all duration-150 hover:border-white/10 hover:bg-white/[0.02]"
      style={{ background: "var(--bg-elevated)", borderColor: "var(--border-subtle)" }}
    >
      {/* Score badge */}
      <div className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ring-1 ${bg} ${ring}`}>
        <span className={`text-base font-bold tabular-nums ${color}`}>{property.overall_score}</span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate group-hover:text-indigo-300 transition-colors">
          {property.address}
        </p>
        <p className="text-xs text-slate-500 mt-0.5">{date}</p>
      </div>

      {/* Arrow */}
      <svg className="w-4 h-4 text-slate-600 group-hover:text-slate-400 shrink-0 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  );
}
