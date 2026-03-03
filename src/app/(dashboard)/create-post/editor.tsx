"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import {
  Sparkles,
  Wand2,
  Eye,
  ChevronDown,
  ChevronUp,
  Loader2,
  Save,
  Calendar,
  Send,
  AlertCircle,
  CheckCircle2,
  ThumbsUp,
  MessageCircle,
  Repeat2,
  SendHorizontal,
  Globe,
} from "lucide-react";

interface EditorProps {
  userName: string;
  userHeadline: string;
  userAvatar: string | null;
  hasBrandBrain: boolean;
  subscriptionPlan: string;
}

const LINKEDIN_CHAR_LIMIT = 3000;
const SEE_MORE_THRESHOLD = 5; // lines before truncation in preview

export default function CreatePostEditor({
  userName,
  userHeadline,
  userAvatar,
  hasBrandBrain,
  subscriptionPlan,
}: EditorProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const preloadedHook = searchParams.get("hook") || "";

  const [input, setInput] = useState(preloadedHook);
  const [generatedContent, setGeneratedContent] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [format, setFormat] = useState("text");
  const [tone, setTone] = useState("default");
  const [length, setLength] = useState("medium");

  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [showScheduler, setShowScheduler] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("09:00");
  const [previewExpanded, setPreviewExpanded] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // The active content being edited (generated or hand-typed)
  const activeContent = generatedContent || input;
  const wordCount = activeContent.trim()
    ? activeContent.trim().split(/\s+/).length
    : 0;
  const charCount = activeContent.length;
  const isOverLimit = charCount > LINKEDIN_CHAR_LIMIT;

  // Clear success message after a delay
  useEffect(() => {
    if (successMsg) {
      const t = setTimeout(() => setSuccessMsg(""), 4000);
      return () => clearTimeout(t);
    }
  }, [successMsg]);

  const handleGenerate = useCallback(
    async (mode: "generate" | "improve") => {
      const text = mode === "improve" ? generatedContent || input : input;
      if (!text.trim()) return;

      setGenerating(true);
      setError("");

      try {
        const res = await fetch("/api/posts/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topic: text,
            format,
            tone,
            length,
            mode,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          if (data.code === "LIMIT_REACHED") {
            setError(data.message);
          } else {
            setError(data.error || "Failed to generate. Please try again.");
          }
          return;
        }

        setGeneratedContent(data.content);
      } catch {
        setError("Failed to generate. Please try again.");
      } finally {
        setGenerating(false);
      }
    },
    [input, generatedContent, format, tone, length]
  );

  const handleSave = useCallback(
    async (status: "draft" | "scheduled") => {
      const content = generatedContent || input;
      if (!content.trim()) return;

      setSaving(true);
      setError("");

      let scheduled_at: string | undefined;
      if (status === "scheduled" && scheduleDate) {
        scheduled_at = new Date(
          `${scheduleDate}T${scheduleTime}`
        ).toISOString();
      }

      try {
        const res = await fetch("/api/posts/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content,
            post_type: format,
            status,
            scheduled_at,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          if (data.code === "PRO_REQUIRED") {
            setError(data.message);
          } else {
            setError(data.error || "Failed to save.");
          }
          return;
        }

        setSuccessMsg(data.message);
        if (status === "scheduled") {
          setShowScheduler(false);
        }
      } catch {
        setError("Failed to save. Please try again.");
      } finally {
        setSaving(false);
      }
    },
    [generatedContent, input, format, scheduleDate, scheduleTime]
  );

  // Preview text with "see more" behavior
  const previewLines = activeContent.split("\n");
  const shouldTruncate =
    previewLines.length > SEE_MORE_THRESHOLD && !previewExpanded;
  const displayLines = shouldTruncate
    ? previewLines.slice(0, SEE_MORE_THRESHOLD)
    : previewLines;

  return (
    <div className="animate-fade-in-up grid grid-cols-1 gap-6 lg:grid-cols-5">
      {/* ─── LEFT: Editor Panel ─── */}
      <div className="space-y-4 lg:col-span-3">
        {/* Hook pre-loaded banner */}
        {preloadedHook && (
          <div className="flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2.5">
            <Sparkles className="h-4 w-4 text-indigo-500" />
            <span className="text-sm font-medium text-indigo-700">
              Expanding a Brand Brain idea
            </span>
          </div>
        )}

        {/* Input area */}
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <textarea
            value={generatedContent || input}
            onChange={(e) => {
              if (generatedContent) {
                setGeneratedContent(e.target.value);
              } else {
                setInput(e.target.value);
              }
            }}
            className="min-h-[220px] w-full resize-none rounded-lg border border-gray-200 p-4 text-sm leading-relaxed text-slate-700 placeholder:text-slate-400 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            placeholder="What do you want to post about? Enter a topic, a rough idea, or paste content to adapt..."
          />

          {/* Char/word count */}
          <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
            <div className="flex gap-3">
              <span>{wordCount} words</span>
              <span
                className={isOverLimit ? "font-semibold text-red-500" : ""}
              >
                {charCount.toLocaleString()} / {LINKEDIN_CHAR_LIMIT.toLocaleString()} chars
              </span>
            </div>
            {isOverLimit && (
              <span className="font-medium text-red-500">
                Over LinkedIn&apos;s character limit
              </span>
            )}
          </div>

          {/* Action buttons */}
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={() => handleGenerate("generate")}
              disabled={generating || !input.trim()}
              className="flex items-center gap-2 rounded-lg bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-600 disabled:opacity-50"
            >
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Generate Post
            </button>
            <button
              onClick={() => handleGenerate("improve")}
              disabled={generating || !activeContent.trim()}
              className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-gray-50 disabled:opacity-50"
            >
              <Wand2 className="h-4 w-4" />
              Improve This
            </button>
          </div>

          {/* Advanced options */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="mt-4 flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-slate-600"
          >
            Advanced Options
            {showAdvanced ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </button>

          {showAdvanced && (
            <div className="mt-3 grid grid-cols-3 gap-3 rounded-lg bg-slate-50 p-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">
                  Format
                </label>
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-slate-700 focus:border-indigo-300 focus:outline-none"
                >
                  <option value="text">Text post</option>
                  <option value="carousel">Carousel outline</option>
                  <option value="poll">Poll</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">
                  Tone
                </label>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-slate-700 focus:border-indigo-300 focus:outline-none"
                >
                  <option value="default">My voice (default)</option>
                  <option value="casual">More casual</option>
                  <option value="professional">More professional</option>
                  <option value="provocative">More provocative</option>
                  <option value="storytelling">More storytelling</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">
                  Length
                </label>
                <select
                  value={length}
                  onChange={(e) => setLength(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-slate-700 focus:border-indigo-300 focus:outline-none"
                >
                  <option value="short">Short (&lt;100 words)</option>
                  <option value="medium">Medium (100-200)</option>
                  <option value="long">Long (200+)</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Error / Success */}
        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
        {successMsg && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <p className="text-sm font-medium text-emerald-700">{successMsg}</p>
          </div>
        )}
      </div>

      {/* ─── RIGHT: Preview Panel ─── */}
      <div className="space-y-4 lg:col-span-2">
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-500">
            <Eye className="h-4 w-4" />
            LinkedIn Preview
          </div>

          {/* Mock LinkedIn Post */}
          <div className="rounded-lg border border-gray-200 bg-white">
            {/* Header */}
            <div className="flex items-start gap-3 p-4 pb-0">
              {userAvatar ? (
                <Image
                  src={userAvatar}
                  alt={userName}
                  width={48}
                  height={48}
                  className="h-12 w-12 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-lg font-semibold text-indigo-600">
                  {userName.charAt(0)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900">
                  {userName}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {userHeadline}
                </p>
                <p className="flex items-center gap-1 text-xs text-slate-400">
                  1h &middot; <Globe className="h-3 w-3" />
                </p>
              </div>
            </div>

            {/* Post content */}
            <div className="px-4 py-3">
              {activeContent.trim() ? (
                <div className="text-sm leading-relaxed text-slate-800">
                  {displayLines.map((line, i) => (
                    <span key={i}>
                      {line}
                      {i < displayLines.length - 1 && <br />}
                    </span>
                  ))}
                  {shouldTruncate && (
                    <button
                      onClick={() => setPreviewExpanded(true)}
                      className="text-slate-500 hover:text-indigo-500"
                    >
                      ...see more
                    </button>
                  )}
                  {previewExpanded && previewLines.length > SEE_MORE_THRESHOLD && (
                    <button
                      onClick={() => setPreviewExpanded(false)}
                      className="ml-1 text-xs text-slate-400 hover:text-indigo-500"
                    >
                      show less
                    </button>
                  )}
                </div>
              ) : (
                <p className="text-sm italic text-slate-400">
                  Your post will preview here as you type or generate
                  content...
                </p>
              )}
            </div>

            {/* Reactions bar */}
            <div className="mx-4 flex items-center gap-1 border-b border-gray-100 pb-2">
              <span className="text-sm">👍</span>
              <span className="text-sm">❤️</span>
              <span className="text-sm">💡</span>
              <span className="ml-1 text-xs text-slate-400">42</span>
              <span className="ml-auto text-xs text-slate-400">
                3 comments &middot; 1 repost
              </span>
            </div>

            {/* Action bar */}
            <div className="grid grid-cols-4 px-2 py-1">
              {[
                { icon: ThumbsUp, label: "Like" },
                { icon: MessageCircle, label: "Comment" },
                { icon: Repeat2, label: "Repost" },
                { icon: SendHorizontal, label: "Send" },
              ].map(({ icon: Icon, label }) => (
                <button
                  key={label}
                  className="flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-medium text-slate-500"
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <button
              onClick={() => handleSave("draft")}
              disabled={saving || !activeContent.trim()}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-gray-50 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              Save Draft
            </button>
            <button
              onClick={() => setShowScheduler(!showScheduler)}
              disabled={!activeContent.trim()}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-gray-50 disabled:opacity-50"
            >
              <Calendar className="h-4 w-4" />
              Schedule
            </button>
          </div>

          {/* Schedule picker */}
          {showScheduler && (
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="mb-3 grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">
                    Date
                  </label>
                  <input
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-300 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">
                    Time
                  </label>
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-300 focus:outline-none"
                  />
                </div>
              </div>
              <button
                onClick={() => handleSave("scheduled")}
                disabled={saving || !scheduleDate}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-600 disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Calendar className="h-4 w-4" />
                )}
                Schedule Post
              </button>
            </div>
          )}

          <button
            onClick={async () => {
              const content = generatedContent || input;
              if (!content.trim()) return;

              setPublishing(true);
              setError("");

              try {
                const res = await fetch("/api/posts/publish", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ content }),
                });

                const data = await res.json();

                if (!res.ok) {
                  if (data.code === "TOKEN_EXPIRED") {
                    setError(data.message);
                  } else {
                    setError(data.error || "Failed to publish.");
                  }
                  return;
                }

                setSuccessMsg(data.message || "Post published to LinkedIn!");
              } catch {
                setError("Failed to publish. Please try again.");
              } finally {
                setPublishing(false);
              }
            }}
            disabled={publishing || !activeContent.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-600 disabled:opacity-50"
          >
            {publishing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {publishing ? "Publishing..." : "Post Now"}
          </button>
        </div>
      </div>
    </div>
  );
}
