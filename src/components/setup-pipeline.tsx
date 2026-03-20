"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  Brain,
  Linkedin,
  BarChart3,
} from "lucide-react";

type PipelineStep =
  | "idle"
  | "fetching"
  | "analyzing"
  | "done"
  | "error";

const ANALYZE_MESSAGES = [
  "Reading your posts...",
  "Analyzing your voice...",
  "Finding patterns...",
  "Identifying opportunities...",
  "Generating content ideas...",
  "Almost done...",
];

export default function SetupPipeline() {
  const [step, setStep] = useState<PipelineStep>("idle");
  const [postsFetched, setPostsFetched] = useState(0);
  const [analyzeMessageIndex, setAnalyzeMessageIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [errorStep, setErrorStep] = useState<"fetching" | "analyzing" | null>(
    null
  );
  const router = useRouter();

  const runPipeline = useCallback(async () => {
    // --- Step 1: Fetch posts ---
    setStep("fetching");
    setProgress(10);
    setErrorMessage("");
    setErrorStep(null);

    const fetchProgressInterval = setInterval(() => {
      setProgress((prev) => (prev >= 40 ? 40 : prev + Math.random() * 4));
    }, 800);

    try {
      const fetchRes = await fetch("/api/linkedin/fetch-posts", {
        method: "POST",
      });
      clearInterval(fetchProgressInterval);

      const fetchData = await fetchRes.json();

      if (!fetchRes.ok) {
        setStep("error");
        setErrorStep("fetching");
        setProgress(0);
        setErrorMessage(
          fetchData.message || "Failed to fetch LinkedIn posts."
        );
        return;
      }

      setPostsFetched(fetchData.posts_fetched || 0);
      setProgress(50);

      if ((fetchData.posts_fetched || 0) === 0) {
        setStep("error");
        setErrorStep("fetching");
        setProgress(0);
        setErrorMessage(
          "No posts found on your LinkedIn profile. Try posting on LinkedIn first, then come back."
        );
        return;
      }
    } catch {
      clearInterval(fetchProgressInterval);
      setStep("error");
      setErrorStep("fetching");
      setProgress(0);
      setErrorMessage(
        "Couldn't connect to LinkedIn right now. Please try again."
      );
      return;
    }

    // --- Step 2: Analyze with AI ---
    setStep("analyzing");
    setProgress(55);

    const msgInterval = setInterval(() => {
      setAnalyzeMessageIndex(
        (prev) => (prev + 1) % ANALYZE_MESSAGES.length
      );
    }, 4000);

    const analyzeProgressInterval = setInterval(() => {
      setProgress((prev) => (prev >= 90 ? 90 : prev + Math.random() * 4));
    }, 1200);

    try {
      const analyzeRes = await fetch("/api/brand-brain/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: true }),
      });

      clearInterval(msgInterval);
      clearInterval(analyzeProgressInterval);

      const analyzeData = await analyzeRes.json();

      if (!analyzeRes.ok) {
        setStep("error");
        setErrorStep("analyzing");
        setProgress(0);
        setErrorMessage(
          analyzeData.message || "Analysis failed. Please try again."
        );
        return;
      }

      setProgress(100);
      setStep("done");
      router.refresh();
    } catch {
      clearInterval(msgInterval);
      clearInterval(analyzeProgressInterval);
      setStep("error");
      setErrorStep("analyzing");
      setProgress(0);
      setErrorMessage(
        "Something went wrong during analysis. Please try again."
      );
    }
  }, [router]);

  // Auto-start on mount
  useEffect(() => {
    runPipeline();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="animate-fade-in-up rounded-xl border border-gray-100 bg-white p-8 shadow-sm">
      <div className="flex flex-col items-center text-center">
        {/* Icon */}
        {(step === "fetching" || step === "analyzing") && (
          <div className="relative mb-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-indigo-50">
              <Brain className="h-10 w-10 animate-pulse text-indigo-500" />
            </div>
            <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-sm">
              <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
            </div>
          </div>
        )}

        {step === "done" && (
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-emerald-50">
            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
          </div>
        )}

        {step === "error" && (
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-red-50">
            <AlertCircle className="h-10 w-10 text-red-400" />
          </div>
        )}

        {/* Title */}
        {step === "fetching" && (
          <p className="mb-2 text-lg font-semibold text-slate-900">
            Setting up your Brand Brain
          </p>
        )}
        {step === "analyzing" && (
          <p className="mb-2 text-lg font-semibold text-slate-900">
            Analyzing your LinkedIn posts...
          </p>
        )}
        {step === "done" && (
          <p className="mb-2 text-lg font-semibold text-slate-900">
            Your Brand Brain is ready!
          </p>
        )}
        {step === "error" && (
          <p className="mb-2 text-lg font-semibold text-slate-900">
            Something went wrong
          </p>
        )}

        {/* Subtitle */}
        {step === "analyzing" && (
          <p className="mb-6 text-sm text-slate-500">
            {ANALYZE_MESSAGES[analyzeMessageIndex]}
          </p>
        )}
        {step === "done" && (
          <p className="mb-6 text-sm text-slate-500">
            Analyzed {postsFetched} posts. Scroll down to see your insights.
          </p>
        )}
        {step === "error" && (
          <>
            <p className="mb-4 text-sm text-slate-500">{errorMessage}</p>
            <button
              onClick={runPipeline}
              className="rounded-lg bg-indigo-500 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-600"
            >
              Try Again
            </button>
          </>
        )}

        {/* Step indicators */}
        {step !== "error" && step !== "idle" && (
          <div className="mb-6 w-full max-w-sm space-y-3">
            <StepItem
              icon={<Linkedin className="h-4 w-4" />}
              label={
                postsFetched > 0
                  ? `Fetched ${postsFetched} posts`
                  : "Fetching your LinkedIn posts..."
              }
              active={step === "fetching"}
              completed={step === "analyzing" || step === "done"}
            />
            <StepItem
              icon={<BarChart3 className="h-4 w-4" />}
              label={
                step === "done"
                  ? "Analysis complete"
                  : "Analyzing your content with AI..."
              }
              active={step === "analyzing"}
              completed={step === "done"}
            />
          </div>
        )}

        {/* Progress bar */}
        {(step === "fetching" || step === "analyzing") && (
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

function StepItem({
  icon,
  label,
  active,
  completed,
}: {
  icon: React.ReactNode;
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
        <div className="flex h-5 w-5 shrink-0 items-center justify-center text-slate-300">
          {icon}
        </div>
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
