import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getBrandBrainProfile, shouldReanalyze } from "@/lib/brand-brain/get-profile";

export const metadata: Metadata = {
  title: "Brand Brain",
};
import type { Profile } from "@/lib/types/database";
import PageHeader from "@/components/page-header";
import AnalyzeProgress from "@/components/analyze-progress";
import { Brain, Linkedin } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import BrandBrainDashboard from "./dashboard";

export default async function BrandBrainPage() {
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

  const bbProfile = await getBrandBrainProfile();
  const needsReanalysis = await shouldReanalyze();

  const linkedInConnected = profile?.linkedin_connected ?? false;
  const hasPosts = !!profile?.last_posts_fetched_at;
  const hasAnalysis = !!bbProfile?.analysis;

  // Low post warning
  const lowPostCount =
    bbProfile?.posts_analyzed && bbProfile.posts_analyzed < 30;

  return (
    <div>
      <PageHeader
        title="Brand Brain"
        description={
          hasAnalysis && bbProfile?.last_analyzed_at
            ? `Last analyzed: ${formatDistanceToNow(new Date(bbProfile.last_analyzed_at), { addSuffix: true })}`
            : "Your content intelligence profile"
        }
      >
        {hasAnalysis && (
          <div className="flex items-center gap-3">
            {bbProfile?.posts_analyzed && (
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-600">
                Based on {bbProfile.posts_analyzed} posts
              </span>
            )}
            <AnalyzeProgress compact force buttonLabel="Re-analyze" />
          </div>
        )}
      </PageHeader>

      {/* Low post count warning */}
      {hasAnalysis && lowPostCount && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm text-amber-800">
            Analysis based on{" "}
            <span className="font-semibold">
              {bbProfile?.posts_analyzed} posts
            </span>
            . For more accurate insights, Brand Brain works best with 30+ posts.
          </p>
        </div>
      )}

      {/* State: Not connected */}
      {!linkedInConnected && (
        <div className="animate-fade-in-up flex flex-col items-center justify-center rounded-xl border border-gray-100 bg-white py-20 shadow-sm">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-indigo-50">
            <Brain className="h-10 w-10 text-indigo-400" />
          </div>
          <h2 className="mb-2 text-xl font-bold text-slate-900">
            Your Brand Brain is empty
          </h2>
          <p className="mb-6 max-w-md text-center text-sm text-slate-500">
            Connect your LinkedIn account and we&apos;ll analyze your content to
            build your personalized content strategy.
          </p>
          <a
            href="/api/auth/linkedin"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-6 py-2.5 font-semibold text-white shadow-sm transition-colors hover:bg-indigo-600"
          >
            <Linkedin className="h-4 w-4" />
            Connect LinkedIn
          </a>
        </div>
      )}

      {/* State: Connected but no posts */}
      {linkedInConnected && !hasPosts && (
        <div className="animate-fade-in-up flex flex-col items-center justify-center rounded-xl border border-gray-100 bg-white py-20 shadow-sm">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-indigo-50">
            <Brain className="h-10 w-10 text-indigo-400" />
          </div>
          <h2 className="mb-2 text-xl font-bold text-slate-900">
            Fetch your posts first
          </h2>
          <p className="mb-6 max-w-md text-center text-sm text-slate-500">
            We need to pull your LinkedIn posts before we can analyze your
            content. Head to Settings to fetch your data.
          </p>
          <a
            href="/settings"
            className="rounded-lg bg-indigo-500 px-6 py-2.5 font-semibold text-white shadow-sm transition-colors hover:bg-indigo-600"
          >
            Go to Settings
          </a>
        </div>
      )}

      {/* State: Has posts but no analysis yet — auto-trigger */}
      {linkedInConnected && hasPosts && !hasAnalysis && (
        <AnalyzeProgress autoStart />
      )}

      {/* State: Has posts, analysis exists but needs re-analysis */}
      {linkedInConnected && hasPosts && hasAnalysis && needsReanalysis && (
        <div className="mb-6 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-indigo-800">
              New posts detected since your last analysis. Re-analyze for
              updated insights.
            </p>
            <AnalyzeProgress compact force buttonLabel="Update Analysis" />
          </div>
        </div>
      )}

      {/* State: Has analysis — render the dashboard */}
      {hasAnalysis && bbProfile?.analysis && (
        <BrandBrainDashboard analysis={bbProfile.analysis} />
      )}
    </div>
  );
}
