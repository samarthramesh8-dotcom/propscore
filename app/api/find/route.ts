// Deal Finder — autonomous agent (Phase 2).
//
// A claude-fable-5 orchestrator decides which listings deserve a full analysis:
// it searches Zillapi, triages on partial data, cross-checks rents, and calls
// score_property on its chosen candidates. The per-property scoring itself is
// unchanged — appendFinancials + SYSTEM_PROMPT on claude-sonnet-4-6 — so
// verdicts stay deterministic and comparable with /api/analyze.
//
// Streams NDJSON to the client:
//   {type:"agent_step", message}                        — live agent narration / tool trace
//   {type:"progress",  current, total, address}         — a property entered scoring
//   {type:"result",    property_id, ...}                — scored + saved property
//   {type:"error",     address, message}                — per-property failure
//   {type:"done",      total_found, total_analyzed, errors}
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import {
  appendFinancials,
  fetchRentcastEstimate,
  fetchViaZillapi,
  formatRentcastForClaude,
  geocodeLocation,
  RentcastResult,
  SYSTEM_PROMPT,
} from "@/lib/analysis";
import { formatOutcomeStatsForClaude, getOutcomeStats } from "@/lib/outcomeStats";

// Vercel: allow up to 5 minutes for agent runs
export const maxDuration = 300;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Cost bounds for one Deal Finder run
const MAX_TOOL_CALLS = 40;
const MAX_ITERATIONS = 30;
const TIME_BUDGET_MS = 250_000; // leave headroom under maxDuration for the final summary

// ─── Helpers (unchanged from the sequential implementation) ───────────────────

function parseClaudeJson(raw: string): Record<string, unknown> {
  try { return JSON.parse(raw); } catch { /* fall through */ }
  const match = raw.match(/\{[\s\S]*\}/);
  if (match) {
    try { return JSON.parse(match[0]); } catch { /* fall through */ }
  }
  throw new Error("Claude returned an unexpected response. Please try again.");
}

function parseListPrice(text: string): number | null {
  const m = text.match(/List price:\s*\$?([\d,]+)/i);
  return m ? parseInt(m[1].replace(/,/g, ""), 10) : null;
}

function parseCashFlow(text: string): number | null {
  const lineM = text.match(/Monthly cash flow:[^\n]*/i);
  if (!lineM) return null;
  const line = lineM[0];
  const numM = line.match(/\$?([\d,]+)/);
  if (!numM) return null;
  const abs = parseInt(numM[1].replace(/,/g, ""), 10);
  return line.includes("NEGATIVE") ? -abs : abs;
}

function parseCapRate(text: string): string | null {
  const m = text.match(/Cap rate:\s*([\d.]+)%/i);
  return m ? m[1] : null;
}

// ─── Zillapi search ───────────────────────────────────────────────────────────

