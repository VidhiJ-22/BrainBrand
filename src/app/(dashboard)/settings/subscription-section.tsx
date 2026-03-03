"use client";

import { useState } from "react";
import { CreditCard, Loader2, ExternalLink, Check, Sparkles } from "lucide-react";
import { STRIPE_PLANS } from "@/lib/stripe/plans";

interface SubscriptionSectionProps {
  currentPlan: string;
  hasStripeCustomer: boolean;
}

export default function SubscriptionSection({
  currentPlan,
  hasStripeCustomer,
}: SubscriptionSectionProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isPro = currentPlan === "pro";

  async function handleUpgrade() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to start checkout");
        return;
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleManageBilling() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to open billing portal");
        return;
      }

      window.location.href = data.url;
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="animate-fade-in-up rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-500">
          <CreditCard className="h-5 w-5" />
        </div>
        <h3 className="font-semibold text-slate-900">Subscription</h3>
      </div>

      <div className="flex items-center gap-3">
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            isPro
              ? "bg-indigo-100 text-indigo-700"
              : "bg-slate-100 text-slate-600"
          }`}
        >
          {isPro ? "Pro Plan" : "Free Plan"}
        </span>
        {isPro && (
          <span className="text-sm text-emerald-600 flex items-center gap-1">
            <Check className="h-3.5 w-3.5" />
            Active
          </span>
        )}
      </div>

      {!isPro && (
        <>
          <p className="mt-3 text-sm text-slate-500">
            Upgrade to Pro for unlimited AI generations, scheduling, and full
            Brand Brain insights.
          </p>

          {/* Feature list */}
          <div className="mt-4 rounded-lg border border-indigo-100 bg-indigo-50/50 p-4">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-500" />
              <span className="text-sm font-semibold text-indigo-900">
                Pro Plan &mdash; ${STRIPE_PLANS.pro.price}/month
              </span>
            </div>
            <ul className="space-y-1.5">
              {STRIPE_PLANS.pro.features.map((feature) => (
                <li
                  key={feature}
                  className="flex items-center gap-2 text-sm text-indigo-800"
                >
                  <Check className="h-3.5 w-3.5 shrink-0 text-indigo-500" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          <button
            onClick={handleUpgrade}
            disabled={loading}
            className="mt-4 flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Upgrade to Pro
          </button>
        </>
      )}

      {isPro && (
        <>
          <p className="mt-3 text-sm text-slate-500">
            You have unlimited access to all ContentBrain features.
          </p>
          {hasStripeCustomer && (
            <button
              onClick={handleManageBilling}
              disabled={loading}
              className="mt-4 flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ExternalLink className="h-4 w-4" />
              )}
              Manage Billing
            </button>
          )}
        </>
      )}

      {error && (
        <p className="mt-3 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
