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

    if (!profile?.linkedin_connected || !profile.linkedin_access_token) {
      return NextResponse.json(
        { error: "LinkedIn is not connected" },
        { status: 400 }
      );
    }

    // Check token expiry
    if (profile.linkedin_token_expires_at) {
      const expiresAt = new Date(profile.linkedin_token_expires_at);
      if (expiresAt < new Date()) {
        return NextResponse.json(
          {
            error: "LinkedIn token expired",
            code: "TOKEN_EXPIRED",
            message:
              "Your LinkedIn access token has expired. Please reconnect your account in Settings.",
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
        { error: "Post content is required" },
        { status: 400 }
      );
    }

    // Publish to LinkedIn
    const result = await publishToLinkedIn(
      profile.linkedin_access_token,
      profile.linkedin_sub!,
      content
    );

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
