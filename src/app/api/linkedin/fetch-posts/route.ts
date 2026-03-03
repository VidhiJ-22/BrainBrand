import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createAuthClient } from "@/lib/supabase/server";
import {
  fetchLinkedInPosts,
  calculateEngagementRate,
  type RawLinkedInPost,
} from "@/lib/linkedin/fetch-posts";

// Service role client for writing data
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST() {
  try {
    // Get current user
    const supabase = await createAuthClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get profile with LinkedIn token
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select(
        "linkedin_access_token, linkedin_sub, linkedin_connected, linkedin_token_expires_at"
      )
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }

    if (!profile.linkedin_connected || !profile.linkedin_access_token) {
      return NextResponse.json(
        { error: "LinkedIn not connected" },
        { status: 400 }
      );
    }

    // Check token expiry
    if (profile.linkedin_token_expires_at) {
      const expiresAt = new Date(profile.linkedin_token_expires_at);
      if (expiresAt <= new Date()) {
        return NextResponse.json(
          {
            error: "LinkedIn token expired",
            code: "TOKEN_EXPIRED",
            message:
              "Your LinkedIn connection has expired. Please reconnect in Settings.",
          },
          { status: 401 }
        );
      }
    }

    // Fetch posts from LinkedIn
    let fetchedPosts: RawLinkedInPost[] = [];
    try {
      fetchedPosts = await fetchLinkedInPosts(
        profile.linkedin_access_token,
        profile.linkedin_sub || ""
      );
    } catch (err) {
      console.error("LinkedIn fetch error:", err);
      return NextResponse.json(
        {
          error: "Failed to fetch LinkedIn posts",
          message:
            "We couldn't pull your LinkedIn data right now. Please try again in a few minutes.",
        },
        { status: 502 }
      );
    }

    if (fetchedPosts.length === 0) {
      // Update last fetched timestamp even if no posts found
      const serviceClient = getServiceClient();
      await serviceClient
        .from("profiles")
        .update({ last_posts_fetched_at: new Date().toISOString() })
        .eq("id", user.id);

      return NextResponse.json({
        success: true,
        posts_fetched: 0,
        message: "No posts found on your LinkedIn profile.",
      });
    }

    // Calculate engagement rates
    const postsWithEngagement = fetchedPosts.map((post) => ({
      ...post,
      engagement_rate: calculateEngagementRate(post),
    }));

    const serviceClient = getServiceClient();

    // Delete existing posts for this user (full refresh approach)
    await serviceClient
      .from("linkedin_posts")
      .delete()
      .eq("user_id", user.id);

    // Insert new posts in batches
    const batchSize = 50;
    for (let i = 0; i < postsWithEngagement.length; i += batchSize) {
      const batch = postsWithEngagement.slice(i, i + batchSize).map((post) => ({
        user_id: user.id,
        linkedin_post_id: post.linkedin_post_id,
        content: post.content,
        post_type: post.post_type,
        likes_count: post.likes_count,
        comments_count: post.comments_count,
        reposts_count: post.reposts_count,
        impressions: post.impressions,
        engagement_rate: post.engagement_rate,
        posted_at: post.posted_at,
        hashtags: post.hashtags.length > 0 ? post.hashtags : null,
      }));

      const { error: insertError } = await serviceClient
        .from("linkedin_posts")
        .insert(batch);

      if (insertError) {
        console.error("Error inserting posts batch:", insertError);
        // Continue with remaining batches
      }
    }

    // Update last_posts_fetched_at on profile
    await serviceClient
      .from("profiles")
      .update({ last_posts_fetched_at: new Date().toISOString() })
      .eq("id", user.id);

    return NextResponse.json({
      success: true,
      posts_fetched: postsWithEngagement.length,
      message: `Successfully fetched ${postsWithEngagement.length} posts from LinkedIn.`,
    });
  } catch (err) {
    console.error("Unexpected error in fetch-posts:", err);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: "Something went wrong. Please try again.",
      },
      { status: 500 }
    );
  }
}
