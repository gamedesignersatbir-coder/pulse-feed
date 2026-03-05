import { FeedItem } from "@/types";
import { calculateDramaScore, getDramaLevel, isBreakingNews, extractTags } from "./scorer";

function generateId(appId: number, gid: string): string {
  let hash = 0;
  const str = `steam:${appId}:${gid}`;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return `steam-${Math.abs(hash).toString(36)}`;
}

// Popular games to track (appId: gameName)
const TRACKED_GAMES: Record<number, string> = {
  730: "Counter-Strike 2",
  570: "Dota 2",
  1086940: "Baldur's Gate 3",
  1245620: "Elden Ring",
  1091500: "Cyberpunk 2077",
  553850: "Helldivers 2",
  892970: "Valheim",
  1174180: "Red Dead Redemption 2",
  413150: "Stardew Valley",
  252490: "Rust",
};

interface SteamNewsItem {
  gid: string;
  title: string;
  url: string;
  author: string;
  contents: string;
  date: number;
  feedlabel: string;
  appid: number;
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/\[.*?\]/g, "") // Remove BBCode
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchGameNews(appId: number): Promise<SteamNewsItem[]> {
  try {
    const res = await fetch(
      `https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=${appId}&count=5&maxlength=500&format=json`,
      { next: { revalidate: 300 } }
    );

    if (!res.ok) return [];
    const data = await res.json();
    return data?.appnews?.newsitems ?? [];
  } catch {
    return [];
  }
}

function newsToFeedItem(news: SteamNewsItem, gameName: string): FeedItem {
  const summary = stripHtml(news.contents).slice(0, 300);

  const partial: Partial<FeedItem> = {
    title: `[${gameName}] ${news.title}`,
    summary,
    url: news.url,
    source: `Steam: ${gameName}`,
    sourceType: "steam",
    category: "gaming",
    publishedAt: new Date(news.date * 1000).toISOString(),
    author: news.author || news.feedlabel,
    engagement: { score: 0 },
  };

  const dramaScore = calculateDramaScore(partial);

  return {
    id: generateId(news.appid, news.gid),
    title: partial.title!,
    summary,
    url: news.url,
    source: `Steam: ${gameName}`,
    sourceType: "steam",
    category: "gaming",
    publishedAt: partial.publishedAt!,
    author: partial.author,
    engagement: partial.engagement!,
    dramaScore,
    dramaLevel: getDramaLevel(dramaScore),
    isBreaking: isBreakingNews(partial),
    tags: [...extractTags(partial), gameName],
  };
}

export async function fetchSteamNews(): Promise<FeedItem[]> {
  try {
    const entries = Object.entries(TRACKED_GAMES);
    const results = await Promise.all(
      entries.map(async ([appIdStr, gameName]) => {
        const appId = parseInt(appIdStr, 10);
        const newsItems = await fetchGameNews(appId);
        return newsItems.map((n) => newsToFeedItem(n, gameName));
      })
    );

    return results.flat();
  } catch (error) {
    console.error("Failed to fetch Steam news:", error);
    return [];
  }
}
