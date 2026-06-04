import { NextRequest, NextResponse } from "next/server";
import { runAlerts } from "@/lib/runAlerts";

// Vercel Cron runs this every Monday at 9am UTC.
// Protect with CRON_SECRET set in Vercel Project Settings → Environment Variables.
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runAlerts();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("Alert cron failed:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
