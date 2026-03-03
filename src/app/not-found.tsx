import Link from "next/link";
import { Sparkles, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-6 text-center">
      <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500">
        <Sparkles className="h-7 w-7 text-white" />
      </div>
      <h1 className="mb-2 text-6xl font-extrabold text-slate-900">404</h1>
      <h2 className="mb-2 text-xl font-semibold text-slate-700">
        Page not found
      </h2>
      <p className="mb-8 max-w-md text-slate-500">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link
        href="/"
        className="flex items-center gap-2 rounded-lg bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-600"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Home
      </Link>
    </div>
  );
}
