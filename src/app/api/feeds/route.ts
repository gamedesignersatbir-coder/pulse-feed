import { NextResponse } from "next/server";
import { FeedItem } from "@/types";
import { RSS_SOURCES, REDDIT_SOURCES } from "@/lib/feedSources";
import { fetchRSSFeed, fetchRedditFeed, fetchHackerNews } from "@/lib/rssParser";
import { fetchBlueskyFeeds } from "@/lib/blueskyParser";
import { fetchGithubTrending } from "@/lib/githubTrending";
import { fetchSteamNews } from "@/lib/steamParser";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET() {
  try {
    const enabledRss = RSS_SOURCES.filter((s) => s.enabled);
    const enabledReddit = REDDIT_SOURCES.filter((s) => s.enabled);

    // Fetch all sources in parallel (including new Phase 3 sources)
    const [rssResults, redditResults, hnResults, blueskyResults, githubResults, steamResults] =
      await Promise.all([
        Promise.all(enabledRss.map((source) => fetchRSSFeed(source))),
        Promise.all(enabledReddit.map((source) => fetchRedditFeed(source))),
        fetchHackerNews(),
        fetchBlueskyFeeds(),
        fetchGithubTrending(),
        fetchSteamNews(),
      ]);

    // Flatten all results
    const allItems: FeedItem[] = [
      ...rssResults.flat(),
      ...redditResults.flat(),
      ...hnResults,
      ...blueskyResults,
      ...githubResults,
      ...steamResults,
    ];

    // Deduplicate by URL
    const seen = new Set<string>();
    const uniqueItems = allItems.filter((item) => {
      if (seen.has(item.url)) return false;
      seen.add(item.url);
      return true;
    });

    // Sort by date (newest first), with breaking news boosted to top
    uniqueItems.sort((a, b) => {
      // Breaking news always first
      if (a.isBreaking && !b.isBreaking) return -1;
      if (!a.isBreaking && b.isBreaking) return 1;

      // Then by drama score for high-drama items
      if (a.dramaScore >= 50 && b.dramaScore < 50) return -1;
      if (a.dramaScore < 50 && b.dramaScore >= 50) return 1;

      // Then by date
      return (
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      );
    });

    return NextResponse.json({
      items: uniqueItems,
      meta: {
        total: uniqueItems.length,
        sources: {
          rss: rssResults.flat().length,
          reddit: redditResults.flat().length,
          hackernews: hnResults.length,
          bluesky: blueskyResults.length,
          github: githubResults.length,
          steam: steamResults.length,
        },
        fetchedAt: new Date().toISOString(),
        breakingCount: uniqueItems.filter((i) => i.isBreaking).length,
        dramaCount: uniqueItems.filter((i) => i.dramaScore >= 35).length,
      },
    });
  } catch (error) {
    console.error("Feed aggregation error:", error);
    return NextResponse.json(
      { error: "Failed to fetch feeds", items: [], meta: {} },
      { status: 500 }
    );
  }
}
