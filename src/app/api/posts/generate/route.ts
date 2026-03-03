import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { getBrandBrainProfile } from "@/lib/brand-brain/get-profile";

interface GenerateRequest {
  topic: string;
  format?: string;
  tone?: string;
  length?: string;
  mode?: "generate" | "improve";
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

    const body: GenerateRequest = await request.json();

    if (!body.topic?.trim()) {
      return NextResponse.json(
        { error: "Please provide a topic or idea" },
        { status: 400 }
      );
    }

    // Get user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, linkedin_headline, subscription_plan, ai_generations_this_month, ai_generations_reset_at")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }

    // Check free tier limits
    if (profile.subscription_plan === "free") {
      // Reset counter if month changed
      const resetAt = new Date(profile.ai_generations_reset_at);
      const now = new Date();
      if (
        resetAt.getMonth() !== now.getMonth() ||
        resetAt.getFullYear() !== now.getFullYear()
      ) {
        await supabase
          .from("profiles")
          .update({
            ai_generations_this_month: 0,
            ai_generations_reset_at: now.toISOString(),
          })
          .eq("id", user.id);
        profile.ai_generations_this_month = 0;
      }

      if (profile.ai_generations_this_month >= 5) {
        return NextResponse.json(
          {
            error: "Generation limit reached",
            code: "LIMIT_REACHED",
            message:
              "You've used all 5 free AI generations this month. Upgrade to Pro for unlimited.",
          },
          { status: 403 }
        );
      }
    }

    // Load Brand Brain profile
    const bbProfile = await getBrandBrainProfile();
    const analysis = bbProfile?.analysis;

    // Build the prompt
    const voiceSection = analysis?.voice_profile
      ? `THEIR BRAND BRAIN VOICE PROFILE:
- Overall tone: ${analysis.voice_profile.overall_tone}
- Tone tags: ${analysis.voice_profile.tone_tags?.join(", ") || "N/A"}
- Avg post length: ${analysis.voice_profile.avg_post_length_words} words
- Vocabulary level: ${analysis.voice_profile.vocabulary_level}
- Emoji usage: ${analysis.voice_profile.emoji_usage}
- Hashtag usage: ${analysis.voice_profile.hashtag_usage}
- Hook style: ${analysis.voice_profile.hook_style}
- CTA style: ${analysis.voice_profile.cta_style}
- Signature phrases: ${analysis.voice_profile.signature_phrases?.join(", ") || "None identified"}`
      : "No Brand Brain voice profile available. Write in a professional, engaging LinkedIn style.";

    const topTopics = analysis?.performance_insights?.top_performing_topics
      ?.map(
        (t) =>
          `- ${t.topic} (avg engagement: ${t.avg_engagement}, ${t.post_count} posts)`
      )
      .join("\n");

    const bestPost = analysis?.performance_insights?.best_post;
    const bestPostSection = bestPost
      ? `THEIR BEST POST FOR REFERENCE:
Content: ${bestPost.content_preview}
Why it worked: ${bestPost.why_it_worked}`
      : "";

    const format = body.format || "text";
    const tone =
      body.tone === "default" || !body.tone
        ? "match their natural tone"
        : `${body.tone} tone`;
    const lengthPref = body.length || "medium";
    const lengthInstructions =
      lengthPref === "short"
        ? "Keep it under 100 words."
        : lengthPref === "long"
          ? "Write 200+ words for depth."
          : `Match their typical post length of ~${analysis?.voice_profile?.avg_post_length_words || 150} words.`;

    const hashtagNote =
      analysis?.voice_profile?.hashtag_usage === "none" ||
      analysis?.voice_profile?.hashtag_usage === "minimal"
        ? "Do NOT include hashtags."
        : `Include 2-3 relevant hashtags (they typically use ${analysis?.voice_profile?.hashtag_usage || "some"} hashtags).`;

    const isImprove = body.mode === "improve";

    const systemPrompt = `You are a LinkedIn ghostwriter. You write posts that match the creator's exact voice and style. You never sound generic or AI-generated. Every post should feel like the creator wrote it themselves.`;

    const userPrompt = isImprove
      ? `Improve this LinkedIn post draft for ${profile.full_name || "the user"}.

${voiceSection}

${topTopics ? `THEIR TOP PERFORMING TOPICS:\n${topTopics}` : ""}

${bestPostSection}

THE DRAFT TO IMPROVE:
${body.topic}

INSTRUCTIONS:
- Rewrite in their exact voice — match their tone, vocabulary, sentence length, and style
- Use their typical hook style to open the post
- Use their typical CTA style to end the post
- Tone: ${tone}
- ${lengthInstructions}
- Include line breaks for readability (LinkedIn posts need whitespace)
- ${hashtagNote}
- Return ONLY the post text. No explanation, no options, no meta-commentary.`
      : `Write a LinkedIn post for ${profile.full_name || "the user"}.

${voiceSection}

${topTopics ? `THEIR TOP PERFORMING TOPICS:\n${topTopics}` : ""}

${bestPostSection}

THE TOPIC/IDEA:
${body.topic}

INSTRUCTIONS:
- Write in their exact voice — match their tone, vocabulary, sentence length, and style
- Use their typical hook style to open the post
- Use their typical CTA style to end the post
- Format: ${format}
- Tone: ${tone}
- ${lengthInstructions}
- Include line breaks for readability (LinkedIn posts need whitespace)
- ${hashtagNote}
- Return ONLY the post text. No explanation, no options, no meta-commentary.`;

    // Call Claude
    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    });

    const message = await client.messages.create({
      model: "claude-sonnet-4-5-20250514",
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json(
        { error: "No content generated" },
        { status: 500 }
      );
    }

    // Increment generation counter
    await supabase
      .from("profiles")
      .update({
        ai_generations_this_month: (profile.ai_generations_this_month || 0) + 1,
      })
      .eq("id", user.id);

    return NextResponse.json({
      content: textBlock.text.trim(),
      generations_used:
        (profile.ai_generations_this_month || 0) + 1,
      generations_limit:
        profile.subscription_plan === "free" ? 5 : null,
    });
  } catch (err) {
    console.error("Post generation error:", err);
    return NextResponse.json(
      { error: "Failed to generate post. Please try again." },
      { status: 500 }
    );
  }
}
