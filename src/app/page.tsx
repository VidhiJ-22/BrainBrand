import Link from "next/link";
import {
  Sparkles,
  Brain,
  PenSquare,
  Calendar,
  BarChart3,
  ArrowRight,
  Check,
  Linkedin,
  Zap,
  Shield,
} from "lucide-react";

const FEATURES = [
  {
    icon: Brain,
    title: "Brand Brain AI",
    description:
      "We analyze your LinkedIn posts and learn your unique voice, tone, and what drives engagement.",
  },
  {
    icon: PenSquare,
    title: "AI Post Writer",
    description:
      "Generate posts that sound like you, not a robot. Powered by your Brand Brain voice profile.",
  },
  {
    icon: Calendar,
    title: "Content Calendar",
    description:
      "Plan, schedule, and visualize your content pipeline with drag-and-drop simplicity.",
  },
  {
    icon: BarChart3,
    title: "Analytics",
    description:
      "Track engagement trends, top-performing formats, and get AI-powered improvement insights.",
  },
  {
    icon: Zap,
    title: "One-Click Publish",
    description:
      "Publish directly to LinkedIn from ContentBrain. No copy-pasting required.",
  },
  {
    icon: Shield,
    title: "Your Voice, Protected",
    description:
      "Your data stays private. We never share your content or analysis with anyone.",
  },
];

const PRO_FEATURES = [
  "Unlimited AI generations",
  "Post scheduling",
  "Full Brand Brain insights",
  "LinkedIn direct publishing",
  "Priority support",
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* ─── Nav ─── */}
      <header className="border-b border-gray-100">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">
              ContentBrain
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/auth"
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
            >
              Sign In
            </Link>
            <Link
              href="/auth"
              className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-600"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </header>

      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/80 via-white to-amber-50/30" />
        <div className="relative mx-auto max-w-4xl px-6 pb-20 pt-20 text-center sm:pt-28">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-1.5">
            <Linkedin className="h-4 w-4 text-[#0A66C2]" />
            <span className="text-sm font-medium text-indigo-700">
              Built for LinkedIn creators
            </span>
          </div>

          <h1 className="mb-6 text-4xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
            Your LinkedIn content,{" "}
            <span className="bg-gradient-to-r from-indigo-500 to-indigo-600 bg-clip-text text-transparent">
              supercharged by AI
            </span>
          </h1>

          <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-slate-600">
            ContentBrain analyzes your posting history, learns your voice, and
            helps you create better content that drives real engagement. Stop
            guessing, start growing.
          </p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/auth"
              className="flex items-center gap-2 rounded-xl bg-indigo-500 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-indigo-200 transition-all hover:bg-indigo-600 hover:shadow-xl hover:shadow-indigo-200"
            >
              Start Free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <span className="text-sm text-slate-400">
              No credit card required
            </span>
          </div>
        </div>
      </section>

      {/* ─── Features ─── */}
      <section className="border-t border-gray-100 bg-gray-50/50 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-12 text-center">
            <h2 className="mb-3 text-3xl font-bold text-slate-900">
              Everything you need to grow on LinkedIn
            </h2>
            <p className="text-lg text-slate-500">
              From analysis to publishing, ContentBrain handles it all.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-indigo-50">
                  <feature.icon className="h-5 w-5 text-indigo-500" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-slate-900">
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed text-slate-500">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section className="py-20">
        <div className="mx-auto max-w-4xl px-6">
          <div className="mb-12 text-center">
            <h2 className="mb-3 text-3xl font-bold text-slate-900">
              How it works
            </h2>
            <p className="text-lg text-slate-500">
              Three simple steps to transform your LinkedIn presence.
            </p>
          </div>

          <div className="space-y-8">
            {[
              {
                step: "1",
                title: "Connect LinkedIn",
                description:
                  "Link your account securely. We fetch your recent posts and engagement data.",
              },
              {
                step: "2",
                title: "Brand Brain analyzes your voice",
                description:
                  "Our AI identifies your tone, best-performing topics, content patterns, and areas for growth.",
              },
              {
                step: "3",
                title: "Create & publish smarter",
                description:
                  "Generate posts in your voice, schedule them at optimal times, and track what works.",
              },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-lg font-bold text-white">
                  {item.step}
                </div>
                <div>
                  <h3 className="mb-1 text-lg font-semibold text-slate-900">
                    {item.title}
                  </h3>
                  <p className="text-slate-500">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pricing ─── */}
      <section className="border-t border-gray-100 bg-gray-50/50 py-20">
        <div className="mx-auto max-w-4xl px-6">
          <div className="mb-12 text-center">
            <h2 className="mb-3 text-3xl font-bold text-slate-900">
              Simple pricing
            </h2>
            <p className="text-lg text-slate-500">
              Start free, upgrade when you&apos;re ready.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {/* Free Plan */}
            <div className="rounded-xl border border-gray-200 bg-white p-8">
              <h3 className="mb-1 text-lg font-semibold text-slate-900">
                Free
              </h3>
              <p className="mb-4 text-sm text-slate-500">
                Get started with the basics
              </p>
              <p className="mb-6">
                <span className="text-3xl font-bold text-slate-900">$0</span>
                <span className="text-slate-400"> / month</span>
              </p>
              <Link
                href="/auth"
                className="mb-6 block w-full rounded-lg border border-gray-200 px-4 py-2.5 text-center text-sm font-semibold text-slate-700 transition-colors hover:bg-gray-50"
              >
                Get Started
              </Link>
              <ul className="space-y-2">
                {[
                  "5 AI generations / month",
                  "Brand Brain analysis",
                  "Content calendar",
                  "Basic analytics",
                ].map((f) => (
                  <li
                    key={f}
                    className="flex items-center gap-2 text-sm text-slate-600"
                  >
                    <Check className="h-4 w-4 shrink-0 text-slate-400" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            {/* Pro Plan */}
            <div className="relative rounded-xl border-2 border-indigo-500 bg-white p-8">
              <div className="absolute -top-3 right-6 rounded-full bg-indigo-500 px-3 py-0.5 text-xs font-semibold text-white">
                Popular
              </div>
              <h3 className="mb-1 text-lg font-semibold text-slate-900">Pro</h3>
              <p className="mb-4 text-sm text-slate-500">
                For serious LinkedIn creators
              </p>
              <p className="mb-6">
                <span className="text-3xl font-bold text-slate-900">$19</span>
                <span className="text-slate-400"> / month</span>
              </p>
              <Link
                href="/auth"
                className="mb-6 block w-full rounded-lg bg-indigo-500 px-4 py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-indigo-600"
              >
                Start Free Trial
              </Link>
              <ul className="space-y-2">
                {PRO_FEATURES.map((f) => (
                  <li
                    key={f}
                    className="flex items-center gap-2 text-sm text-slate-600"
                  >
                    <Check className="h-4 w-4 shrink-0 text-indigo-500" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="mb-4 text-3xl font-bold text-slate-900">
            Ready to level up your LinkedIn game?
          </h2>
          <p className="mb-8 text-lg text-slate-500">
            Join creators who are using AI to build their personal brand
            smarter, not harder.
          </p>
          <Link
            href="/auth"
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-indigo-200 transition-all hover:bg-indigo-600 hover:shadow-xl hover:shadow-indigo-200"
          >
            Get Started Free
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-gray-100 bg-gray-50 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500">
              <Sparkles className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold text-slate-700">
              ContentBrain
            </span>
          </div>
          <p className="text-sm text-slate-400">
            &copy; {new Date().getFullYear()} ContentBrain. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
