import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Sidebar from "@/components/Sidebar";
import SettingsClient from "./SettingsClient";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Get property count for the "delete account" confirmation message
  const { count } = await supabase
    .from("properties")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />
      <main className="ps-page-main" style={{ flex: 1, overflowY: "auto" }}>
        <SettingsClient email={user.email ?? ""} propertyCount={count ?? 0} />
      </main>
    </div>
  );
}
