import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

// Use service role client for admin operations (linking accounts, updating profiles)
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Get the authenticated user's Supabase client
async function getAuthClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignored in non-mutable contexts
          }
        },
      },
    }
  );
}

interface LinkedInTokenResponse {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
  id_token?: string;
}

interface LinkedInUserInfo {
  sub: string;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
  email: string;
  email_verified: boolean;
  locale: { country: string; language: string };
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

  // Handle OAuth errors
  if (error) {
    console.error("LinkedIn OAuth error:", error);
    return NextResponse.redirect(
      `${appUrl}/settings?error=linkedin_auth_failed`
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${appUrl}/settings?error=missing_params`
    );
  }

  // Verify CSRF state
  const cookieStore = await cookies();
  const storedState = cookieStore.get("linkedin_oauth_state")?.value;
  cookieStore.delete("linkedin_oauth_state");

  if (state !== storedState) {
    console.error("LinkedIn OAuth state mismatch");
    return NextResponse.redirect(
      `${appUrl}/settings?error=state_mismatch`
    );
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch(
      "https://www.linkedin.com/oauth/v2/accessToken",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: `${appUrl}/api/auth/linkedin/callback`,
          client_id: process.env.LINKEDIN_CLIENT_ID!,
          client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
        }),
      }
    );

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      console.error("LinkedIn token exchange failed:", errText);
      return NextResponse.redirect(
        `${appUrl}/settings?error=token_exchange_failed`
      );
    }

    const tokenData: LinkedInTokenResponse = await tokenResponse.json();

    // Fetch LinkedIn user profile using OpenID Connect userinfo endpoint
    const profileResponse = await fetch(
      "https://api.linkedin.com/v2/userinfo",
      {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      }
    );

    if (!profileResponse.ok) {
      console.error(
        "LinkedIn profile fetch failed:",
        await profileResponse.text()
      );
      return NextResponse.redirect(
        `${appUrl}/settings?error=profile_fetch_failed`
      );
    }

    const linkedinProfile: LinkedInUserInfo = await profileResponse.json();

    const expiresAt = new Date(
      Date.now() + tokenData.expires_in * 1000
    ).toISOString();

    // Check if user is already logged in (linking LinkedIn to existing account)
    const authClient = await getAuthClient();
    const {
      data: { user: existingUser },
    } = await authClient.auth.getUser();

    const serviceClient = getServiceClient();

    if (existingUser) {
      // User is already logged in — link LinkedIn to their existing account
      const { error: updateError } = await serviceClient
        .from("profiles")
        .upsert({
          id: existingUser.id,
          email: existingUser.email,
          linkedin_connected: true,
          linkedin_access_token: tokenData.access_token,
          linkedin_token_expires_at: expiresAt,
          linkedin_profile_url: `https://www.linkedin.com/in/${linkedinProfile.sub}`,
          linkedin_headline: null, // Headline not available via userinfo
          linkedin_profile_picture: linkedinProfile.picture,
          linkedin_sub: linkedinProfile.sub,
          full_name: existingUser.user_metadata?.full_name || linkedinProfile.name,
          avatar_url: linkedinProfile.picture,
        });

      if (updateError) {
        console.error("Failed to update profile with LinkedIn data:", updateError);
        return NextResponse.redirect(
          `${appUrl}/settings?error=profile_update_failed`
        );
      }

      return NextResponse.redirect(
        `${appUrl}/create-post?linkedin=connected`
      );
    }

    // No existing session — check if a Supabase user exists for this email
    const { data: existingUsers } = await serviceClient.auth.admin.listUsers();
    const matchingUser = existingUsers?.users?.find(
      (u) => u.email === linkedinProfile.email
    );

    if (matchingUser) {
      // User exists but isn't logged in — update their LinkedIn data and sign them in
      await serviceClient
        .from("profiles")
        .update({
          linkedin_connected: true,
          linkedin_access_token: tokenData.access_token,
          linkedin_token_expires_at: expiresAt,
          linkedin_profile_picture: linkedinProfile.picture,
          linkedin_sub: linkedinProfile.sub,
          avatar_url: linkedinProfile.picture,
        })
        .eq("id", matchingUser.id);

      // Generate a magic link to sign them in
      // We use a one-time token approach via admin
      const { data: sessionData, error: signInError } =
        await serviceClient.auth.admin.generateLink({
          type: "magiclink",
          email: linkedinProfile.email,
          options: {
            redirectTo: `${appUrl}/create-post?linkedin=connected`,
          },
        });

      if (signInError || !sessionData) {
        console.error("Failed to generate sign-in link:", signInError);
        return NextResponse.redirect(
          `${appUrl}/auth?error=signin_failed`
        );
      }

      // Redirect through Supabase's verify endpoint
      const verifyUrl = new URL(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/verify`
      );
      verifyUrl.searchParams.set("type", "magiclink");
      verifyUrl.searchParams.set(
        "token",
        sessionData.properties?.hashed_token || ""
      );
      verifyUrl.searchParams.set("redirect_to", `${appUrl}/create-post?linkedin=connected`);

      return NextResponse.redirect(verifyUrl.toString());
    }

    // Brand new user — create account via Supabase Auth
    const { data: newUser, error: signUpError } =
      await serviceClient.auth.admin.createUser({
        email: linkedinProfile.email,
        email_confirm: true,
        user_metadata: {
          full_name: linkedinProfile.name,
          avatar_url: linkedinProfile.picture,
        },
      });

    if (signUpError || !newUser?.user) {
      console.error("Failed to create user:", signUpError);
      return NextResponse.redirect(
        `${appUrl}/auth?error=signup_failed`
      );
    }

    // Update their profile with LinkedIn data
    // (The trigger creates the profile row, so we update it)
    await serviceClient
      .from("profiles")
      .update({
        linkedin_connected: true,
        linkedin_access_token: tokenData.access_token,
        linkedin_token_expires_at: expiresAt,
        linkedin_profile_url: `https://www.linkedin.com/in/${linkedinProfile.sub}`,
        linkedin_profile_picture: linkedinProfile.picture,
        linkedin_sub: linkedinProfile.sub,
        full_name: linkedinProfile.name,
        avatar_url: linkedinProfile.picture,
      })
      .eq("id", newUser.user.id);

    // Sign them in via magic link
    const { data: sessionData, error: linkError } =
      await serviceClient.auth.admin.generateLink({
        type: "magiclink",
        email: linkedinProfile.email,
        options: {
          redirectTo: `${appUrl}/overview`,
        },
      });

    if (linkError || !sessionData) {
      console.error("Failed to generate sign-in link:", linkError);
      return NextResponse.redirect(
        `${appUrl}/auth?error=signin_failed`
      );
    }

    const verifyUrl = new URL(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/verify`
    );
    verifyUrl.searchParams.set("type", "magiclink");
    verifyUrl.searchParams.set(
      "token",
      sessionData.properties?.hashed_token || ""
    );
    verifyUrl.searchParams.set("redirect_to", `${appUrl}/create-post?linkedin=connected`);

    return NextResponse.redirect(verifyUrl.toString());
  } catch (err) {
    console.error("LinkedIn OAuth callback error:", err);
    return NextResponse.redirect(
      `${appUrl}/settings?error=unknown`
    );
  }
}
