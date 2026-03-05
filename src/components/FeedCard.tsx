"use client";

import { FeedItem } from "@/types";
import { categoryColor, timeAgo, formatNumber, dramaBarColor } from "@/lib/utils";
import { dramaLevelEmoji } from "@/lib/scorer";
import {
  MessageSquare,
  ArrowUp,
  ExternalLink,
  Flame,
  Zap,
} from "lucide-react";

interface FeedCardProps {
  item: FeedItem;
}

export default function FeedCard({ item }: FeedCardProps) {
  const hasEngagement =
    (item.engagement.comments ?? 0) > 0 ||
    (item.engagement.upvotes ?? 0) > 0 ||
    (item.engagement.score ?? 0) > 0;

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`group block rounded-xl border bg-surface-raised p-4 transition-all duration-200 hover:bg-surface-overlay hover:border-zinc-600 animate-slide-in ${
        item.isBreaking
          ? "border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.1)]"
          : item.dramaScore >= 35
            ? "border-orange-500/30"
            : "border-zinc-800"
      }`}
    >
      {/* Breaking badge */}
      {item.isBreaking && (
        <div className="flex items-center gap-1.5 mb-2">
          <Zap className="w-3.5 h-3.5 text-red-500 fill-red-500" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-red-500">
            Breaking
          </span>
        </div>
      )}

      <div className="flex gap-3">
        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Source + time row */}
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${categoryColor(
                item.category
              )}`}
            >
              {item.category === "ai" ? "AI" : item.category === "gaming" ? "Gaming" : "General"}
            </span>
            <span className="text-[11px] text-zinc-500">{item.source}</span>
            <span className="text-zinc-700">·</span>
            <span className="text-[11px] text-zinc-500">
              {timeAgo(item.publishedAt)}
            </span>
            {item.dramaLevel !== "none" && (
              <span className="text-xs ml-auto">
                {dramaLevelEmoji(item.dramaLevel)}
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="text-sm font-semibold text-zinc-100 leading-snug mb-1 group-hover:text-white line-clamp-2">
            {item.title}
          </h3>

          {/* Summary */}
          {item.summary && (
            <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2 mb-2">
              {item.summary}
            </p>
          )}

          {/* Tags */}
          {item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {item.tags.slice(0, 4).map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/50"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Bottom row: engagement + drama */}
          <div className="flex items-center gap-3">
            {hasEngagement && (
              <div className="flex items-center gap-3 text-zinc-500">
                {(item.engagement.upvotes ?? 0) > 0 && (
                  <span className="flex items-center gap-1 text-[11px]">
                    <ArrowUp className="w-3 h-3" />
                    {formatNumber(item.engagement.upvotes!)}
                  </span>
                )}
                {(item.engagement.score ?? 0) > 0 &&
                  !item.engagement.upvotes && (
                    <span className="flex items-center gap-1 text-[11px]">
                      <ArrowUp className="w-3 h-3" />
                      {formatNumber(item.engagement.score!)}
                    </span>
                  )}
                {(item.engagement.comments ?? 0) > 0 && (
                  <span className="flex items-center gap-1 text-[11px]">
                    <MessageSquare className="w-3 h-3" />
                    {formatNumber(item.engagement.comments!)}
                  </span>
                )}
              </div>
            )}

            {/* Drama meter */}
            {item.dramaScore > 0 && (
              <div className="flex items-center gap-1.5 ml-auto">
                <Flame
                  className={`w-3 h-3 ${
                    item.dramaScore >= 60
                      ? "text-red-500"
                      : item.dramaScore >= 35
                        ? "text-orange-500"
                        : "text-yellow-600"
                  }`}
                />
                <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${dramaBarColor(
                      item.dramaScore
                    )}`}
                    style={{ width: `${item.dramaScore}%` }}
                  />
                </div>
              </div>
            )}

            <ExternalLink className="w-3 h-3 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
          </div>
        </div>

        {/* Thumbnail */}
        {item.imageUrl && (
          <div className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-zinc-800">
            <img
              src={item.imageUrl}
              alt=""
              className="w-full h-full object-cover"
              loading="lazy"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
        )}
      </div>
    </a>
  );
}
