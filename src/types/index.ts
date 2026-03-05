export type FeedCategory = "ai" | "gaming" | "drama" | "breaking" | "social" | "general";

export type FeedSource =
  | "rss"
  | "reddit"
  | "twitter"
  | "hackernews"
  | "bluesky"
  | "github"
  | "steam";

export type TrendVelocity = "rising" | "stable" | "falling" | "new";

export type DramaLevel = "none" | "mild" | "spicy" | "nuclear";

export interface FeedItem {
  id: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  sourceType: FeedSource;
  category: FeedCategory;
  publishedAt: string;
  imageUrl?: string;
  author?: string;
  engagement: EngagementMetrics;
  dramaScore: number; // 0-100
  dramaLevel: DramaLevel;
  isBreaking: boolean;
  tags: string[];
  aiSummary?: string;
}

export interface EngagementMetrics {
  score?: number;
  comments?: number;
  upvotes?: number;
  retweets?: number;
  likes?: number;
}

export interface FeedSourceConfig {
  id: string;
  name: string;
  url: string;
  type: FeedSource;
  category: FeedCategory;
  icon: string;
  color: string;
  enabled: boolean;
}

export interface FilterState {
  categories: FeedCategory[];
  sources: FeedSource[];
  minDramaScore: number;
  breakingOnly: boolean;
  bookmarksOnly: boolean;
  searchQuery: string;
}

export interface TrendingTopic {
  topic: string;
  mentions: number;
  category: FeedCategory;
  dramaLevel: DramaLevel;
  relatedItems: string[]; // FeedItem IDs
  velocity: TrendVelocity;
  previousMentions: number;
}

export interface AppState {
  items: FeedItem[];
  trending: TrendingTopic[];
  filters: FilterState;
  isLoading: boolean;
  lastUpdated: string | null;
  autoRefresh: boolean;
  refreshInterval: number; // seconds
}
