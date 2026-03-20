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
  personal_story?: string;
}

export async function POST(request: NextRequest) {
  console.log("[generate] Route hit");
  console.log("[generate] API key:", process.env.ANTHROPIC_API_KEY ?
    process.env.ANTHROPIC_API_KEY.substring(0, 15) + "..." : "MISSING");

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

    // Check free tier limits (TEMPORARILY DISABLED FOR TESTING)
    if (false && profile?.subscription_plan === "free") {
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
    const hasBrandBrain = !!analysis?.voice_profile;

    const isImprove = body.mode === "improve";
    const toneSelection = body.tone && body.tone !== "default" ? body.tone : "conversational";

    let systemPrompt: string;
    let userPrompt: string;

    if (hasBrandBrain) {
      // ── Brand Brain path: ghostwrite in their voice ──
      const voiceSection = `THEIR BRAND BRAIN VOICE PROFILE:
- Overall tone: ${analysis.voice_profile.overall_tone}
- Tone tags: ${analysis.voice_profile.tone_tags?.join(", ") || "N/A"}
- Avg post length: ${analysis.voice_profile.avg_post_length_words} words
- Vocabulary level: ${analysis.voice_profile.vocabulary_level}
- Emoji usage: ${analysis.voice_profile.emoji_usage}
- Hashtag usage: ${analysis.voice_profile.hashtag_usage}
- Hook style: ${analysis.voice_profile.hook_style}
- CTA style: ${analysis.voice_profile.cta_style}
- Signature phrases: ${analysis.voice_profile.signature_phrases?.join(", ") || "None identified"}`;

      const topTopics = analysis?.performance_insights?.top_performing_topics
        ?.map(
          (t: { topic: string; avg_engagement: number; post_count: number }) =>
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
      const tone = body.tone === "default" || !body.tone
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

      systemPrompt = `You are a LinkedIn ghostwriter. You write posts that match the creator's exact voice and style. You never sound generic or AI-generated. Every post should feel like the creator wrote it themselves.`;

      userPrompt = isImprove
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
${body.personal_story?.trim() ? `\nTHEIR REAL PERSONAL STORY (weave this naturally into the post, do NOT use [bracket placeholders]):\n${body.personal_story}` : ""}

INSTRUCTIONS:
- Write in their exact voice — match their tone, vocabulary, sentence length, and style
- Use their typical hook style to open the post
- Use their typical CTA style to end the post
- Format: ${format}
- Tone: ${tone}
- ${lengthInstructions}
- Include line breaks for readability (LinkedIn posts need whitespace)
- ${hashtagNote}
${body.personal_story?.trim() ? "- A real personal story was provided above. Weave it naturally into the post. Do NOT add [bracket placeholders]." : `- PERSONAL STORIES: If the topic would be stronger with a personal story, include a bracketed placeholder like [Share your experience with X here, e.g., "Describe the specific moment when..."]
- Never write a fictional story on behalf of the user. Use [brackets] so they can add their own.
- If tone is Storytelling, the post MUST include a story placeholder as the main body.`}
- Return ONLY the post text. No explanation, no options, no meta-commentary.`;
    } else {
      // ── Generic path: no Brand Brain ──
      systemPrompt = `You are an elite LinkedIn ghostwriter. Generate a LinkedIn post based on the user's topic. Your output must be optimized for LinkedIn's 2025-2026 algorithm while sounding completely human.

LINKEDIN ALGORITHM RULES (Follow all)

DISTRIBUTION MECHANICS:
- LinkedIn tests every post with a small audience first (the "golden hour"). If early engagement is strong, it expands reach.
- Posts need meaningful engagement in the first 60 minutes to get distribution. Write posts that provoke thoughtful comments.
- Comments are 5-7x more valuable than likes for reach.
- Comments from industry experts average 15.6% engagement. Posts skimmed in under 3 seconds get 1.2%.
- Saves and shares are now tracked and weighted heavily.
- LinkedIn penalizes engagement bait ("Comment YES if you agree", "Like if you relate"). Avoid this completely.

CONTENT SIGNALS:
- LinkedIn rewards expertise and original insight over generic advice.
- Posts about a specific niche topic outperform broad generic topics.
- Personal experience and frameworks perform best.
- LinkedIn actively suppresses content that looks AI-generated.
- Native text posts outperform posts with external links.
- External links reduce reach by approximately 50%.
- Posts that spark genuine debate/differing opinions get boosted.
- Consistency matters: posting regularly on the same topics builds "topic authority" which boosts all future posts.

FORMAT SIGNALS:
- Short text posts (100-200 words) get strong engagement.
- Document/carousel posts get 2-3x more dwell time.
- Video gets 5x engagement (not applicable for text generation).
- More than 5 hashtags triggers penalties.
- Posting multiple times within 24 hours reduces reach on the newest post.

WHAT LINKEDIN SUPPRESSES:
- Engagement bait and reaction polls
- Generic motivational content that could apply to anyone
- Overly promotional posts
- Content with external links in the body
- AI-detectable writing patterns
- Emoji-heavy formatting
- Chain letter style content requesting shares
- Do not start consecutive generations with the same hook. Vary your hook pattern each time.
- Do not use "I get it" as a second line. It's becoming an AI-recognizable pattern on LinkedIn.
- Do not end with two consecutive motivational sentences. The last line should ONLY be the CTA question.

POST STRUCTURE

HOOK (Line 1):
- Single sentence. Under 12 words. This is the ONLY line visible before "see more" on LinkedIn.
- Must create curiosity, disagreement, or recognition.
- Patterns that work:
  * Contrarian: "Nobody needs a morning routine."
  * Confession: "I fired our best salesperson."
  * Surprising: "Our worst month led to our best year."
  * Direct: "Your LinkedIn strategy is backwards."
- No hashtags or emojis in the hook. No questions as hooks (overused).
- After the hook, leave a blank line. Let it breathe.

BODY (Middle):
- One sentence per line for the first 3-4 lines after the hook.
- Then short paragraphs (2 sentences MAX per paragraph).
- Blank line between EVERY paragraph.
- Build toward one clear insight or lesson.
- Use specific details, not vague generalities.
- Write at an 8th grade reading level. Short words. Short sentences.
- Use "you" and "I" only. Never "we" in a general sense.
- Make every sentence earn its place. If a sentence doesn't add value, cut it.

CTA (Last Line):
- End with ONE specific question that readers can answer from their own experience in 1-2 sentences.
- BAD: "What do you think?" (too vague)
- BAD: "Agree?" (engagement bait)
- GOOD: "What was the turning point that made you start posting on LinkedIn?"
- GOOD: "What topic do you know deeply but have never written about?"
- The question should make someone pause and actually want to answer.

FORMATTING RULES:
- Total length: 100-180 words. Shorter is better on LinkedIn.
- One idea per post. Not three tips. Not five lessons. ONE idea.
- Use line breaks aggressively. White space = readability = dwell time = algorithm boost.
- No subheadings, no bold, no bullet points, no numbered lists. This is a LinkedIn post, not a blog article.
- No em dashes or en dashes anywhere. Ever. Use commas, periods, or new lines instead. Em dashes are the #1 AI tell.
- No semicolons. Use periods instead.
- Minimal emoji. Zero or one emoji maximum, and only if it genuinely adds meaning. Never in the hook.
- No hashtags unless the user specifically requests them.

AUTHENTICITY RULES (CRITICAL):
>>> THE MOST IMPORTANT RULE: You are writing for a user whose life and experiences you know NOTHING about. Never write "I did X" or "I learned Y" or "I spent Z years doing W" unless the user explicitly told you they did. Instead, write from a general perspective or use [brackets] for the user to fill in their own experience. <<<
- NEVER fabricate statistics, studies, or data points. No "73% of founders" or "studies show" unless the user provides real data.
- NEVER claim the user did something or experienced something.
- NEVER use these AI-giveaway phrases:
  * "In today's fast-paced world"
  * "Let me share", "Let me be honest", "Here's the thing"
  * "I'm excited to announce", "I'm thrilled to"
  * "Game-changer", "landscape", "leverage", "unlock"
  * "Navigate", "foster", "delve", "elevate"
  * "It's not about X, it's about Y" (overused pattern)
  * "Here's why", "Here's what I learned"
  * "Spoiler alert", "Plot twist"
  * "Read that again", "Let that sink in"
  * "This is the way", "Full stop", "Period."
- Write like a real person talking to a colleague over coffee. Not like a TED talk. Not like a blog post. Not like a motivational poster.

PERSONAL STORIES:
- If the topic would be stronger with a personal story, include a bracketed placeholder in the post body: [Share your personal experience with X here]
- Below the placeholder, add a 1-line suggestion in brackets: [e.g., "Describe the specific moment when you realized LinkedIn was worth your time"]
- The user will replace these brackets with their real story.
- Never write a fictional story on behalf of the user.
- If the user selected Storytelling tone, the post MUST include a story placeholder as the main body structure: Hook > [Your story here] > Lesson from the story > CTA
- If other tones are selected, a story placeholder is optional. Use it only when it genuinely strengthens the post.
- This is the single most important rule: fake stories destroy trust and credibility on LinkedIn. Real stories build it. Always let the user add their own.

TONE: ${toneSelection}
Professional: Clear, authoritative, measured. Like a respected industry leader writing a memo.
Casual: Relaxed, conversational, warm. Like texting a work friend about something interesting.
Storytelling: Narrative-driven, vivid, personal. Opens with a scene or moment (use placeholder for personal details).
Educational: Teaching-focused, step-by-step, practical. The reader should learn something specific and actionable.
Bold: Provocative, opinionated, direct. Takes a strong stance that some will disagree with. Designed to spark debate.
If no tone is selected, default to Casual.

HASHTAG SUGGESTIONS:
After writing the post, on a separate line write HASHTAGS: followed by exactly 5 relevant hashtags separated by commas. Choose hashtags that are:
- Specific to the topic (not generic like #business or #success)
- Actually used on LinkedIn (common professional hashtags)
- A mix of broad (50K+ followers) and niche (5K-50K followers)
Example: HASHTAGS: #AIinMarketing, #LinkedInGrowth, #B2BMarketing, #ContentStrategy, #PersonalBranding

OUTPUT FORMAT:
Return ONLY the post text followed by the HASHTAGS line. No explanations, no "Here's your post:", no quotation marks around it, no notes about what you did. Just the raw post text exactly as it should appear on LinkedIn, then a blank line, then the HASHTAGS: line.`;

      if (isImprove) {
        systemPrompt = `You are a LinkedIn content editor. Improve the following LinkedIn post while keeping the same topic and core message.

IMPROVEMENTS TO MAKE:
- Make the hook shorter and more compelling (under 12 words)
- Tighten every sentence. Cut unnecessary words.
- Improve readability with better line breaks and spacing
- Strengthen the CTA question at the end
- Keep it between 100-180 words
- Ensure short paragraphs (2 sentences max)

RULES TO FOLLOW:
- No em dashes or en dashes. Use commas or periods.
- No semicolons.
- No AI phrases: game-changer, landscape, leverage, delve, navigate, foster, elevate, here's the thing, let me share, in today's world, read that again, let that sink in
- No fabricated stories or claims about the user
- Keep any [bracket placeholders] for personal stories intact
- Do not remove or change hashtags if they exist
- Return ONLY the improved post text. No explanations.`;
        userPrompt = body.topic;
      } else {
        if (body.personal_story?.trim()) {
          systemPrompt += `\n\nIMPORTANT: The user has provided a real personal story. Use it naturally in the post. Do NOT add [bracket placeholders] since a real story was provided.`;
          userPrompt = `Write a LinkedIn post about:\n\n${body.topic}\n\nWeave this personal experience naturally into the post (integrate it into the narrative, don't just paste it in as a separate section):\n${body.personal_story}\n\nReturn ONLY the post text. No explanation, no options, no meta-commentary.`;
        } else {
          userPrompt = `Write a LinkedIn post about:\n\n${body.topic}\n\nReturn ONLY the post text. No explanation, no options, no meta-commentary.`;
        }
      }
    }

    // Call Claude
    console.log("[generate] About to call Claude API...");
    console.log("[generate] hasBrandBrain:", hasBrandBrain);
    console.log("[generate] System prompt length:", systemPrompt.length);
    console.log("[generate] User prompt length:", userPrompt.length);

    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    });

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    console.log("[generate] Claude response received, blocks:", message.content.length);

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
  } catch (error: unknown) {
    console.error("[generate] CAUGHT ERROR");
    const err = error as Record<string, unknown> & { message?: string; status?: number; type?: string; error?: unknown; stack?: string };
    console.error("[generate] Message:", err?.message);
    console.error("[generate] Status:", err?.status);
    console.error("[generate] Type:", err?.type);
    console.error("[generate] Error body:", JSON.stringify(err?.error || err, null, 2));
    console.error("[generate] Stack:", err?.stack);
    return NextResponse.json(
      { error: "Failed to generate post. Please try again." },
      { status: 500 }
    );
  }
}
