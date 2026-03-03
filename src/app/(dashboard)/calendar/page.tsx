import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Calendar",
};
import { getBrandBrainProfile } from "@/lib/brand-brain/get-profile";
import type { Draft } from "@/lib/types/database";
import PageHeader from "@/components/page-header";
import CalendarView from "./calendar-view";
import Link from "next/link";
import { Plus } from "lucide-react";

export default async function CalendarPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let drafts: Draft[] = [];
  let suggestedTimes: { day: string; time: string }[] = [];

  if (user) {
    const { data } = await supabase
      .from("drafts")
      .select("*")
      .eq("user_id", user.id)
      .in("status", ["draft", "scheduled", "published"])
      .order("created_at", { ascending: false });
    drafts = (data || []) as Draft[];

    // Get suggested times from Brand Brain
    const bbProfile = await getBrandBrainProfile();
    const patterns = bbProfile?.analysis?.posting_patterns;
    if (patterns) {
      const days = patterns.best_performing_days || [];
      const times = patterns.best_performing_times || [];
      suggestedTimes = days.slice(0, 3).map((day, i) => ({
        day,
        time: times[i] || times[0] || "9:00 AM",
      }));
    }
  }

  return (
    <div>
      <PageHeader title="Calendar" description="Plan and schedule your content">
        <Link
          href="/create-post"
          className="flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-600"
        >
          <Plus className="h-4 w-4" />
          Create Post
        </Link>
      </PageHeader>

      <CalendarView drafts={drafts} suggestedTimes={suggestedTimes} />
    </div>
  );
}
