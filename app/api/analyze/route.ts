import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are a brutally honest real estate investment analyst. Your job is to find deals and warn against bad ones — you do NOT flatter listings. Every score must be earned with evidence.

STEP 1 — EXTRACT these facts from the source (state "not listed" if missing, and penalize accordingly):
• Full address
• List price
• Beds / baths
• Square footage (living area)
• Lot size
• Year built
• Price per sqft (calculate if not stated: price ÷ sqft)
• HOA fees (monthly)
• Property taxes (annual)
• Days on market
• Any price reductions
• Parking / garage
• Basement, pool, major upgrades mentioned
• School ratings or district mentioned
• Any condition issues, deferred maintenance, or "as-is" language

STEP 2 — SCORE each category 0–100 using these benchmarks:
90–100: Exceptional — rare upside, clear deal
70–89: Solid investment, manageable risks
50–69: Mediocre — needs specific conditions to pencil out
30–49: Risky — multiple red flags
0–29: Avoid — likely value-destroying

CATEGORY RULES (cite specific numbers in every summary):

1. Location & Neighborhood
   - School ratings (GreatSchools or mentioned ratings), commute to major employment, walkability, crime context
   - Appreciation trend of the city/zip — is it growing or shrinking?
   - Natural hazard risk (flood zone, wildfire, etc.) if inferable
   - Penalize hard for: rural isolation, declining population, high crime, no walkability

2. Price & Value
   - Price per sqft vs. typical market range for that city/zip
   - Days on market: 60+ days = overpriced or problem property; use it as leverage
   - Any price cuts signal seller desperation — mention the cut amount
   - Zestimate vs. list price if available
   - A "beautiful home" in an overpriced market still gets a low score here

3. Rental Income Potential
   - Estimate gross monthly rent (use 0.8–1.0% of purchase price as a rough 1% rule benchmark)
   - Calculate: does it meet the 1% rule? (monthly rent ≥ 1% of price = strong; <0.7% = weak)
   - Estimate cap rate: assume 45% expense ratio (taxes + insurance + maintenance + vacancy + mgmt); cap rate = (annual rent × 0.55) ÷ price × 100
   - Flag explicitly if cap rate < 5%: "This will not cash flow without significant appreciation"
   - Factor in HOA fees — they directly kill cash flow

4. Condition & Maintenance
   - Year built drives deferred maintenance risk: pre-1980 = plumbing/electrical/roof risk; pre-1960 = likely lead paint, knob-and-tube wiring
   - Flag "as-is", "investor special", "TLC needed" language — these mean hidden costs
   - Estimate annual maintenance budget: 1–2% of purchase price for newer homes, 2–4% for older
   - Credit recent renovations with specifics (new roof, HVAC, kitchen) but be skeptical of cosmetic-only flips

5. Market Trends
   - Characterize the local market: buyer's vs. seller's market, inventory levels
   - Is the metro growing or shrinking? Population and job growth = appreciation; stagnation = flat or negative returns
   - Interest rate environment impact on affordability and buyer pool
   - Risk of rental oversupply if it's a heavily investor-targeted market

SCORING DISCIPLINE:
- Missing price data → Price & Value score ≤ 40
- HOA > $400/mo → automatically reduces Rental Income Potential by ≥15 points
- Days on market > 60 → Price & Value score ≤ 55
- Cap rate < 4% → Rental Income Potential ≤ 35
- Year built < 1970 with no renovation mention → Condition score ≤ 50
- Overall score = weighted average: Location 25%, Price 25%, Rental 25%, Condition 15%, Market 10%
- A beautiful home in a bad market gets an ugly score. Be honest.

