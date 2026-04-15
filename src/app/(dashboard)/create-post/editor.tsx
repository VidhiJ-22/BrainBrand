"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import PostAnalysisPanel from "@/components/post-analysis-panel";
import { toBold, toItalic } from "@/lib/unicode-formatter";
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
  PenLine,
  Bold,
  Italic,
  CornerDownLeft,
  List,
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
  const [tone, setTone] = useState("");
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
  const [publishedPostId, setPublishedPostId] = useState("");
  const [hashtagSuggestions, setHashtagSuggestions] = useState<string[]>([]);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(
    searchParams.get("draft") || null
  );
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [storyPlaceholders, setStoryPlaceholders] = useState<
    { prompt: string; hint: string; answer: string; raw: string }[]
  >([]);
  const [showStorySection, setShowStorySection] = useState(false);
  const [originalTopic, setOriginalTopic] = useState("");
  const [hasStoryContext, setHasStoryContext] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Formatting toolbar helpers ──
  const updateContent = useCallback(
    (newValue: string) => {
      if (generatedContent) {
        setGeneratedContent(newValue);
      } else {
        setInput(newValue);
      }
    },
    [generatedContent]
  );

  const applyFormat = useCallback(
    (transform: (text: string) => string, placeholder: string) => {
      const ta = textareaRef.current;
      if (!ta) return;
      const content = generatedContent || input;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;

      if (start === end) {
        // No selection — insert placeholder
        const before = content.slice(0, start);
        const after = content.slice(end);
        const inserted = placeholder;
        const newContent = before + inserted + after;
        updateContent(newContent);
        requestAnimationFrame(() => {
          ta.focus();
          ta.selectionStart = start + inserted.length;
          ta.selectionEnd = start + inserted.length;
        });
      } else {
        // Transform selected text
        const before = content.slice(0, start);
        const selected = content.slice(start, end);
        const after = content.slice(end);
        const formatted = transform(selected);
        const newContent = before + formatted + after;
        updateContent(newContent);
        requestAnimationFrame(() => {
          ta.focus();
          ta.selectionStart = start;
          ta.selectionEnd = start + formatted.length;
        });
      }
    },
    [generatedContent, input, updateContent]
  );

  const insertLineBreak = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    const content = generatedContent || input;
    const pos = ta.selectionStart;
    const newContent = content.slice(0, pos) + "\n\n" + content.slice(pos);
    updateContent(newContent);
    requestAnimationFrame(() => {
      ta.focus();
      ta.selectionStart = pos + 2;
      ta.selectionEnd = pos + 2;
    });
  }, [generatedContent, input, updateContent]);

  const insertBullet = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    const content = generatedContent || input;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;

    if (start === end) {
      // Find start of current line and prepend bullet
      const lineStart = content.lastIndexOf("\n", start - 1) + 1;
      const newContent =
        content.slice(0, lineStart) + "• " + content.slice(lineStart);
      updateContent(newContent);
      requestAnimationFrame(() => {
        ta.focus();
        ta.selectionStart = start + 2;
        ta.selectionEnd = start + 2;
      });
    } else {
      // Add bullet to each selected line
      const before = content.slice(0, start);
      const selected = content.slice(start, end);
      const after = content.slice(end);
      const bulleted = selected
        .split("\n")
        .map((line) => (line.trim() ? "• " + line : line))
        .join("\n");
      const newContent = before + bulleted + after;
      updateContent(newContent);
      requestAnimationFrame(() => {
        ta.focus();
        ta.selectionStart = start;
        ta.selectionEnd = start + bulleted.length;
      });
    }
  }, [generatedContent, input, updateContent]);

  // Hide story section if user manually removes all brackets
  useEffect(() => {
    if (showStorySection && generatedContent && !/\[[^\]]+\]/.test(generatedContent)) {
      setShowStorySection(false);
    }
  }, [generatedContent, showStorySection]);

  // The active content being edited (generated or hand-typed)
  const activeContent = generatedContent || input;
  const wordCount = activeContent.trim()
    ? activeContent.trim().split(/\s+/).length
    : 0;
  const charCount = activeContent.length;
  const isOverLimit = charCount > LINKEDIN_CHAR_LIMIT;

  // Show toast when redirected from LinkedIn OAuth
  useEffect(() => {
    if (searchParams.get("linkedin") === "connected") {
      setSuccessMsg("LinkedIn connected! You can now publish posts directly.");
      window.history.replaceState({}, "", "/create-post");
    }
  }, [searchParams]);

  // Clear success message after a delay
  useEffect(() => {
    if (successMsg) {
      const t = setTimeout(() => setSuccessMsg(""), 4000);
      return () => clearTimeout(t);
    }
  }, [successMsg]);

  const extractPlaceholders = useCallback(
    (text: string) => {
      const regex = /\[([^\]]+)\]/g;
      const matches: { prompt: string; hint: string; answer: string; raw: string }[] = [];
      let match;
      while ((match = regex.exec(text)) !== null) {
        const inner = match[1];
        const raw = match[0];
        const egSplit = inner.split(/e\.g\.?,?\s*/i);
        const prompt = egSplit[0].trim();
        const hint = egSplit.length > 1 ? egSplit.slice(1).join("").trim() : "";
        matches.push({ prompt, hint, answer: "", raw });
      }
      return matches;
    },
    []
  );

  const handleGenerate = useCallback(
    async (mode: "generate" | "improve", story?: string) => {
      const text = mode === "improve" ? generatedContent || input : input;
      if (!text.trim()) return;

      // Clear story answers when generating with a new topic
      const isNewTopic = mode === "generate" && !story && text !== originalTopic;
      if (isNewTopic) {
        setStoryPlaceholders([]);
        setHasStoryContext(false);
      }
      if (mode === "generate" && !story) {
        setOriginalTopic(text);
      }
      // Track whether this generation includes a user-provided story
      if (story) {
        setHasStoryContext(true);
      }

      setShowStorySection(false);
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
            personal_story: story || undefined,
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

        // Parse hashtag suggestions from response
        const rawContent = data.content as string;
        const hashtagSplit = rawContent.split(/\nHASHTAGS:\s*/i);
        const postContent = hashtagSplit[0].trimEnd();
        if (hashtagSplit[1]) {
          const tags = hashtagSplit[1]
            .split(",")
            .map((t: string) => t.trim())
            .filter((t: string) => t.startsWith("#"));
          setHashtagSuggestions(tags);
        }
        setGeneratedContent(postContent);

        // Extract placeholders for post-generation story flow
        const placeholders = extractPlaceholders(postContent);
        if (placeholders.length > 0) {
          // Preserve existing answers if prompts match
          setStoryPlaceholders((prev) => {
            if (prev.length === 0) return placeholders;
            return placeholders.map((p) => {
              const existing = prev.find((e) => e.raw === p.raw);
              return existing ? { ...p, answer: existing.answer } : p;
            });
          });
          setShowStorySection(true);
        } else {
          setShowStorySection(false);
        }
      } catch {
        setError("Failed to generate. Please try again.");
      } finally {
        setGenerating(false);
      }
    },
    [input, generatedContent, format, tone, length, originalTopic, extractPlaceholders]
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
            draft_id: currentDraftId || undefined,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          if (data.code === "PRO_REQUIRED") {
            setError(data.message);
          } else {
            setError(data.error || "Failed to save draft. Please try again.");
          }
          return;
        }

        if (data.draft?.id) {
          setCurrentDraftId(data.draft.id);
          console.log("[save] Draft ID:", data.draft.id);
        }
        setLastSavedAt(
          new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        );
        setSuccessMsg(status === "draft" ? "Draft saved" : data.message);
        if (status === "scheduled") {
          setShowScheduler(false);
        }
      } catch {
        setError("Failed to save. Please try again.");
      } finally {
        setSaving(false);
      }
    },
    [generatedContent, input, format, scheduleDate, scheduleTime, currentDraftId]
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
          <div className="relative">
            {/* Formatting toolbar */}
            <div className="flex h-9 items-center gap-0.5 rounded-t-lg border border-b-0 border-gray-200 bg-gray-50 px-2">
              {[
                {
                  icon: Bold,
                  title: "Bold",
                  action: () => applyFormat(toBold, toBold("bold text")),
                },
                {
                  icon: Italic,
                  title: "Italic",
                  action: () => applyFormat(toItalic, toItalic("italic text")),
                },
                {
                  icon: CornerDownLeft,
                  title: "Line break",
                  action: insertLineBreak,
                },
                {
                  icon: List,
                  title: "Bullet point",
                  action: insertBullet,
                },
              ].map(({ icon: Icon, title, action }) => (
                <button
                  key={title}
                  onClick={action}
                  title={title}
                  type="button"
                  disabled={generating}
                  className="flex h-7 w-7 items-center justify-center rounded text-slate-500 transition-colors hover:bg-indigo-100 hover:text-indigo-600 disabled:opacity-40"
                >
                  <Icon className="h-3.5 w-3.5" />
                </button>
              ))}
            </div>
            <textarea
              ref={textareaRef}
              value={generatedContent || input}
              onChange={(e) => {
                if (generatedContent) {
                  setGeneratedContent(e.target.value);
                } else {
                  setInput(e.target.value);
                }
              }}
              disabled={generating}
              className={`min-h-[220px] w-full resize-none rounded-b-lg rounded-t-none border border-gray-200 p-4 text-sm leading-relaxed text-slate-700 placeholder:text-slate-400 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed ${generating ? "animate-pulse bg-indigo-50/50" : ""}`}
              placeholder="What do you want to post about? Enter a topic, a rough idea, or paste content to adapt..."
            />
            {generating && (
              <div className="absolute inset-0 flex items-center justify-center rounded-lg">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-indigo-400 [animation-delay:0ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-indigo-400 [animation-delay:150ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-indigo-400 [animation-delay:300ms]" />
                </div>
              </div>
            )}
          </div>

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
            {lastSavedAt && (
              <span className="text-slate-400">Last saved: {lastSavedAt}</span>
            )}
          </div>

          {/* Tone selector pills */}
          <div className="mt-4 flex flex-wrap gap-2">
            {(["Professional", "Casual", "Storytelling", "Educational", "Bold"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTone(tone === t.toLowerCase() ? "" : t.toLowerCase())}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  tone === t.toLowerCase()
                    ? "bg-indigo-500 text-white"
                    : "border border-gray-200 bg-white text-slate-600 hover:border-indigo-300 hover:text-indigo-600"
                }`}
              >
                {t}
              </button>
            ))}
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
              {generating ? "Generating..." : "Generate Post"}
            </button>
            {activeContent.trim() && (
              <button
                onClick={() => handleGenerate("improve")}
                disabled={generating}
                className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-gray-50 disabled:opacity-50"
              >
                {generating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="h-4 w-4" />
                )}
                {generating ? "Improving..." : "Improve This"}
              </button>
            )}
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

        {/* ─── Post-Generation Story Section ─── */}
        <div
          className={`overflow-hidden transition-all duration-200 ease-in-out ${
            showStorySection && storyPlaceholders.length > 0
              ? "max-h-[2000px] opacity-100"
              : "max-h-0 opacity-0"
          }`}
        >
          <div className="rounded-xl border border-indigo-100 bg-white p-6 shadow-sm">
            <div className="mb-1 flex items-center gap-2">
              <PenLine className="h-4 w-4 text-indigo-500" />
              <span className="text-base font-semibold text-slate-800">
                Make this post yours
              </span>
            </div>
            <p className="mb-4 text-sm text-slate-500">
              Your post has spots for your real experience. Fill them in and
              we&apos;ll rewrite it naturally.
            </p>

            {/* Highlighted post preview */}
            <div className="mb-5 max-h-[200px] overflow-y-auto rounded-lg border border-gray-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-600">
              {generatedContent.split(/(\[[^\]]+\])/).map((segment, i) =>
                /^\[.+\]$/.test(segment) ? (
                  <span
                    key={i}
                    className="rounded bg-amber-100 px-1 py-0.5 text-amber-800"
                  >
                    {segment}
                  </span>
                ) : (
                  <span key={i}>{segment}</span>
                )
              )}
            </div>

            {/* Story questions */}
            <div className="max-h-[400px] space-y-4 overflow-y-auto">
              {storyPlaceholders.map((placeholder, idx) => (
                <div key={idx}>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    {placeholder.prompt}
                  </label>
                  {placeholder.hint && (
                    <p className="mb-1.5 text-xs text-slate-400">
                      e.g., {placeholder.hint}
                    </p>
                  )}
                  <textarea
                    value={placeholder.answer}
                    onChange={(e) => {
                      setStoryPlaceholders((prev) =>
                        prev.map((p, i) =>
                          i === idx ? { ...p, answer: e.target.value } : p
                        )
                      );
                    }}
                    rows={3}
                    className="w-full resize-none rounded-lg border border-gray-200 p-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    placeholder="Your answer..."
                  />
                </div>
              ))}
            </div>

            {/* Buttons */}
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => {
                    // Client-side replacement: swap brackets with answers
                    let updated = generatedContent;
                    for (const p of storyPlaceholders) {
                      if (p.answer.trim()) {
                        updated = updated.replace(p.raw, p.answer.trim());
                      }
                    }
                    setGeneratedContent(updated);
                    setHasStoryContext(true);
                    setShowStorySection(false);
                  }}
                  disabled={
                    !storyPlaceholders.some((p) => p.answer.trim())
                  }
                  className="flex items-center gap-2 rounded-lg bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-600 disabled:opacity-50"
                >
                  <PenLine className="h-4 w-4" />
                  Add my story
                </button>
                <button
                  onClick={() => setShowStorySection(false)}
                  className="text-sm font-medium text-slate-500 hover:text-slate-700"
                >
                  Keep as is
                </button>
              </div>
              <button
                onClick={() => {
                  const combined = storyPlaceholders
                    .filter((p) => p.answer.trim())
                    .map((p) => `${p.prompt}: ${p.answer.trim()}`)
                    .join("\n");
                  if (!combined) return;
                  const storyBlock = `Include this personal experience naturally in the post (weave it into the narrative, don't just paste it in):\n${combined}\nDo NOT add [bracket placeholders] since a real story was provided.`;
                  handleGenerate("generate", storyBlock);
                }}
                disabled={
                  generating ||
                  !storyPlaceholders.some((p) => p.answer.trim())
                }
                className="text-sm font-medium text-indigo-500 hover:text-indigo-700 disabled:opacity-50"
              >
                {generating ? "Rewriting..." : "Or rewrite the full post around my story"}
              </button>
            </div>
          </div>
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
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
            <p className="text-sm font-medium text-emerald-700">
              {successMsg}
              {publishedPostId && (
                <a
                  href={`https://www.linkedin.com/feed/update/${publishedPostId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 text-emerald-600 underline hover:text-emerald-800"
                >
                  View on LinkedIn
                </a>
              )}
            </p>
          </div>
        )}

        {/* Post Analysis Panel */}
        <PostAnalysisPanel
          postText={activeContent}
          hashtagSuggestions={hashtagSuggestions}
          hasStoryContext={hasStoryContext}
          onAddHashtag={(hashtag) => {
            const content = generatedContent || input;
            // Check if there's already a hashtag line at the end
            const hashtagLineMatch = content.match(/(\n\n)(#[\w\u00C0-\u024F]+\s*)+$/);
            if (hashtagLineMatch) {
              const updated = content + " " + hashtag;
              if (generatedContent) setGeneratedContent(updated);
              else setInput(updated);
            } else {
              const updated = content + "\n\n" + hashtag;
              if (generatedContent) setGeneratedContent(updated);
              else setInput(updated);
            }
          }}
          onRemoveHashtag={(hashtag) => {
            const content = generatedContent || input;
            // Remove the hashtag and clean up extra spaces
            const updated = content
              .replace(new RegExp("\\s*" + hashtag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), "")
              .replace(/\n\n\s*$/, "");
            if (generatedContent) setGeneratedContent(updated);
            else setInput(updated);
          }}
          onSchedule={(date, time) => {
            setScheduleDate(date);
            setScheduleTime(time);
            setShowScheduler(true);
          }}
        />
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
            <div className="mx-4 border-b border-gray-100 pb-2">
              <span className="text-xs text-slate-300">Preview</span>
            </div>

            {/* Action bar */}
            <div className="grid grid-cols-4 px-2 py-1 opacity-40">
              {[
                { icon: ThumbsUp, label: "Like" },
                { icon: MessageCircle, label: "Comment" },
                { icon: Repeat2, label: "Repost" },
                { icon: SendHorizontal, label: "Send" },
              ].map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-medium text-slate-500"
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <button
              onClick={() => handleSave("draft")}
              disabled={saving || generating || !activeContent.trim()}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-gray-50 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              Save Draft
            </button>
            <button
              onClick={() => setShowScheduler(!showScheduler)}
              disabled={generating || !activeContent.trim()}
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
                disabled={saving || generating || !scheduleDate}
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
              if (!content.trim()) {
                setError("Cannot publish an empty post.");
                return;
              }

              console.log("[publish-ui] Starting publish...", content.substring(0, 50));
              setPublishing(true);
              setError("");
              setSuccessMsg("");

              try {
                const res = await fetch("/api/posts/publish", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ content, draft_id: currentDraftId || undefined }),
                });

                const data = await res.json();

                if (!res.ok) {
                  if (data.code === "TOKEN_EXPIRED") {
                    setError(data.message || "Your LinkedIn connection has expired. Please reconnect in Settings.");
                  } else {
                    setError(data.error || "Publishing failed. Please try again.");
                  }
                  return;
                }

                setSuccessMsg("Published to LinkedIn!");
                setPublishedPostId(data.linkedin_post_id || "");
              } catch {
                setError("Publishing failed. Please try again.");
              } finally {
                setPublishing(false);
              }
            }}
            disabled={publishing || generating || !activeContent.trim()}
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
