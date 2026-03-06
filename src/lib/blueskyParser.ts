import { FeedItem } from "@/types";
import { calculateDramaScore, getDramaLevel, isBreakingNews, extractTags } from "./scorer";

const BSKY_PUBLIC_API = "https://public.api.bsky.app";

function generateId(uri: string): string {
  let hash = 0;
  const str = `bsky:${uri}`;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return `bsky-${Math.abs(hash).toString(36)}`;
}

interface BskyPost {
  uri: string;
  cid: string;
  author: {
    handle: string;
    displayName?: string;
    avatar?: string;
  };
  record: {
    text: string;
    createdAt: string;
  };
  embed?: {
    $type: string;
    external?: {
      uri: string;
      title: string;
      description: string;
      thumb?: string;
    };
    images?: Array<{ thumb: string; alt: string }>;
  };
  likeCount?: number;
  repostCount?: number;
  replyCount?: number;
  indexedAt?: string;
}

// Search top Bluesky posts for a query (hashtag or keyword)
async function searchPosts(query: string, limit = 20): Promise<BskyPost[]> {
  try {
    const params = new URLSearchParams({ q: query, limit: String(limit), sort: "top" });
    const res = await fetch(
      `${BSKY_PUBLIC_API}/xrpc/app.bsky.feed.searchPosts?${params}`,
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 300 },
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.posts ?? [];
  } catch {
    return [];
  }
}

function postToFeedItem(post: BskyPost, category: FeedItem["category"]): FeedItem | null {
  const text = post.record?.text || "";
  const external = post.embed?.external;

  const title = external?.title || text.split("\n")[0].slice(0, 140) || "";
  const summary = external?.description || text.slice(0, 300);
  const url =
    external?.uri ||
    `https://bsky.app/profile/${post.author.handle}/post/${post.uri.split("/").pop()}`;
  const imageUrl = external?.thumb || post.embed?.images?.[0]?.thumb;

  // Skip very short or empty posts
  if (!title || title.length < 10) return null;

  // Skip low-engagement posts (noise from random accounts)
  const totalEngagement = (post.likeCount || 0) + (post.repostCount || 0);
  if (totalEngagement < 2) return null;

  const partial: Partial<FeedItem> = {
    title,
    summary,
    url,
    source: "Bluesky",
    sourceType: "bluesky",
    category,
    publishedAt: post.record?.createdAt || post.indexedAt || new Date().toISOString(),
    author: post.author.displayName || post.author.handle,
    engagement: {
      likes: post.likeCount || 0,
      retweets: post.repostCount || 0,
      comments: post.replyCount || 0,
      score: (post.likeCount || 0) + (post.repostCount || 0) * 2,
    },
  };

  const dramaScore = calculateDramaScore(partial);

  return {
    id: generateId(post.uri),
    title,
    summary,
    url,
    source: "Bluesky",
    sourceType: "bluesky",
    category,
    publishedAt: partial.publishedAt!,
    imageUrl,
    author: partial.author,
    engagement: partial.engagement!,
    dramaScore,
    dramaLevel: getDramaLevel(dramaScore),
    isBreaking: isBreakingNews(partial),
    tags: extractTags(partial),
  };
}

export async function fetchBlueskyFeeds(): Promise<FeedItem[]> {
  try {
    // Search for trending AI and gaming content — finds independent Bluesky voices,
    // not just cross-posts from publishers already covered by RSS
    const [aiPosts, gamingPosts] = await Promise.all([
      Promise.all([
        searchPosts("#AI", 20),
        searchPosts("#LLM", 15),
        searchPosts("#MachineLearning", 15),
      ]).then((r) => r.flat()),
      Promise.all([
        searchPosts("#gaming", 20),
        searchPosts("#gamedev", 15),
        searchPosts("#indiegames", 10),
      ]).then((r) => r.flat()),
    ]);

    const aiItems = aiPosts
      .map((p) => postToFeedItem(p, "ai"))
      .filter((item): item is FeedItem => item !== null);

    const gamingItems = gamingPosts
      .map((p) => postToFeedItem(p, "gaming"))
      .filter((item): item is FeedItem => item !== null);

    // Deduplicate by URL
    const seen = new Set<string>();
    return [...aiItems, ...gamingItems].filter((item) => {
      if (seen.has(item.url)) return false;
      seen.add(item.url);
      return true;
    });
  } catch (error) {
    console.error("Failed to fetch Bluesky feeds:", error);
    return [];
  }
}
