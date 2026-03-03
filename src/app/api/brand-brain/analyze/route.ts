import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createAuthClient } from "@/lib/supabase/server";
import { generateBrandBrainAnalysis } from "@/lib/ai/brand-brain-analysis";

const MIN_POSTS = 5;

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: Request) {
  try {
    const supabase = await createAuthClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check for force re-analyze flag
    const body = await request.json().catch(() => ({}));
    const forceReanalyze = body?.force === true;

    // Get user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, linkedin_headline, last_posts_fetched_at")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }

    // Check if analysis already exists and is fresh
    if (!forceReanalyze) {
      const { data: existing } = await supabase
        .from("brand_brain_profiles")
        .select("last_analyzed_at, updated_at")
        .eq("user_id", user.id)
        .single();

      if (existing?.last_analyzed_at) {
        // Don't re-analyze if analysis is newer than last post fetch
        const analyzedAt = new Date(existing.last_analyzed_at);
        const fetchedAt = profile.last_posts_fetched_at
          ? new Date(profile.last_posts_fetched_at)
          : null;

        if (!fetchedAt || analyzedAt > fetchedAt) {
          return NextResponse.json({
            success: true,
            cached: true,
            message: "Analysis is already up to date.",
          });
        }
      }
    }

    // Fetch all posts for this user
    const { data: posts, error: postsError } = await supabase
      .from("linkedin_posts")
      .select(
        "content, post_type, likes_count, comments_count, reposts_count, impressions, engagement_rate, posted_at"
      )
      .eq("user_id", user.id)
      .order("posted_at", { ascending: false });

    if (postsError) {
      console.error("Error fetching posts for analysis:", postsError);
      return NextResponse.json(
        { error: "Failed to fetch posts" },
        { status: 500 }
      );
    }

    if (!posts || posts.length === 0) {
      return NextResponse.json(
        {
          error: "No posts found",
          message:
            "You need to fetch your LinkedIn posts first before running Brand Brain analysis.",
          code: "NO_POSTS",
        },
        { status: 400 }
      );
    }

    if (posts.length < MIN_POSTS) {
      return NextResponse.json(
        {
          error: "Not enough posts",
          message: `You need at least ${MIN_POSTS} LinkedIn posts for Brand Brain to analyze. You currently have ${posts.length}. Keep posting and come back!`,
          code: "TOO_FEW_POSTS",
          posts_count: posts.length,
        },
        { status: 400 }
      );
    }

    // Run the analysis
    const analysis = await generateBrandBrainAnalysis(posts, {
      name: profile.full_name || "User",
      headline: profile.linkedin_headline,
    });

    // Store the analysis using service client (bypasses RLS for upsert)
    const serviceClient = getServiceClient();
    const now = new Date().toISOString();

    // Check if a brand_brain_profile exists
    const { data: existingProfile } = await serviceClient
      .from("brand_brain_profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (existingProfile) {
      // Update existing
      const { error: updateError } = await serviceClient
        .from("brand_brain_profiles")
        .update({
          analysis,
          posts_analyzed: posts.length,
          last_analyzed_at: now,
        })
        .eq("user_id", user.id);

      if (updateError) {
        console.error("Error updating brand brain profile:", updateError);
        return NextResponse.json(
          { error: "Failed to save analysis" },
          { status: 500 }
        );
      }
    } else {
      // Insert new
      const { error: insertError } = await serviceClient
        .from("brand_brain_profiles")
        .insert({
          user_id: user.id,
          analysis,
          posts_analyzed: posts.length,
          last_analyzed_at: now,
        });

      if (insertError) {
        console.error("Error inserting brand brain profile:", insertError);
        return NextResponse.json(
          { error: "Failed to save analysis" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      cached: false,
      posts_analyzed: posts.length,
      score: analysis.brand_brain_score?.overall ?? null,
      message: `Analysis complete! Analyzed ${posts.length} posts.`,
    });
  } catch (err) {
    console.error("Brand Brain analysis error:", err);

    const message =
      err instanceof Error ? err.message : "An unexpected error occurred";

    return NextResponse.json(
      {
        error: "Analysis failed",
        message:
          message.includes("Failed to generate")
            ? "We had trouble analyzing your content. Please try again."
            : "Something went wrong during analysis. Please try again.",
      },
      { status: 500 }
    );
  }
}
