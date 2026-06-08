import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractRichData } from "@/lib/analysis";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { property_id } = await request.json();
    if (!property_id) return NextResponse.json({ error: "property_id required" }, { status: 400 });

    // Load the property (ownership check via user_id)
    const { data: property } = await supabase
      .from("properties")
      .select("id, listing_text")
      .eq("id", property_id)
      .eq("user_id", user.id)
      .single();

    if (!property) return NextResponse.json({ error: "Property not found" }, { status: 404 });

    // Parse the Zillow URL that was stored at the top of listing_text
    const urlMatch = (property.listing_text as string | null)?.match(
      /Source:\s*(https?:\/\/[^\s]+zillow\.com[^\s]*)/i
    );
    if (!urlMatch) {
      return NextResponse.json(
        { error: "This property was not analyzed from a Zillow URL — no photos available." },
        { status: 400 }
      );
    }
    const zillowUrl = urlMatch[1];

    // Fetch from Zillapi (no Rentcast, no Claude — just the raw listing JSON)
    const apiKey = process.env.ZILLAPI_KEY;
    if (!apiKey || apiKey === "your_zillapi_key") {
      return NextResponse.json({ error: "ZILLAPI_KEY not configured" }, { status: 500 });
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json: any = await res.json();
    if (!res.ok || json.error) {
      const msg =
        typeof json.detail  === "string" ? json.detail  :
        typeof json.error   === "string" ? json.error   :
        typeof json.message === "string" ? json.message :
        `Zillapi error ${res.status}`;
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const richData = extractRichData(json, zillowUrl);

    // Persist to DB — rich_data and zillow_url columns must exist (run migration first)
    const { error: updateError } = await supabase
      .from("properties")
      .update({ rich_data: richData, zillow_url: zillowUrl })
      .eq("id", property_id)
      .eq("user_id", user.id);

    if (updateError) {
      const isMigrationMissing =
        updateError.code === "42703" ||
        updateError.code === "PGRST204" ||
        updateError.message?.includes("schema cache");
      if (isMigrationMissing) {
        return NextResponse.json(
          { error: "DB migration not yet applied — run the two ALTER TABLE statements in Supabase SQL Editor first." },
          { status: 400 }
        );
      }
      throw new Error(updateError.message);
    }

    return NextResponse.json({ success: true, photoCount: richData.photos.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("/api/fetch-rich-data error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
