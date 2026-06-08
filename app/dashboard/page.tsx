export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import DashboardClient from "@/components/DashboardClient";
import { Property } from "@/lib/types";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: properties } = await supabase
    .from("properties")
    .select(
      "id, user_id, address, listing_text, overall_score, subscores, " +
      "verdict, bull_case, bear_case, rentcast_estimate, rentcast_comps, " +
      "mud_rate, notes, created_at, updated_at, source, zillow_url"
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const list = (properties as unknown as Property[]) ?? [];

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg-base)" }}>
      <Sidebar />
      <DashboardClient initialList={list} />
    </div>
  );
}
