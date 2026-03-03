import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Overview",
};
import { getBrandBrainProfile } from "@/lib/brand-brain/get-profile";
import type { Profile, LinkedInPost, BrandBrainAnalysis } from "@/lib/types/database";
import PageHeader from "@/components/page-header";
import StalenessBanner from "@/components/staleness-banner";
import FetchProgress from "@/components/fetch-progress";
import AnalyzeProgress from "@/components/analyze-progress";
import {
  PenSquare,
  Calendar,
  BarChart3,
  ArrowRight,
  Linkedin,
  TrendingUp,
  TrendingDown,
  Brain,
  ThumbsUp,
  MessageCircle,
  Repeat2,
  Lightbulb,
} from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function fmtEngagement(n: number): string {
  if (n > 100) return Math.round(n).toLocaleString();
  return `${n.toFixed(1)}%`;
}

export default async function OverviewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: Profile | null = null;
  let recentPosts: LinkedInPost[] = [];
  let avgEngagement = 0;

  if (user) {
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    profile = profileData;

    const { data: postsData } = await supabase
      .from("linkedin_posts")
      .select("*")
      .eq("user_id", user.id)
      .order("posted_at", { ascending: false })
      .limit(5);
    recentPosts = postsData || [];

    if (recentPosts.length > 0) {
      avgEngagement =
        recentPosts.reduce((sum, p) => sum + (p.engagement_rate || 0), 0) /
        recentPosts.length;
    }
  }

  const firstName = profile?.full_name?.split(" ")[0] || "there";
  const linkedInConnected = profile?.linkedin_connected ?? false;
  const hasPosts = recentPosts.length > 0;

  const bbProfile = await getBrandBrainProfile();
  const analysis = bbProfile?.analysis ?? null;
  const bbScore = analysis?.brand_brain_score?.overall ?? null;
  const topFormat =
    analysis?.performance_insights?.format_performance?.[0]?.format ?? null;

  let totalPosts = 0;
  if (user && linkedInConnected) {
    const { count } = await supabase
      .from("linkedin_posts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);
    totalPosts = count || 0;
  }

  // Determine overall avg engagement from BB analysis if available
  const bbAvgEngagement =
    analysis?.performance_insights?.avg_engagement_rate ?? null;

  // States
  const isNewUser = !linkedInConnected;
  const needsFetch =
    linkedInConnected && !hasPosts && !profile?.last_posts_fetched_at;
  const needsAnalysis =
    linkedInConnected && hasPosts && !analysis;
  const isFullySetUp = linkedInConnected && hasPosts && !!analysis;

  return (
    <div>
      <PageHeader
        title={`${getGreeting()}, ${firstName}`}
        description="Here's your LinkedIn content overview"
      />

      {/* Staleness banner */}
      {linkedInConnected && (
        <StalenessBanner
          lastFetchedAt={profile?.last_posts_fetched_at ?? null}
        />
      )}

      {/* ─── STATE: New user — big connect banner ─── */}
      {isNewUser && (
        <div className="animate-fade-in-up mb-8 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 p-8 text-white shadow-lg">
          <h2 className="mb-2 text-xl font-bold">
            Connect your LinkedIn to unlock Brand Brain
          </h2>
          <p className="mb-6 max-w-lg text-indigo-100">
            We&apos;ll analyze your posts, learn your voice, and help you create
            better content that drives engagement.
          </p>
          <a
            href="/api/auth/linkedin"
            className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-2.5 font-semibold text-indigo-600 shadow-sm transition-colors hover:bg-indigo-50"
          >
            <Linkedin className="h-4 w-4" />
            Connect LinkedIn
          </a>
        </div>
      )}

      {/* ─── STATE: Connected but need to fetch posts ─── */}
      {needsFetch && (
        <div className="mb-8">
          <FetchProgress />
        </div>
      )}

      {/* ─── STATE: Posts exist but no analysis ─── */}
      {needsAnalysis && (
        <div className="mb-8">
          <AnalyzeProgress autoStart />
        </div>
      )}

      {/* ─── QUICK STATS ─── */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/brand-brain"
          className="animate-fade-in-up rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:border-indigo-200 hover:shadow-md"
        >
          <p className="text-sm font-medium text-slate-500">Posts Analyzed</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {hasPosts ? totalPosts.toLocaleString() : "--"}
          </p>
        </Link>
        <Link
          href="/brand-brain"
          className="animate-fade-in-up rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:border-indigo-200 hover:shadow-md"
        >
          <p className="text-sm font-medium text-slate-500">
            Brand Brain Score
          </p>
          <p
            className={`mt-1 text-2xl font-bold ${
              bbScore !== null
                ? bbScore >= 60
                  ? "text-emerald-600"
                  : bbScore >= 40
                    ? "text-amber-600"
                    : "text-red-500"
                : "text-slate-900"
            }`}
          >
            {bbScore !== null ? `${bbScore}/100` : "--"}
          </p>
        </Link>
        <Link
          href="/analytics"
          className="animate-fade-in-up rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:border-indigo-200 hover:shadow-md"
        >
          <p className="text-sm font-medium text-slate-500">Avg Engagement</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {bbAvgEngagement !== null
              ? fmtEngagement(bbAvgEngagement)
              : hasPosts
                ? fmtEngagement(avgEngagement)
                : "--"}
          </p>
        </Link>
        <Link
          href="/brand-brain"
          className="animate-fade-in-up rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:border-indigo-200 hover:shadow-md"
        >
          <p className="text-sm font-medium text-slate-500">Top Format</p>
          <p className="mt-1 text-2xl font-bold capitalize text-slate-900">
            {topFormat || "--"}
          </p>
        </Link>
      </div>

      {/* ─── BRAND BRAIN SUMMARY CARD ─── */}
      {isFullySetUp && analysis && (
        <div className="animate-fade-in-up mb-8 rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-indigo-500" />
              <h3 className="text-lg font-semibold text-slate-900">
                Brand Brain Insights
              </h3>
            </div>
            <Link
              href="/brand-brain"
              className="flex items-center gap-1 text-sm font-medium text-indigo-500 hover:text-indigo-600"
            >
              View Full Analysis
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
            {/* Mini score */}
            <div className="flex shrink-0 items-center gap-3 rounded-xl bg-gradient-to-br from-indigo-50 to-white px-5 py-4">
              <div
                className={`flex h-14 w-14 items-center justify-center rounded-full border-4 text-xl font-bold ${
                  (bbScore ?? 0) >= 60
                    ? "border-emerald-200 text-emerald-600"
                    : (bbScore ?? 0) >= 40
                      ? "border-amber-200 text-amber-600"
                      : "border-red-200 text-red-500"
                }`}
              >
                {bbScore ?? 0}
              </div>
              <div>
                <p className="text-xs text-slate-400">Overall Score</p>
                <p className="text-sm font-semibold text-slate-700">
                  {(bbScore ?? 0) >= 60
                    ? "Strong"
                    : (bbScore ?? 0) >= 40
                      ? "Growing"
                      : "Early stage"}
                </p>
              </div>
            </div>

            {/* Pills */}
            <div className="flex-1 space-y-3">
              {/* Strengths */}
              {analysis.strengths?.length > 0 && (
                <div>
                  <p className="mb-1.5 text-xs font-medium text-slate-400">
                    Strengths
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {analysis.strengths.slice(0, 3).map((s) => (
                      <span
                        key={s.strength}
                        className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700"
                      >
                        {s.strength}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Top opportunities */}
              {analysis.missed_opportunities?.length > 0 && (
                <div>
                  <p className="mb-1.5 text-xs font-medium text-slate-400">
                    Top Opportunities
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {analysis.missed_opportunities
                      .filter((o) => o.expected_impact === "high")
                      .slice(0, 2)
                      .map((o) => (
                        <span
                          key={o.opportunity}
                          className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700"
                        >
                          {o.opportunity}
                        </span>
                      ))}
                    {/* fallback if no high-impact ones */}
                    {analysis.missed_opportunities.filter(
                      (o) => o.expected_impact === "high"
                    ).length === 0 &&
                      analysis.missed_opportunities.slice(0, 2).map((o) => (
                        <span
                          key={o.opportunity}
                          className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700"
                        >
                          {o.opportunity}
                        </span>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── RECENT POSTS ─── */}
      {hasPosts && (
        <div className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">
              Your Recent LinkedIn Posts
            </h3>
            <Link
              href="/analytics"
              className="text-sm font-medium text-indigo-500 hover:text-indigo-600"
            >
              View all posts
            </Link>
          </div>
          <div className="space-y-3">
            {recentPosts.map((post) => {
              const isAboveAvg = post.engagement_rate > avgEngagement;
              return (
                <div
                  key={post.id}
                  className="animate-fade-in-up rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-all hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-4">
                    <p className="flex-1 text-sm leading-relaxed text-slate-700">
                      {post.content.slice(0, 120)}
                      {post.content.length > 120 ? "..." : ""}
                    </p>
                    <div className="flex shrink-0 items-center gap-1">
                      {isAboveAvg ? (
                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-400" />
                      )}
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-4 text-xs text-slate-400">
                    <span>
                      {formatDistanceToNow(new Date(post.posted_at), {
                        addSuffix: true,
                      })}
                    </span>
                    <span className="flex items-center gap-1">
                      <ThumbsUp className="h-3 w-3" />
                      {post.likes_count}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="h-3 w-3" />
                      {post.comments_count}
                    </span>
                    <span className="flex items-center gap-1">
                      <Repeat2 className="h-3 w-3" />
                      {post.reposts_count}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── POST IDEAS TEASER ─── */}
      {isFullySetUp && analysis?.content_ideas?.length > 0 && (
        <div className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-amber-500" />
              <h3 className="text-lg font-semibold text-slate-900">
                Ready-to-Use Post Ideas
              </h3>
            </div>
            <Link
              href="/brand-brain#post-ideas"
              className="text-sm font-medium text-indigo-500 hover:text-indigo-600"
            >
              See all {analysis.content_ideas.length} ideas
            </Link>
          </div>
          <div className="space-y-3">
            {analysis.content_ideas.slice(0, 3).map((idea, i) => (
              <div
                key={i}
                className="animate-fade-in-up flex items-start gap-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
              >
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-50 text-xs font-semibold text-amber-600">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="mb-1.5 text-sm font-medium leading-snug text-slate-800">
                    {idea.hook}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-600">
                      {idea.topic}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium capitalize text-slate-500">
                      {idea.format}
                    </span>
                  </div>
                </div>
                <Link
                  href={`/create-post?hook=${encodeURIComponent(idea.hook)}`}
                  className="flex shrink-0 items-center gap-1 rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-600"
                >
                  Create Post
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── QUICK ACTIONS ─── */}
      <h3 className="mb-4 text-lg font-semibold text-slate-900">
        Quick Actions
      </h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { href: "/create-post", label: "Create New Post", icon: PenSquare },
          { href: "/calendar", label: "View Calendar", icon: Calendar },
          { href: "/analytics", label: "View Analytics", icon: BarChart3 },
        ].map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="group flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:border-indigo-200 hover:shadow-md"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-500 transition-colors group-hover:bg-indigo-100">
              <action.icon className="h-5 w-5" />
            </div>
            <span className="flex-1 font-medium text-slate-700">
              {action.label}
            </span>
            <ArrowRight className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-indigo-400" />
          </Link>
        ))}
      </div>
    </div>
  );
}
