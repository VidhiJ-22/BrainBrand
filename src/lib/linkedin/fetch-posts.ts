/**
 * LinkedIn Post Fetcher
 *
 * Fetches a user's LinkedIn posts using the LinkedIn API (v2).
 * Handles pagination and extracts engagement metrics.
 *
 * LinkedIn API Reference:
 * - Posts: GET /v2/posts?author=urn:li:person:{id}&q=author
 * - Social Actions: GET /v2/socialActions/{urn}
 *
 * NOTE: LinkedIn's API has significant access limitations.
 * Full post retrieval requires "Marketing Developer Platform" access
 * or a product like "Community Management API".
 * The implementation below follows the current API spec but may need
 * endpoint/scope adjustments based on your LinkedIn app's approved products.
 */

export interface RawLinkedInPost {
  linkedin_post_id: string;
  content: string;
  post_type: string;
  likes_count: number;
  comments_count: number;
  reposts_count: number;
  impressions: number;
  posted_at: string;
  hashtags: string[];
}

export interface FetchProgress {
  step: string;
  detail: string;
  posts_found: number;
}

type ProgressCallback = (progress: FetchProgress) => void;

function extractHashtags(text: string): string[] {
  const matches = text.match(/#[\w\u00C0-\u024F]+/g);
  return matches ? [...new Set(matches.map((t) => t.toLowerCase()))] : [];
}

function detectPostType(post: Record<string, unknown>): string {
  const content = post.content as Record<string, unknown> | undefined;
  if (!content) return "text";

  const media = content.media as Record<string, unknown> | undefined;
  if (!media) return "text";

  const mediaCategory = (media.title as string) || "";
  const id = (media.id as string) || "";

  if (id.includes("image") || mediaCategory.includes("IMAGE")) return "image";
  if (id.includes("video") || mediaCategory.includes("VIDEO")) return "video";
  if (id.includes("document") || mediaCategory.includes("DOCUMENT"))
    return "carousel"; // LinkedIn "documents" are often carousels
  if (
    (post as Record<string, unknown>).pollId ||
    mediaCategory.includes("POLL")
  )
    return "poll";
  if (mediaCategory.includes("ARTICLE")) return "article";

  return "text";
}

function extractPostText(post: Record<string, unknown>): string {
  // LinkedIn API v2 posts use `commentary` field for text
  if (typeof post.commentary === "string") return post.commentary;

  // UGC posts use specificContent.shareCommentary.text
  const specificContent = post.specificContent as
    | Record<string, unknown>
    | undefined;
  if (specificContent) {
    const shareContent = specificContent[
      "com.linkedin.ugc.ShareContent"
    ] as Record<string, unknown> | undefined;
    if (shareContent) {
      const commentary = shareContent.shareCommentary as
        | Record<string, unknown>
        | undefined;
      if (commentary && typeof commentary.text === "string")
        return commentary.text;
    }
  }

  // Fallback: check text field
  if (typeof post.text === "string") return post.text;

  return "";
}

/**
 * Fetches posts from LinkedIn API with pagination.
 * Targets 30-200 posts, stopping when no more are available.
 */
export async function fetchLinkedInPosts(
  accessToken: string,
  linkedinSub: string,
  onProgress?: ProgressCallback
): Promise<RawLinkedInPost[]> {
  const posts: RawLinkedInPost[] = [];
  const maxPosts = 200;
  let start = 0;
  const count = 50; // Posts per page

  onProgress?.({
    step: "connecting",
    detail: "Connecting to LinkedIn...",
    posts_found: 0,
  });

  // Fetch the member's person URN using the sub from OpenID
  // The sub from userinfo is the person ID
  const authorUrn = `urn:li:person:${linkedinSub}`;
  console.log("[linkedin] Author URN:", authorUrn);
  console.log("[linkedin] Token preview:", accessToken.substring(0, 10) + "...");

  let hasMore = true;

  while (hasMore && posts.length < maxPosts) {
    try {
      // Try the v2 posts endpoint first (requires Community Management API or equivalent)
      const postsUrl = new URL("https://api.linkedin.com/v2/posts");
      postsUrl.searchParams.set("author", authorUrn);
      postsUrl.searchParams.set("q", "author");
      postsUrl.searchParams.set("count", count.toString());
      postsUrl.searchParams.set("start", start.toString());
      postsUrl.searchParams.set("sortBy", "LAST_MODIFIED");

      console.log("[linkedin] Calling v2/posts:", postsUrl.toString());

      const response = await fetch(postsUrl.toString(), {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "LinkedIn-Version": "202401",
          "X-Restli-Protocol-Version": "2.0.0",
        },
      });

      console.log("[linkedin] v2/posts response status:", response.status);

      if (!response.ok) {
        const errText = await response.text();
        console.error("[linkedin] v2/posts error body:", errText);

        // If v2/posts fails, try ugcPosts endpoint
        if (response.status === 403 || response.status === 401) {
          console.warn(
            "[linkedin] v2/posts not available (status " + response.status + "), falling back to ugcPosts..."
          );
          const ugcPosts = await fetchViaUgcPosts(
            accessToken,
            authorUrn,
            maxPosts,
            onProgress
          );
          return ugcPosts;
        }

        // If rate limited, stop
        if (response.status === 429) {
          console.warn("[linkedin] Rate limit hit, stopping with current posts");
          break;
        }

        break;
      }

      const data = await response.json();
      console.log("[linkedin] v2/posts response keys:", Object.keys(data));
      console.log("[linkedin] v2/posts elements count:", (data.elements || []).length);
      if ((data.elements || []).length > 0) {
        console.log("[linkedin] First element keys:", Object.keys(data.elements[0]));
        console.log("[linkedin] First element preview:", JSON.stringify(data.elements[0]).substring(0, 500));
      }
      const elements = (data.elements || []) as Record<string, unknown>[];

      if (elements.length === 0) {
        hasMore = false;
        break;
      }

      for (const post of elements) {
        const text = extractPostText(post);
        if (!text) continue; // Skip posts with no text content

        const postId =
          (post.id as string) || (post.activity as string) || `post_${start}`;

        posts.push({
          linkedin_post_id: postId,
          content: text,
          post_type: detectPostType(post),
          likes_count: 0, // Will be fetched separately or from socialDetail
          comments_count: 0,
          reposts_count: 0,
          impressions: 0,
          posted_at:
            typeof post.createdAt === "number"
              ? new Date(post.createdAt).toISOString()
              : typeof post.publishedAt === "number"
                ? new Date(post.publishedAt).toISOString()
                : new Date().toISOString(),
          hashtags: extractHashtags(text),
        });
      }

      onProgress?.({
        step: "fetching",
        detail: `Pulling your posts... (${posts.length} found)`,
        posts_found: posts.length,
      });

      // Extract social actions (likes, comments, reposts) for each post
      await enrichWithSocialActions(
        accessToken,
        posts.slice(start, start + elements.length)
      );

      start += elements.length;

      if (elements.length < count) {
        hasMore = false;
      }
    } catch (err) {
      console.error("Error fetching LinkedIn posts:", err);
      break;
    }
  }

  onProgress?.({
    step: "processing",
    detail: "Analyzing engagement data...",
    posts_found: posts.length,
  });

  return posts;
}

