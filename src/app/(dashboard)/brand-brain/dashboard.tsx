"use client";

import type { BrandBrainAnalysis } from "@/lib/types/database";
import ScoreGauge, { ScoreBar } from "@/components/score-gauge";
import Link from "next/link";
import {
  Mic,
  TrendingUp,
  Sprout,
  LayoutGrid,
  Clock,
  Trophy,
  Target,
  Star,
  Lightbulb,
  ArrowRight,
  Quote,
} from "lucide-react";

interface BrandBrainDashboardProps {
  analysis: BrandBrainAnalysis;
}

function fmt(n: number | undefined | null): string {
  if (n == null) return "0";
  if (n >= 1000) return n.toLocaleString();
  if (Number.isInteger(n)) return n.toString();
  return n.toFixed(1);
}

const IMPACT_COLORS = {
  high: "bg-red-100 text-red-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-slate-100 text-slate-600",
};

const TONE_TAG_COLORS = [
  "bg-indigo-50 text-indigo-600",
  "bg-emerald-50 text-emerald-600",
  "bg-amber-50 text-amber-700",
  "bg-rose-50 text-rose-600",
  "bg-sky-50 text-sky-600",
];

const STRENGTH_ICONS = [Trophy, Target, Star];

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const TIMES = ["Morning", "Afternoon", "Evening"];

