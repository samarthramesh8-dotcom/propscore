// Deal Finder run recovery (bug fix — state survives navigation).
//
// The frontend loses all in-memory search state when the user navigates away
// from /find mid-search, because it only relied on the live NDJSON stream as
// its source of truth. Each scored property was already being inserted into
// `properties` immediately as it was found (see scoreAndInsert in
// ../route.ts) — what was missing was a way to look up "everything found by
// this specific search" and whether it's still running. This endpoint reads
// that back by search_run_id. See the migration comment at the top of
// ../route.ts for the required schema (properties.search_run_id, search_runs).
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseCapRate, parseCashFlow, parseListPrice } from "@/lib/analysis";

// If a run has been "running" longer than this with no completion, the
// serverless function that drove it was almost certainly killed by a platform
// timeout before it could mark itself done/error — treat it as stopped rather
// than let the client poll forever. Comfortably above the agent route's
// maxDuration (300s).
const STALE_RUNNING_MS = 6 * 60 * 1000;

// 42703/42P01 = PostgreSQL undefined_column/undefined_table; PGRST204/PGRST205 =
// PostgREST schema cache miss — all mean the run-persistence migration hasn't
// been applied yet.
function isSchemaMissing(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  return err.code === "42703" || err.code === "42P01" ||
    err.code === "PGRST204" || err.code === "PGRST205" ||
    (typeof err.message === "string" && err.message.includes("schema cache"));
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ runId: string }> },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { runId } = await params;

  const { data: run, error: runError } = await supabase
    .from("search_runs")
    .select("*")
    .eq("id", runId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (isSchemaMissing(runError)) {
    return NextResponse.json({ run: null, results: [] });
  }
  if (runError) return NextResponse.json({ error: runError.message }, { status: 500 });
  if (!run) return NextResponse.json({ error: "Search run not found" }, { status: 404 });

  let status: string = run.status;
  if (status === "running" && Date.now() - new Date(run.created_at).getTime() > STALE_RUNNING_MS) {
    status = "error";
    // Best-effort — reflect the stale state so future polls don't recompute it
    await supabase
      .from("search_runs")
      .update({ status: "error", completed_at: new Date().toISOString() })
      .eq("id", runId)
      .eq("user_id", user.id);
  }

  const { data: properties, error: propsError } = await supabase
    .from("properties")
    .select("id, address, overall_score, verdict, subscores, listing_text, created_at")
    .eq("search_run_id", runId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (isSchemaMissing(propsError)) {
    return NextResponse.json({ run: { id: run.id, status, total_found: run.total_found, total_analyzed: run.total_analyzed }, results: [] });
  }
  if (propsError) return NextResponse.json({ error: propsError.message }, { status: 500 });

  const results = (properties ?? []).map((p) => ({
    property_id:       p.id,
    address:           p.address,
    overall_score:      p.overall_score,
    verdict:           p.verdict,
    subscores:         p.subscores,
    list_price:        parseListPrice(p.listing_text ?? ""),
    monthly_cash_flow: parseCashFlow(p.listing_text ?? ""),
    cap_rate:          parseCapRate(p.listing_text ?? ""),
  }));

  return NextResponse.json({
    run: {
      id: run.id,
      status,
      total_found: run.total_found,
      total_analyzed: run.total_analyzed,
    },
    results,
  });
}
