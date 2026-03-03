"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types/database";
import { User, Loader2, Check } from "lucide-react";

interface ProfileSectionProps {
  profile: Profile | null;
}

export default function ProfileSection({ profile }: ProfileSectionProps) {
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [email, setEmail] = useState(profile?.email || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const router = useRouter();

  async function handleSave() {
    if (!profile) return;
    setSaving(true);
    setSaved(false);

    const supabase = createClient();
    await supabase
      .from("profiles")
      .update({ full_name: fullName })
      .eq("id", profile.id);

    setSaving(false);
    setSaved(true);
    router.refresh();

    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="animate-fade-in-up rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-500">
          <User className="h-5 w-5" />
        </div>
        <h3 className="font-semibold text-slate-900">Profile</h3>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Full Name
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Your name"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Email
          </label>
          <input
            type="email"
            value={email}
            disabled
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-slate-500"
          />
          <p className="mt-1 text-xs text-slate-400">
            Email cannot be changed here
          </p>
        </div>
      </div>
      <button
        onClick={handleSave}
        disabled={saving}
        className="mt-4 flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-600 disabled:opacity-50"
      >
        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
        {saved && <Check className="h-4 w-4" />}
        {saved ? "Saved!" : "Save Changes"}
      </button>
    </div>
  );
}
