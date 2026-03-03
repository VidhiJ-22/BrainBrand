"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types/database";
import { Linkedin, CheckCircle2, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import FetchProgress from "@/components/fetch-progress";
import AnalyzeProgress from "@/components/analyze-progress";

interface LinkedInSectionProps {
  profile: Profile | null;
}

export default function LinkedInSection({ profile }: LinkedInSectionProps) {
  const [disconnecting, setDisconnecting] = useState(false);
  const router = useRouter();

  async function handleDisconnect() {
    if (
      !confirm(
        "This will remove your LinkedIn data and Brand Brain analysis. Are you sure?"
      )
    ) {
      return;
    }

    setDisconnecting(true);
    const supabase = createClient();

    // Clear LinkedIn data from profile
    await supabase
      .from("profiles")
      .update({
        linkedin_connected: false,
        linkedin_access_token: null,
        linkedin_token_expires_at: null,
        linkedin_profile_url: null,
        linkedin_headline: null,
        linkedin_profile_picture: null,
        linkedin_sub: null,
        last_posts_fetched_at: null,
      })
      .eq("id", profile!.id);

    // Delete LinkedIn posts
    await supabase.from("linkedin_posts").delete().eq("user_id", profile!.id);

    // Delete Brand Brain analysis
    await supabase
      .from("brand_brain_profiles")
      .delete()
      .eq("user_id", profile!.id);

    setDisconnecting(false);
    router.refresh();
  }

  return (
    <div className="animate-fade-in-up rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-500">
          <Linkedin className="h-5 w-5" />
        </div>
        <h3 className="font-semibold text-slate-900">LinkedIn Connection</h3>
      </div>

      {profile?.linkedin_connected ? (
        <div>
          {/* Connected profile card */}
          <div className="mb-4 flex items-center gap-4 rounded-lg border border-emerald-100 bg-emerald-50/50 p-4">
            {profile.linkedin_profile_picture ? (
              <Image
                src={profile.linkedin_profile_picture}
                alt={profile.full_name || "LinkedIn profile"}
                width={48}
                height={48}
                className="h-12 w-12 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-lg font-semibold text-indigo-600">
                {(profile.full_name || "U").charAt(0)}
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-slate-900">
                  {profile.full_name}
                </p>
                <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                  <CheckCircle2 className="h-3 w-3" />
                  Connected
                </span>
              </div>
              {profile.linkedin_headline && (
                <p className="text-sm text-slate-500">
                  {profile.linkedin_headline}
                </p>
              )}
            </div>
          </div>

          {/* Timestamps and actions */}
          <div className="space-y-3">
            {profile.last_posts_fetched_at && (
              <p className="text-sm text-slate-500">
                Posts last fetched:{" "}
                <span className="font-medium text-slate-700">
                  {formatDistanceToNow(
                    new Date(profile.last_posts_fetched_at),
                    { addSuffix: true }
                  )}
                </span>
              </p>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <FetchProgress compact buttonLabel="Refresh Data" />
              <AnalyzeProgress compact force buttonLabel="Re-analyze Brand Brain" />
              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
              >
                {disconnecting && <Loader2 className="h-4 w-4 animate-spin" />}
                Disconnect
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div>
          <p className="mb-4 text-sm text-slate-500">
            Connect your LinkedIn account to analyze your posts, learn your
            voice, and publish content directly.
          </p>
          <a
            href="/api/auth/linkedin"
            className="inline-flex items-center gap-2 rounded-lg bg-[#0A66C2] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#004182]"
          >
            <Linkedin className="h-4 w-4" />
            Connect LinkedIn
          </a>
        </div>
      )}
    </div>
  );
}
