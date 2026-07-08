// Migration required for Verdict-Outcome Tracking (Phase 1):
// Run this in your Supabase SQL editor before using these endpoints:
//
//   create table if not exists property_outcomes (
//     id                   uuid primary key default gen_random_uuid(),
//     property_id          uuid not null references properties(id) on delete cascade,
//     user_id              uuid not null references auth.users(id) on delete cascade,
//     outcome_type         text not null check (outcome_type in
//       ('pursued', 'passed', 'offer_made', 'offer_accepted', 'offer_rejected', 'closed', 'still_watching')),
//     actual_sale_price    numeric,
//     actual_rent_achieved numeric,
//     days_to_close        integer,
//     outcome_notes        text,
//     recorded_at          timestamptz not null default now(),
//     created_at           timestamptz not null default now(),
//     unique (property_id)
//   );
//
//   alter table property_outcomes enable row level security;
//
//   create policy "Users can view own outcomes"
//     on property_outcomes for select using (auth.uid() = user_id);
//   create policy "Users can insert own outcomes"
//     on property_outcomes for insert with check (auth.uid() = user_id);
//   create policy "Users can update own outcomes"
//     on property_outcomes for update using (auth.uid() = user_id);
//   create policy "Users can delete own outcomes"
//     on property_outcomes for delete using (auth.uid() = user_id);
//
//   create index if not exists property_outcomes_user_id_idx on property_outcomes (user_id);
//
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { OUTCOME_TYPES, OutcomeType } from "@/lib/types";

// 42P01 = PostgreSQL undefined_table; PGRST205 = PostgREST table not in schema
// cache. Both mean the property_outcomes migration hasn't been run yet.
function isTableMissing(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  return err.code === "42P01" || err.code === "PGRST205" ||
    (typeof err.message === "string" && err.message.includes("schema cache"));
}

function optionalNumber(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const { data, error } = await supabase
    .from("property_outcomes")
    .select("*")
    .eq("property_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  // Table not migrated yet — behave as "no outcome recorded" so the UI still renders
  if (isTableMissing(error)) return NextResponse.json({ outcome: null });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ outcome: data ?? null });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  const outcomeType = body.outcome_type as OutcomeType;
  if (!OUTCOME_TYPES.includes(outcomeType)) {
    return NextResponse.json(
      { error: `outcome_type must be one of: ${OUTCOME_TYPES.join(", ")}` },
      { status: 400 }
    );
  }

  // Verify the property exists and belongs to this user before recording
  const { data: property } = await supabase
    .from("properties")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!property) {
    return NextResponse.json({ error: "Property not found" }, { status: 404 });
  }

  const daysToClose = body.days_to_close;
  const payload = {
    property_id:          id,
    user_id:              user.id,
    outcome_type:         outcomeType,
    actual_sale_price:    optionalNumber(body.actual_sale_price),
    actual_rent_achieved: optionalNumber(body.actual_rent_achieved),
    days_to_close:
      typeof daysToClose === "number" && Number.isInteger(daysToClose) && daysToClose > 0
        ? daysToClose : null,
    outcome_notes:
      typeof body.outcome_notes === "string" && body.outcome_notes.trim()
        ? body.outcome_notes.trim().slice(0, 2000) : null,
    recorded_at: new Date().toISOString(),
  };

  // One outcome row per property — create on first save, replace on later ones
  const { data, error } = await supabase
    .from("property_outcomes")
    .upsert(payload, { onConflict: "property_id" })
    .select("*")
    .single();

  if (isTableMissing(error)) {
    return NextResponse.json(
      { error: "Outcome tracking not set up yet — run the property_outcomes migration (see app/api/properties/[id]/outcome/route.ts)" },
      { status: 500 }
    );
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ outcome: data });
}
