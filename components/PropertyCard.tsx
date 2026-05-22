import Link from "next/link";
import { Property } from "@/lib/types";

function scoreColor(score: number) {
  if (score >= 75) return "text-green-400";
  if (score >= 50) return "text-amber-400";
  return "text-red-400";
}

function scoreBg(score: number) {
  if (score >= 75) return "bg-green-900/40";
  if (score >= 50) return "bg-amber-900/40";
  return "bg-red-900/40";
}

export default function PropertyCard({ property }: { property: Property }) {
  const date = new Date(property.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <Link
      href={`/property/${property.id}`}
      className="flex items-center justify-between bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-gray-500 rounded-xl px-5 py-4 transition-colors group"
    >
      <div className="min-w-0 flex-1">
        <p className="font-medium text-white truncate group-hover:text-blue-400 transition-colors">
          {property.address}
        </p>
        <p className="text-xs text-gray-500 mt-0.5">{date}</p>
      </div>
      <div
        className={`ml-4 flex-shrink-0 rounded-lg px-3 py-1.5 ${scoreBg(property.overall_score)}`}
      >
        <span className={`text-lg font-bold ${scoreColor(property.overall_score)}`}>
          {property.overall_score}
        </span>
      </div>
    </Link>
  );
}
