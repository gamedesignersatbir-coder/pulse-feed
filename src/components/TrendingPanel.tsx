"use client";

import { FeedItem, TrendingTopic } from "@/types";
import { dramaLevelEmoji, dramaLevelColor } from "@/lib/scorer";
import { categoryColor, formatNumber, timeAgo } from "@/lib/utils";
import { TrendingUp, Flame, Clock, ExternalLink } from "lucide-react";

interface TrendingPanelProps {
  items: FeedItem[];
}

function extractTrending(items: FeedItem[]): TrendingTopic[] {
  const topicCounts = new Map<string, { count: number; items: FeedItem[] }>();

  for (const item of items) {
    for (const tag of item.tags) {
      const existing = topicCounts.get(tag) || { count: 0, items: [] };
      existing.count++;
      existing.items.push(item);
      topicCounts.set(tag, existing);
    }
  }

  return Array.from(topicCounts.entries())
    .filter(([, data]) => data.count >= 2)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .map(([topic, data]) => {
      const maxDrama = Math.max(...data.items.map((i) => i.dramaScore));
      const categories = data.items.map((i) => i.category);
      const primaryCategory =
        categories.sort(
          (a, b) =>
            categories.filter((c) => c === b).length -
            categories.filter((c) => c === a).length
        )[0] ?? "general";

      return {
        topic,
        mentions: data.count,
        category: primaryCategory,
        dramaLevel:
          maxDrama >= 60
            ? "nuclear"
            : maxDrama >= 35
              ? "spicy"
              : maxDrama >= 15
                ? "mild"
                : ("none" as const),
        relatedItems: data.items.map((i) => i.id),
      };
    });
}

export default function TrendingPanel({ items }: TrendingPanelProps) {
  const trending = extractTrending(items);
  const topDrama = [...items]
    .filter((i) => i.dramaScore >= 25)
    .sort((a, b) => b.dramaScore - a.dramaScore)
    .slice(0, 5);

  const recentHot = [...items]
    .sort(
      (a, b) =>
        (b.engagement.comments ?? 0) +
        (b.engagement.upvotes ?? 0) -
        ((a.engagement.comments ?? 0) + (a.engagement.upvotes ?? 0))
    )
    .slice(0, 5);

  return (
    <div className="w-80 flex-shrink-0 border-l border-zinc-800 overflow-y-auto bg-surface-raised/50">
      <div className="p-4 space-y-6">
        {/* Trending Topics */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-amber-500" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Trending
            </h2>
          </div>
          {trending.length === 0 ? (
            <p className="text-xs text-zinc-600 italic">
              Loading trends...
            </p>
          ) : (
            <div className="space-y-2">
              {trending.map((topic, i) => (
                <div
                  key={topic.topic}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-surface-overlay transition-colors"
                >
                  <span className="text-[11px] text-zinc-600 w-4">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium text-zinc-200 truncate">
                        {topic.topic}
                      </span>
                      {topic.dramaLevel !== "none" && (
                        <span className="text-[10px]">
                          {dramaLevelEmoji(topic.dramaLevel)}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-zinc-500">
                      {topic.mentions} mentions
                    </span>
                  </div>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded border ${categoryColor(
                      topic.category
                    )}`}
                  >
                    {topic.category}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Drama Alert */}
        {topDrama.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Flame className="w-4 h-4 text-red-500" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Drama Alert
              </h2>
            </div>
            <div className="space-y-2">
              {topDrama.map((item) => (
                <a
                  key={item.id}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-2 rounded-lg hover:bg-surface-overlay transition-colors group"
                >
                  <div className="flex items-start gap-2">
                    <span className={`text-xs ${dramaLevelColor(item.dramaLevel)}`}>
                      {dramaLevelEmoji(item.dramaLevel)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-medium text-zinc-300 line-clamp-2 group-hover:text-white">
                        {item.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-zinc-500">
                          {item.source}
                        </span>
                        <span className="text-[10px] text-zinc-600">
                          Score: {item.dramaScore}
                        </span>
                      </div>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Most Active */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-cyan-500" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Most Active
            </h2>
          </div>
          <div className="space-y-2">
            {recentHot.map((item) => (
              <a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-2 rounded-lg hover:bg-surface-overlay transition-colors group"
              >
                <p className="text-[11px] font-medium text-zinc-300 line-clamp-2 group-hover:text-white">
                  {item.title}
                </p>
                <div className="flex items-center gap-2 mt-1 text-[10px] text-zinc-500">
                  <span>{item.source}</span>
                  {(item.engagement.comments ?? 0) > 0 && (
                    <span>
                      {formatNumber(item.engagement.comments!)} comments
                    </span>
                  )}
                  <span>{timeAgo(item.publishedAt)}</span>
                </div>
              </a>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
