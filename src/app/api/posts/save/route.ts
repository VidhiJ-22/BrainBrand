import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface SaveRequest {
  content: string;
  post_type?: string;
  status: "draft" | "scheduled";
  scheduled_at?: string;
  draft_id?: string; // If updating an existing draft
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

    const body: SaveRequest = await request.json();

    if (!body.content?.trim()) {
      return NextResponse.json(
        { error: "Post content is required" },
        { status: 400 }
      );
    }

    if (body.status === "scheduled" && !body.scheduled_at) {
      return NextResponse.json(
        { error: "Scheduled date is required for scheduled posts" },
        { status: 400 }
      );
    }

    // Check free plan limitations for scheduling (TEMPORARILY DISABLED FOR TESTING)
    if (false && body.status === "scheduled") {
      const { data: profile } = await supabase
        .from("profiles")
        .select("subscription_plan")
        .eq("id", user!.id)
        .single();

      if (profile?.subscription_plan === "free") {
        return NextResponse.json(
          {
            error: "Scheduling is a Pro feature",
            code: "PRO_REQUIRED",
            message:
              "Upgrade to Pro to schedule posts. Free users can save drafts.",
          },
          { status: 403 }
        );
      }
    }

    if (body.draft_id) {
      // Update existing draft
      const { data, error } = await supabase
        .from("drafts")
        .update({
          content: body.content,
          post_type: body.post_type || "text",
          status: body.status,
          scheduled_at: body.scheduled_at || null,
        })
        .eq("id", body.draft_id)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) {
        console.error("Error updating draft:", error);
        return NextResponse.json(
          { error: "Failed to update draft" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        draft: data,
        message:
          body.status === "scheduled"
            ? "Post scheduled successfully!"
            : "Draft updated.",
      });
    }

    // Create new draft
    const { data, error } = await supabase
      .from("drafts")
      .insert({
        user_id: user.id,
        content: body.content,
        post_type: body.post_type || "text",
        status: body.status,
        scheduled_at: body.scheduled_at || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error saving draft:", error);
      return NextResponse.json(
        { error: "Failed to save draft" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      draft: data,
      message:
        body.status === "scheduled"
          ? "Post scheduled successfully!"
          : "Draft saved.",
    });
  } catch (err) {
    console.error("Save draft error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