export default function BrandBrainDashboard({
  analysis,
}: BrandBrainDashboardProps) {
  const { voice_profile: voice, performance_insights: perf, posting_patterns: patterns, brand_brain_score: score } = analysis;

  return (
    <div className="space-y-6">
      {/* ─── SECTION 1: BRAND BRAIN SCORE ─── */}
      <section className="animate-fade-in-up rounded-xl border border-gray-100 bg-gradient-to-br from-indigo-50/60 to-white p-8 shadow-sm">
        <div className="flex flex-col items-center gap-8 md:flex-row md:items-start">
          <ScoreGauge score={score?.overall ?? 0} />
          <div className="flex-1 space-y-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Brand Brain Score
              </h3>
              <p className="text-sm text-slate-500">
                {(score?.overall ?? 0) >= 80
                  ? "Exceptional — you're a top LinkedIn creator"
                  : (score?.overall ?? 0) >= 60
                    ? "Strong — you have clear strengths to build on"
                    : (score?.overall ?? 0) >= 40
                      ? "Growing — solid foundation with room to improve"
                      : "Getting started — lots of opportunities ahead"}
              </p>
            </div>
            {score?.breakdown && (
              <div className="space-y-2.5">
                <ScoreBar label="Voice Clarity" score={score.breakdown.voice_clarity} />
                <ScoreBar label="Topic Authority" score={score.breakdown.topic_authority} />
                <ScoreBar label="Engagement Power" score={score.breakdown.engagement_power} />
                <ScoreBar label="Consistency" score={score.breakdown.consistency} />
                <ScoreBar label="Content Variety" score={score.breakdown.content_variety} />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ─── SECTION 2: YOUR VOICE ─── */}
      {voice && (
        <section className="animate-fade-in-up rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Mic className="h-5 w-5 text-indigo-500" />
            <h3 className="text-lg font-semibold text-slate-900">Your Voice</h3>
          </div>

          <p className="mb-4 text-sm leading-relaxed text-slate-600">
            {voice.overall_tone}
          </p>

          <div className="mb-5 flex flex-wrap gap-2">
            {voice.tone_tags?.map((tag, i) => (
              <span
                key={tag}
                className={`rounded-full px-3 py-1 text-xs font-medium ${TONE_TAG_COLORS[i % TONE_TAG_COLORS.length]}`}
              >
                {tag}
              </span>
            ))}
          </div>

          <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
                How You Open
              </p>
              <p className="text-sm text-slate-700">{voice.hook_style}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
                How You Close
              </p>
              <p className="text-sm text-slate-700">{voice.cta_style}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 text-xs text-slate-500">
            <span>Avg length: <strong className="text-slate-700">{voice.avg_post_length_words} words</strong></span>
            <span>Emoji use: <strong className="text-slate-700">{voice.emoji_usage}</strong></span>
            <span>Hashtags: <strong className="text-slate-700">{voice.hashtag_usage}</strong></span>
            <span>Vocabulary: <strong className="text-slate-700">{voice.vocabulary_level}</strong></span>
          </div>

          {voice.signature_phrases?.length > 0 && (
            <div className="mt-4 border-t border-gray-100 pt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                Your Signature Phrases
              </p>
              <div className="flex flex-wrap gap-2">
                {voice.signature_phrases.map((phrase) => (
                  <span
                    key={phrase}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50/70 px-3 py-1.5 text-sm italic text-indigo-700"
                  >
                    <Quote className="h-3 w-3" />
                    {phrase}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ─── SECTION 3: WHAT'S WORKING vs WHAT'S NOT ─── */}
      {perf && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* What's Working */}
          <section className="animate-fade-in-up rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-500" />
              <h3 className="text-lg font-semibold text-slate-900">What&apos;s Working</h3>
            </div>

            <div className="space-y-4">
              {perf.top_performing_topics?.map((topic) => (
                <div key={topic.topic}>
                  <div className="mb-1 flex items-baseline justify-between">
                    <span className="text-sm font-semibold text-slate-800">{topic.topic}</span>
                    <span className="text-xs text-slate-500">
                      {topic.post_count} posts &middot; {fmt(topic.avg_engagement)} avg
                    </span>
                  </div>
                  <div className="mb-1 h-1.5 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-emerald-400"
                      style={{
                        width: `${Math.min(100, (topic.avg_engagement / (perf.top_performing_topics[0]?.avg_engagement || 1)) * 100)}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-slate-400">{topic.why_it_works}</p>
                </div>
              ))}
            </div>

            {perf.best_post && (
              <div className="mt-5 rounded-lg border border-emerald-100 bg-emerald-50/50 p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-600">
                  Your Best Post
                </p>
                <p className="mb-2 border-l-2 border-emerald-300 pl-3 text-sm italic text-slate-700">
                  {perf.best_post.content_preview}
                </p>
                <p className="mb-1 text-xs font-semibold text-emerald-700">
                  Engagement: {fmt(perf.best_post.engagement)}
                </p>
                <p className="text-xs text-slate-500">{perf.best_post.why_it_worked}</p>
              </div>
            )}
          </section>

          {/* Room to Grow */}
          <section className="animate-fade-in-up rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Sprout className="h-5 w-5 text-amber-500" />
              <h3 className="text-lg font-semibold text-slate-900">Room to Grow</h3>
            </div>

            <div className="space-y-4">
              {perf.underperforming_topics?.map((topic) => (
                <div key={topic.topic}>
                  <div className="mb-1 flex items-baseline justify-between">
                    <span className="text-sm font-semibold text-slate-800">{topic.topic}</span>
                    <span className="text-xs text-slate-500">
                      {topic.post_count} posts &middot; {fmt(topic.engagement)} eng
                    </span>
                  </div>
                  <div className="mb-1 h-1.5 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-amber-300"
                      style={{
                        width: `${Math.min(100, Math.max(15, (topic.engagement / (perf.top_performing_topics[0]?.avg_engagement || 1)) * 100))}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-slate-400">{topic.why_it_underperforms}</p>
                </div>
              ))}
            </div>

            {perf.worst_post && (
              <div className="mt-5 rounded-lg border border-amber-100 bg-amber-50/50 p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-amber-600">
                  Lowest Performer
                </p>
                <p className="mb-2 border-l-2 border-amber-300 pl-3 text-sm italic text-slate-700">
                  {perf.worst_post.content_preview}
                </p>
                <p className="mb-1 text-xs font-semibold text-amber-700">
                  Engagement: {fmt(perf.worst_post.engagement)}
                </p>
                <p className="text-xs text-slate-500">{perf.worst_post.why_it_flopped}</p>
              </div>
            )}
          </section>
        </div>
      )}

      {/* ─── SECTION 4: FORMAT BREAKDOWN ─── */}
      {perf?.format_performance && perf.format_performance.length > 0 && (
        <section className="animate-fade-in-up rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <LayoutGrid className="h-5 w-5 text-indigo-500" />
            <h3 className="text-lg font-semibold text-slate-900">Content Formats</h3>
          </div>

          <div className="space-y-3">
            {perf.format_performance.map((f, i) => {
              const maxEng = perf.format_performance[0]?.avg_engagement || 1;
              const isBest = i === 0 && f.post_count > 0;
              const neverTried = f.post_count === 0;

              return (
                <div
                  key={f.format}
                  className={`flex items-center gap-4 ${neverTried ? "opacity-50" : ""}`}
                >
                  <span className="w-20 shrink-0 text-sm font-medium capitalize text-slate-700">
                    {f.format}
                    {isBest && (
                      <span className="ml-1.5 inline-flex items-center text-xs text-amber-500">
                        <Star className="mr-0.5 h-3 w-3" fill="currentColor" />
                        Best
                      </span>
                    )}
                  </span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        isBest ? "bg-indigo-500" : "bg-indigo-300"
                      }`}
                      style={{
                        width: neverTried
                          ? "0%"
                          : `${Math.max(5, (f.avg_engagement / maxEng) * 100)}%`,
                      }}
                    />
                  </div>
                  <span className="w-16 text-right text-sm text-slate-500">
                    {neverTried ? "--" : fmt(f.avg_engagement)}
                  </span>
                  <span className="w-16 text-right text-xs text-slate-400">
                    {f.post_count} posts
                  </span>
                </div>
              );
            })}
          </div>

          {/* Nudge for unused formats */}
          {perf.format_performance.some((f) => f.post_count === 0) && (
            <p className="mt-4 text-xs text-slate-400">
              Formats with 0 posts could be untapped opportunities. Brand Brain suggests trying new formats to see what resonates.
            </p>
          )}
        </section>
      )}

      {/* ─── SECTION 5: POSTING PATTERNS ─── */}
      {patterns && (
        <section className="animate-fade-in-up rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-indigo-500" />
            <h3 className="text-lg font-semibold text-slate-900">Your Rhythm</h3>
          </div>

          <div className="flex flex-col gap-6 lg:flex-row">
            {/* Mini heatmap */}
            <div className="shrink-0">
              <div className="mb-1 grid grid-cols-[auto_repeat(7,1fr)] gap-1 text-center">
                <div />
                {DAYS.map((d) => (
                  <div key={d} className="text-[10px] font-medium text-slate-400">
                    {d}
                  </div>
                ))}
                {TIMES.map((time) => (
                  <>
                    <div
                      key={`label-${time}`}
                      className="flex items-center pr-2 text-[10px] text-slate-400"
                    >
                      {time}
                    </div>
                    {DAYS.map((day) => {
                      const isBestDay = patterns.best_performing_days?.some(
                        (d) => d.toLowerCase().startsWith(day.toLowerCase())
                      );
                      const isMostActive = patterns.most_active_days?.some(
                        (d) => d.toLowerCase().startsWith(day.toLowerCase())
                      );
                      const intensity = isBestDay ? 3 : isMostActive ? 2 : 0;

                      return (
                        <div
                          key={`${day}-${time}`}
                          className={`h-7 w-7 rounded ${
                            intensity === 3
                              ? "bg-indigo-500"
                              : intensity === 2
                                ? "bg-indigo-200"
                                : "bg-gray-100"
                          }`}
                          title={`${day} ${time}`}
                        />
                      );
                    })}
                  </>
                ))}
              </div>
              <div className="mt-2 flex items-center gap-3 text-[10px] text-slate-400">
                <span className="flex items-center gap-1">
                  <div className="h-3 w-3 rounded bg-gray-100" /> Less active
                </span>
                <span className="flex items-center gap-1">
                  <div className="h-3 w-3 rounded bg-indigo-200" /> Active
                </span>
                <span className="flex items-center gap-1">
                  <div className="h-3 w-3 rounded bg-indigo-500" /> Best performing
                </span>
              </div>
            </div>

            {/* Stats */}
            <div className="flex-1 space-y-3">
              <div className="rounded-lg bg-slate-50 p-3">
                <span className="text-xs text-slate-400">Posting frequency</span>
                <p className="text-sm font-semibold text-slate-800">
                  ~{fmt(patterns.avg_posts_per_week)} posts per week
                </p>
              </div>
              {patterns.best_performing_days?.length > 0 && (
                <div className="rounded-lg bg-slate-50 p-3">
                  <span className="text-xs text-slate-400">Best days</span>
                  <p className="text-sm font-semibold text-slate-800">
                    {patterns.best_performing_days.join(", ")}
                  </p>
                </div>
              )}
              {patterns.best_performing_times?.length > 0 && (
                <div className="rounded-lg bg-slate-50 p-3">
                  <span className="text-xs text-slate-400">Best times</span>
                  <p className="text-sm font-semibold text-slate-800">
                    {patterns.best_performing_times.join(", ")}
                  </p>
                </div>
              )}
              <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white ${
                    patterns.consistency_score >= 7
                      ? "bg-emerald-500"
                      : patterns.consistency_score >= 4
                        ? "bg-amber-500"
                        : "bg-red-400"
                  }`}
                >
                  {patterns.consistency_score}
                </div>
                <div>
                  <p className="text-xs text-slate-400">Consistency score</p>
                  <p className="text-sm text-slate-600">{patterns.consistency_feedback}</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ─── SECTION 6: STRENGTHS & OPPORTUNITIES ─── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Strengths */}
        {analysis.strengths?.length > 0 && (
          <section className="animate-fade-in-up rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Trophy className="h-5 w-5 text-indigo-500" />
              <h3 className="text-lg font-semibold text-slate-900">Your Strengths</h3>
            </div>
            <div className="space-y-4">
              {analysis.strengths.map((s, i) => {
                const Icon = STRENGTH_ICONS[i % STRENGTH_ICONS.length];
                return (
                  <div key={s.strength} className="flex gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-500">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{s.strength}</p>
                      <p className="text-sm leading-relaxed text-slate-500">{s.detail}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Missed Opportunities */}
        {analysis.missed_opportunities?.length > 0 && (
          <section className="animate-fade-in-up rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Target className="h-5 w-5 text-amber-500" />
              <h3 className="text-lg font-semibold text-slate-900">Missed Opportunities</h3>
            </div>
            <div className="space-y-4">
              {analysis.missed_opportunities.map((o) => (
                <div
                  key={o.opportunity}
                  className={`rounded-lg border p-4 ${
                    o.expected_impact === "high"
                      ? "border-amber-200 bg-amber-50/30"
                      : "border-gray-100"
                  }`}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-800">{o.opportunity}</p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                        IMPACT_COLORS[o.expected_impact] || IMPACT_COLORS.low
                      }`}
                    >
                      {o.expected_impact} impact
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-slate-500">{o.detail}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* ─── SECTION 7: POST IDEAS ─── */}
      {analysis.content_ideas?.length > 0 && (
        <section className="animate-fade-in-up rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-1 flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-amber-500" />
            <h3 className="text-lg font-semibold text-slate-900">
              {analysis.content_ideas.length} Posts Written For You
            </h3>
          </div>
          <p className="mb-6 text-sm text-slate-500">
            Click any hook to expand it into a full post draft
          </p>

          <div className="divide-y divide-gray-100">
            {analysis.content_ideas.map((idea, i) => (
              <div
                key={i}
                className="flex items-start gap-4 py-4 first:pt-0 last:pb-0"
              >
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-500">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="mb-2 text-[15px] font-medium leading-snug text-slate-800">
                    {idea.hook}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-medium text-indigo-600">
                      {idea.topic}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium capitalize text-slate-600">
                      {idea.format}
                    </span>
                    <span className="text-xs text-slate-400">{idea.why}</span>
                  </div>
                </div>
                <Link
                  href={`/create-post?hook=${encodeURIComponent(idea.hook)}`}
                  className="mt-1 flex shrink-0 items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-indigo-600 transition-colors hover:border-indigo-200 hover:bg-indigo-50"
                >
                  Create Post
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
