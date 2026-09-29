// Migration required for Property Status Tags (feature #5):
// Run this in your Supabase SQL editor to enable status tracking:
//
//   alter table properties
//     add column if not exists status text not null default 'watching'
//     check (status in ('watching', 'offer_submitted', 'passed', 'acquired'));
//
// Migration required for Deep Verify confidence flags (Phase 3):
//
//   alter table properties
//     add column if not exists confidence_flags jsonb;
//
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  RentcastComp,
  RentcastResult,
  ZillowRichData,
  dig,
  formatZillapiForClaude,
  formatRentcastForClaude,
  formatMudForClaude,
  appendFinancials,
  extractRichData,
} from "@/lib/analysis";
import { runDeepVerify } from "@/lib/deepVerify";
import { scoreListing } from "@/lib/scoring";

// Single-property analyses can run long when deep_verify is enabled
export const maxDuration = 300;

// ─── Types ────────────────────────────────────────────────────────────────────

// Re-export so existing consumers of this module keep working
export type { RentcastComp };

interface AnalysisInput {
  listingText: string;
  rentcast: RentcastResult | null;
  richData: ZillowRichData | null;
  zillowUrl: string;
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
  const richData = extractRichData(json, zillowUrl);

  return { listingText, rentcast, richData, zillowUrl };
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
  return { listingText: `Source URL: ${url}\n\n${text.slice(0, 15000)}`, rentcast: null, richData: null, zillowUrl: "" };
}

// Catches both PostgreSQL 42703 (undefined_column) and PostgREST PGRST204
// (schema cache miss) — both indicate the DB migration hasn't been run yet.
function isSchemaMissing(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  return err.code === "42703" || err.code === "PGRST204" ||
    (typeof err.message === "string" && err.message.includes("schema cache"));
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
    const deepVerify: boolean = body.deep_verify === true;

    if (!rawInput?.trim()) {
      return NextResponse.json({ error: "listing_text is required" }, { status: 400 });
    }

    // If the user pasted a URL, fetch the listing data (+ Rentcast) from it.
    // Otherwise treat the raw text as the listing and skip Rentcast.
    const { listingText: zillapiText, rentcast, richData, zillowUrl } = URL_RE.test(rawInput.trim())
      ? await fetchListingFromUrl(rawInput.trim())
      : { listingText: rawInput, rentcast: null, richData: null, zillowUrl: "" };

    // Append MUD tax context when the user provided a rate, then pre-compute
    // all investment metrics so Claude has verified numbers to cite directly.
    const withMud         = mudRate ? zillapiText + formatMudForClaude(mudRate) : zillapiText;
    const listingText     = appendFinancials(withMud, mudRate);

    const analysis = await scoreListing(listingText);

    // ── Optional deep verification (Phase 3) ──────────────────────────────
    // Opt-in second pass on claude-fable-5 that cross-checks the data sources
    // behind the verdict (fresh Rentcast pull, comparable-sales search, price
    // history consistency) and reports material disagreements. It never
    // changes the verdict — it annotates it.
    let confidenceFlags: import("@/lib/types").ConfidenceFlag[] | null = null;
    let verificationNote: string | null = null;
    if (deepVerify && typeof analysis.address === "string") {
      const verify = await runDeepVerify({
        listingText,
        address: analysis.address,
      });
      confidenceFlags = verify.flags;
      verificationNote = verify.note;
    }

    // Columns shared by both insert and update paths
    const analysisPayload = {
      // Store flags only when verification actually completed ([] = verified clean)
      ...(confidenceFlags !== null ? { confidence_flags: confidenceFlags } : {}),
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
      rich_data:         richData ?? null,
      zillow_url:        zillowUrl || null,
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

      if (isSchemaMissing(error)) {
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

      // 42703 = PostgreSQL "undefined_column"; PGRST204 = PostgREST schema cache miss.
      // Both mean the migration hasn't been run yet.
      if (isSchemaMissing(error)) {
        console.warn(
          "/api/analyze: new columns missing — run the DB migration. " +
          "Falling back to base insert without rentcast/mud/rich_data fields."
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
      ...(deepVerify ? {
        confidence_flags: confidenceFlags,
        verification_note: verificationNote,
      } : {}),
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