interface SearchFilters {
  price_max: number | null;
  beds_min: number;
  baths_min: number;
  max_items: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function zillapiSearch(bbox: string, status: string, f: SearchFilters): Promise<any[]> {
  const searchParams = new URLSearchParams({ bbox, status });
  if (f.price_max)  searchParams.set("price_max",  String(f.price_max));
  if (f.beds_min)   searchParams.set("beds_min",   String(f.beds_min));
  if (f.baths_min)  searchParams.set("baths_min",  String(f.baths_min));
  searchParams.set("max_items", String(f.max_items));

  const res = await fetch(`https://api.zillapi.com/v1/listings?${searchParams}`, {
    headers: {
      Authorization: `Bearer ${process.env.ZILLAPI_KEY}`,
      Accept: "application/json",
      "User-Agent": "propscore/1.0",
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const json: any = await res.json().catch(() => null);
  if (!res.ok) {
    const errMsg =
      typeof json?.detail  === "string" ? json.detail  :
      typeof json?.error   === "string" ? json.error   :
      typeof json?.message === "string" ? json.message :
      json ? JSON.stringify(json) : `Zillapi search error ${res.status}`;
    throw new Error(`Zillapi search error ${res.status}: ${errMsg}`);
  }

  return Array.isArray(json) ? json : (json.results ?? json.data ?? json.listings ?? []);
}

// ─── Listing registry ─────────────────────────────────────────────────────────
// The agent references listings by short id (L1, L2, …) instead of echoing URLs.
// Full listing fetches are cached so score_property never re-spends the credit.

interface ListingEntry {
  id: string;
  url: string;
  address: string;
  price: number | null;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  dom: number | null;
  full?: { listingText: string; rentcast: RentcastResult | null };
  scored: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function listingSummary(listing: any): Omit<ListingEntry, "id" | "url" | "scored"> {
  const rawUrl: string = listing.detailUrl ?? listing.hdpUrl ?? listing.detail_url ?? "";
  const addressFromUrl = rawUrl.includes("/homedetails/")
    ? decodeURIComponent(
        rawUrl.split("/homedetails/")[1]?.split("/")[0]?.replace(/-/g, " ") ?? "",
      ).trim()
    : "";
  return {
    address: (listing.address ?? listing.streetAddress ?? listing.fullAddress ?? addressFromUrl) || "Unknown address",
    price:  listing.price ?? listing.unformattedPrice ?? listing.listPrice ?? null,
    beds:   listing.bedrooms ?? listing.beds ?? null,
    baths:  listing.bathrooms ?? listing.baths ?? null,
    sqft:   listing.livingArea ?? listing.area ?? listing.sqft ?? null,
    dom:    listing.daysOnZillow ?? listing.daysOnMarket ?? null,
  };
}

function entryLine(e: ListingEntry): string {
  const fmt = (v: number | null, prefix = "", suffix = "") => (v == null ? "?" : `${prefix}${v.toLocaleString()}${suffix}`);
  return `${e.id} | ${e.address} | ${fmt(e.price, "$")} | ${fmt(e.beds)}bd/${fmt(e.baths)}ba | ${fmt(e.sqft)} sqft | ${fmt(e.dom)} DOM${e.scored ? " | ALREADY SCORED" : ""}`;
}

// ─── Agent tool definitions ───────────────────────────────────────────────────

const AGENT_TOOLS: Anthropic.Beta.BetaToolUnion[] = [
  {
    name: "search_listings",
    description:
      "Search for-sale listings around the user's location. Call this first (after get_past_outcomes). " +
      "Widen radius_miles when results are thin; results are deduplicated across calls, so repeat searches " +
      "only surface new listings. The user's price/bed/bath constraints are enforced server-side and cannot be relaxed.",
    input_schema: {
      type: "object",
      properties: {
        radius_miles: {
          type: "number",
          description: "Search radius in miles from the user's location (5–40, default 20)",
        },
        price_max: {
          type: "number",
          description: "Optional price ceiling for this search. Tightening below the user's cap is allowed; raising above it is ignored.",
        },
        max_items: {
          type: "number",
          description: "Max listings to return (default 20, max 40)",
        },
      },
      required: [],
    },
  },
  {
    name: "get_full_listing",
    description:
      "Fetch the full property sheet for one listing (facts, valuation, HOA, price history, schools, rent estimates). " +
      "Costs one data credit — use it on candidates that survive your price/type triage, not on everything.",
    input_schema: {
      type: "object",
      properties: {
        listing_id: { type: "string", description: "A listing id from search_listings, e.g. \"L3\"" },
      },
      required: ["listing_id"],
    },
  },
  {
    name: "get_rentcast_estimate",
    description:
      "Get an independent Rentcast rent estimate (with comparables) for an address — useful to cross-check " +
      "a rent number before deciding whether a borderline listing deserves a full analysis.",
    input_schema: {
      type: "object",
      properties: {
        address: { type: "string", description: "Street address, e.g. \"4224 Oak St\"" },
        city:    { type: "string" },
        state:   { type: "string", description: "Two-letter state code" },
        zip:     { type: "string" },
        beds:    { type: "number" },
        baths:   { type: "number" },
        sqft:    { type: "number" },
      },
      required: ["address", "city", "state"],
    },
  },
  {
    name: "get_past_outcomes",
    description:
      "The user's real track record with past PropScore verdicts: win rate by verdict tier and how their " +
      "pursue/pass decisions correlate with scores. Call once at the start and weigh it in triage.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "score_property",
    description:
      "Run the full PropScore investment analysis on a listing and save it to the user's portfolio. " +
      "This is the expensive step — spend it only on listings you believe can cash-flow. " +
      "Batch multiple score_property calls in ONE turn to run them in parallel. " +
      "Returns the overall score, verdict, cap rate and monthly cash flow.",
    input_schema: {
      type: "object",
      properties: {
        listing_id: { type: "string", description: "A listing id from search_listings, e.g. \"L3\"" },
      },
      required: ["listing_id"],
    },
  },
];

// ─── Agent system prompt ──────────────────────────────────────────────────────
// Distinct from the scoring SYSTEM_PROMPT in lib/analysis.ts, which is unchanged
// and still governs the per-property verdict JSON.

function buildAgentSystemPrompt(maxResults: number): string {
  return `You are the Deal Finder orchestrator for PropScore, a real-estate investment analysis tool. Your job is triage and orchestration, not scoring — a separate deterministic analyst scores properties when you call score_property.

GOAL
Find the best cash-flowing deals near the user's location under their constraints, and spend full analyses only on listings that deserve them.

HOW TO WORK
1. Call get_past_outcomes first — if the user's track record shows certain verdict tiers or score bands never convert, weigh that in triage.
2. Search with search_listings. If results are thin (fewer than ~5 viable candidates), widen the radius and say why. If results are abundant, triage harder instead of scoring more. The user's price/bed/bath constraints are hard limits enforced server-side — the radius is your lever.
3. Skip early on partial data: a listing whose price alone already fails the ceiling, or that is obviously wrong-type (vacant lot, missing beds/price), never gets a full analysis. Say what you skipped and why, briefly.
4. For borderline candidates, pull get_full_listing or cross-check rent with get_rentcast_estimate before deciding to score. Rough cash-flow screen: at 25% down / 7% / 30yr, a property needs roughly 0.7–0.8% of price in monthly rent to break even — below that, it must be cheap relative to comps to be worth scoring.
5. Call score_property on your chosen candidates, up to ${maxResults}. Batch independent score_property calls in a single turn so they run in parallel. React to results — if the first scores confirm the area doesn't pencil, change strategy rather than burning the remaining budget on lookalikes.
6. Narrate as you go: one short plain-English sentence before each meaningful decision ("Only 3 listings under $400k — widening to 30 miles"). These stream live to the user; keep them tight.

HARD LIMITS
- ${maxResults} scored properties max.
- ${MAX_TOOL_CALLS} tool calls total; each tool result tells you how many you have used.
- When you are done (scored the best candidates or exhausted reasonable options), STOP calling tools and finish with a 2–3 sentence plain-text summary: what you found, what you skipped, and the single best candidate.`;
}

function describeToolCall(name: string, input: Record<string, unknown>, registry: Map<string, ListingEntry>): string {
  switch (name) {
    case "search_listings": {
      const r = input.radius_miles ? `${input.radius_miles}mi radius` : "default radius";
      const p = input.price_max ? `, under $${Number(input.price_max).toLocaleString()}` : "";
      return `Searching listings (${r}${p})…`;
    }
    case "get_full_listing": {
      const e = registry.get(String(input.listing_id));
      return `Pulling full details for ${e?.address ?? input.listing_id}…`;
    }
    case "get_rentcast_estimate":
      return `Cross-checking rent estimate for ${input.address ?? "address"}…`;
    case "get_past_outcomes":
      return "Reviewing your past deal outcomes…";
    case "score_property": {
      const e = registry.get(String(input.listing_id));
      return `Running full analysis on ${e?.address ?? input.listing_id}…`;
    }
    default:
      return `Running ${name}…`;
  }
}

// After a mid-output server-side fallback, thinking and tool_use blocks that
// precede the final fallback boundary must be omitted when echoing the turn back.
function sanitizeForReplay(content: Anthropic.Beta.BetaContentBlock[]): Anthropic.Beta.BetaContentBlockParam[] {
  const types = content.map((b) => b.type as string);
  const lastFallback = types.lastIndexOf("fallback");
  const filtered = lastFallback === -1
    ? content
    : content.filter((b, i) =>
        i > lastFallback || !["thinking", "redacted_thinking", "tool_use"].includes(b.type as string));
  return filtered as unknown as Anthropic.Beta.BetaContentBlockParam[];
}

// ─── POST /api/find ───────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Rate limit: max 3 find batches per hour (each batch inserts up to 20 rows)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentCount } = await supabase
      .from("properties")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("source", "deal_finder")
      .gte("created_at", oneHourAgo);

    if ((recentCount ?? 0) >= 60) {
      return NextResponse.json(
        { error: "Rate limit: max 3 find batches per hour" },
        { status: 429 },
      );
    }

    const body = await request.json();
    const location: string = (body.location ?? "").trim();
    if (!location) {
      return NextResponse.json({ error: "location is required" }, { status: 400 });
    }

    const status: string = body.status ?? "for_sale";
    const price_max: number | null = typeof body.price_max === "number" && body.price_max > 0
      ? body.price_max : null;
    const beds_min: number  = typeof body.beds_min  === "number" && body.beds_min  > 0 ? body.beds_min  : 0;
    const baths_min: number = typeof body.baths_min === "number" && body.baths_min > 0 ? body.baths_min : 0;
    const max_results: number = Math.min(
      typeof body.max_results === "number" ? body.max_results : 10,
      20,
    );

    const apiKey = process.env.ZILLAPI_KEY;
    if (!apiKey || apiKey === "your_zillapi_key") {
      throw new Error("ZILLAPI_KEY not configured — get a free key at zillapi.com/signup");
    }

    const geocoded = await geocodeLocation(location);
    if (!geocoded) {
      return NextResponse.json(
        { error: `Could not geocode "${location}". Try being more specific, e.g. "Austin, TX" or "78759".` },
        { status: 400 },
      );
    }
    const coords = geocoded; // non-null binding usable inside the tool closures

    // ── Stream NDJSON ─────────────────────────────────────────────────────────
    const encoder = new TextEncoder();
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const writeEvent = async (obj: unknown) => {
      await writer.write(encoder.encode(JSON.stringify(obj) + "\n"));
    };

    // ── Agent state ───────────────────────────────────────────────────────────
    const registry = new Map<string, ListingEntry>();   // listing_id → entry
    const urlIndex = new Map<string, string>();          // url → listing_id
    let nextListingId = 1;
    let toolCallsUsed = 0;
    let scoredReserved = 0;  // slots claimed (incl. in-flight) to enforce max_results under parallel calls
    let total_analyzed = 0;
    let errors = 0;
    const startedAt = Date.now();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function registerListings(rawListings: any[]): ListingEntry[] {
      const entries: ListingEntry[] = [];
      for (const raw of rawListings) {
        const rawUrl: string = raw.detailUrl ?? raw.hdpUrl ?? raw.detail_url ?? "";
        if (!rawUrl) continue;
        const url = rawUrl.startsWith("http") ? rawUrl : `https://www.zillow.com${rawUrl}`;
        const existingId = urlIndex.get(url);
        if (existingId) {
          entries.push(registry.get(existingId)!);
          continue;
        }
        const id = `L${nextListingId++}`;
        const entry: ListingEntry = { id, url, scored: false, ...listingSummary(raw) };
        registry.set(id, entry);
        urlIndex.set(url, id);
        entries.push(entry);
      }
      return entries;
    }

    async function ensureFullListing(entry: ListingEntry): Promise<NonNullable<ListingEntry["full"]>> {
      if (!entry.full) {
        const { listingText, rentcast } = await fetchViaZillapi(entry.url);
        entry.full = { listingText, rentcast };
      }
      return entry.full;
    }

    // Scores a listing with the existing deterministic pipeline and streams the result
    async function scoreAndInsert(entry: ListingEntry): Promise<string> {
      await writeEvent({
        type: "progress",
        current: Math.min(scoredReserved, max_results),
        total: max_results,
        address: entry.address,
      });

      const { listingText: rawText, rentcast } = await ensureFullListing(entry);
      const listingText = appendFinancials(rawText, null);

      // Per-listing scoring stays on Sonnet — deterministic, cheap, unchanged prompt
      const message = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 3500,
        temperature: 0.2,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: listingText }],
      });

      const content = message.content[0];
      if (content.type !== "text") throw new Error("Unexpected Claude response type");
      const analysis = parseClaudeJson(content.text);

      const payload = {
        user_id:           user!.id,
        address:           analysis.address,
        listing_text:      listingText,
        overall_score:     analysis.overall_score,
        subscores:         analysis.subscores,
        verdict:           analysis.verdict,
        bull_case:         analysis.bull_case,
        bear_case:         analysis.bear_case,
        rentcast_estimate: rentcast?.estimate ?? null,
        rentcast_comps:    rentcast?.comparables ?? null,
        mud_rate:          null,
        source:            "deal_finder",
      };

      let ins = await supabase.from("properties").insert(payload).select("id").single();

      // 42703 = undefined_column — source column migration not yet applied
      if (ins.error?.code === "42703") {
        const { address, listing_text, overall_score, subscores, verdict, bull_case, bear_case } = payload;
        ins = await supabase
          .from("properties")
          .insert({ user_id: user!.id, address, listing_text, overall_score, subscores, verdict, bull_case, bear_case })
          .select("id")
          .single();
      }

      if (ins.error) {
        throw new Error(typeof ins.error.message === "string" ? ins.error.message : JSON.stringify(ins.error));
      }
      if (!ins.data) throw new Error("Insert returned no data");

      entry.scored = true;
      total_analyzed++;
      await writeEvent({
        type:              "result",
        property_id:       ins.data.id,
        address:           analysis.address as string,
        overall_score:     analysis.overall_score as number,
        verdict:           analysis.verdict as string,
        subscores:         analysis.subscores as unknown[],
        list_price:        parseListPrice(listingText),
        monthly_cash_flow: parseCashFlow(listingText),
        cap_rate:          parseCapRate(listingText),
      });

      const verdictHead = String(analysis.verdict ?? "").split(/[.\n]/)[0].slice(0, 140);
      return [
        `Scored ${entry.address}:`,
        `  overall_score: ${analysis.overall_score}`,
        `  verdict: ${verdictHead}`,
        `  cap_rate: ${parseCapRate(listingText) ?? "?"}%`,
        `  monthly_cash_flow: ${parseCashFlow(listingText) ?? "?"}`,
      ].join("\n");
    }

