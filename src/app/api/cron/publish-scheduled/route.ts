import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { publishToLinkedIn } from "@/lib/linkedin/publish-post";

// Use service role client — no user session in cron context
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('[cron] CRON_SECRET not set');
    return NextResponse.json({ error: 'Not configured' }, { status: 500 });
  }
  const provided = request.headers.get('authorization')?.replace('Bearer ', '').trim();
  if (provided !== cronSecret) {
    console.warn('[cron] Unauthorized attempt blocked');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log("[cron] ─── Publish Scheduled Posts ───");
  console.log("[cron] Run at:", new Date().toISOString());

  const supabase = getServiceClient();

  // 1. Query all posts that are scheduled and due
  const { data: duePosts, error: queryError } = await supabase
    .from("drafts")
    .select("id, user_id, content, scheduled_at")
    .eq("status", "scheduled")
    .lte("scheduled_at", new Date().toISOString())
    .order("scheduled_at", { ascending: true });

  if (queryError) {
    console.error("[cron] Query error:", queryError.message);
    return NextResponse.json(
      { error: "Failed to query scheduled posts", detail: queryError.message },
      { status: 500 }
    );
  }

  const total = duePosts?.length || 0;
  console.log(`[cron] Found ${total} scheduled post(s) due for publishing`);

  if (total === 0) {
    return NextResponse.json({ message: "No scheduled posts due", published: 0, failed: 0 });
  }

  const results: { id: string; status: string; error?: string }[] = [];

  for (const post of duePosts!) {
    console.log(`[cron] ── Processing post ${post.id} (user: ${post.user_id}, scheduled: ${post.scheduled_at})`);

    // 2. Get the user's LinkedIn credentials
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("linkedin_connected, linkedin_access_token, linkedin_sub, linkedin_token_expires_at")
      .eq("id", post.user_id)
      .single();

    if (profileError || !profile) {
      console.error(`[cron] Profile not found for user ${post.user_id}`);
      await markFailed(supabase, post.id, "User profile not found");
      results.push({ id: post.id, status: "failed", error: "User profile not found" });
      continue;
    }

    // Check LinkedIn connection
    if (!profile.linkedin_connected || !profile.linkedin_access_token || !profile.linkedin_sub) {
      console.error(`[cron] LinkedIn not connected for user ${post.user_id}`);
      await markFailed(supabase, post.id, "LinkedIn not connected");
      results.push({ id: post.id, status: "failed", error: "LinkedIn not connected" });
      continue;
    }

    // Check token expiry
    if (profile.linkedin_token_expires_at) {
      const expiresAt = new Date(profile.linkedin_token_expires_at);
      if (expiresAt < new Date()) {
        console.error(`[cron] LinkedIn token expired for user ${post.user_id} (expired: ${expiresAt.toISOString()})`);
        await markFailed(supabase, post.id, "LinkedIn token expired");
        results.push({ id: post.id, status: "failed", error: "LinkedIn token expired" });
        continue;
      }
    }

    // 3. Publish
    console.log(`[cron] Publishing post ${post.id}...`);
    try {
      const result = await publishToLinkedIn(
        profile.linkedin_access_token,
        profile.linkedin_sub,
        post.content
      );

      if (result.success) {
        console.log(`[cron] ✓ Post ${post.id} published successfully (URN: ${result.linkedin_post_id})`);
        await supabase
          .from("drafts")
          .update({
            status: "published",
            published_at: new Date().toISOString(),
            linkedin_post_id: result.linkedin_post_id || null,
            error_message: null,
          })
          .eq("id", post.id);
        results.push({ id: post.id, status: "published" });
      } else {
        console.error(`[cron] ✗ Post ${post.id} failed:`, result.error);
        await markFailed(supabase, post.id, result.error || "Publishing failed");
        results.push({ id: post.id, status: "failed", error: result.error });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error(`[cron] ✗ Post ${post.id} exception:`, message);
      await markFailed(supabase, post.id, message);
      results.push({ id: post.id, status: "failed", error: message });
    }
  }

  const published = results.filter((r) => r.status === "published").length;
  const failed = results.filter((r) => r.status === "failed").length;
  console.log(`[cron] ─── Done: ${published} published, ${failed} failed ───`);

  return NextResponse.json({ message: "Cron complete", total, published, failed, results });
}

async function markFailed(
  supabase: ReturnType<typeof getServiceClient>,
  draftId: string,
  errorMessage: string
) {
  await supabase
    .from("drafts")
    .update({
      status: "failed",
      error_message: errorMessage,
    })
    .eq("id", draftId);
}
