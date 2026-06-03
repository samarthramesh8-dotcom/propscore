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
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false }); // client sorts from here

  const list = (properties as Property[]) ?? [];

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg-base)" }}>
      <Sidebar />
      <DashboardClient initialList={list} />
    </div>
  );
}
