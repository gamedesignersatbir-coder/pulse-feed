import { NextResponse } from "next/server";
import { FeedItem } from "@/types";
import { RSS_SOURCES, REDDIT_SOURCES } from "@/lib/feedSources";
import { fetchRSSFeed, fetchRedditFeed, fetchHackerNews } from "@/lib/rssParser";
import { fetchBlueskyFeeds } from "@/lib/blueskyParser";
import { fetchGithubTrending } from "@/lib/githubTrending";
import { fetchSteamNews } from "@/lib/steamParser";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// ── Title similarity deduplication ──

const STOP_WORDS = new Set([
  "a","an","the","in","on","at","to","for","of","and","or","but",
  "is","it","its","as","by","with","this","that","from","are","was",
  "has","have","be","been","will","how","why","what","when","who","new",
]);

function titleWords(title: string): Set<string> {
  return new Set(
    title.toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP_WORDS.has(w))
  );
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  const intersection = Array.from(a).filter((w) => b.has(w)).length;
  const union = new Set([...Array.from(a), ...Array.from(b)]).size;
  return intersection / union;
}

function deduplicateByTitle(items: FeedItem[]): FeedItem[] {
  const wordSets = items.map((item) => titleWords(item.title));
  const merged = new Set<number>();
  const result: FeedItem[] = [];

  for (let i = 0; i < items.length; i++) {
    if (merged.has(i)) continue;
    merged.add(i);

    for (let j = i + 1; j < items.length; j++) {
      if (merged.has(j)) continue;
      if (jaccardSimilarity(wordSets[i], wordSets[j]) >= 0.5) {
        merged.add(j);
      }
    }

    // Items are pre-sorted by importance; keep the first (highest-ranked) in each group
    result.push(items[i]);
  }

  return result;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const disabledParam = url.searchParams.get("disabled");
    const disabledIds = new Set(disabledParam ? disabledParam.split(",") : []);

    const enabledRss = RSS_SOURCES.filter((s) => s.enabled && !disabledIds.has(s.id));
    const enabledReddit = REDDIT_SOURCES.filter((s) => s.enabled && !disabledIds.has(s.id));

    const [rssResults, redditResults, hnResults, blueskyResults, githubResults, steamResults] =
      await Promise.all([
        Promise.all(enabledRss.map((source) => fetchRSSFeed(source))),
        Promise.all(enabledReddit.map((source) => fetchRedditFeed(source))),
        disabledIds.has("hackernews") ? Promise.resolve([]) : fetchHackerNews(),
        disabledIds.has("bluesky") ? Promise.resolve([]) : fetchBlueskyFeeds(),
        disabledIds.has("github-trending") ? Promise.resolve([]) : fetchGithubTrending(),
        disabledIds.has("steam-news") ? Promise.resolve([]) : fetchSteamNews(),
      ]);

    const allItems: FeedItem[] = [
      ...rssResults.flat(),
      ...redditResults.flat(),
      ...hnResults,
      ...blueskyResults,
      ...githubResults,
      ...steamResults,
    ];

    // Step 1: deduplicate by exact URL
    const seen = new Set<string>();
    const urlDeduped = allItems.filter((item) => {
      if (seen.has(item.url)) return false;
      seen.add(item.url);
      return true;
    });

    // Step 2: sort by importance (so title dedup keeps the best version)
    urlDeduped.sort((a, b) => {
      if (a.isBreaking && !b.isBreaking) return -1;
      if (!a.isBreaking && b.isBreaking) return 1;
      if (a.dramaScore >= 50 && b.dramaScore < 50) return -1;
      if (a.dramaScore < 50 && b.dramaScore >= 50) return 1;
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    });

    // Step 3: deduplicate by title similarity
    const uniqueItems = deduplicateByTitle(urlDeduped);

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
