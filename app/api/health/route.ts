import { NextResponse } from "next/server";

export async function GET() {
  const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const zillapiKey   = process.env.ZILLAPI_KEY;
  const rentcastKey  = process.env.RENTCAST_API_KEY;

  const vars = {
    NEXT_PUBLIC_SUPABASE_URL:      supabaseUrl  ? "✓ set" : "✗ MISSING",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseKey  ? "✓ set" : "✗ MISSING",
    ANTHROPIC_API_KEY:             anthropicKey ? "✓ set" : "✗ MISSING",
    ZILLAPI_KEY:                   zillapiKey   ? "✓ set" : "✗ MISSING",
    RENTCAST_API_KEY:              rentcastKey  ? "✓ set" : "✗ MISSING",
  };

  const allGood = Object.values(vars).every((v) => v.startsWith("✓"));

  return NextResponse.json(
    { status: allGood ? "ok" : "degraded", env: vars },
    { status: allGood ? 200 : 500 }
  );
}
