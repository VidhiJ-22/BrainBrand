"use client";

import { differenceInDays } from "date-fns";
import { AlertTriangle, RefreshCw, Loader2 } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface StalenessBannerProps {
  lastFetchedAt: string | null;
  staleAfterDays?: number;
}

export default function StalenessBanner({
  lastFetchedAt,
  staleAfterDays = 7,
}: StalenessBannerProps) {
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  if (!lastFetchedAt) return null;

  const daysSinceFetch = differenceInDays(
    new Date(),
    new Date(lastFetchedAt)
  );

  if (daysSinceFetch < staleAfterDays) return null;

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await fetch("/api/linkedin/fetch-posts", { method: "POST" });
      router.refresh();
    } catch {
      // Errors handled by the fetch-posts route
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="mb-6 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
      <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" />
      <p className="flex-1 text-sm text-amber-800">
        Your data is{" "}
        <span className="font-semibold">{daysSinceFetch} days old</span>.
        Refresh to get the latest insights.
      </p>
      <button
        onClick={handleRefresh}
        disabled={refreshing}
        className="flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-50 disabled:opacity-50"
      >
        {refreshing ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <RefreshCw className="h-3.5 w-3.5" />
        )}
        Refresh
      </button>
    </div>
  );
}
