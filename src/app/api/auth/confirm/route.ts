import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Handles email confirmation redirects from Supabase Auth
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = searchParams.get("next") ?? "/overview";

  if (token_hash && type) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { error } = await supabase.auth.verifyOtp({
      type: type as "signup" | "email",
      token_hash,
    });

    if (!error) {
      return NextResponse.redirect(
        new URL(next, process.env.NEXT_PUBLIC_APP_URL!)
      );
    }
  }

  // If verification fails, redirect to auth with error
  return NextResponse.redirect(
    new URL("/auth?error=verification_failed", process.env.NEXT_PUBLIC_APP_URL!)
  );
}
