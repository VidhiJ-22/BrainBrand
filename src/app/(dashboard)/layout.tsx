import { Suspense } from "react";
import Sidebar from "@/components/sidebar";
import Toast from "@/components/toast";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types/database";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: Profile | null = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    profile = data;
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar profile={profile} />
      <main className="ml-[240px] flex-1 p-8 transition-all duration-200">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
      <Suspense>
        <Toast />
      </Suspense>
    </div>
  );
}
