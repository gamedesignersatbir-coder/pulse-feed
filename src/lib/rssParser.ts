import { FeedItem, FeedSourceConfig } from "@/types";
import { calculateDramaScore, getDramaLevel, isBreakingNews, extractTags } from "./scorer";

function generateId(source: string, url: string): string {
  // Simple hash-like id from source + url
  let hash = 0;
  const str = `${source}:${url}`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return `${source}-${Math.abs(hash).toString(36)}`;
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function extractImageFromContent(content: string): string | undefined {
  const imgMatch = content.match(/<img[^>]+src="([^"]+)"/);
  return imgMatch?.[1];
}

export async function fetchRSSFeed(source: FeedSourceConfig): Promise<FeedItem[]> {
  try {
    // Dynamic import to avoid SSR issues
    const Parser = (await import("rss-parser")).default;
    const parser = new Parser({
      timeout: 10000,
      headers: {
        "User-Agent": "PulseFeed/1.0",
        Accept: "application/rss+xml, application/xml, text/xml",
      },
    });

    const feed = await parser.parseURL(source.url);
    const items: FeedItem[] = [];

    for (const entry of feed.items?.slice(0, 20) ?? []) {
      const summary = stripHtml(
        entry.contentSnippet || entry.content || entry.summary || ""
      ).slice(0, 300);

      const imageUrl =
        entry.enclosure?.url ||
        extractImageFromContent(entry.content || entry["content:encoded"] || "");

      const partial: Partial<FeedItem> = {
        title: entry.title || "Untitled",
        summary,
        url: entry.link || "",
        source: source.name,
        sourceType: "rss",
        category: source.category,
        publishedAt: entry.isoDate || entry.pubDate || new Date().toISOString(),
        imageUrl,
        author: entry.creator || entry.author,
        engagement: { score: 0, comments: 0 },
      };

      const dramaScore = calculateDramaScore(partial);

      const item: FeedItem = {
        id: generateId(source.id, entry.link || entry.title || ""),
        title: partial.title!,
        summary,
        url: partial.url!,
        source: source.name,
        sourceType: "rss",
        category: source.category,
        publishedAt: partial.publishedAt!,
        imageUrl,
        author: partial.author,
        engagement: partial.engagement!,
        dramaScore,
        dramaLevel: getDramaLevel(dramaScore),
        isBreaking: isBreakingNews(partial),
        tags: extractTags(partial),
      };

      items.push(item);
    }

    return items;
  } catch (error) {
    console.error(`Failed to fetch RSS feed ${source.name}:`, error);
    return [];
  }
}

export async function fetchRedditFeed(source: FeedSourceConfig): Promise<FeedItem[]> {
  try {
    const response = await fetch(source.url, {
      headers: {
        "User-Agent": "PulseFeed/1.0",
      },
      next: { revalidate: 120 },
    });

    if (!response.ok) {
      throw new Error(`Reddit API returned ${response.status}`);
    }

    const data = await response.json();
    const posts = data?.data?.children ?? [];
    const items: FeedItem[] = [];

    for (const post of posts.slice(0, 20)) {
      const d = post.data;
      if (!d || d.stickied) continue;

      const partial: Partial<FeedItem> = {
        title: d.title || "Untitled",
        summary: stripHtml(d.selftext || "").slice(0, 300),
        url: d.url?.startsWith("https://www.reddit.com")
          ? d.url
          : `https://www.reddit.com${d.permalink}`,
        source: source.name,
        sourceType: "reddit",
        category: source.category,
        publishedAt: new Date(d.created_utc * 1000).toISOString(),
        author: d.author,
        engagement: {
          upvotes: d.ups || 0,
          comments: d.num_comments || 0,
          score: d.score || 0,
        },
      };

      // Use reddit thumbnail if available
      let imageUrl: string | undefined;
      if (d.thumbnail && d.thumbnail.startsWith("http")) {
        imageUrl = d.thumbnail;
      }
      if (d.preview?.images?.[0]?.source?.url) {
        imageUrl = d.preview.images[0].source.url.replace(/&amp;/g, "&");
      }

      const dramaScore = calculateDramaScore(partial);

      items.push({
        id: generateId(source.id, d.id || d.permalink || ""),
        title: partial.title!,
        summary: partial.summary!,
        url: partial.url!,
        source: source.name,
        sourceType: "reddit",
        category: source.category,
        publishedAt: partial.publishedAt!,
        imageUrl,
        author: partial.author,
        engagement: partial.engagement!,
        dramaScore,
        dramaLevel: getDramaLevel(dramaScore),
        isBreaking: isBreakingNews(partial),
        tags: extractTags(partial),
      });
    }

    return items;
  } catch (error) {
    console.error(`Failed to fetch Reddit feed ${source.name}:`, error);
    return [];
  }
}

export async function fetchHackerNews(): Promise<FeedItem[]> {
  try {
    const topRes = await fetch(
      "https://hacker-news.firebaseio.com/v0/topstories.json?limitToFirst=30&orderBy=%22$key%22",
      { next: { revalidate: 120 } }
    );
    const topIds: number[] = await topRes.json();
    const storyIds = topIds.slice(0, 25);

    const stories = await Promise.all(
      storyIds.map(async (id) => {
        const res = await fetch(
          `https://hacker-news.firebaseio.com/v0/item/${id}.json`,
          { next: { revalidate: 120 } }
        );
        return res.json();
      })
    );

    const items: FeedItem[] = [];

    for (const story of stories) {
      if (!story || story.type !== "story") continue;

      // Determine category based on content
      const text = `${story.title || ""}`.toLowerCase();
      let category: FeedItem["category"] = "general";
      const aiKeywords = ["ai", "gpt", "llm", "machine learning", "neural", "openai", "anthropic", "model", "transformer", "deep learning"];
      const gamingKeywords = ["game", "gaming", "steam", "playstation", "xbox", "nintendo", "epic"];

      if (aiKeywords.some((kw) => text.includes(kw))) category = "ai";
      else if (gamingKeywords.some((kw) => text.includes(kw))) category = "gaming";

      const partial: Partial<FeedItem> = {
        title: story.title || "Untitled",
        summary: "",
        url: story.url || `https://news.ycombinator.com/item?id=${story.id}`,
        source: "Hacker News",
        sourceType: "hackernews",
        category,
        publishedAt: new Date(story.time * 1000).toISOString(),
        author: story.by,
        engagement: {
          score: story.score || 0,
          comments: story.descendants || 0,
        },
      };

      const dramaScore = calculateDramaScore(partial);

      items.push({
        id: generateId("hn", String(story.id)),
        title: partial.title!,
        summary: "",
        url: partial.url!,
        source: "Hacker News",
        sourceType: "hackernews",
        category,
        publishedAt: partial.publishedAt!,
        author: partial.author,
        engagement: partial.engagement!,
        dramaScore,
        dramaLevel: getDramaLevel(dramaScore),
        isBreaking: isBreakingNews(partial),
        tags: extractTags(partial),
      });
    }

    return items;
  } catch (error) {
    console.error("Failed to fetch Hacker News:", error);
    return [];
  }
}
