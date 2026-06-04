import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import {
  RentcastComp,
  RentcastResult,
  dig,
  formatZillapiForClaude,
  formatRentcastForClaude,
  formatMudForClaude,
  appendFinancials,
} from "@/lib/analysis";

// ─── Types ────────────────────────────────────────────────────────────────────

// Re-export so existing consumers of this module keep working
export type { RentcastComp };

interface AnalysisInput {
  listingText: string;
  rentcast: RentcastResult | null;
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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

// ─── Rentcast ─────────────────────────────────────────────────────────────────

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
      {
        headers: {
          "X-Api-Key": apiKey,
          Accept: "application/json",
        },
      }
    );
    if (!res.ok) return null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json: any = await res.json();

    return {
      estimate:      Math.round(json.rent         ?? 0),
      rentRangeLow:  Math.round(json.rentRangeLow ?? 0),
      rentRangeHigh: Math.round(json.rentRangeHigh ?? 0),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      comparables: ((json.comparables ?? []) as any[]).slice(0, 5).map((c) => ({
        address:       c.formattedAddress ?? c.addressLine1 ?? "",
        rent:          Math.round(c.price ?? c.rent ?? 0),
        bedrooms:      c.bedrooms    ?? 0,
        bathrooms:     c.bathrooms   ?? 0,
        squareFootage: c.squareFootage ?? 0,
        distanceMi:    Math.round((c.distance ?? 0) * 10) / 10,
      })),
    };
  } catch {
    return null; // network error — analysis continues without Rentcast
  }
}

// ─── Zillow via Zillapi ───────────────────────────────────────────────────────

// Zillapi — wraps Zillow's data. 1 credit per call. 100 free credits at zillapi.com/signup.
async function fetchViaZillapi(zillowUrl: string): Promise<AnalysisInput> {
  const apiKey = process.env.ZILLAPI_KEY;
  if (!apiKey || apiKey === "your_zillapi_key") {
    throw new Error("ZILLAPI_KEY not configured — get a free key at zillapi.com/signup");
  }

  const res = await fetch(
    `https://api.zillapi.com/v1/properties/by-url?${new URLSearchParams({ url: zillowUrl })}`,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
        "User-Agent": "propscore/1.0",
      },
    }
  );

  const json = await res.json();

  if (!res.ok || json.error) {
    const errMsg =
      typeof json.detail  === "string" ? json.detail  :
      typeof json.error   === "string" ? json.error   :
      typeof json.message === "string" ? json.message :
      json.error ? JSON.stringify(json.error) : `Zillapi error ${res.status}`;
    throw new Error(errMsg);
  }

  // Extract address components to pass to Rentcast
  const d = json?.data ?? json;
  const streetAddress = dig(d, "streetAddress", "street_address", "address") as string | undefined;
  const city          = dig(d, "city")                                         as string | undefined;
  const state         = dig(d, "state")                                        as string | undefined;
  const zip           = dig(d, "zipcode", "zip", "postal_code")                as string | undefined;
  const beds          = dig(d, "bedrooms", "beds", "bedroom_count")            as number | undefined;
  const baths         = dig(d, "bathrooms", "baths", "bathroom_count")         as number | undefined;
  const sqft          = dig(d, "livingArea", "sqft", "squareFootage",
                             "living_area", "finished_sq_ft")                  as number | undefined;

  // Fire Rentcast lookup concurrently with formatting
  const rentcastPromise = (streetAddress && city && state)
    ? fetchRentcastEstimate(streetAddress, city, state, zip, beds, baths, sqft)
    : Promise.resolve(null);

  const [rentcast] = await Promise.all([rentcastPromise]);

  const zillapiText = formatZillapiForClaude(json, zillowUrl);
  const listingText = zillapiText + (rentcast ? formatRentcastForClaude(rentcast) : "");

  return { listingText, rentcast };
}

async function fetchListingFromUrl(url: string): Promise<AnalysisInput> {
  // Any zillow.com URL → Zillapi (handles homedetails, search results, etc.)
  if (/zillow\.com/.test(url)) {
    return fetchViaZillapi(url);
  }

  // Non-Zillow URL — try Jina as best-effort (no Rentcast without structured address)
  const res = await fetch(`https://r.jina.ai/${url}`, {
    headers: { Accept: "text/plain", "X-Return-Format": "markdown" },
  });
  if (!res.ok) {
    throw new Error(`Could not fetch URL (${res.status}). Try pasting the listing text directly.`);
  }
  const text = await res.text();
  if (text.trim().length < 150) {
    throw new Error("Not enough content at that URL. Try pasting the listing text directly.");
  }
  return { listingText: `Source URL: ${url}\n\n${text.slice(0, 15000)}`, rentcast: null };
}

