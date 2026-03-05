import { FeedItem } from "@/types";
import { calculateDramaScore, getDramaLevel, isBreakingNews, extractTags } from "./scorer";

const BSKY_PUBLIC_API = "https://public.api.bsky.app";

// Curated Bluesky accounts for AI & gaming news
const AI_ACCOUNTS = [
  "arstechnica.com",
  "theverge.com",
  "wired.com",
  "techcrunch.com",
];

const GAMING_ACCOUNTS = [
  "ign.com",
  "kotaku.com",
  "eurogamer.net",
  "pcgamer.com",
];

function generateId(uri: string): string {
  let hash = 0;
  const str = `bsky:${uri}`;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return `bsky-${Math.abs(hash).toString(36)}`;
}

interface BskyFeedViewPost {
  post: {
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
      embed?: {
        $type: string;
        external?: {
          uri: string;
          title: string;
          description: string;
          thumb?: { ref: { $link: string } };
        };
      };
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
  };
}

async function fetchAuthorFeed(actor: string, limit = 10): Promise<BskyFeedViewPost[]> {
  try {
    const params = new URLSearchParams({
      actor,
      limit: String(limit),
      filter: "posts_no_replies",
    });

    const res = await fetch(
      `${BSKY_PUBLIC_API}/xrpc/app.bsky.feed.getAuthorFeed?${params}`,
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 300 },
      }
    );

    if (!res.ok) return [];
    const data = await res.json();
    return data.feed ?? [];
  } catch {
    return [];
  }
}

function isRelevantToCategory(text: string, category: "ai" | "gaming"): boolean {
  const lower = text.toLowerCase();
  if (category === "ai") {
    return /\b(ai|artificial intelligence|llm|gpt|claude|openai|anthropic|machine learning|deep learning|neural|transformer|chatbot|gemini|copilot)\b/i.test(lower);
  }
  return /\b(game|gaming|playstation|xbox|nintendo|steam|indie|esports|rpg|fps|mmorpg)\b/i.test(lower);
}

function feedPostToFeedItem(feedViewPost: BskyFeedViewPost, category: "ai" | "gaming"): FeedItem | null {
  const post = feedViewPost.post;
  const text = post.record.text || "";
  const external = post.embed?.external;

  // Use external link title if available, otherwise first line of text
  const title = external?.title || text.split("\n")[0].slice(0, 140) || "Bluesky Post";
  const summary = external?.description || text.slice(0, 300);
  const url = external?.uri || `https://bsky.app/profile/${post.author.handle}/post/${post.uri.split("/").pop()}`;
  const imageUrl = external?.thumb || post.embed?.images?.[0]?.thumb || post.author.avatar;

  if (!title || title.length < 5) return null;

  const partial: Partial<FeedItem> = {
    title,
    summary,
    url,
    source: "Bluesky",
    sourceType: "bluesky",
    category,
    publishedAt: post.record.createdAt || post.indexedAt || new Date().toISOString(),
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
    // Fetch from AI and gaming accounts in parallel
    const aiPromises = AI_ACCOUNTS.map(async (actor) => {
      const feedPosts = await fetchAuthorFeed(actor, 8);
      return feedPosts
        .map((fp) => feedPostToFeedItem(fp, "ai"))
        .filter((item): item is FeedItem => item !== null)
        .filter((item) => isRelevantToCategory(item.title + " " + item.summary, "ai"));
    });

    const gamingPromises = GAMING_ACCOUNTS.map(async (actor) => {
      const feedPosts = await fetchAuthorFeed(actor, 8);
      return feedPosts
        .map((fp) => feedPostToFeedItem(fp, "gaming"))
        .filter((item): item is FeedItem => item !== null)
        .filter((item) => isRelevantToCategory(item.title + " " + item.summary, "gaming"));
    });

    const [aiResults, gamingResults] = await Promise.all([
      Promise.all(aiPromises),
      Promise.all(gamingPromises),
    ]);

    const allItems = [...aiResults.flat(), ...gamingResults.flat()];

    // Deduplicate by URL
    const seen = new Set<string>();
    return allItems.filter((item) => {
      if (seen.has(item.url)) return false;
      seen.add(item.url);
      return true;
    });
  } catch (error) {
    console.error("Failed to fetch Bluesky feeds:", error);
    return [];
  }
}
