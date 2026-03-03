"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Brain, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

const LOADING_MESSAGES = [
  "Reading your posts...",
  "Analyzing your voice...",
  "Finding patterns...",
  "Identifying opportunities...",
  "Generating ideas...",
  "Almost done...",
];

interface AnalyzeProgressProps {
  /** Auto-start analysis on mount */
  autoStart?: boolean;
  /** Force re-analysis even if cached */
  force?: boolean;
  /** Compact button mode */
  compact?: boolean;
  buttonLabel?: string;
  onComplete?: () => void;
}

export default function AnalyzeProgress({
  autoStart = false,
  force = false,
  compact = false,
  buttonLabel = "Re-analyze Brand Brain",
  onComplete,
}: AnalyzeProgressProps) {
  const [status, setStatus] = useState<
    "idle" | "analyzing" | "done" | "error"
  >(autoStart ? "analyzing" : "idle");
  const [messageIndex, setMessageIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [result, setResult] = useState<{
    posts_analyzed?: number;
    score?: number;
  } | null>(null);
  const router = useRouter();

  const startAnalysis = useCallback(async () => {
    setStatus("analyzing");
    setMessageIndex(0);
    setProgress(5);
    setErrorMessage("");
    setResult(null);

    // Cycle through loading messages
    const msgInterval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 4000);

    // Animate progress bar
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return 90;
        return prev + Math.random() * 6;
      });
    }, 1200);

    try {
      const response = await fetch("/api/brand-brain/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force }),
      });

      clearInterval(msgInterval);
      clearInterval(progressInterval);

      const data = await response.json();

      if (!response.ok) {
        setStatus("error");
        setProgress(0);
        setErrorMessage(
          data.message || "Analysis failed. Please try again."
        );
        return;
      }

      if (data.cached) {
        // Already up to date
        setStatus("done");
        setProgress(100);
        setResult({ posts_analyzed: data.posts_analyzed });
        router.refresh();
        onComplete?.();
        return;
      }

      setProgress(100);
      setStatus("done");
      setResult({
        posts_analyzed: data.posts_analyzed,
        score: data.score,
      });
      router.refresh();
      onComplete?.();
    } catch {
      clearInterval(msgInterval);
      clearInterval(progressInterval);
      setStatus("error");
      setProgress(0);
      setErrorMessage(
        "Something went wrong during analysis. Please try again."
      );
    }
  }, [force, router, onComplete]);

  // Auto-start on mount if requested
  useEffect(() => {
    if (autoStart && status === "analyzing") {
      startAnalysis();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  // Compact button mode
  if (compact && status === "idle") {
    return (
      <button
        onClick={startAnalysis}
        className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-gray-50"
      >
        <Brain className="h-4 w-4" />
        {buttonLabel}
      </button>
    );
  }

  if (status === "idle") {
    return (
      <button
        onClick={startAnalysis}
        className="flex items-center gap-2 rounded-lg bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-600"
      >
        <Brain className="h-4 w-4" />
        Analyze My Content
      </button>
    );
  }

  // Full analyzing/done/error state
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-8 shadow-sm">
      <div className="flex flex-col items-center text-center">
        {/* Icon */}
        {status === "analyzing" && (
          <div className="relative mb-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-indigo-50">
              <Brain className="h-10 w-10 animate-pulse text-indigo-500" />
            </div>
            <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-sm">
              <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
            </div>
          </div>
        )}

        {status === "done" && (
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-emerald-50">
            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
          </div>
        )}

        {status === "error" && (
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-red-50">
            <AlertCircle className="h-10 w-10 text-red-400" />
          </div>
        )}

        {/* Message */}
        {status === "analyzing" && (
          <>
            <p className="mb-2 text-lg font-semibold text-slate-900">
              Analyzing your content
            </p>
            <p className="mb-6 text-sm text-slate-500">
              {LOADING_MESSAGES[messageIndex]}
            </p>
          </>
        )}

        {status === "done" && (
          <>
            <p className="mb-2 text-lg font-semibold text-slate-900">
              Analysis complete!
            </p>
            <p className="mb-6 text-sm text-slate-500">
              {result?.posts_analyzed
                ? `Analyzed ${result.posts_analyzed} posts.`
                : "Your Brand Brain is ready."}
              {result?.score
                ? ` Your score: ${result.score}/100`
                : ""}
            </p>
          </>
        )}

        {status === "error" && (
          <>
            <p className="mb-2 text-lg font-semibold text-slate-900">
              Analysis failed
            </p>
            <p className="mb-4 text-sm text-slate-500">{errorMessage}</p>
            <button
              onClick={startAnalysis}
              className="rounded-lg bg-indigo-500 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-600"
            >
              Try Again
            </button>
          </>
        )}

        {/* Progress bar */}
        {status === "analyzing" && (
          <div className="h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all duration-700 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