Return ONLY this JSON (no markdown, no code fences, no extra text):
{
  "address": "<full address>",
  "overall_score": <integer 0-100>,
  "subscores": [
    { "category": "Location & Neighborhood", "score": <0-100>, "summary": "<3-4 sentences citing specific data points>" },
    { "category": "Price & Value", "score": <0-100>, "summary": "<3-4 sentences with price, price/sqft, days on market, comps context>" },
    { "category": "Rental Income Potential", "score": <0-100>, "summary": "<3-4 sentences with rent estimate, 1% rule check, cap rate estimate, HOA impact>" },
    { "category": "Condition & Maintenance", "score": <0-100>, "summary": "<3-4 sentences with year built, estimated maintenance cost, condition signals>" },
    { "category": "Market Trends", "score": <0-100>, "summary": "<3-4 sentences on market direction, population/job trends, inventory>" }
  ],
  "verdict": "<3-4 sentences: bottom-line investment assessment with the single most important number or fact>",
  "bull_case": "<3-4 sentences: the specific scenario under which this investment works well>",
  "bear_case": "<3-4 sentences: the specific scenario under which this investment loses money>"
}`;

// Walk a nested object and find a value by any of the given key names
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function dig(obj: any, ...keys: string[]): unknown {
  if (!obj || typeof obj !== "object") return undefined;
  for (const key of keys) {
    if (key in obj && obj[key] !== null && obj[key] !== undefined) return obj[key];
  }
  for (const val of Object.values(obj)) {
    if (val && typeof val === "object") {
      const found = dig(val, ...keys);
      if (found !== undefined) return found;
    }
  }
  return undefined;
}

function fmt(v: unknown, prefix = "", suffix = ""): string {
  if (v === undefined || v === null || v === "") return "not listed";
  return `${prefix}${v}${suffix}`;
}

// Turn Zillapi's deeply-nested JSON into a flat, labelled property sheet for Claude.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatZillapiForClaude(json: any, url: string): string {
  // Zillapi may wrap in { data: { ... } } or return fields at root
  const d = json?.data ?? json;

  const price = dig(d, "price", "listPrice", "listing_price") as number | undefined;
  const sqft = dig(d, "livingArea", "sqft", "squareFootage", "living_area", "finished_sq_ft") as number | undefined;
  const lotSqft = dig(d, "lotSize", "lot_size", "lotAreaValue") as number | undefined;
  const beds = dig(d, "bedrooms", "beds", "bedroom_count") as number | undefined;
  const baths = dig(d, "bathrooms", "baths", "bathroom_count") as number | undefined;
  const yearBuilt = dig(d, "yearBuilt", "year_built") as number | undefined;
  const dom = dig(d, "daysOnZillow", "days_on_market", "daysOnMarket", "dom") as number | undefined;
  const zestimate = dig(d, "zestimate") as number | undefined;
  const rentZestimate = dig(d, "rentZestimate", "rent_zestimate") as number | undefined;
  const taxValue = dig(d, "taxAssessedValue", "tax_assessed_value", "taxValue") as number | undefined;
  const hoa = dig(d, "monthlyHoaFee", "hoa_fee", "hoaFee") as number | undefined;
  const homeType = dig(d, "homeType", "home_type", "propertyType") as string | undefined;
  const homeStatus = dig(d, "homeStatus", "home_status", "listingStatus") as string | undefined;
  const description = dig(d, "description") as string | undefined;
  const pricePerSqft = price && sqft ? Math.round(price / sqft) : undefined;

  // Address
  const streetAddress = dig(d, "streetAddress", "street_address", "address") as string | undefined;
  const city = dig(d, "city") as string | undefined;
  const state = dig(d, "state") as string | undefined;
  const zip = dig(d, "zipcode", "zip", "postal_code") as string | undefined;
  const fullAddress = [streetAddress, city, state, zip].filter(Boolean).join(", ") || "See URL";

  // Price history — look for cuts
  const priceHistory = dig(d, "priceHistory", "price_history") as Array<{date?: string; price?: number; event?: string; priceChangeRate?: number}> | undefined;
  const priceHistoryStr = priceHistory?.slice(0, 8)
    .map(h => `${h.date ?? "?"}: $${h.price?.toLocaleString() ?? "?"} (${h.event ?? "?"})`)
    .join(" → ") ?? "not listed";

  // Schools
  const schools = dig(d, "schools", "nearbySchools") as Array<{name?: string; rating?: number; type?: string; grades?: string}> | undefined;
  const schoolsStr = schools?.slice(0, 5)
    .map(s => `${s.name ?? "?"} (${s.type ?? "?"}, grades ${s.grades ?? "?"}): ${s.rating ?? "?"}/10`)
    .join("; ") ?? "not listed";

  const lines = [
    `Source: ${url}`,
    ``,
    `=== PROPERTY FACTS ===`,
    `Address: ${fullAddress}`,
    `List price: ${fmt(price, "$", price ? ` ($${(price / 1000).toFixed(0)}k)` : "")}`,
    `Bedrooms: ${fmt(beds)}`,
    `Bathrooms: ${fmt(baths)}`,
    `Living area: ${fmt(sqft, "", " sqft")}`,
    `Lot size: ${fmt(lotSqft, "", " sqft")}`,
    `Year built: ${fmt(yearBuilt)}`,
    `Price per sqft: ${fmt(pricePerSqft, "$", "/sqft")}`,
    `Days on market: ${fmt(dom)}`,
    `Home type: ${fmt(homeType)}`,
    `Status: ${fmt(homeStatus)}`,
    `HOA (monthly): ${fmt(hoa, "$")}`,
    ``,
    `=== VALUATION ===`,
    `Zestimate: ${fmt(zestimate, "$")}`,
    `Rent Zestimate: ${fmt(rentZestimate, "$", "/mo")}`,
    `Tax assessed value: ${fmt(taxValue, "$")}`,
    `Zestimate vs list price: ${zestimate && price ? `$${(zestimate - price).toLocaleString()} (${((zestimate - price) / price * 100).toFixed(1)}%)` : "not listed"}`,
    ``,
    `=== PRICE HISTORY ===`,
    priceHistoryStr,
    ``,
    `=== SCHOOLS ===`,
    schoolsStr,
    ``,
    `=== DESCRIPTION ===`,
    description?.slice(0, 1500) ?? "not listed",
  ];

  return lines.join("\n");
}

// Zillapi — wraps Zillow's data. 1 credit per call. 100 free credits at zillapi.com/signup.
async function fetchViaZillapi(zillowUrl: string): Promise<string> {
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
    throw new Error(json.detail || json.error || `Zillapi error ${res.status}`);
  }

  return formatZillapiForClaude(json, zillowUrl);
}

async function fetchListingFromUrl(url: string): Promise<string> {
  // Any zillow.com URL → Zillapi (handles homedetails, search results, etc.)
  if (/zillow\.com/.test(url)) {
    return fetchViaZillapi(url);
  }

  // Non-Zillow URL — try Jina as best-effort
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
  return `Source URL: ${url}\n\n${text.slice(0, 15000)}`;
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

    const body = await request.json();
    let { listing_text } = body;

    if (!listing_text?.trim()) {
      return NextResponse.json({ error: "listing_text is required" }, { status: 400 });
    }

    // If the user pasted a URL, fetch the listing data from it
    if (URL_RE.test(listing_text.trim())) {
      listing_text = await fetchListingFromUrl(listing_text.trim());
    }

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: listing_text }],
    });

    const content = message.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type from Claude");
    }

    const analysis = parseClaudeJson(content.text);

    const { data, error } = await supabase
      .from("properties")
      .insert({
        user_id: user.id,
        address: analysis.address,
        listing_text,
        overall_score: analysis.overall_score,
        subscores: analysis.subscores,
        verdict: analysis.verdict,
        bull_case: analysis.bull_case,
        bear_case: analysis.bear_case,
      })
      .select("id")
      .single();

    if (error) throw error;

    return NextResponse.json({
      property_id: data.id,
      ...analysis,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("/api/analyze error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
