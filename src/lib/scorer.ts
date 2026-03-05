import { DramaLevel, FeedItem } from "@/types";

// Keywords that indicate drama, controversy, or breaking news
const DRAMA_KEYWORDS = [
  // Conflict
  "controversy", "controversial", "backlash", "outrage", "furious", "slams",
  "blasts", "attacks", "fired", "fired from", "lawsuit", "sued", "sues",
  "scandal", "leaked", "leak", "exposed", "caught", "busted", "accused",
  "allegations", "drama", "beef", "feud", "fight", "war", "battle",
  "claps back", "responds to", "fires back", "calls out", "dragged",
  // Urgency
  "breaking", "just in", "happening now", "urgent", "emergency", "alert",
  "exclusive", "confirmed", "shock", "shocking", "stunning", "bombshell",
  // Negative outcomes
  "layoffs", "laid off", "shutdown", "shutting down", "killed", "dead",
  "cancelled", "canceled", "axed", "scrapped", "failed", "failure",
  "disaster", "catastrophe", "collapse", "crashes", "crashed",
  "bankrupt", "bankruptcy",
  // AI-specific drama
  "ai safety", "alignment", "existential risk", "doom", "agi",
  "sentient", "consciousness", "replaced by ai", "jobs lost",
  "deepfake", "hallucination", "bias", "biased", "racist",
  "censorship", "censored", "banned", "ban",
  // Gaming-specific drama
  "review bombed", "review bombing", "crunch", "microtransaction",
  "pay to win", "p2w", "downgrade", "delayed", "refund", "refunds",
  "broken", "buggy", "unplayable", "drm", "anti-cheat", "loot box",
  "gacha", "monetization",
];

const BREAKING_KEYWORDS = [
  "breaking", "just in", "happening now", "just announced",
  "official", "confirmed", "exclusive", "first look",
  "launches", "launched", "releases", "released", "unveils",
  "reveals", "announced", "announcing",
];

export function calculateDramaScore(item: Partial<FeedItem>): number {
  let score = 0;
  const text = `${item.title ?? ""} ${item.summary ?? ""}`.toLowerCase();

  // Keyword matching
  for (const keyword of DRAMA_KEYWORDS) {
    if (text.includes(keyword.toLowerCase())) {
      score += 8;
    }
  }

  // Engagement signals
  if (item.engagement) {
    const { comments = 0, upvotes = 0, score: engScore = 0 } = item.engagement;
    if (comments > 500) score += 20;
    else if (comments > 200) score += 12;
    else if (comments > 50) score += 5;

    if (upvotes > 5000) score += 15;
    else if (upvotes > 1000) score += 8;
    else if (upvotes > 200) score += 3;

    if (engScore > 1000) score += 10;
  }

  // ALL CAPS in title is usually drama
  if (item.title && item.title === item.title.toUpperCase() && item.title.length > 10) {
    score += 10;
  }

  // Exclamation marks
  const exclamations = (item.title ?? "").split("!").length - 1;
  score += exclamations * 3;

  // Question marks in titles (often clickbait/drama)
  if (item.title?.includes("?")) {
    score += 2;
  }

  return Math.min(100, Math.max(0, score));
}

export function getDramaLevel(score: number): DramaLevel {
  if (score >= 60) return "nuclear";
  if (score >= 35) return "spicy";
  if (score >= 15) return "mild";
  return "none";
}

export function isBreakingNews(item: Partial<FeedItem>): boolean {
  const text = `${item.title ?? ""} ${item.summary ?? ""}`.toLowerCase();

  for (const keyword of BREAKING_KEYWORDS) {
    if (text.includes(keyword.toLowerCase())) {
      return true;
    }
  }

  // Published within last 30 minutes and high engagement
  if (item.publishedAt) {
    const published = new Date(item.publishedAt);
    const now = new Date();
    const minutesAgo = (now.getTime() - published.getTime()) / 60000;
    if (minutesAgo < 30 && (item.engagement?.comments ?? 0) > 100) {
      return true;
    }
  }

  return false;
}

export function extractTags(item: Partial<FeedItem>): string[] {
  const text = `${item.title ?? ""} ${item.summary ?? ""}`.toLowerCase();
  const tags: string[] = [];

  const tagPatterns: Record<string, string[]> = {
    "OpenAI": ["openai", "chatgpt", "gpt-4", "gpt-5", "sam altman", "dall-e", "sora"],
    "Google": ["google", "gemini", "deepmind", "bard", "google ai"],
    "Anthropic": ["anthropic", "claude"],
    "Meta AI": ["meta ai", "llama", "llama 2", "llama 3"],
    "Microsoft": ["microsoft", "copilot", "bing ai", "azure ai"],
    "Apple": ["apple intelligence", "apple ai", "apple ml"],
    "NVIDIA": ["nvidia", "cuda", "gpu", "rtx"],
    "Steam": ["steam", "valve", "steam deck"],
    "PlayStation": ["playstation", "ps5", "ps6", "sony"],
    "Xbox": ["xbox", "game pass", "microsoft gaming"],
    "Nintendo": ["nintendo", "switch", "switch 2"],
    "Epic Games": ["epic games", "fortnite", "unreal"],
    "AI Safety": ["ai safety", "alignment", "regulation"],
    "Open Source": ["open source", "open-source", "hugging face", "huggingface"],
    "Startup": ["startup", "funding", "raised", "series a", "series b", "yc"],
  };

  for (const [tag, keywords] of Object.entries(tagPatterns)) {
    if (keywords.some((kw) => text.includes(kw))) {
      tags.push(tag);
    }
  }

  return tags;
}

export function dramaLevelColor(level: DramaLevel): string {
  switch (level) {
    case "nuclear": return "text-red-500";
    case "spicy": return "text-orange-500";
    case "mild": return "text-yellow-500";
    case "none": return "text-zinc-500";
  }
}

export function dramaLevelEmoji(level: DramaLevel): string {
  switch (level) {
    case "nuclear": return "🔥🔥🔥";
    case "spicy": return "🌶️🌶️";
    case "mild": return "🌶️";
    case "none": return "";
  }
}
