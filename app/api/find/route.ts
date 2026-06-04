import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import {
  RentcastResult,
  dig,
  formatZillapiForClaude,
  formatRentcastForClaude,
  appendFinancials,
} from "@/lib/analysis";

// Vercel: allow up to 5 minutes for batch analyses
export const maxDuration = 300;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Types ────────────────────────────────────────────────────────────────────

interface AnalysisInput {
  listingText: string;
  rentcast: RentcastResult | null;
}

interface FindResult {
  property_id: string;
  address: string;
  overall_score: number;
  verdict: string;
  subscores: unknown[];
  list_price: number | null;
  monthly_cash_flow: number | null;
  cap_rate: string | null;
}

// ─── System prompt (same as /api/analyze — update both when changing) ─────────

const SYSTEM_PROMPT = `You are a senior real estate investment analyst with 20 years of experience managing $40M in rental assets. Your analyses inform real capital deployment decisions. Precision is your professional obligation.

═══ HARD RULES (violating any of these degrades the analysis) ═══
1. EVERY sentence in EVERY summary must contain at least one hard data point: a dollar amount, percentage, year, count, or direct quote from the listing. "The neighborhood is desirable" is a firing offense. "$209/sqft vs the 78759 median of $195 — a 7% premium on 12 DOM" is correct.
2. The PRE-COMPUTED INVESTMENT METRICS section contains pre-calculated numbers. Use those exact figures. Do not re-derive independently — cite them directly (e.g. "the pre-computed cap rate of 4.8%").
3. The verdict MUST open with exactly one of: STRONG BUY · BUY · CONDITIONAL BUY · PASS · STRONG PASS
4. Take a position. Never hedge with "it depends" without immediately specifying what it depends on and the exact number that triggers each outcome.

═══ SCORING SCALE ═══
90–100  Exceptional — rare upside, clear deal, act fast
70–89   Solid — positive cash flow, manageable risk, actionable
50–69   Marginal — pencils out only under specific, stated conditions
30–49   Risky — multiple quantified red flags, caution warranted
0–29    Avoid — value-destroying at current price

═══ MANDATORY CONTENT PER CATEGORY (5–6 sentences each) ═══

1. LOCATION & NEIGHBORHOOD
   Required: school rating score (X/10), distance to primary employment anchor (X miles or "not inferable"), city/zip vacancy rate or rental demand signal, 3-to-5-year appreciation trend for the metro or submarket (X%/yr if available), and any FEMA/natural hazard context. If data is missing, state the gap and penalize accordingly.

2. PRICE & VALUE
   Required: calculated price/sqft ($X/sqft), comparison to known market range or Zestimate ($X delta, X% above/below), DOM interpretation (X days = buyer's leverage / fairly priced / demand signal), price cut history if any (cut $X on [date]), and a precise negotiation assessment (e.g. "offer $X, walk at $X").

3. RENTAL INCOME POTENTIAL
   Required: monthly rent source and amount ($X/mo from Rentcast/Zestimate/estimate), 1% rule result stated explicitly (X% — PASSES/FAILS; need $X/mo to pass), cap rate from pre-computed section (X%), monthly cash flow from pre-computed section (+/−$X/mo), and HOA/MUD impact if applicable. If cash flow is negative, state the break-even rent and year.

4. CONDITION & MAINTENANCE
   Required: year built, estimated annual maintenance budget from pre-computed section ($X/yr = X% of value), specific condition signals from the description (quote or paraphrase actual language), age-based risk timeline (roof, HVAC, plumbing — expected replacement in X years), and any renovation credits with a skepticism flag if cosmetic-only.

5. MARKET TRENDS
   Required: buyer's vs. seller's market declaration with evidence (DOM, inventory), 1–2 specific metro-level data points (population growth, job growth, GDP trend, or major employer context), rental market direction (tightening/softening), and interest rate impact on the buyer pool for this price band.

═══ VERDICT (4–5 sentences) ═══
Sentence 1: "[RECOMMENDATION] — [the single most decisive number]"
Sentence 2: Core investment thesis in one sentence (why this works or doesn't) with the key metric.
Sentence 3: Specific action — offer price if buying, or the condition that must change, or "do not pursue at any price above $X."
Sentence 4: Year 1 expected cash flow from pre-computed section.
Sentence 5: 5-year total return estimate assuming 3% annual appreciation and cited rent growth.

═══ BULL CASE (4–5 sentences) ═══
A specific, realistic upside scenario. Must include: the trigger condition, Year 3 or Year 5 cash flow number, and total equity/return estimate. Format: "If [specific condition occurs], by Year [X] this property generates $X/mo in cash flow. At that point the yield-on-cost reaches X% and total equity including appreciation is approximately $X."

═══ BEAR CASE (4–5 sentences) ═══
A specific, realistic downside scenario. Must include: the failure trigger, a major cost event with dollar amount, and cumulative loss estimate over Years 1–3. Format: "If [specific condition] and [specific cost event of $X] hits in Year [X], the cumulative net loss through Year 3 is approximately $X."

═══ SCORING DISCIPLINE ═══
• Missing price data → Price & Value ≤ 40
• HOA > $400/mo → Rental Income Potential ≤ 45 (auto, cite the HOA drag in $/mo)
• DOM > 60 → Price & Value ≤ 55
• Cap rate < 4% → Rental Income Potential ≤ 35
• Effective cap rate after HOA/MUD < 3% → Rental Income Potential ≤ 25
• Year built < 1970, no renovation mention → Condition ≤ 50
• Negative monthly cash flow > −$500/mo → Overall ≤ 55
• Overall = weighted: Location 25% · Price 25% · Rental 25% · Condition 15% · Market 10%

Return ONLY valid JSON — no markdown fences, no preamble, no trailing text:
{
  "address": "<full address>",
  "overall_score": <integer 0–100>,
  "subscores": [
    { "category": "Location & Neighborhood", "score": <0–100>, "summary": "<5–6 hard-number sentences>" },
    { "category": "Price & Value",            "score": <0–100>, "summary": "<5–6 hard-number sentences>" },
    { "category": "Rental Income Potential",  "score": <0–100>, "summary": "<5–6 sentences with cap rate, cash flow, 1% result>" },
    { "category": "Condition & Maintenance",  "score": <0–100>, "summary": "<4–5 sentences with year, budget, condition flags>" },
    { "category": "Market Trends",            "score": <0–100>, "summary": "<4–5 sentences with specific metro data>" }
  ],
  "verdict": "<RECOMMENDATION — decisive metric — thesis — offer action — Year 1 cash flow — 5-yr return estimate>",
  "bull_case": "<4–5 sentences: specific upside scenario with Year 3-5 numbers>",
  "bear_case": "<4–5 sentences: specific downside with cost event and cumulative loss>"
}`;

