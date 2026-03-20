import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Create Post",
};
import { getBrandBrainProfile } from "@/lib/brand-brain/get-profile";
import type { Profile } from "@/lib/types/database";
import PageHeader from "@/components/page-header";
import CreatePostEditor from "./editor";

export default async function CreatePostPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: Profile | null = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    profile = data;
  }

  const bbProfile = await getBrandBrainProfile();
  const hasBrandBrain = !!bbProfile?.analysis;

  return (
    <div>
      <PageHeader
        title="Create Post"
        description={
          hasBrandBrain
            ? "Write a LinkedIn post powered by your Brand Brain"
            : "Write a LinkedIn post"
        }
      />

      <CreatePostEditor
        userName={profile?.full_name || user?.email?.split("@")[0] || "User"}
        userHeadline={profile?.linkedin_headline || "LinkedIn Member"}
        userAvatar={profile?.linkedin_profile_picture || profile?.avatar_url || null}
        hasBrandBrain={hasBrandBrain}
        subscriptionPlan={profile?.subscription_plan || "free"}
      />
    </div>
  );
}
