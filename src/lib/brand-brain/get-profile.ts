import { createClient } from "@/lib/supabase/server";
import type { BrandBrainProfile } from "@/lib/types/database";

/**
 * Fetches the current user's Brand Brain profile.
 * Returns null if no analysis exists yet.
 *
 * This is the canonical way to load Brand Brain data across all pages.
 */
export async function getBrandBrainProfile(): Promise<BrandBrainProfile | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("brand_brain_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (error || !data) return null;

  return data as BrandBrainProfile;
}

/**
 * Checks whether a new analysis should be triggered.
 * Returns true if:
 * - No analysis exists yet
 * - Posts have been fetched since the last analysis
 */
export async function shouldReanalyze(): Promise<boolean> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  const { data: profile } = await supabase
    .from("profiles")
    .select("last_posts_fetched_at, linkedin_connected")
    .eq("id", user.id)
    .single();

  if (!profile?.linkedin_connected) return false;

  const { data: bbProfile } = await supabase
    .from("brand_brain_profiles")
    .select("last_analyzed_at")
    .eq("user_id", user.id)
    .single();

  // No analysis exists yet
  if (!bbProfile) return true;

  // Posts fetched after last analysis
  if (profile.last_posts_fetched_at && bbProfile.last_analyzed_at) {
    return (
      new Date(profile.last_posts_fetched_at) >
      new Date(bbProfile.last_analyzed_at)
    );
  }

  return false;
}
