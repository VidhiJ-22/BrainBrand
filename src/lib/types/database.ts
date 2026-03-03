export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  linkedin_connected: boolean;
  linkedin_access_token: string | null;
  linkedin_token_expires_at: string | null;
  linkedin_profile_url: string | null;
  linkedin_headline: string | null;
  linkedin_profile_picture: string | null;
  linkedin_sub: string | null;
  subscription_plan: "free" | "pro" | "team";
  stripe_customer_id: string | null;
  ai_generations_this_month: number;
  ai_generations_reset_at: string;
  last_posts_fetched_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface LinkedInPost {
  id: string;
  user_id: string;
  linkedin_post_id: string | null;
  content: string;
  post_type:
    | "text"
    | "image"
    | "carousel"
    | "document"
    | "video"
    | "poll"
    | "article";
  likes_count: number;
  comments_count: number;
  reposts_count: number;
  impressions: number;
  engagement_rate: number;
  posted_at: string;
  hashtags: string[] | null;
  created_at: string;
}

export interface BrandBrainProfile {
  id: string;
  user_id: string;
  analysis: BrandBrainAnalysis | null;
  posts_analyzed: number;
  last_analyzed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Draft {
  id: string;
  user_id: string;
  content: string;
  post_type:
    | "text"
    | "image"
    | "carousel"
    | "document"
    | "video"
    | "poll"
    | "article";
  status: "draft" | "scheduled" | "published" | "failed";
  scheduled_at: string | null;
  published_at: string | null;
  linkedin_post_id: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

// Brand Brain Analysis JSON structure
export interface BrandBrainAnalysis {
  voice_profile: {
    overall_tone: string;
    tone_tags: string[];
    avg_post_length_words: number;
    vocabulary_level: "simple" | "moderate" | "sophisticated";
    emoji_usage: "none" | "minimal" | "moderate" | "heavy";
    hashtag_usage: "none" | "minimal" | "moderate" | "heavy";
    signature_phrases: string[];
    hook_style: string;
    cta_style: string;
  };
  performance_insights: {
    avg_engagement_rate: number;
    total_posts_analyzed: number;
    top_performing_topics: {
      topic: string;
      avg_engagement: number;
      post_count: number;
      why_it_works: string;
    }[];
    underperforming_topics: {
      topic: string;
      engagement: number;
      post_count: number;
      why_it_underperforms: string;
    }[];
    best_post: {
      content_preview: string;
      engagement: number;
      why_it_worked: string;
    };
    worst_post: {
      content_preview: string;
      engagement: number;
      why_it_flopped: string;
    };
    format_performance: {
      format: string;
      avg_engagement: number;
      post_count: number;
      recommendation: string;
    }[];
  };
  posting_patterns: {
    avg_posts_per_week: number;
    most_active_days: string[];
    best_performing_days: string[];
    best_performing_times: string[];
    consistency_score: number;
    consistency_feedback: string;
  };
  strengths: {
    strength: string;
    detail: string;
  }[];
  missed_opportunities: {
    opportunity: string;
    detail: string;
    expected_impact: "high" | "medium" | "low";
  }[];
  content_ideas: {
    hook: string;
    topic: string;
    format: string;
    why: string;
  }[];
  brand_brain_score: {
    overall: number;
    breakdown: {
      voice_clarity: number;
      topic_authority: number;
      engagement_power: number;
      consistency: number;
      content_variety: number;
    };
  };
}
