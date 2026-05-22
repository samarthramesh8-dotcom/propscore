interface SubscoreCardProps {
  category: string;
  score: number;
  summary: string;
}

function scoreStyle(score: number) {
  if (score >= 75) return { bar: "bg-emerald-500", text: "text-emerald-400", bg: "bg-emerald-500/10" };
  if (score >= 60) return { bar: "bg-amber-500", text: "text-amber-400", bg: "bg-amber-500/10" };
  if (score >= 40) return { bar: "bg-orange-500", text: "text-orange-400", bg: "bg-orange-500/10" };
  return { bar: "bg-red-500", text: "text-red-400", bg: "bg-red-500/10" };
}

export default function SubscoreCard({ category, score, summary }: SubscoreCardProps) {
  const { bar, text, bg } = scoreStyle(score);

  return (
    <div className="rounded-xl p-5 border transition-colors hover:border-white/10"
      style={{ background: "var(--bg-elevated)", borderColor: "var(--border-subtle)" }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-slate-200">{category}</span>
        <span className={`text-sm font-bold px-2 py-0.5 rounded-md ${text} ${bg}`}>{score}</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/5 mb-3 overflow-hidden">
        <div
          className={`h-full rounded-full ${bar} transition-all duration-700`}
          style={{ width: `${score}%` }}
        />
      </div>
      <p className="text-slate-400 text-sm leading-relaxed">{summary}</p>
    </div>
  );
}
