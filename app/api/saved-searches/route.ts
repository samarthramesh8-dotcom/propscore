import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: searches, error } = await supabase
    .from("saved_searches")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ searches: searches ?? [] });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();

  const name: string = (body.name ?? "").trim();
  const location: string = (body.location ?? "").trim();
  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });
  if (!location) return NextResponse.json({ error: "location is required" }, { status: 400 });

  const min_score = typeof body.min_score === "number" ? body.min_score : 60;
  if (min_score < 0 || min_score > 100) {
    return NextResponse.json({ error: "min_score must be between 0 and 100" }, { status: 400 });
  }

  const { data: search, error } = await supabase
    .from("saved_searches")
    .insert({
      user_id:   user.id,
      name,
      location,
      status:    body.status ?? "for_sale",
      price_max: body.price_max ?? null,
      beds_min:  body.beds_min  || null,
      baths_min: body.baths_min || null,
      min_score,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ search }, { status: 201 });
}