/**
 * Fallback: Fetch posts via the UGC Posts endpoint.
 * This endpoint is available with different permission scopes.
 */
async function fetchViaUgcPosts(
  accessToken: string,
  authorUrn: string,
  maxPosts: number,
  onProgress?: ProgressCallback
): Promise<RawLinkedInPost[]> {
  const posts: RawLinkedInPost[] = [];
  let start = 0;
  const count = 50;
  let hasMore = true;

  console.log("[linkedin] === FALLBACK: trying ugcPosts ===");

  while (hasMore && posts.length < maxPosts) {
    try {
      const url = new URL("https://api.linkedin.com/v2/ugcPosts");
      url.searchParams.set("q", "authors");
      url.searchParams.set("authors", `List(${authorUrn})`);
      url.searchParams.set("count", count.toString());
      url.searchParams.set("start", start.toString());
      url.searchParams.set("sortBy", "LAST_MODIFIED");

      console.log("[linkedin] Calling ugcPosts:", url.toString());

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "X-Restli-Protocol-Version": "2.0.0",
        },
      });

      console.log("[linkedin] ugcPosts response status:", response.status);

      if (!response.ok) {
        const errText = await response.text();
        console.error("[linkedin] ugcPosts error body:", errText);

        // If this also fails, the app's API access may be insufficient
        // Return whatever we have (possibly empty)
        if (posts.length === 0) {
          console.warn(
            "Unable to fetch posts from LinkedIn. " +
              "Ensure your LinkedIn app has the required API products enabled. " +
              "Required: 'Share on LinkedIn' and/or 'Community Management API'."
          );
        }
        break;
      }

      const data = await response.json();
      console.log("[linkedin] ugcPosts response keys:", Object.keys(data));
      console.log("[linkedin] ugcPosts elements count:", (data.elements || []).length);
      if ((data.elements || []).length > 0) {
        console.log("[linkedin] ugcPosts first element keys:", Object.keys(data.elements[0]));
        console.log("[linkedin] ugcPosts first element preview:", JSON.stringify(data.elements[0]).substring(0, 500));
      }
      const elements = (data.elements || []) as Record<string, unknown>[];

      if (elements.length === 0) {
        console.log("[linkedin] ugcPosts returned 0 elements, stopping");
        hasMore = false;
        break;
      }

      for (const post of elements) {
        const text = extractPostText(post);
        if (!text) {
          console.log("[linkedin] Skipping post with no text, keys:", Object.keys(post));
          continue;
        }

        const postId = (post.id as string) || `ugc_${start}_${posts.length}`;

        posts.push({
          linkedin_post_id: postId,
          content: text,
          post_type: detectPostType(post),
          likes_count: 0,
          comments_count: 0,
          reposts_count: 0,
          impressions: 0,
          posted_at:
            typeof post.created === "object" &&
            post.created !== null &&
            "time" in (post.created as Record<string, unknown>)
              ? new Date(
                  (post.created as Record<string, unknown>).time as number
                ).toISOString()
              : typeof post.firstPublishedAt === "number"
                ? new Date(post.firstPublishedAt).toISOString()
                : new Date().toISOString(),
          hashtags: extractHashtags(text),
        });
      }

      onProgress?.({
        step: "fetching",
        detail: `Pulling your posts... (${posts.length} found)`,
        posts_found: posts.length,
      });

      await enrichWithSocialActions(
        accessToken,
        posts.slice(start, start + elements.length)
      );

      start += elements.length;

      if (elements.length < count) {
        hasMore = false;
      }
    } catch (err) {
      console.error("Error fetching ugcPosts:", err);
      break;
    }
  }

  return posts;
}

