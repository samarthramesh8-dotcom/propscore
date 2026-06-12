import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import {
  appendFinancials,
  fetchViaZillapi,
  geocodeLocation,
  SYSTEM_PROMPT,
} from "@/lib/analysis";

// Vercel: allow up to 5 minutes for batch analyses
export const maxDuration = 300;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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

    // ── Search Zillapi listings ───────────────────────────────────────────────
    const apiKey = process.env.ZILLAPI_KEY;
    if (!apiKey || apiKey === "your_zillapi_key") {
      throw new Error("ZILLAPI_KEY not configured — get a free key at zillapi.com/signup");
    }

    const coords = await geocodeLocation(location);
    if (!coords) {
      return NextResponse.json(
        { error: `Could not geocode "${location}". Try being more specific, e.g. "Austin, TX" or "78759".` },
        { status: 400 },
      );
    }

    // ~0.3° ≈ 20 miles radius → 40×40 mile search area
    const BBOX_DEG = 0.3;
    const bbox = `${coords.lon - BBOX_DEG},${coords.lat - BBOX_DEG},${coords.lon + BBOX_DEG},${coords.lat + BBOX_DEG}`;

    const searchParams = new URLSearchParams({ bbox, status });
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const searchJson: any = await searchRes.json().catch(() => null);
    console.log("/api/find Zillapi search status:", searchRes.status, JSON.stringify(searchJson));
    if (!searchRes.ok) {
      const errMsg =
        typeof searchJson?.detail  === "string" ? searchJson.detail  :
        typeof searchJson?.error   === "string" ? searchJson.error   :
        typeof searchJson?.message === "string" ? searchJson.message :
        searchJson ? JSON.stringify(searchJson) : `Zillapi search error ${searchRes.status}`;
      throw new Error(`Zillapi search error ${searchRes.status}: ${errMsg}`);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const listings: any[] = Array.isArray(searchJson)
      ? searchJson
      : (searchJson.results ?? searchJson.data ?? searchJson.listings ?? []);

    const total_found = listings.length;

    // ── Stream NDJSON results ─────────────────────────────────────────────────
    const encoder = new TextEncoder();
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();

    const writeEvent = async (obj: unknown) => {
      await writer.write(encoder.encode(JSON.stringify(obj) + "\n"));
    };

    // Process listings sequentially in the background
    (async () => {
      let total_analyzed = 0;
      let errors = 0;

      if (total_found === 0) {
        await writeEvent({
          type: "done",
          total_found: 0,
          total_analyzed: 0,
          errors: 0,
          message: "No listings found matching your criteria. Try broadening your search.",
        });
        await writer.close();
        return;
      }

      const toProcess = listings.slice(0, max_results);

      for (let i = 0; i < toProcess.length; i++) {
        const listing = toProcess[i];

        // Extract display address before analysis (for progress event)
        const rawUrl: string = listing.detailUrl ?? listing.hdpUrl ?? listing.detail_url ?? "";
        const addressFromUrl = rawUrl.includes("/homedetails/")
          ? decodeURIComponent(
              rawUrl.split("/homedetails/")[1]?.split("/")[0]?.replace(/-/g, " ") ?? "",
            ).trim()
          : "";
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const displayAddress: string =
          ((listing as any).address
            ?? (listing as any).streetAddress
            ?? (listing as any).fullAddress
            ?? addressFromUrl
          ) || "Property";

        await writeEvent({
          type: "progress",
          current: i + 1,
          total: toProcess.length,
          address: displayAddress,
        });

        try {
          if (!rawUrl) throw new Error("No Zillow URL in listing");

          const zillowUrl = rawUrl.startsWith("http")
            ? rawUrl
            : `https://www.zillow.com${rawUrl}`;

          // Fetch full property data via Zillapi
          const { listingText: rawText, rentcast } = await fetchViaZillapi(zillowUrl);
          const listingText = appendFinancials(rawText, null);

          // Claude analysis
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

          // Insert into properties table with source='deal_finder'
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
        } catch (err) {
          errors++;
          const errMsg = err instanceof Error ? err.message : String(err);
          await writeEvent({ type: "error", address: displayAddress, message: errMsg });
        }
      }

      await writeEvent({ type: "done", total_found, total_analyzed, errors });
      await writer.close();
    })().catch(console.error);

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
