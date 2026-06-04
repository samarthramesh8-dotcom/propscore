import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runAlerts } from "@/lib/runAlerts";

export const maxDuration = 300;

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Verify ownership
  const { data: search } = await supabase
    .from("saved_searches")
    .select("id, user_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!search) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const result = await runAlerts(id);
    return NextResponse.json({ ok: true, new_results: result.processed, emailed: result.processed > 0 });
  } catch (err) {
    console.error(`Manual alert run failed for ${id}:`, err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
