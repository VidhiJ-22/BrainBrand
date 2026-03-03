/**
 * LinkedIn Post Publisher
 *
 * Publishes text posts to LinkedIn via the v2 Posts API.
 *
 * LinkedIn API Reference:
 * - POST /v2/posts (requires w_member_social scope)
 *
 * NOTE: Publishing images, carousels, or videos requires additional
 * asset upload steps. This implementation handles text-only posts.
 * Extend with media upload if your app has the required permissions.
 */

export interface PublishResult {
  success: boolean;
  linkedin_post_id?: string;
  error?: string;
}

/**
 * Publishes a text post to LinkedIn.
 */
export async function publishToLinkedIn(
  accessToken: string,
  linkedinSub: string,
  content: string
): Promise<PublishResult> {
  const authorUrn = `urn:li:person:${linkedinSub}`;

  try {
    // Try v2/posts endpoint first (Community Management API / newer apps)
    const result = await publishViaPostsApi(accessToken, authorUrn, content);
    if (result.success) return result;

    // Fallback to UGC Posts endpoint (Share on LinkedIn product)
    return await publishViaUgcApi(accessToken, authorUrn, content);
  } catch (err) {
    console.error("LinkedIn publish error:", err);
    return {
      success: false,
      error: "Failed to publish to LinkedIn. Please try again.",
    };
  }
}

async function publishViaPostsApi(
  accessToken: string,
  authorUrn: string,
  content: string
): Promise<PublishResult> {
  const body = {
    author: authorUrn,
    commentary: content,
    visibility: "PUBLIC",
    distribution: {
      feedDistribution: "MAIN_FEED",
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },
    lifecycleState: "PUBLISHED",
    isReshareDisabledByAuthor: false,
  };

  const response = await fetch("https://api.linkedin.com/v2/posts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "LinkedIn-Version": "202401",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    if (response.status === 403 || response.status === 401) {
      // Permission issue — fall through to UGC fallback
      return { success: false, error: "v2/posts not available" };
    }
    const errText = await response.text();
    console.error(`LinkedIn v2/posts publish error (${response.status}):`, errText);
    return {
      success: false,
      error: `LinkedIn API error: ${response.status}`,
    };
  }

  // The response header `x-restli-id` contains the created post URN
  const postId =
    response.headers.get("x-restli-id") ||
    response.headers.get("x-linkedin-id") ||
    "";

  return {
    success: true,
    linkedin_post_id: postId,
  };
}

async function publishViaUgcApi(
  accessToken: string,
  authorUrn: string,
  content: string
): Promise<PublishResult> {
  const body = {
    author: authorUrn,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: {
          text: content,
        },
        shareMediaCategory: "NONE",
      },
    },
    visibility: {
      "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
    },
  };

  const response = await fetch("https://api.linkedin.com/v2/ugcPosts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error(`LinkedIn ugcPosts publish error (${response.status}):`, errText);
    return {
      success: false,
      error:
        response.status === 403
          ? "Your LinkedIn app needs the 'Share on LinkedIn' or 'Community Management API' product to publish posts."
          : `LinkedIn API error: ${response.status}`,
    };
  }

  const data = await response.json();
  const postId = (data.id as string) || "";

  return {
    success: true,
    linkedin_post_id: postId,
  };
}