function parseClaudeJson(raw: string): Record<string, unknown> {
  // Try direct parse
  try {
    return JSON.parse(raw);
  } catch { /* fall through */ }

  // Claude sometimes wraps JSON in markdown fences or adds preamble — extract the object
  const match = raw.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      return JSON.parse(match[0]);
    } catch { /* fall through */ }
  }

  throw new Error("Claude returned an unexpected response. Please try again.");
}

const URL_RE = /^https?:\/\/\S+$/;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit: max 10 new analyses per hour per user
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentCount } = await supabase
      .from("properties")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", oneHourAgo);

    if ((recentCount ?? 0) >= 10) {
      return NextResponse.json(
        { error: "Rate limit: max 10 analyses per hour" },
        { status: 429 }
      );
    }

    const body = await request.json();
    const rawInput: string = body.listing_text;
    const mudRate: number | null =
      typeof body.mud_rate === "number" && body.mud_rate > 0 ? body.mud_rate : null;
    const reanalyzeId: string | null =
      typeof body.reanalyze_id === "string" && body.reanalyze_id.trim().length > 0
        ? body.reanalyze_id.trim()
        : null;

    if (!rawInput?.trim()) {
      return NextResponse.json({ error: "listing_text is required" }, { status: 400 });
    }

    // If the user pasted a URL, fetch the listing data (+ Rentcast) from it.
    // Otherwise treat the raw text as the listing and skip Rentcast.
    const { listingText: zillapiText, rentcast } = URL_RE.test(rawInput.trim())
      ? await fetchListingFromUrl(rawInput.trim())
      : { listingText: rawInput, rentcast: null };

    // Append MUD tax context when the user provided a rate, then pre-compute
    // all investment metrics so Claude has verified numbers to cite directly.
    const withMud         = mudRate ? zillapiText + formatMudForClaude(mudRate) : zillapiText;
    const listingText     = appendFinancials(withMud, mudRate);

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 3500,
      temperature: 0.2,  // analytical precision over creativity
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: listingText }],
    });

    const content = message.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type from Claude");
    }

    const analysis = parseClaudeJson(content.text);

    // Columns shared by both insert and update paths
    const analysisPayload = {
      address:           analysis.address,
      listing_text:      listingText,
      overall_score:     analysis.overall_score,
      subscores:         analysis.subscores,
      verdict:           analysis.verdict,
      bull_case:         analysis.bull_case,
      bear_case:         analysis.bear_case,
      rentcast_estimate: rentcast?.estimate ?? null,
      rentcast_comps:    rentcast?.comparables ?? null,
      mud_rate:          mudRate,
    };

    let data: { id: string } | null = null;
    let error: { code?: string; message?: string } | null = null;

    if (reanalyzeId) {
      // ── Re-analyze: update the existing row in-place ─────────────────────
      // The updated_at trigger fires automatically on every UPDATE.
      const up = await supabase
        .from("properties")
        .update(analysisPayload)
        .eq("id", reanalyzeId)
        .eq("user_id", user.id)   // ensures ownership
        .select("id")
        .single();
      data  = up.data;
      error = up.error;

      if (error?.code === "42703") {
        const { address, listing_text, overall_score, subscores, verdict, bull_case, bear_case } = analysisPayload;
        const fallback = await supabase
          .from("properties")
          .update({ address, listing_text, overall_score, subscores, verdict, bull_case, bear_case })
          .eq("id", reanalyzeId)
          .eq("user_id", user.id)
          .select("id")
          .single();
        data  = fallback.data;
        error = fallback.error;
      }

      if (!error && !data) {
        // Row not found or user doesn't own it
        throw new Error("Property not found or access denied");
      }
    } else {
      // ── New analysis: insert a fresh row ──────────────────────────────────
      const baseInsert = { user_id: user.id, ...analysisPayload };

      const ins = await supabase
        .from("properties")
        .insert(baseInsert)
        .select("id")
        .single();
      data  = ins.data;
      error = ins.error;

      // PostgreSQL error code 42703 = "undefined_column" — migration not yet run.
      if (error?.code === "42703") {
        console.warn(
          "/api/analyze: new columns missing — run the DB migration. " +
          "Falling back to base insert without rentcast/mud fields."
        );
        const { address, listing_text, overall_score, subscores, verdict, bull_case, bear_case } = analysisPayload;
        const fallback = await supabase
          .from("properties")
          .insert({ user_id: user.id, address, listing_text, overall_score, subscores, verdict, bull_case, bear_case })
          .select("id")
          .single();
        data  = fallback.data;
        error = fallback.error;
      }
    }

    if (error) {
      // Supabase errors are plain objects — extract the message before throwing
      throw new Error(
        typeof error.message === "string"
          ? error.message
          : JSON.stringify(error)
      );
    }

    return NextResponse.json({
      property_id: data!.id,
      ...analysis,
    });
  } catch (err) {
    // Supabase, fetch, and other non-Error throws land here as plain objects.
    // Normalise to a string before returning to the client.
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
    console.error("/api/analyze error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
