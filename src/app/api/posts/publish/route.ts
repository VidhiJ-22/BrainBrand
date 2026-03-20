import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { publishToLinkedIn } from "@/lib/linkedin/publish-post";

interface PublishRequest {
  draft_id?: string;
  content?: string;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get profile with LinkedIn tokens
    const { data: profile } = await supabase
      .from("profiles")
      .select(
        "linkedin_connected, linkedin_access_token, linkedin_sub, linkedin_token_expires_at"
      )
      .eq("id", user.id)
      .single();

    console.log("[publish-route] User:", user.id);
    console.log("[publish-route] LinkedIn connected:", profile?.linkedin_connected);
    console.log("[publish-route] Token length:", profile?.linkedin_access_token?.length || 0);
    console.log("[publish-route] Token preview:", profile?.linkedin_access_token?.substring(0, 10) + "...");
    console.log("[publish-route] LinkedIn sub:", profile?.linkedin_sub);
    console.log("[publish-route] Token expires at:", profile?.linkedin_token_expires_at);

    if (!profile?.linkedin_connected || !profile.linkedin_access_token) {
      console.error("[publish-route] BLOCKED: LinkedIn not connected or no token");
      return NextResponse.json(
        { error: "LinkedIn is not connected" },
        { status: 400 }
      );
    }

    // Check token expiry
    if (profile.linkedin_token_expires_at) {
      const expiresAt = new Date(profile.linkedin_token_expires_at);
      const isExpired = expiresAt < new Date();
      console.log("[publish-route] Token expired:", isExpired, "| Expires:", expiresAt.toISOString(), "| Now:", new Date().toISOString());
      if (isExpired) {
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

    const body: PublishRequest = await request.json();

    let content = body.content;
    let draftId = body.draft_id;

    // If draft_id provided, load the draft content
    if (draftId) {
      const { data: draft } = await supabase
        .from("drafts")
        .select("content")
        .eq("id", draftId)
        .eq("user_id", user.id)
        .single();

      if (!draft) {
        return NextResponse.json(
          { error: "Draft not found" },
          { status: 404 }
        );
      }

      content = draft.content;
    }

    if (!content?.trim()) {
      return NextResponse.json(
        { error: "Cannot publish an empty post." },
        { status: 400 }
      );
    }

    console.log("[publish-route] Content to publish (first 50 chars):", content.substring(0, 50) + "...");

    // Publish to LinkedIn
    console.log("[publish-route] Calling publish-post.ts...");
    const result = await publishToLinkedIn(
      profile.linkedin_access_token,
      profile.linkedin_sub!,
      content
    );

    console.log("[publish-route] Publish result:", JSON.stringify(result));

    if (!result.success) {
      // If we have a draft, mark it as failed
      if (draftId) {
        await supabase
          .from("drafts")
          .update({
            status: "failed",
            error_message: result.error || "Publishing failed",
          })
          .eq("id", draftId)
          .eq("user_id", user.id);
      }

      return NextResponse.json(
        { error: result.error || "Failed to publish to LinkedIn" },
        { status: 500 }
      );
    }

    // If we have a draft, update it to published
    if (draftId) {
      await supabase
        .from("drafts")
        .update({
          status: "published",
          published_at: new Date().toISOString(),
          linkedin_post_id: result.linkedin_post_id || null,
          error_message: null,
        })
        .eq("id", draftId)
        .eq("user_id", user.id);
    } else {
      // Create a new draft record for tracking
      const { data: newDraft } = await supabase
        .from("drafts")
        .insert({
          user_id: user.id,
          content,
          post_type: "text",
          status: "published",
          published_at: new Date().toISOString(),
          linkedin_post_id: result.linkedin_post_id || null,
        })
        .select()
        .single();

      draftId = newDraft?.id;
    }

    console.log("[publish-route] Draft updated/created, draft_id:", draftId);

    return NextResponse.json({
      success: true,
      linkedin_post_id: result.linkedin_post_id,
      draft_id: draftId,
      message: "Post published to LinkedIn!",
    });
  } catch (err) {
    console.error("Publish error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
