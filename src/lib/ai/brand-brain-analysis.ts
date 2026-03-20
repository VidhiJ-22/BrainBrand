import Anthropic from "@anthropic-ai/sdk";
import type { BrandBrainAnalysis } from "@/lib/types/database";

interface PostData {
  content: string;
  post_type: string;
  likes_count: number;
  comments_count: number;
  reposts_count: number;
  impressions: number;
  engagement_rate: number;
  posted_at: string;
}

interface UserInfo {
  name: string;
  headline: string | null;
}

const SYSTEM_PROMPT = `You are Brand Brain, an expert LinkedIn content strategist and analyst. You analyze a creator's LinkedIn posting history and produce a comprehensive, actionable content intelligence profile.

Your analysis must be specific, data-driven, and immediately useful. Never be generic. Every insight should reference specific posts, patterns, or data points from the user's actual content.

Respond ONLY with valid JSON. No markdown, no backticks, no explanation outside the JSON.`;

function buildUserPrompt(
  user: UserInfo,
  posts: PostData[]
): string {
  const postEntries = posts
    .map((post, i) => {
      return `---
POST #${i + 1}
Date: ${post.posted_at}
Type: ${post.post_type}
Content: ${post.content}
Likes: ${post.likes_count} | Comments: ${post.comments_count} | Reposts: ${post.reposts_count} | Impressions: ${post.impressions}
Engagement Rate: ${post.engagement_rate}%
---`;
    })
    .join("\n\n");

  return `Analyze these LinkedIn posts from ${user.name}${user.headline ? ` (${user.headline})` : ""}.

Here are their ${posts.length} most recent LinkedIn posts with performance data:

${postEntries}

Analyze this data and return a JSON object with EXACTLY this structure:

{
  "voice_profile": {
    "overall_tone": "2-3 sentence description of their writing personality and voice",
    "tone_tags": ["tag1", "tag2", "tag3"],
    "avg_post_length_words": number,
    "vocabulary_level": "simple" | "moderate" | "sophisticated",
    "emoji_usage": "none" | "minimal" | "moderate" | "heavy",
    "hashtag_usage": "none" | "minimal" | "moderate" | "heavy",
    "signature_phrases": ["phrase1", "phrase2"],
    "hook_style": "description of how they typically start posts — their opening line patterns",
    "cta_style": "description of how they typically end posts — questions, calls to action, statements"
  },
  "performance_insights": {
    "avg_engagement_rate": number,
    "total_posts_analyzed": number,
    "top_performing_topics": [
      {
        "topic": "topic name",
        "avg_engagement": number,
        "post_count": number,
        "why_it_works": "1 sentence explanation"
      }
    ],
    "underperforming_topics": [
      {
        "topic": "topic name",
        "engagement": number,
        "post_count": number,
        "why_it_underperforms": "1 sentence explanation"
      }
    ],
    "best_post": {
      "content_preview": "first 100 chars of the post",
      "engagement": number,
      "why_it_worked": "2-3 sentence analysis of why this was their best post"
    },
    "worst_post": {
      "content_preview": "first 100 chars of the post",
      "engagement": number,
      "why_it_flopped": "2-3 sentence analysis of why this underperformed"
    },
    "format_performance": [
      {
        "format": "text" | "image" | "carousel" | "document" | "video" | "poll",
        "avg_engagement": number,
        "post_count": number,
        "recommendation": "1 sentence"
      }
    ]
  },
  "posting_patterns": {
    "avg_posts_per_week": number,
    "most_active_days": ["Monday", "Wednesday"],
    "best_performing_days": ["Tuesday", "Thursday"],
    "best_performing_times": ["9:00 AM", "12:00 PM"],
    "consistency_score": number,
    "consistency_feedback": "1-2 sentence feedback on their posting consistency"
  },
  "strengths": [
    {
      "strength": "short title",
      "detail": "2-3 sentence explanation with specific examples from their posts"
    }
  ],
  "missed_opportunities": [
    {
      "opportunity": "short title",
      "detail": "2-3 sentence explanation of what they should try and why",
      "expected_impact": "high" | "medium" | "low"
    }
  ],
  "content_ideas": [
    {
      "hook": "The exact opening line/hook for the post (written in their voice and style)",
      "topic": "what the post is about in 5-10 words",
      "format": "text" | "carousel" | "image" | "poll",
      "why": "1 sentence on why this would perform well for their audience"
    }
  ],
  "brand_brain_score": {
    "overall": number,
    "breakdown": {
      "voice_clarity": number,
      "topic_authority": number,
      "engagement_power": number,
      "consistency": number,
      "content_variety": number
    }
  }
}

IMPORTANT RULES:
- top_performing_topics: return top 5 topics ranked by engagement
- underperforming_topics: return bottom 3 topics
- format_performance: ranked by engagement, include all formats they've used
- strengths: return exactly 3 strengths
- missed_opportunities: return exactly 4 missed opportunities
- content_ideas: return exactly 10 post ideas
- Every insight MUST reference their actual posts and data. No generic advice.
- Content ideas MUST be written in their voice — match their tone, vocabulary, length, and style.
- Hooks should be specific and ready to use, not vague templates.
- Be honest. If their content is weak in an area, say so but constructively.
- Scores should be realistic. Most creators score 40-70. Only exceptional creators score 80+.
- Return ONLY the JSON object. No other text.`;
}

