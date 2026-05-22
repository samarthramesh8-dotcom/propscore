interface SubscoreCardProps {
  category: string;
  score: number;
  summary: string;
}

function barColor(score: number) {
  if (score >= 75) return "bg-green-500";
  if (score >= 50) return "bg-amber-500";
  return "bg-red-500";
}

export default function SubscoreCard({ category, score, summary }: SubscoreCardProps) {
  return (
    <div className="bg-gray-800 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-medium text-gray-200 text-sm">{category}</span>
        <span className="text-sm font-bold text-white">{score}</span>
      </div>
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${barColor(score)} transition-all duration-500`}
          style={{ width: `${score}%` }}
        />
      </div>
      <p className="text-gray-400 text-xs leading-relaxed">{summary}</p>
    </div>
  );
}