    // ── Tool dispatch ─────────────────────────────────────────────────────────
    async function runTool(name: string, input: Record<string, unknown>): Promise<{ text: string; isError: boolean }> {
      try {
        switch (name) {
          case "search_listings": {
            const radius = Math.min(Math.max(Number(input.radius_miles) || 20, 5), 40);
            const deg = radius / 69; // ≈ degrees latitude per mile
            const bbox = `${coords.lon - deg},${coords.lat - deg},${coords.lon + deg},${coords.lat + deg}`;
            // User constraints are hard: the agent may only tighten the price cap
            const agentPriceMax = typeof input.price_max === "number" && input.price_max > 0 ? input.price_max : null;
            const effectivePriceMax = price_max
              ? (agentPriceMax ? Math.min(agentPriceMax, price_max) : price_max)
              : agentPriceMax;
            const rawListings = await zillapiSearch(bbox, status, {
              price_max: effectivePriceMax,
              beds_min,
              baths_min,
              max_items: Math.min(Math.max(Number(input.max_items) || 20, 1), 40),
            });
            const entries = registerListings(rawListings);
            if (entries.length === 0) {
              return { text: "No listings found for these parameters. Consider widening the radius.", isError: false };
            }
            return {
              text: `${entries.length} listings (id | address | price | beds/baths | sqft | days on market):\n` +
                entries.map(entryLine).join("\n"),
              isError: false,
            };
          }

          case "get_full_listing": {
            const entry = registry.get(String(input.listing_id));
            if (!entry) return { text: `Unknown listing_id "${input.listing_id}" — use an id from search_listings.`, isError: true };
            const full = await ensureFullListing(entry);
            return { text: full.listingText, isError: false };
          }

          case "get_rentcast_estimate": {
            const rc = await fetchRentcastEstimate(
              String(input.address ?? ""),
              String(input.city ?? ""),
              String(input.state ?? ""),
              input.zip ? String(input.zip) : undefined,
              input.beds ? Number(input.beds) : undefined,
              input.baths ? Number(input.baths) : undefined,
              input.sqft ? Number(input.sqft) : undefined,
            );
            if (!rc || !rc.estimate) {
              return { text: "No Rentcast estimate available for this address.", isError: false };
            }
            return { text: formatRentcastForClaude(rc).trim(), isError: false };
          }

          case "get_past_outcomes": {
            const stats = await getOutcomeStats(supabase, user!.id);
            return { text: formatOutcomeStatsForClaude(stats), isError: false };
          }

          case "score_property": {
            const entry = registry.get(String(input.listing_id));
            if (!entry) return { text: `Unknown listing_id "${input.listing_id}" — use an id from search_listings.`, isError: true };
            if (entry.scored) return { text: `${entry.address} was already scored in this run.`, isError: true };
            if (scoredReserved >= max_results) {
              return { text: `Scoring budget exhausted (${max_results} max). Stop calling tools and summarize.`, isError: true };
            }
            scoredReserved++;
            try {
              return { text: await scoreAndInsert(entry), isError: false };
            } catch (err) {
              scoredReserved--;
              errors++;
              const msg = err instanceof Error ? err.message : String(err);
              await writeEvent({ type: "error", address: entry.address, message: msg });
              return { text: `Scoring failed for ${entry.address}: ${msg}`, isError: true };
            }
          }

          default:
            return { text: `Unknown tool: ${name}`, isError: true };
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { text: `${name} failed: ${msg}`, isError: true };
      }
    }

    // ── Agent loop (runs in the background while the stream is returned) ──────
    (async () => {
      try {
        const kickoff = [
          `Find the best cash-flowing deals for this search:`,
          `- Location: ${location} (geocoded to ${coords.lat.toFixed(4)}, ${coords.lon.toFixed(4)} — search_listings searches around this point)`,
          `- Listing status: ${status}`,
          `- Max price: ${price_max ? `$${price_max.toLocaleString()}` : "no ceiling"} (hard limit)`,
          `- Min beds: ${beds_min || "any"} · Min baths: ${baths_min || "any"} (hard limits)`,
          `- Score up to ${max_results} properties.`,
          `Begin.`,
        ].join("\n");

        const messages: Anthropic.Beta.BetaMessageParam[] = [
          { role: "user", content: kickoff },
        ];

        let finished = false;

        for (let iter = 0; iter < MAX_ITERATIONS && !finished; iter++) {
          // claude-fable-5 is a Covered Model: 30-day data retention required, no
          // zero-data-retention option. Keep this in mind for any data-handling
          // claims made to users about Deal Finder searches.
          const stream = anthropic.beta.messages.stream({
            model: "claude-fable-5",
            max_tokens: 16000,
            output_config: { effort: "medium" },
            // Opt-in refusal fallback: a spurious safety decline re-runs the
            // request on Opus 4.8 inside the same call instead of failing the run.
            betas: ["server-side-fallback-2026-06-01"],
            fallbacks: [{ model: "claude-opus-4-8" }],
            system: [{
              type: "text",
              text: buildAgentSystemPrompt(max_results),
              cache_control: { type: "ephemeral" },
            }],
            tools: AGENT_TOOLS,
            messages,
          });
          const response = await stream.finalMessage();

          // Narrate the agent's text blocks to the client
          for (const block of response.content) {
            if (block.type === "text" && block.text.trim()) {
              await writeEvent({ type: "agent_step", message: block.text.trim() });
            }
          }

          if (response.stop_reason === "refusal") {
            await writeEvent({
              type: "agent_step",
              message: "The search was declined by a safety check — stopping this run.",
            });
            break;
          }

          if (response.stop_reason === "pause_turn") {
            messages.push({ role: "assistant", content: sanitizeForReplay(response.content) });
            continue;
          }

          const toolUses = response.content.filter(
            (b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use",
          );
          if (toolUses.length === 0 || response.stop_reason === "end_turn") {
            finished = true;
            break;
          }

          messages.push({ role: "assistant", content: sanitizeForReplay(response.content) });

          const overTime = Date.now() - startedAt > TIME_BUDGET_MS;

          // Execute all tool calls of this turn in parallel; results go back in ONE user message
          const results = await Promise.all(toolUses.map(async (tu) => {
            const input = (tu.input ?? {}) as Record<string, unknown>;
            let text: string;
            let isError: boolean;
            if (toolCallsUsed >= MAX_TOOL_CALLS || overTime) {
              text = overTime
                ? "TIME BUDGET EXHAUSTED — stop calling tools and give your final summary now."
                : "TOOL BUDGET EXHAUSTED — stop calling tools and give your final summary now.";
              isError = true;
            } else {
              toolCallsUsed++;
              await writeEvent({ type: "agent_step", message: describeToolCall(tu.name, input, registry) });
              ({ text, isError } = await runTool(tu.name, input));
              text += `\n\n[Tool calls used: ${toolCallsUsed}/${MAX_TOOL_CALLS}]`;
            }
            return {
              type: "tool_result" as const,
              tool_use_id: tu.id,
              content: text,
              is_error: isError,
            };
          }));

          messages.push({ role: "user", content: results });
        }

        await writeEvent({
          type: "done",
          total_found: registry.size,
          total_analyzed,
          errors,
          ...(registry.size === 0
            ? { message: "No listings found matching your criteria. Try broadening your search." }
            : {}),
        });
      } catch (err) {
        console.error("/api/find agent loop error:", err);
        const msg = err instanceof Error ? err.message : String(err);
        await writeEvent({ type: "agent_step", message: `Deal Finder stopped: ${msg}` }).catch(() => undefined);
        await writeEvent({
          type: "done",
          total_found: registry.size,
          total_analyzed,
          errors: errors + 1,
        }).catch(() => undefined);
      } finally {
        await writer.close().catch(() => undefined);
      }
    })();

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-cache",
      },
    });

  } catch (err) {
    let message: string;
    if (err instanceof Error) {
      message = err.message;
    } else if (typeof err === "object" && err !== null) {
      const obj = err as Record<string, unknown>;
      message =
        typeof obj.message === "string" ? obj.message :
        typeof obj.detail  === "string" ? obj.detail  :
        JSON.stringify(obj);
    } else {
      message = String(err);
    }
    console.error("/api/find error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
