import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { cookies } from "next/headers";

export async function GET() {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/linkedin/callback`;

  console.log("[linkedin-oauth] client_id:", clientId ? `${clientId.substring(0, 4)}...` : "MISSING");
  console.log("[linkedin-oauth] redirect_uri:", redirectUri);

  if (!clientId) {
    console.error("[linkedin-oauth] LINKEDIN_CLIENT_ID is not set in environment");
    return NextResponse.json(
      { error: "LinkedIn OAuth is not configured. LINKEDIN_CLIENT_ID is missing." },
      { status: 500 }
    );
  }

  // Generate CSRF state token
  const state = randomBytes(32).toString("hex");

  // Store state in cookie for verification
  const cookieStore = await cookies();
  cookieStore.set("linkedin_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600, // 10 minutes
    path: "/",
  });

  const scopes = ["openid", "profile", "email", "w_member_social"];

  const authUrl = new URL("https://www.linkedin.com/oauth/v2/authorization");
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("scope", scopes.join(" "));

  console.log("[linkedin-oauth] Full auth URL:", authUrl.toString());

  return NextResponse.redirect(authUrl.toString());
}
