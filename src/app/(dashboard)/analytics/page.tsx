import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Analytics",
};
import { getBrandBrainProfile } from "@/lib/brand-brain/get-profile";
import type { LinkedInPost } from "@/lib/types/database";
import PageHeader from "@/components/page-header";
import AnalyticsDashboard from "./analytics-dashboard";
import Link from "next/link";
import { Linkedin } from "lucide-react";

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let posts: LinkedInPost[] = [];
  let linkedInConnected = false;

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("linkedin_connected")
      .eq("id", user.id)
      .single();
    linkedInConnected = profile?.linkedin_connected ?? false;

    if (linkedInConnected) {
      const { data } = await supabase
        .from("linkedin_posts")
        .select("*")
        .eq("user_id", user.id)
        .order("posted_at", { ascending: true });
      posts = (data || []) as LinkedInPost[];
    }
  }

  const bbProfile = await getBrandBrainProfile();
  const analysis = bbProfile?.analysis ?? null;

  if (!linkedInConnected) {
    return (
      <div>
        <PageHeader
          title="Analytics"
          description="Track your LinkedIn performance"
        />
        <div className="animate-fade-in-up flex flex-col items-center justify-center rounded-xl border border-gray-100 bg-white py-20 text-center shadow-sm">
          <Linkedin className="mb-4 h-10 w-10 text-slate-300" />
          <h3 className="mb-2 text-lg font-semibold text-slate-900">
            Connect LinkedIn to see analytics
          </h3>
          <p className="mb-6 max-w-sm text-sm text-slate-500">
            Once you connect your account and fetch posts, we&apos;ll show engagement
            trends, format breakdowns, and more.
          </p>
          <a
            href="/api/auth/linkedin"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-600"
          >
            <Linkedin className="h-4 w-4" />
            Connect LinkedIn
          </a>
        </div>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div>
        <PageHeader
          title="Analytics"
          description="Track your LinkedIn performance"
        />
        <div className="animate-fade-in-up flex flex-col items-center justify-center rounded-xl border border-gray-100 bg-white py-20 text-center shadow-sm">
          <h3 className="mb-2 text-lg font-semibold text-slate-900">
            No posts fetched yet
          </h3>
          <p className="mb-6 max-w-sm text-sm text-slate-500">
            Head to settings and fetch your LinkedIn posts to unlock analytics.
          </p>
          <Link
            href="/settings"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-600"
          >
            Go to Settings
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Analytics"
        description="Track your LinkedIn performance"
      />
      <AnalyticsDashboard posts={posts} analysis={analysis} />
    </div>
  );
}
