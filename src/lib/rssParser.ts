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
      if (!d || d.stickied || d.distinguished === "moderator") continue;
      if ((d.score || 0) < 5) continue; // filter low-quality / spam posts

      const isExternalLink = d.url && !d.url.startsWith("https://www.reddit.com") && !d.is_self;
      const redditPermalink = `https://www.reddit.com${d.permalink}`;

      const partial: Partial<FeedItem> = {
        title: d.title || "Untitled",
        summary: stripHtml(d.selftext || "").slice(0, 300),
        url: isExternalLink ? d.url : redditPermalink,
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
      // Add subreddit as a tag so it's searchable and shows in trending
      const subredditTag = d.subreddit ? `r/${d.subreddit}` : source.name;

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
        tags: [...extractTags(partial), subredditTag],
        redditUrl: isExternalLink ? redditPermalink : undefined,
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
    // Algolia HN Search API: single request returns front page stories with text
    const res = await fetch(
      "https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=30",
      { next: { revalidate: 120 } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const hits: Array<{
      objectID: string;
      title: string;
      url?: string;
      story_text?: string;
      author: string;
      points: number;
      num_comments: number;
      created_at: string;
    }> = data.hits ?? [];

    const items: FeedItem[] = [];

    for (const hit of hits) {
      if (!hit.title) continue;

      const isAskHN = hit.title.startsWith("Ask HN:");
      const isShowHN = hit.title.startsWith("Show HN:");
      const hnSource = isAskHN ? "Ask HN" : isShowHN ? "Show HN" : "Hacker News";
      // Ask/Show HN always link to the discussion page
      const storyUrl = (isAskHN || isShowHN || !hit.url)
        ? `https://news.ycombinator.com/item?id=${hit.objectID}`
        : hit.url;
      const summary = hit.story_text ? stripHtml(hit.story_text).slice(0, 300) : "";

      // Determine category
      const text = `${hit.title} ${summary}`.toLowerCase();
      let category: FeedItem["category"] = "general";
      const aiKeywords = ["ai", "gpt", "llm", "machine learning", "neural", "openai", "anthropic", "model", "transformer", "deep learning"];
      const gamingKeywords = ["game", "gaming", "steam", "playstation", "xbox", "nintendo", "epic"];
      if (aiKeywords.some((kw) => text.includes(kw))) category = "ai";
      else if (gamingKeywords.some((kw) => text.includes(kw))) category = "gaming";

      const partial: Partial<FeedItem> = {
        title: hit.title,
        summary,
        url: storyUrl,
        source: hnSource,
        sourceType: "hackernews",
        category,
        publishedAt: hit.created_at,
        author: hit.author,
        engagement: { score: hit.points, comments: hit.num_comments },
      };

      const dramaScore = calculateDramaScore(partial);

      items.push({
        id: generateId("hn", hit.objectID),
        title: hit.title,
        summary,
        url: storyUrl,
        source: hnSource,
        sourceType: "hackernews",
        category,
        publishedAt: hit.created_at,
        author: hit.author,
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
