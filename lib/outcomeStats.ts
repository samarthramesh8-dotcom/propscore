// Verdict-outcome track record (Phase 1).
// Computes how PropScore's verdicts have actually performed for a user, from
// the property_outcomes table joined to properties. Used as agent context in
// the Deal Finder (Phase 2) and rendered on the dashboard (Phase 4).

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  OutcomeStats,
  OutcomeType,
  VerdictTier,
  VerdictTierStats,
} from "@/lib/types";

const VERDICT_TIERS: VerdictTier[] = [
  "STRONG BUY",
  "BUY",
  "CONDITIONAL BUY",
  "PASS",
  "STRONG PASS",
];

const WIN_OUTCOMES: OutcomeType[] = ["closed", "offer_accepted"];
const RESOLVED_OUTCOMES: OutcomeType[] = ["closed", "offer_accepted", "offer_rejected", "passed"];
const PURSUED_OUTCOMES: OutcomeType[] = ["pursued", "offer_made", "offer_accepted", "closed"];
const DECLINED_OUTCOMES: OutcomeType[] = ["passed", "offer_rejected"];

// Verdicts open with the recommendation (SYSTEM_PROMPT hard rule 3). Match the
// most specific tier first so "STRONG BUY" doesn't parse as "BUY".
export function parseVerdictTier(verdict: string | null): VerdictTier | null {
  if (!verdict) return null;
  const head = verdict.slice(0, 40).toUpperCase();
  if (head.includes("STRONG BUY")) return "STRONG BUY";
  if (head.includes("CONDITIONAL BUY")) return "CONDITIONAL BUY";
  if (head.includes("STRONG PASS")) return "STRONG PASS";
  if (head.includes("BUY")) return "BUY";
  if (head.includes("PASS")) return "PASS";
  return null;
}

function pearson(xs: number[], ys: number[]): number | null {
  const n = xs.length;
  if (n < 3) return null;
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  let cov = 0, varX = 0, varY = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    cov  += dx * dy;
    varX += dx * dx;
    varY += dy * dy;
  }
  if (varX === 0 || varY === 0) return null;
  return cov / Math.sqrt(varX * varY);
}

interface OutcomeRow {
  outcome_type: OutcomeType;
  properties: { overall_score: number; verdict: string | null } | null;
}

export async function getOutcomeStats(
  supabase: SupabaseClient,
  userId: string,
): Promise<OutcomeStats> {
  const empty: OutcomeStats = {
    totalTracked: 0,
    byVerdictTier: VERDICT_TIERS.map((tier) => ({
      tier, tracked: 0, resolved: 0, wins: 0, winRate: null,
    })),
    scoreOutcomeCorrelation: null,
  };

  const { data, error } = await supabase
    .from("property_outcomes")
    .select("outcome_type, properties!inner(overall_score, verdict)")
    .eq("user_id", userId);

  // Missing table (migration not run) or any query error → empty stats
  if (error || !data) return empty;

  const rows = data as unknown as OutcomeRow[];

  const tierMap = new Map<VerdictTier, VerdictTierStats>(
    empty.byVerdictTier.map((t) => [t.tier, { ...t }]),
  );
  const corrScores: number[] = [];
  const corrPursued: number[] = [];

  for (const row of rows) {
    const tier = parseVerdictTier(row.properties?.verdict ?? null);
    if (tier) {
      const t = tierMap.get(tier)!;
      t.tracked++;
      if (RESOLVED_OUTCOMES.includes(row.outcome_type)) t.resolved++;
      if (WIN_OUTCOMES.includes(row.outcome_type)) t.wins++;
    }
    const score = row.properties?.overall_score;
    if (typeof score === "number") {
      if (PURSUED_OUTCOMES.includes(row.outcome_type)) {
        corrScores.push(score);
        corrPursued.push(1);
      } else if (DECLINED_OUTCOMES.includes(row.outcome_type)) {
        corrScores.push(score);
        corrPursued.push(0);
      }
      // still_watching is undecided — excluded from correlation
    }
  }

  const byVerdictTier = VERDICT_TIERS.map((tier) => {
    const t = tierMap.get(tier)!;
    return { ...t, winRate: t.resolved > 0 ? t.wins / t.resolved : null };
  });

  return {
    totalTracked: rows.length,
    byVerdictTier,
    scoreOutcomeCorrelation: pearson(corrScores, corrPursued),
  };
}

// Compact text rendering for use as model context (Phase 2 get_past_outcomes tool).
export function formatOutcomeStatsForClaude(stats: OutcomeStats): string {
  if (stats.totalTracked === 0) {
    return "No tracked outcomes yet for this user — no historical track record to calibrate against.";
  }
  const lines = [
    `Tracked outcomes: ${stats.totalTracked}`,
    `Win rate by verdict tier (win = closed or offer accepted, of resolved outcomes):`,
    ...stats.byVerdictTier
      .filter((t) => t.tracked > 0)
      .map((t) =>
        `  ${t.tier}: ${t.tracked} tracked, ${t.resolved} resolved, ` +
        (t.winRate === null ? "no resolved outcomes yet" : `${(t.winRate * 100).toFixed(0)}% win rate`),
      ),
    stats.scoreOutcomeCorrelation === null
      ? `Score-vs-pursuit correlation: not enough decided outcomes yet`
      : `Score-vs-pursuit correlation: ${stats.scoreOutcomeCorrelation.toFixed(2)} (Pearson, score vs pursued/declined)`,
  ];
  return lines.join("\n");
}