/**
 * Fetches like, comment, and repost counts for a batch of posts.
 * Uses the socialActions endpoint.
 */
async function enrichWithSocialActions(
  accessToken: string,
  posts: RawLinkedInPost[]
): Promise<void> {
  // Fetch social actions in parallel (batched to avoid rate limits)
  const batchSize = 10;

  for (let i = 0; i < posts.length; i += batchSize) {
    const batch = posts.slice(i, i + batchSize);

    const promises = batch.map(async (post) => {
      try {
        const urn = encodeURIComponent(post.linkedin_post_id);
        const response = await fetch(
          `https://api.linkedin.com/v2/socialActions/${urn}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "X-Restli-Protocol-Version": "2.0.0",
            },
          }
        );

        if (!response.ok) {
          // Social actions endpoint may not be available for all posts
          // or may require additional permissions
          return;
        }

        const data = await response.json();

        // LinkedIn returns counts in the socialActions response
        if (typeof data.likesSummary?.totalLikes === "number") {
          post.likes_count = data.likesSummary.totalLikes;
        }
        if (typeof data.commentsSummary?.totalFirstLevelComments === "number") {
          post.comments_count = data.commentsSummary.totalFirstLevelComments;
        }
        if (typeof data.sharesSummary?.totalShares === "number") {
          post.reposts_count = data.sharesSummary.totalShares;
        }
      } catch {
        // Silently continue — engagement data is best-effort
      }
    });

    await Promise.all(promises);
  }
}

/**
 * Calculate engagement rate for a post.
 * If impressions are available: (likes + comments + reposts) / impressions * 100
 * If no impressions: use raw engagement total as score
 */
export function calculateEngagementRate(post: {
  likes_count: number;
  comments_count: number;
  reposts_count: number;
  impressions: number;
}): number {
  const totalEngagement =
    post.likes_count + post.comments_count + post.reposts_count;

  if (post.impressions > 0) {
    return Math.round((totalEngagement / post.impressions) * 10000) / 100;
  }

  // Fallback: raw engagement total
  return totalEngagement;
}
