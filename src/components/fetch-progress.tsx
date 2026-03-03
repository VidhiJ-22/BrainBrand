"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";

type Step = "idle" | "connecting" | "fetching" | "processing" | "done" | "error";

const STEP_LABELS: Record<Step, string> = {
  idle: "",
  connecting: "Connecting to LinkedIn...",
  fetching: "Pulling your posts...",
  processing: "Analyzing engagement data...",
  done: "Done! Ready to analyze.",
  error: "Something went wrong.",
};

interface FetchProgressProps {
  /** If true, show a compact inline button instead of full progress UI */
  compact?: boolean;
  /** Button label for compact mode */
  buttonLabel?: string;
  /** Called when fetch completes successfully */
  onComplete?: () => void;
}

export default function FetchProgress({
  compact = false,
  buttonLabel = "Refresh Data",
  onComplete,
}: FetchProgressProps) {
  const [step, setStep] = useState<Step>("idle");
  const [postsFound, setPostsFound] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [progress, setProgress] = useState(0);
  const router = useRouter();

  const startFetch = useCallback(async () => {
    setStep("connecting");
    setPostsFound(0);
    setErrorMessage("");
    setProgress(10);

    // Simulate progress while waiting for API
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 85) {
          clearInterval(progressInterval);
          return 85;
        }
        return prev + Math.random() * 8;
      });
    }, 800);

    try {
      setStep("fetching");
      setProgress(25);

      const response = await fetch("/api/linkedin/fetch-posts", {
        method: "POST",
      });

      clearInterval(progressInterval);

      const data = await response.json();

      if (!response.ok) {
        setStep("error");
        setProgress(0);
        setErrorMessage(
          data.message ||
            "We couldn't pull your LinkedIn data right now. Please try again in a few minutes."
        );

        if (data.code === "TOKEN_EXPIRED") {
          setErrorMessage(
            "Your LinkedIn connection has expired. Please reconnect in Settings."
          );
        }
        return;
      }

      setPostsFound(data.posts_fetched);
      setStep("processing");
      setProgress(90);

      // Brief pause for the processing step to be visible
      await new Promise((r) => setTimeout(r, 800));

      setStep("done");
      setProgress(100);

      // Refresh page data
      router.refresh();
      onComplete?.();
    } catch {
      clearInterval(progressInterval);
      setStep("error");
      setProgress(0);
      setErrorMessage(
        "We couldn't pull your LinkedIn data right now. Please try again in a few minutes."
      );
    }
  }, [router, onComplete]);

  // Compact mode: just a button
  if (compact && step === "idle") {
    return (
      <button
        onClick={startFetch}
        className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-gray-50"
      >
        <RefreshCw className="h-4 w-4" />
        {buttonLabel}
      </button>
    );
  }

  if (step === "idle") {
    return (
      <button
        onClick={startFetch}
        className="flex items-center gap-2 rounded-lg bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-600"
      >
        <RefreshCw className="h-4 w-4" />
        Fetch LinkedIn Posts
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="space-y-4">
        {/* Steps */}
        <div className="space-y-3">
          <StepItem
            label="Connecting to LinkedIn..."
            active={step === "connecting"}
            completed={
              step === "fetching" ||
              step === "processing" ||
              step === "done"
            }
          />
          <StepItem
            label={
              postsFound > 0
                ? `Pulling your posts... (${postsFound} found)`
                : "Pulling your posts..."
            }
            active={step === "fetching"}
            completed={step === "processing" || step === "done"}
          />
          <StepItem
            label="Analyzing engagement data..."
            active={step === "processing"}
            completed={step === "done"}
          />
          <StepItem
            label={
              step === "done"
                ? `Done! ${postsFound} posts ready to analyze.`
                : "Ready to analyze."
            }
            active={false}
            completed={step === "done"}
          />
        </div>

        {/* Progress bar */}
        {step !== "done" && step !== "error" && (
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {/* Error state */}
        {step === "error" && (
          <div className="flex items-start gap-3 rounded-lg bg-red-50 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
            <div>
              <p className="text-sm font-medium text-red-800">
                {errorMessage}
              </p>
              <button
                onClick={startFetch}
                className="mt-2 text-sm font-medium text-red-600 underline hover:text-red-700"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {/* Done state */}
        {step === "done" && (
          <div className="flex items-center gap-2 text-sm text-emerald-600">
            <CheckCircle2 className="h-4 w-4" />
            <span className="font-medium">
              {postsFound} posts fetched successfully
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function StepItem({
  label,
  active,
  completed,
}: {
  label: string;
  active: boolean;
  completed: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      {completed ? (
        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
      ) : active ? (
        <Loader2 className="h-5 w-5 shrink-0 animate-spin text-indigo-500" />
      ) : (
        <div className="h-5 w-5 shrink-0 rounded-full border-2 border-gray-200" />
      )}
      <span
        className={`text-sm ${
          completed
            ? "font-medium text-emerald-700"
            : active
              ? "font-medium text-slate-900"
              : "text-slate-400"
        }`}
      >
        {label}
      </span>
    </div>
  );
}
