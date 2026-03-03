"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, XCircle, X } from "lucide-react";

const MESSAGES: Record<string, { type: "success" | "error"; text: string }> = {
  "linkedin=connected": {
    type: "success",
    text: "LinkedIn connected successfully!",
  },
  "error=linkedin_auth_failed": {
    type: "error",
    text: "LinkedIn authentication failed. Please try again.",
  },
  "error=token_exchange_failed": {
    type: "error",
    text: "Failed to connect LinkedIn. Please try again.",
  },
  "error=state_mismatch": {
    type: "error",
    text: "Security check failed. Please try connecting again.",
  },
  "error=signin_failed": {
    type: "error",
    text: "Sign in failed. Please try again.",
  },
  "error=verification_failed": {
    type: "error",
    text: "Email verification failed. Please try again.",
  },
  "upgraded=true": {
    type: "success",
    text: "Welcome to Pro! All features are now unlocked.",
  },
  "toast=subscription_success": {
    type: "success",
    text: "Welcome to Pro! All features are now unlocked.",
  },
  "toast=subscription_cancelled": {
    type: "error",
    text: "Subscription checkout was cancelled.",
  },
  "toast=account_deleted": {
    type: "success",
    text: "Your account data has been deleted.",
  },
};

export default function Toast() {
  const searchParams = useSearchParams();
  const [toast, setToast] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    for (const [key, value] of Object.entries(MESSAGES)) {
      const [param, val] = key.split("=");
      if (searchParams.get(param) === val) {
        setToast(value);
        // Clean URL without reload
        const url = new URL(window.location.href);
        url.searchParams.delete(param);
        window.history.replaceState({}, "", url.toString());
        break;
      }
    }
  }, [searchParams]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  if (!toast) return null;

  return (
    <div className="fixed right-4 top-4 z-50 animate-fade-in-up">
      <div
        className={`flex items-center gap-3 rounded-xl border px-4 py-3 shadow-lg ${
          toast.type === "success"
            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
            : "border-red-200 bg-red-50 text-red-800"
        }`}
      >
        {toast.type === "success" ? (
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
        ) : (
          <XCircle className="h-5 w-5 shrink-0 text-red-500" />
        )}
        <p className="text-sm font-medium">{toast.text}</p>
        <button
          onClick={() => setToast(null)}
          className="ml-2 rounded p-0.5 hover:bg-black/5"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
