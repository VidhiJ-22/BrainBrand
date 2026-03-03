"use client";

import { useState, useMemo } from "react";
import type { LinkedInPost, BrandBrainAnalysis } from "@/lib/types/database";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  ThumbsUp,
  MessageCircle,
  Eye,
  ArrowUpDown,
  Brain,
  ArrowRight,
  ChevronDown,
} from "lucide-react";
import { format, subDays, subMonths, isAfter } from "date-fns";
import Link from "next/link";

type Period = "7d" | "30d" | "90d" | "all";
type SortKey = "posted_at" | "likes_count" | "comments_count" | "impressions" | "engagement_rate";
type SortDir = "asc" | "desc";

const PERIOD_LABELS: Record<Period, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  all: "All time",
};

const FORMAT_COLORS = [
  "#6366f1", // indigo
  "#f59e0b", // amber
  "#10b981", // emerald
  "#ef4444", // red
  "#8b5cf6", // violet
  "#06b6d4", // cyan
  "#f97316", // orange
];

interface Props {
  posts: LinkedInPost[];
  analysis: BrandBrainAnalysis | null;
}

export default function AnalyticsDashboard({ posts, analysis }: Props) {
  const [period, setPeriod] = useState<Period>("30d");
  const [sortKey, setSortKey] = useState<SortKey>("posted_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [tableExpanded, setTableExpanded] = useState(false);

  // Filter posts by time period
  const filteredPosts = useMemo(() => {
    if (period === "all") return posts;
    const now = new Date();
    const cutoff =
      period === "7d"
        ? subDays(now, 7)
        : period === "30d"
          ? subDays(now, 30)
          : subMonths(now, 3);
    return posts.filter((p) => isAfter(new Date(p.posted_at), cutoff));
  }, [posts, period]);

  // ── Stats ──
  const stats = useMemo(() => {
    const fp = filteredPosts;
    if (fp.length === 0) {
      return {
        totalPosts: 0,
        totalImpressions: 0,
        avgEngagement: 0,
        totalLikes: 0,
        totalComments: 0,
      };
    }
    const totalImpressions = fp.reduce((s, p) => s + (p.impressions || 0), 0);
    const avgEngagement =
      fp.reduce((s, p) => s + (p.engagement_rate || 0), 0) / fp.length;
    const totalLikes = fp.reduce((s, p) => s + (p.likes_count || 0), 0);
    const totalComments = fp.reduce((s, p) => s + (p.comments_count || 0), 0);
    return {
      totalPosts: fp.length,
      totalImpressions,
      avgEngagement,
      totalLikes,
      totalComments,
    };
  }, [filteredPosts]);

  // ── Engagement over time (area chart) ──
  const engagementTimeline = useMemo(() => {
    return filteredPosts.map((p) => ({
      date: format(new Date(p.posted_at), "MMM d"),
      engagement: +(p.engagement_rate || 0).toFixed(2),
      likes: p.likes_count || 0,
      comments: p.comments_count || 0,
    }));
  }, [filteredPosts]);

  // ── Format breakdown ──
  const formatBreakdown = useMemo(() => {
    const map: Record<string, { count: number; engagement: number }> = {};
    filteredPosts.forEach((p) => {
      const f = p.post_type || "text";
      if (!map[f]) map[f] = { count: 0, engagement: 0 };
      map[f].count++;
      map[f].engagement += p.engagement_rate || 0;
    });
    return Object.entries(map)
      .map(([format, d]) => ({
        format,
        count: d.count,
        avgEngagement: +(d.engagement / d.count).toFixed(2),
      }))
      .sort((a, b) => b.count - a.count);
  }, [filteredPosts]);

  // ── Sorted table posts ──
  const sortedPosts = useMemo(() => {
    const sorted = [...filteredPosts].sort((a, b) => {
      const av = a[sortKey] ?? 0;
      const bv = b[sortKey] ?? 0;
      if (typeof av === "string" && typeof bv === "string") {
        return sortDir === "asc"
          ? av.localeCompare(bv)
          : bv.localeCompare(av);
      }
      return sortDir === "asc"
        ? (av as number) - (bv as number)
        : (bv as number) - (av as number);
    });
    return sorted;
  }, [filteredPosts, sortKey, sortDir]);

  const displayedPosts = tableExpanded ? sortedPosts : sortedPosts.slice(0, 10);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  function fmtNum(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toLocaleString();
  }

  return (
    <div>
      {/* ── Period selector ── */}
      <div className="mb-6 flex items-center gap-2">
        {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              period === p
                ? "bg-indigo-500 text-white shadow-sm"
                : "bg-white text-slate-600 hover:bg-gray-50 border border-gray-200"
            }`}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {/* ── Stats cards ── */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          {
            label: "Total Posts",
            value: stats.totalPosts.toString(),
            icon: null,
          },
          {
            label: "Total Impressions",
            value: fmtNum(stats.totalImpressions),
            icon: Eye,
          },
          {
            label: "Avg Engagement",
            value: `${stats.avgEngagement.toFixed(1)}%`,
            icon: stats.avgEngagement >= 2 ? TrendingUp : TrendingDown,
            color: stats.avgEngagement >= 2 ? "text-emerald-600" : "text-amber-600",
          },
          {
            label: "Total Likes",
            value: fmtNum(stats.totalLikes),
            icon: ThumbsUp,
          },
          {
            label: "Total Comments",
            value: fmtNum(stats.totalComments),
            icon: MessageCircle,
          },
        ].map((s) => (
          <div
            key={s.label}
            className="animate-fade-in-up rounded-xl border border-gray-100 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">{s.label}</p>
              {s.icon && (
                <s.icon
                  className={`h-4 w-4 ${s.color || "text-slate-400"}`}
                />
              )}
            </div>
            <p className={`mt-1 text-2xl font-bold ${s.color || "text-slate-900"}`}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* ── Engagement chart ── */}
      <div className="mb-8 animate-fade-in-up rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-slate-900">
          Engagement Over Time
        </h3>
        {engagementTimeline.length > 1 ? (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={engagementTimeline}>
              <defs>
                <linearGradient id="engGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "12px",
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 4px 6px -1px rgba(0,0,0,.1)",
                  fontSize: 13,
                }}
                formatter={(value) => [`${value}%`, "Engagement"]}
              />
              <Area
                type="monotone"
                dataKey="engagement"
                stroke="#6366f1"
                strokeWidth={2}
                fill="url(#engGrad)"
                dot={{ r: 3, fill: "#6366f1", strokeWidth: 0 }}
                activeDot={{ r: 5, fill: "#6366f1" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-[300px] items-center justify-center text-sm text-slate-400">
            Not enough data points for this time period.
          </div>
        )}
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* ── Format breakdown chart ── */}
        <div className="animate-fade-in-up rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-slate-900">
            Format Breakdown
          </h3>
          {formatBreakdown.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={formatBreakdown} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 12, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="format"
                    tick={{ fontSize: 12, fill: "#64748b" }}
                    axisLine={false}
                    tickLine={false}
                    width={80}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "12px",
                      border: "1px solid #e2e8f0",
                      fontSize: 13,
                    }}
                    formatter={(value, name) => [
                      name === "count" ? `${value} posts` : `${value}%`,
                      name === "count" ? "Posts" : "Avg Engagement",
                    ]}
                  />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={20}>
                    {formatBreakdown.map((_, i) => (
                      <Cell
                        key={i}
                        fill={FORMAT_COLORS[i % FORMAT_COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-3 flex flex-wrap gap-2">
                {formatBreakdown.map((f, i) => (
                  <span
                    key={f.format}
                    className="flex items-center gap-1.5 text-xs text-slate-500"
                  >
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-sm"
                      style={{
                        backgroundColor:
                          FORMAT_COLORS[i % FORMAT_COLORS.length],
                      }}
                    />
                    <span className="capitalize">{f.format}</span>
                    <span className="text-slate-400">
                      ({f.avgEngagement}% avg)
                    </span>
                  </span>
                ))}
              </div>
            </>
          ) : (
            <div className="flex h-[220px] items-center justify-center text-sm text-slate-400">
              No posts in this period.
            </div>
          )}
        </div>

        {/* ── Brand Brain context panel ── */}
        <div className="animate-fade-in-up rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-indigo-500" />
              <h3 className="text-lg font-semibold text-slate-900">
                AI Insights
              </h3>
            </div>
            {analysis && (
              <Link
                href="/brand-brain"
                className="flex items-center gap-1 text-sm font-medium text-indigo-500 hover:text-indigo-600"
              >
                Full Analysis
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>

          {analysis ? (
            <div className="space-y-4">
              {/* Top performing topics */}
              {analysis.performance_insights?.top_performing_topics?.length >
                0 && (
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-400">
                    Top Topics
                  </p>
                  <div className="space-y-2">
                    {analysis.performance_insights.top_performing_topics
                      .slice(0, 3)
                      .map((t) => (
                        <div
                          key={t.topic}
                          className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2"
                        >
                          <span className="text-sm font-medium text-emerald-800">
                            {t.topic}
                          </span>
                          <span className="text-xs text-emerald-600">
                            {t.avg_engagement.toFixed(1)}% avg
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Underperforming topics */}
              {analysis.performance_insights?.underperforming_topics?.length >
                0 && (
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-400">
                    Needs Improvement
                  </p>
                  <div className="space-y-2">
                    {analysis.performance_insights.underperforming_topics
                      .slice(0, 2)
                      .map((t) => (
                        <div
                          key={t.topic}
                          className="flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2"
                        >
                          <span className="text-sm font-medium text-amber-800">
                            {t.topic}
                          </span>
                          <span className="text-xs text-amber-600">
                            {t.engagement.toFixed(1)}% avg
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Best post highlight */}
              {analysis.performance_insights?.best_post && (
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-400">
                    Best Post
                  </p>
                  <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-3">
                    <p className="mb-1 text-sm text-indigo-900">
                      &ldquo;{analysis.performance_insights.best_post.content_preview.slice(0, 80)}...&rdquo;
                    </p>
                    <p className="text-xs text-indigo-600">
                      {analysis.performance_insights.best_post.why_it_worked}
                    </p>
                  </div>
                </div>
              )}

              {/* Format recommendations */}
              {analysis.performance_insights?.format_performance?.length >
                0 && (
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-400">
                    Format Tips
                  </p>
                  <div className="space-y-1">
                    {analysis.performance_insights.format_performance
                      .slice(0, 3)
                      .map((f) => (
                        <p key={f.format} className="text-xs text-slate-600">
                          <span className="font-medium capitalize">
                            {f.format}:
                          </span>{" "}
                          {f.recommendation}
                        </p>
                      ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Brain className="mb-3 h-8 w-8 text-slate-200" />
              <p className="mb-1 text-sm font-medium text-slate-500">
                No Brand Brain analysis yet
              </p>
              <p className="mb-4 text-xs text-slate-400">
                Run an analysis to get AI-powered insights
              </p>
              <Link
                href="/brand-brain"
                className="rounded-lg bg-indigo-500 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-indigo-600"
              >
                Go to Brand Brain
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* ── Post Performance Table ── */}
      <div className="animate-fade-in-up rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-6 py-4">
          <h3 className="font-semibold text-slate-900">Post Performance</h3>
        </div>

        {filteredPosts.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-50 text-left">
                    <th className="px-6 py-3 font-medium text-slate-500">
                      Content
                    </th>
                    <th className="px-6 py-3 font-medium text-slate-500">
                      Type
                    </th>
                    <SortableHeader
                      label="Date"
                      sortKey="posted_at"
                      currentSort={sortKey}
                      dir={sortDir}
                      onToggle={toggleSort}
                    />
                    <SortableHeader
                      label="Likes"
                      sortKey="likes_count"
                      currentSort={sortKey}
                      dir={sortDir}
                      onToggle={toggleSort}
                    />
                    <SortableHeader
                      label="Comments"
                      sortKey="comments_count"
                      currentSort={sortKey}
                      dir={sortDir}
                      onToggle={toggleSort}
                    />
                    <SortableHeader
                      label="Impressions"
                      sortKey="impressions"
                      currentSort={sortKey}
                      dir={sortDir}
                      onToggle={toggleSort}
                    />
                    <SortableHeader
                      label="Engagement"
                      sortKey="engagement_rate"
                      currentSort={sortKey}
                      dir={sortDir}
                      onToggle={toggleSort}
                    />
                  </tr>
                </thead>
                <tbody>
                  {displayedPosts.map((post) => (
                    <tr
                      key={post.id}
                      className="border-b border-gray-50 transition-colors hover:bg-gray-50/50"
                    >
                      <td className="max-w-[280px] truncate px-6 py-3 text-slate-700">
                        {post.content.slice(0, 80)}
                        {post.content.length > 80 ? "..." : ""}
                      </td>
                      <td className="px-6 py-3">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium capitalize text-slate-600">
                          {post.post_type}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-3 text-slate-500">
                        {format(new Date(post.posted_at), "MMM d, yyyy")}
                      </td>
                      <td className="px-6 py-3 text-slate-700">
                        {fmtNum(post.likes_count)}
                      </td>
                      <td className="px-6 py-3 text-slate-700">
                        {fmtNum(post.comments_count)}
                      </td>
                      <td className="px-6 py-3 text-slate-700">
                        {fmtNum(post.impressions)}
                      </td>
                      <td className="px-6 py-3">
                        <span
                          className={`font-medium ${
                            post.engagement_rate >= 3
                              ? "text-emerald-600"
                              : post.engagement_rate >= 1
                                ? "text-amber-600"
                                : "text-slate-500"
                          }`}
                        >
                          {post.engagement_rate.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {sortedPosts.length > 10 && (
              <div className="border-t border-gray-50 px-6 py-3 text-center">
                <button
                  onClick={() => setTableExpanded((e) => !e)}
                  className="inline-flex items-center gap-1 text-sm font-medium text-indigo-500 hover:text-indigo-600"
                >
                  {tableExpanded
                    ? "Show less"
                    : `Show all ${sortedPosts.length} posts`}
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${
                      tableExpanded ? "rotate-180" : ""
                    }`}
                  />
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="px-6 py-12 text-center text-sm text-slate-400">
            No posts in this time period.
          </div>
        )}
      </div>
    </div>
  );
}

function SortableHeader({
  label,
  sortKey,
  currentSort,
  dir,
  onToggle,
}: {
  label: string;
  sortKey: SortKey;
  currentSort: SortKey;
  dir: SortDir;
  onToggle: (key: SortKey) => void;
}) {
  const isActive = currentSort === sortKey;
  return (
    <th className="px-6 py-3">
      <button
        onClick={() => onToggle(sortKey)}
        className={`inline-flex items-center gap-1 font-medium transition-colors ${
          isActive ? "text-indigo-600" : "text-slate-500 hover:text-slate-700"
        }`}
      >
        {label}
        <ArrowUpDown className={`h-3 w-3 ${isActive ? "text-indigo-500" : "text-slate-300"}`} />
        {isActive && (
          <span className="text-[10px]">{dir === "asc" ? "↑" : "↓"}</span>
        )}
      </button>
    </th>
  );
}