// ─── Rentcast (duplicated from analyze route — refactor pending) ───────────────

async function fetchRentcastEstimate(
  address: string,
  city: string,
  state: string,
  zip?: string,
  beds?: number,
  baths?: number,
  sqft?: number,
): Promise<RentcastResult | null> {
  const apiKey = process.env.RENTCAST_API_KEY;
  if (!apiKey || apiKey === "your_rentcast_api_key") return null;

  const params = new URLSearchParams({ address, city, state });
  if (zip)   params.set("zipCode", zip);
  if (beds)  params.set("bedrooms", String(beds));
  if (baths) params.set("bathrooms", String(baths));
  if (sqft)  params.set("squareFootage", String(Math.round(sqft)));

  try {
    const res = await fetch(
      `https://api.rentcast.io/v1/avm/rent/long-term?${params}`,
      { headers: { "X-Api-Key": apiKey, Accept: "application/json" } },
    );
    if (!res.ok) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json: any = await res.json();
    return {
      estimate:      Math.round(json.rent          ?? 0),
      rentRangeLow:  Math.round(json.rentRangeLow  ?? 0),
      rentRangeHigh: Math.round(json.rentRangeHigh ?? 0),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      comparables: ((json.comparables ?? []) as any[]).slice(0, 5).map((c) => ({
        address:       c.formattedAddress ?? c.addressLine1 ?? "",
        rent:          Math.round(c.price ?? c.rent ?? 0),
        bedrooms:      c.bedrooms     ?? 0,
        bathrooms:     c.bathrooms    ?? 0,
        squareFootage: c.squareFootage ?? 0,
        distanceMi:    Math.round((c.distance ?? 0) * 10) / 10,
      })),
    };
  } catch {
    return null;
  }
}

// ─── Fetch single property via Zillapi (duplicated — refactor pending) ────────

