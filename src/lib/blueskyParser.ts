import { FeedItem } from "@/types";
import { calculateDramaScore, getDramaLevel, isBreakingNews, extractTags } from "./scorer";

const BSKY_PUBLIC_API = "https://public.api.bsky.app";

const AI_SEARCH_TERMS = ["AI", "LLM", "GPT", "Claude", "OpenAI", "machine learning", "artificial intelligence"];
const GAMING_SEARCH_TERMS = ["gaming", "game dev", "indie game", "Steam", "PlayStation", "Xbox"];

function generateId(prefix: string, uri: string): string {
  let hash = 0;
  const str = `${prefix}:${uri}`;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return `${prefix}-${Math.abs(hash).toString(36)}`;
}

interface BskyPost {
  uri: string;
  cid: string;
  author: {
    handle: string;
    displayName?: string;
  };
  record: {
    text: string;
    createdAt: string;
  };
  likeCount?: number;
  repostCount?: number;
  replyCount?: number;
  embed?: {
    external?: {
      uri: string;
      title: string;
      description: string;
      thumb?: string;
    };
    images?: Array<{ thumb: string; alt: string }>;
  };
}

async function searchPosts(query: string, limit = 15): Promise<BskyPost[]> {
  try {
    const params = new URLSearchParams({
      q: query,
      limit: String(limit),
      sort: "latest",
    });

    const res = await fetch(
      `${BSKY_PUBLIC_API}/xrpc/app.bsky.feed.searchPosts?${params}`,
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 120 },
      }
    );

    if (!res.ok) return [];
    const data = await res.json();
    return data.posts ?? [];
  } catch {
    return [];
  }
}

function postToFeedItem(post: BskyPost, category: "ai" | "gaming"): FeedItem {
  const text = post.record.text;
  const externalTitle = post.embed?.external?.title;
  const title = externalTitle || text.split("\n")[0].slice(0, 120) || "Bluesky Post";
  const summary = externalTitle ? text.slice(0, 300) : (post.embed?.external?.description || "").slice(0, 300);
  const url = post.embed?.external?.uri || `https://bsky.app/profile/${post.author.handle}/post/${post.uri.split("/").pop()}`;
  const imageUrl = post.embed?.external?.thumb || post.embed?.images?.[0]?.thumb;

  const partial: Partial<FeedItem> = {
    title,
    summary,
    url,
    source: `@${post.author.displayName || post.author.handle}`,
    sourceType: "bluesky",
    category,
    publishedAt: post.record.createdAt,
    author: post.author.displayName || post.author.handle,
    engagement: {
      likes: post.likeCount || 0,
      retweets: post.repostCount || 0,
      comments: post.replyCount || 0,
    },
  };

  const dramaScore = calculateDramaScore(partial);

  return {
    id: generateId("bsky", post.uri),
    title,
    summary,
    url,
    source: "Bluesky",
    sourceType: "bluesky",
    category,
    publishedAt: post.record.createdAt,
    imageUrl,
    author: post.author.displayName || post.author.handle,
    engagement: partial.engagement!,
    dramaScore,
    dramaLevel: getDramaLevel(dramaScore),
    isBreaking: isBreakingNews(partial),
    tags: extractTags(partial),
  };
}

export async function fetchBlueskyFeeds(): Promise<FeedItem[]> {
  try {
    // Search for AI and gaming posts in parallel
    const queries = [
      ...AI_SEARCH_TERMS.slice(0, 3).map((q) => ({ q, cat: "ai" as const })),
      ...GAMING_SEARCH_TERMS.slice(0, 2).map((q) => ({ q, cat: "gaming" as const })),
    ];

    const results = await Promise.all(
      queries.map(async ({ q, cat }) => {
        const posts = await searchPosts(q, 10);
        return posts.map((p) => postToFeedItem(p, cat));
      })
    );

    // Deduplicate by URI
    const seen = new Set<string>();
    return results.flat().filter((item) => {
      if (seen.has(item.url)) return false;
      seen.add(item.url);
      return true;
    });
  } catch (error) {
    console.error("Failed to fetch Bluesky feeds:", error);
    return [];
  }
}
