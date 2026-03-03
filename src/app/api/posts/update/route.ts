import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface UpdateRequest {
  draft_id: string;
  content?: string;
  status?: "draft" | "scheduled" | "published";
  scheduled_at?: string | null;
  delete?: boolean;
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

    const body: UpdateRequest = await request.json();

    if (!body.draft_id) {
      return NextResponse.json(
        { error: "draft_id is required" },
        { status: 400 }
      );
    }

    if (body.delete) {
      const { error } = await supabase
        .from("drafts")
        .delete()
        .eq("id", body.draft_id)
        .eq("user_id", user.id);

      if (error) {
        return NextResponse.json(
          { error: "Failed to delete" },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, message: "Post deleted." });
    }

    const updates: Record<string, unknown> = {};
    if (body.content !== undefined) updates.content = body.content;
    if (body.status !== undefined) updates.status = body.status;
    if (body.scheduled_at !== undefined) updates.scheduled_at = body.scheduled_at;

    const { data, error } = await supabase
      .from("drafts")
      .update(updates)
      .eq("id", body.draft_id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Failed to update" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      draft: data,
      message: "Post updated.",
    });
  } catch {
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
