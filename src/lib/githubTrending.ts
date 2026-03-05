import { FeedItem } from "@/types";
import { calculateDramaScore, getDramaLevel, isBreakingNews, extractTags } from "./scorer";

function generateId(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash) + name.charCodeAt(i);
    hash |= 0;
  }
  return `gh-${Math.abs(hash).toString(36)}`;
}

interface GithubRepo {
  full_name: string;
  html_url: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  owner: { login: string; avatar_url: string };
  created_at: string;
  updated_at: string;
  pushed_at: string;
  topics: string[];
}

async function searchRepos(query: string, limit = 10): Promise<GithubRepo[]> {
  try {
    // Search for repos created or pushed in the last 7 days
    const weekAgo = new Date(Date.now() - 7 * 86400 * 1000).toISOString().split("T")[0];
    const params = new URLSearchParams({
      q: `${query} pushed:>${weekAgo}`,
      sort: "stars",
      order: "desc",
      per_page: String(limit),
    });

    const res = await fetch(`https://api.github.com/search/repositories?${params}`, {
      headers: {
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "PulseFeed/1.0",
      },
      next: { revalidate: 300 }, // Cache for 5 min (GitHub rate limits)
    });

    if (!res.ok) return [];
    const data = await res.json();
    return data.items ?? [];
  } catch {
    return [];
  }
}

function repoToFeedItem(repo: GithubRepo, category: "ai" | "gaming"): FeedItem {
  const title = `${repo.full_name} — ${repo.description?.slice(0, 100) || "No description"}`;
  const summary = [
    repo.language ? `Language: ${repo.language}` : "",
    `⭐ ${repo.stargazers_count.toLocaleString()} stars`,
    `🍴 ${repo.forks_count.toLocaleString()} forks`,
    repo.topics.length > 0 ? `Topics: ${repo.topics.slice(0, 5).join(", ")}` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  const partial: Partial<FeedItem> = {
    title,
    summary,
    url: repo.html_url,
    source: "GitHub Trending",
    sourceType: "github",
    category,
    publishedAt: repo.pushed_at,
    engagement: {
      score: repo.stargazers_count,
      upvotes: repo.stargazers_count,
    },
  };

  const dramaScore = calculateDramaScore(partial);

  return {
    id: generateId(repo.full_name),
    title,
    summary,
    url: repo.html_url,
    source: "GitHub Trending",
    sourceType: "github",
    category,
    publishedAt: repo.pushed_at,
    imageUrl: repo.owner.avatar_url,
    author: repo.owner.login,
    engagement: partial.engagement!,
    dramaScore,
    dramaLevel: getDramaLevel(dramaScore),
    isBreaking: isBreakingNews(partial),
    tags: extractTags(partial),
  };
}

export async function fetchGithubTrending(): Promise<FeedItem[]> {
  try {
    const [aiRepos, gamingRepos] = await Promise.all([
      searchRepos("artificial intelligence OR LLM OR machine-learning OR transformer OR neural-network", 10),
      searchRepos("game-engine OR game-development OR indie-game OR gaming", 8),
    ]);

    const items: FeedItem[] = [
      ...aiRepos.map((r) => repoToFeedItem(r, "ai")),
      ...gamingRepos.map((r) => repoToFeedItem(r, "gaming")),
    ];

    // Deduplicate
    const seen = new Set<string>();
    return items.filter((i) => {
      if (seen.has(i.url)) return false;
      seen.add(i.url);
      return true;
    });
  } catch (error) {
    console.error("Failed to fetch GitHub trending:", error);
    return [];
  }
}
