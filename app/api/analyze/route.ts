import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

// ─── Rentcast types ───────────────────────────────────────────────────────────

export interface RentcastComp {
  address: string;
  rent: number;
  bedrooms: number;
  bathrooms: number;
  squareFootage: number;
  distanceMi: number;
}

interface RentcastResult {
  estimate: number;
  rentRangeLow: number;
  rentRangeHigh: number;
  comparables: RentcastComp[];
}

interface AnalysisInput {
  listingText: string;
  rentcast: RentcastResult | null;
}

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
   - IMPORTANT: If a "RENTCAST RENT ESTIMATE" section is present in the data, use that figure as your primary rent benchmark — it is derived from actual comparable rental listings and is more reliable than algorithmic estimates
   - If both Rentcast and Zillow Rent Zestimate are provided, cite both and note any discrepancy
   - If neither is available, estimate gross monthly rent using 0.8–1.0% of purchase price as a rough benchmark
   - Calculate: does the rent meet the 1% rule? (monthly rent ≥ 1% of price = strong; <0.7% = weak)
   - Estimate cap rate: assume 45% expense ratio (taxes + insurance + maintenance + vacancy + mgmt); cap rate = (annual rent × 0.55) ÷ price × 100
   - IMPORTANT: If a "MUD TAX" section is present, the annual MUD tax is an additional fixed cost on top of the standard expense ratio. Deduct the stated annual MUD tax from NOI when computing cap rate and cash flow — cite the MUD tax amount explicitly (e.g. "MUD tax of $2,850/yr reduces effective cap rate from X% to Y%")
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

function formatRentcastForClaude(rc: RentcastResult): string {
  const lines = [
    ``,
    `=== RENTCAST RENT ESTIMATE ===`,
    `Estimated monthly rent: $${rc.estimate.toLocaleString()}/mo`,
    `Confidence range: $${rc.rentRangeLow.toLocaleString()}–$${rc.rentRangeHigh.toLocaleString()}/mo`,
  ];
  if (rc.comparables.length > 0) {
    lines.push(`Comparable rentals (active/recent listings):`);
    rc.comparables.forEach((c) => {
      lines.push(
        `  • ${c.address}: $${c.rent.toLocaleString()}/mo, ` +
        `${c.bedrooms}bd/${c.bathrooms}ba, ${c.squareFootage}sqft (${c.distanceMi}mi away)`
      );
    });
  }
  return lines.join("\n");
}

// ─── MUD district ─────────────────────────────────────────────────────────────

function formatMudForClaude(mudRate: number): string {
  return [
    ``,
    `=== MUD TAX (MUNICIPAL UTILITY DISTRICT) ===`,
    `MUD rate: $${mudRate.toFixed(4)} per $100 of assessed value`,
    `NOTE: This is an additional annual tax charged by the MUD district on top of standard county/city property taxes.`,
    `It funds utility infrastructure (water, sewer, drainage) and is common in suburban Texas master-planned communities.`,
    `To calculate the annual MUD tax: (list price ÷ 100) × MUD rate.`,
    `Deduct this from NOI when calculating effective cap rate and annual cash flow.`,
  ].join("\n");
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
    throw new Error(json.detail || json.error || `Zillapi error ${res.status}`);
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

    const body = await request.json();
    const rawInput: string = body.listing_text;
    const mudRate: number | null =
      typeof body.mud_rate === "number" && body.mud_rate > 0 ? body.mud_rate : null;

    if (!rawInput?.trim()) {
      return NextResponse.json({ error: "listing_text is required" }, { status: 400 });
    }

    // If the user pasted a URL, fetch the listing data (+ Rentcast) from it.
    // Otherwise treat the raw text as the listing and skip Rentcast.
    const { listingText: zillapiText, rentcast } = URL_RE.test(rawInput.trim())
      ? await fetchListingFromUrl(rawInput.trim())
      : { listingText: rawInput, rentcast: null };

    // Append MUD tax context when the user provided a rate
    const listingText = mudRate
      ? zillapiText + formatMudForClaude(mudRate)
      : zillapiText;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: listingText }],
    });

    const content = message.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type from Claude");
    }

    const analysis = parseClaudeJson(content.text);

    // Base columns every analysis needs
    const baseInsert = {
      user_id:       user.id,
      address:       analysis.address,
      listing_text:  listingText,
      overall_score: analysis.overall_score,
      subscores:     analysis.subscores,
      verdict:       analysis.verdict,
      bull_case:     analysis.bull_case,
      bear_case:     analysis.bear_case,
    };

    // Attempt full insert with all columns (requires migration to have been run)
    let { data, error } = await supabase
      .from("properties")
      .insert({
        ...baseInsert,
        rentcast_estimate: rentcast?.estimate ?? null,
        rentcast_comps:    rentcast?.comparables ?? null,
        mud_rate:          mudRate,
      })
      .select("id")
      .single();

    // PostgreSQL error code 42703 = "undefined_column" — migration not yet run.
    // Fall back to base columns so the analysis still saves successfully.
    if (error?.code === "42703") {
      console.warn(
        "/api/analyze: new columns missing — run the DB migration. " +
        "Falling back to base insert without rentcast/mud fields."
      );
      const fallback = await supabase
        .from("properties")
        .insert(baseInsert)
        .select("id")
        .single();
      data  = fallback.data;
      error = fallback.error;
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
