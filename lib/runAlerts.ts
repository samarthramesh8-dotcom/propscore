import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchViaZillapi, appendFinancials, geocodeLocation, SYSTEM_PROMPT } from "@/lib/analysis";
import { sendAlertEmail } from "@/lib/email";
import { SavedSearch } from "@/lib/types";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface AlertProperty {
  property_id: string;
  address: string;
  overall_score: number;
  list_price: number;
  cap_rate: string;
  monthly_cash_flow: number;
  verdict: string;
}

function parseMetric(text: string, re: RegExp): string | null {
  const m = text.match(re);
  return m ? m[1].replace(/,/g, "") : null;
}

export async function runAlerts(searchId?: string): Promise<{ processed: number }> {
  const supabase = createAdminClient();

  let query = supabase.from("saved_searches").select("*").eq("is_active", true);

  if (searchId) {
    // Manual run: target a single search, skip the recency filter
    query = query.eq("id", searchId);
  } else {
    // Cron run: skip searches run within the last 6 days
    const cutoff = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString();
    query = query.or(`last_run_at.is.null,last_run_at.lt.${cutoff}`);
  }

  const { data: searches, error } = await query;

  if (error || !searches?.length) return { processed: 0 };

  let processed = 0;

  for (const search of searches as SavedSearch[]) {
    try {
      // Get user email via admin API
      const { data: { user } } = await supabase.auth.admin.getUserById(search.user_id);
      const userEmail = user?.email;
      if (!userEmail) continue;

      // Geocode location to bbox for Zillapi
      const coords = await geocodeLocation(search.location);
      if (!coords) continue;
      const BBOX_DEG = 0.3;
      const bbox = `${coords.lon - BBOX_DEG},${coords.lat - BBOX_DEG},${coords.lon + BBOX_DEG},${coords.lat + BBOX_DEG}`;

      const searchParams = new URLSearchParams({ bbox, status: search.status, max_items: "20" });
      if (search.price_max) searchParams.set("price_max", String(search.price_max));
      if (search.beds_min)  searchParams.set("beds_min",  String(search.beds_min));
      if (search.baths_min) searchParams.set("baths_min", String(search.baths_min));

      const listingsRes = await fetch(
        `https://api.zillapi.com/v1/listings?${searchParams}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.ZILLAPI_KEY}`,
            Accept: "application/json",
            "User-Agent": "propscore/1.0",
          },
        },
      );
      if (!listingsRes.ok) continue;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const listingsJson: any = await listingsRes.json().catch(() => null);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const listings: any[] = Array.isArray(listingsJson)
        ? listingsJson
        : (listingsJson?.results ?? listingsJson?.data ?? listingsJson?.listings ?? []);
      if (!listings.length) continue;

      // Get already-sent property IDs for this search to avoid duplicates
      const { data: sent } = await supabase
        .from("alert_results")
        .select("property_id")
        .eq("saved_search_id", search.id);
      const sentIds = new Set((sent ?? []).map((r: { property_id: string }) => r.property_id));

      // Analyze each listing concurrently (cap at 10 to control costs)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const analysisPromises = listings.slice(0, 10).map(async (listing: any): Promise<AlertProperty | null> => {
        const rawUrl: string = listing.detailUrl ?? listing.hdpUrl ?? listing.detail_url ?? "";
        if (!rawUrl) return null;
        const zillowUrl = rawUrl.startsWith("http") ? rawUrl : `https://www.zillow.com${rawUrl}`;
        if (!zillowUrl.includes("zillow.com")) return null;

        const { listingText: rawText } = await fetchViaZillapi(zillowUrl);
        const withFinancials = appendFinancials(rawText, null);

        const message = await anthropic.messages.create({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          temperature: 0.2,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: withFinancials }],
        });

        const content = message.content[0];
        if (content.type !== "text") return null;

        let analysis: Record<string, unknown>;
        try {
          const raw = content.text;
          const match = raw.match(/\{[\s\S]*\}/);
          analysis = JSON.parse(match ? match[0] : raw);
        } catch {
          return null;
        }

        if ((analysis.overall_score as number) < search.min_score) return null;

        // Save to properties table
        const payload = {
          user_id:       search.user_id,
          address:       analysis.address,
          listing_text:  withFinancials,
          overall_score: analysis.overall_score,
          subscores:     analysis.subscores,
          verdict:       analysis.verdict,
          bull_case:     analysis.bull_case,
          bear_case:     analysis.bear_case,
          source:        "alert",
        };

        let ins = await supabase.from("properties").insert(payload).select("id").single();

        if (ins.error?.code === "42703") {
          // source column not yet migrated — insert without it
          const { address, listing_text, overall_score, subscores, verdict, bull_case, bear_case } = payload;
          ins = await supabase
            .from("properties")
            .insert({ user_id: search.user_id, address, listing_text, overall_score, subscores, verdict, bull_case, bear_case })
            .select("id")
            .single();
        }

        if (ins.error || !ins.data) return null;
        if (sentIds.has(ins.data.id)) return null;

        const listPrice  = parseInt(parseMetric(withFinancials, /List price:\s*\$?([\d,]+)/i) ?? "0", 10);
        const cashFlow   = parseInt(parseMetric(withFinancials, /Monthly cash flow:[^+\-\n]*([+\-]?\$?[\d,]+)/i) ?? "0", 10);
        const capRateStr = (parseMetric(withFinancials, /Cap rate:\s*([\d.]+)%/i) ?? "0") + "%";

        // Determine sign of cash flow from the text
        const cfLine = withFinancials.match(/Monthly cash flow:[^\n]*/i)?.[0] ?? "";
        const signedCf = cfLine.includes("NEGATIVE") ? -Math.abs(cashFlow) : Math.abs(cashFlow);

        return {
          property_id:      ins.data.id,
          address:          analysis.address as string,
          overall_score:    analysis.overall_score as number,
          list_price:       listPrice,
          cap_rate:         capRateStr,
          monthly_cash_flow: signedCf,
          verdict:          (analysis.verdict as string).slice(0, 80),
        };
      });

      const settled = await Promise.allSettled(analysisPromises);
      const newResults: AlertProperty[] = settled
        .filter((r): r is PromiseFulfilledResult<AlertProperty> =>
          r.status === "fulfilled" && r.value !== null
        )
        .map((r) => r.value)
        .sort((a, b) => b.overall_score - a.overall_score);

      // Always update last_run_at, even when there are no new results
      await supabase
        .from("saved_searches")
        .update({ last_run_at: new Date().toISOString() })
        .eq("id", search.id);

      if (!newResults.length) continue;

      await sendAlertEmail({
        to:         userEmail,
        searchName: search.name,
        location:   search.location,
        results:    newResults,
      });

      await supabase.from("alert_results").insert(
        newResults.map((r) => ({
          saved_search_id: search.id,
          property_id:     r.property_id,
        }))
      );

      processed++;
    } catch (err) {
      console.error(`Alert run failed for search ${search.id}:`, err);
    }
  }

  return { processed };
}