/**
 * Generates a Brand Brain analysis by sending posts to Claude.
 * Returns the parsed BrandBrainAnalysis object.
 */
export async function generateBrandBrainAnalysis(
  posts: PostData[],
  user: UserInfo
): Promise<BrandBrainAnalysis> {
  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY!,
  });

  const userPrompt = buildUserPrompt(user, posts);

  let responseText = await callClaude(client, userPrompt);

  // Try to parse the response as JSON
  let analysis: BrandBrainAnalysis;
  try {
    analysis = parseAnalysisJson(responseText);
  } catch (firstError) {
    console.warn(
      "First Claude response was not valid JSON, retrying with stricter prompt..."
    );

    // Retry once with stricter instructions
    responseText = await callClaude(
      client,
      userPrompt +
        "\n\nCRITICAL: Your previous response was not valid JSON. Return ONLY a raw JSON object. No markdown code fences, no backticks, no explanation — just the JSON object starting with { and ending with }."
    );

    try {
      analysis = parseAnalysisJson(responseText);
    } catch (retryError) {
      console.error("Retry also failed to produce valid JSON:", retryError);
      throw new Error(
        "Failed to generate valid Brand Brain analysis after 2 attempts."
      );
    }
  }

  // Validate and sanitize the analysis
  return sanitizeAnalysis(analysis, posts.length);
}

async function callClaude(
  client: Anthropic,
  userPrompt: string
): Promise<string> {
  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 8192,
    messages: [{ role: "user", content: userPrompt }],
    system: SYSTEM_PROMPT,
  });

  // Extract text from the response
  const textBlock = message.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text content in Claude response");
  }

  return textBlock.text;
}

/**
 * Parse JSON from Claude's response, handling common formatting issues.
 */
function parseAnalysisJson(text: string): BrandBrainAnalysis {
  let cleaned = text.trim();

  // Remove markdown code fences if present
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.slice(0, -3);
  }
  cleaned = cleaned.trim();

  // Find the JSON object boundaries
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }

  return JSON.parse(cleaned) as BrandBrainAnalysis;
}

/**
 * Ensures the analysis has all required fields with safe defaults.
 */
function sanitizeAnalysis(
  analysis: BrandBrainAnalysis,
  postCount: number
): BrandBrainAnalysis {
  // Ensure voice_profile exists and has defaults
  if (!analysis.voice_profile) {
    analysis.voice_profile = {
      overall_tone: "Analysis unavailable",
      tone_tags: [],
      avg_post_length_words: 0,
      vocabulary_level: "moderate",
      emoji_usage: "none",
      hashtag_usage: "none",
      signature_phrases: [],
      hook_style: "Not enough data",
      cta_style: "Not enough data",
    };
  }

  // Ensure performance_insights exists
  if (!analysis.performance_insights) {
    analysis.performance_insights = {
      avg_engagement_rate: 0,
      total_posts_analyzed: postCount,
      top_performing_topics: [],
      underperforming_topics: [],
      best_post: {
        content_preview: "",
        engagement: 0,
        why_it_worked: "Not enough data",
      },
      worst_post: {
        content_preview: "",
        engagement: 0,
        why_it_flopped: "Not enough data",
      },
      format_performance: [],
    };
  }

  // Ensure posting_patterns exists
  if (!analysis.posting_patterns) {
    analysis.posting_patterns = {
      avg_posts_per_week: 0,
      most_active_days: [],
      best_performing_days: [],
      best_performing_times: [],
      consistency_score: 0,
      consistency_feedback: "Not enough data to assess consistency.",
    };
  }

  // Ensure arrays exist
  if (!Array.isArray(analysis.strengths)) analysis.strengths = [];
  if (!Array.isArray(analysis.missed_opportunities))
    analysis.missed_opportunities = [];
  if (!Array.isArray(analysis.content_ideas)) analysis.content_ideas = [];

  // Ensure brand_brain_score exists with valid numbers
  if (!analysis.brand_brain_score) {
    analysis.brand_brain_score = {
      overall: 0,
      breakdown: {
        voice_clarity: 0,
        topic_authority: 0,
        engagement_power: 0,
        consistency: 0,
        content_variety: 0,
      },
    };
  } else {
    // Clamp scores to 0-100
    const clamp = (n: unknown) =>
      Math.max(0, Math.min(100, typeof n === "number" ? Math.round(n) : 0));

    analysis.brand_brain_score.overall = clamp(
      analysis.brand_brain_score.overall
    );

    if (analysis.brand_brain_score.breakdown) {
      const b = analysis.brand_brain_score.breakdown;
      b.voice_clarity = clamp(b.voice_clarity);
      b.topic_authority = clamp(b.topic_authority);
      b.engagement_power = clamp(b.engagement_power);
      b.consistency = clamp(b.consistency);
      b.content_variety = clamp(b.content_variety);
    }
  }

  // Update total_posts_analyzed to match actual count
  analysis.performance_insights.total_posts_analyzed = postCount;

  return analysis;
}
