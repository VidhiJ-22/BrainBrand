import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Settings",
};
import type { Profile } from "@/lib/types/database";
import PageHeader from "@/components/page-header";
import LinkedInSection from "./linkedin-section";
import ProfileSection from "./profile-section";
import SubscriptionSection from "./subscription-section";
import AccountSection from "./account-section";

export default async function SettingsPage() {
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

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Manage your account and integrations"
      />

      <div className="space-y-6">
        <ProfileSection profile={profile} />
        <LinkedInSection profile={profile} />
        <SubscriptionSection
          currentPlan={profile?.subscription_plan || "free"}
          hasStripeCustomer={!!profile?.stripe_customer_id}
        />
        <AccountSection />
      </div>
    </div>
  );
}