async function fetchViaZillapi(zillowUrl: string): Promise<AnalysisInput> {
  const apiKey = process.env.ZILLAPI_KEY;
  if (!apiKey || apiKey === "your_zillapi_key") {
    throw new Error("ZILLAPI_KEY not configured");
  }

  const res = await fetch(
    `https://api.zillapi.com/v1/properties/by-url?${new URLSearchParams({ url: zillowUrl })}`,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
        "User-Agent": "propscore/1.0",
      },
    },
  );

  const json = await res.json();
  if (!res.ok || json.error) {
    throw new Error(json.detail || json.error || `Zillapi error ${res.status}`);
  }

  const d = json?.data ?? json;
  const streetAddress = dig(d, "streetAddress", "street_address", "address") as string | undefined;
  const city          = dig(d, "city")                                         as string | undefined;
  const state         = dig(d, "state")                                        as string | undefined;
  const zip           = dig(d, "zipcode", "zip", "postal_code")                as string | undefined;
  const beds          = dig(d, "bedrooms", "beds", "bedroom_count")            as number | undefined;
  const baths         = dig(d, "bathrooms", "baths", "bathroom_count")         as number | undefined;
  const sqft          = dig(d, "livingArea", "sqft", "squareFootage",
                             "living_area", "finished_sq_ft")                  as number | undefined;

  const rentcastPromise = (streetAddress && city && state)
    ? fetchRentcastEstimate(streetAddress, city, state, zip, beds, baths, sqft)
    : Promise.resolve(null);

  const [rentcast] = await Promise.all([rentcastPromise]);

  const zillapiText = formatZillapiForClaude(json, zillowUrl);
  const listingText = zillapiText + (rentcast ? formatRentcastForClaude(rentcast) : "");

  return { listingText, rentcast };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

    const status: string    = body.status ?? "for_sale";
    const price_max: number | null = typeof body.price_max === "number" && body.price_max > 0
      ? body.price_max : null;
    const beds_min: number  = typeof body.beds_min  === "number" && body.beds_min  > 0 ? body.beds_min  : 0;
    const baths_min: number = typeof body.baths_min === "number" && body.baths_min > 0 ? body.baths_min : 0;
    const max_results: number = Math.min(
      typeof body.max_results === "number" ? body.max_results : 10,
      20,
    );

    // ── Step 3: Search Zillapi listings ──────────────────────────────────────
    const apiKey = process.env.ZILLAPI_KEY;
    if (!apiKey || apiKey === "your_zillapi_key") {
      throw new Error("ZILLAPI_KEY not configured — get a free key at zillapi.com/signup");
    }

    const searchParams = new URLSearchParams({ location, status });
    if (price_max)  searchParams.set("price_max",  String(price_max));
    if (beds_min)   searchParams.set("beds_min",   String(beds_min));
    if (baths_min)  searchParams.set("baths_min",  String(baths_min));
    searchParams.set("max_items", String(max_results));

    const searchRes = await fetch(
      `https://api.zillapi.com/v1/listings?${searchParams}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json",
          "User-Agent": "propscore/1.0",
        },
      },
    );

    const searchJson = await searchRes.json();
    if (!searchRes.ok) {
      throw new Error(
        searchJson.detail || searchJson.error || `Zillapi search error ${searchRes.status}`,
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const listings: any[] = Array.isArray(searchJson)
      ? searchJson
      : (searchJson.results ?? searchJson.data ?? searchJson.listings ?? []);

    if (listings.length === 0) {
      return NextResponse.json({
        results: [],
        total_found: 0,
        total_analyzed: 0,
        errors: 0,
        message: "No listings found matching your criteria. Try broadening your search.",
      });
    }

    const total_found = listings.length;

    // ── Steps 4–7: Analyze each listing concurrently ─────────────────────────
    const analysisPromises = listings.slice(0, max_results).map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async (listing: any): Promise<FindResult> => {
        // Step 4: Extract Zillow URL
        const rawUrl: string = listing.detailUrl ?? listing.hdpUrl ?? listing.detail_url ?? "";
        if (!rawUrl) throw new Error("No Zillow URL in listing");
        const zillowUrl = rawUrl.startsWith("http")
          ? rawUrl
          : `https://www.zillow.com${rawUrl}`;

        // Step 5: Fetch full property data via Zillapi
        const { listingText: rawText, rentcast } = await fetchViaZillapi(zillowUrl);
        const listingText = appendFinancials(rawText, null);

        // Step 6: Claude analysis
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

        // Step 7: Insert into properties table with source='deal_finder'
        const payload = {
          user_id:           user.id,
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

        let ins = await supabase
          .from("properties")
          .insert(payload)
          .select("id")
          .single();

        // 42703 = undefined_column — source column migration not yet applied
        if (ins.error?.code === "42703") {
          const { address, listing_text, overall_score, subscores, verdict, bull_case, bear_case } = payload;
          ins = await supabase
            .from("properties")
            .insert({ user_id: user.id, address, listing_text, overall_score, subscores, verdict, bull_case, bear_case })
            .select("id")
            .single();
        }

        if (ins.error) {
          throw new Error(
            typeof ins.error.message === "string" ? ins.error.message : JSON.stringify(ins.error),
          );
        }
        if (!ins.data) throw new Error("Insert returned no data");

        return {
          property_id:      ins.data.id,
          address:          analysis.address as string,
          overall_score:    analysis.overall_score as number,
          verdict:          analysis.verdict as string,
          subscores:        analysis.subscores as unknown[],
          list_price:       parseListPrice(listingText),
          monthly_cash_flow: parseCashFlow(listingText),
          cap_rate:         parseCapRate(listingText),
        };
      },
    );

    const settled = await Promise.allSettled(analysisPromises);

    const results: FindResult[] = settled
      .filter((r): r is PromiseFulfilledResult<FindResult> => r.status === "fulfilled")
      .map((r) => r.value)
      .sort((a, b) => b.overall_score - a.overall_score);

    const errors = settled.filter((r) => r.status === "rejected").length;

    return NextResponse.json({
      results,
      total_found,
      total_analyzed: results.length,
      errors,
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
