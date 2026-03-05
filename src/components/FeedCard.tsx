"use client";

import { useRef, useEffect } from "react";
import { FeedItem } from "@/types";
import { categoryColor, timeAgo, formatNumber, dramaBarColor } from "@/lib/utils";
import { dramaLevelEmoji } from "@/lib/scorer";
import {
  MessageSquare,
  ArrowUp,
  ExternalLink,
  Flame,
  Zap,
  Bookmark,
} from "lucide-react";

interface FeedCardProps {
  item: FeedItem;
  isRead: boolean;
  isBookmarked: boolean;
  isFocused: boolean;
  onMarkRead: (id: string) => void;
  onToggleBookmark: (id: string) => void;
}

export default function FeedCard({
  item,
  isRead,
  isBookmarked,
  isFocused,
  onMarkRead,
  onToggleBookmark,
}: FeedCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const hasEngagement =
    (item.engagement.comments ?? 0) > 0 ||
    (item.engagement.upvotes ?? 0) > 0 ||
    (item.engagement.score ?? 0) > 0;

  // Auto-scroll focused card into view
  useEffect(() => {
    if (isFocused && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [isFocused]);

  const handleCardClick = () => {
    onMarkRead(item.id);
    window.open(item.url, "_blank", "noopener,noreferrer");
  };

  const handleBookmarkClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleBookmark(item.id);
  };

  return (
    <div
      ref={cardRef}
      role="article"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={(e) => {
        if (e.key === "Enter") handleCardClick();
      }}
      className={`group block rounded-xl border bg-surface-raised p-4 transition-all duration-200 cursor-pointer
        hover:bg-surface-overlay hover:border-zinc-600 animate-slide-in
        ${isFocused ? "ring-2 ring-indigo-500/60 border-indigo-500/40" : ""}
        ${isRead ? "opacity-55" : ""}
        ${
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
            {/* Unread dot */}
            {!isRead && (
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 flex-shrink-0" />
            )}
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

          {/* AI Summary */}
          {item.aiSummary && (
            <div className="flex items-start gap-1.5 mb-1.5 px-2 py-1 rounded-md bg-indigo-500/5 border border-indigo-500/10">
              <span className="text-[9px] font-bold text-indigo-400 bg-indigo-500/20 px-1 py-0.5 rounded flex-shrink-0 mt-px">
                AI
              </span>
              <p className="text-[11px] text-indigo-300/80 leading-snug">
                {item.aiSummary}
              </p>
            </div>
          )}

          {/* Summary */}
          {item.summary && !item.aiSummary && (
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

          {/* Bottom row: engagement + drama + actions */}
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

            {/* Bookmark button */}
            <button
              onClick={handleBookmarkClick}
              className={`p-1 rounded transition-all ml-auto ${
                isBookmarked
                  ? "text-amber-400 hover:text-amber-300"
                  : "text-zinc-600 opacity-0 group-hover:opacity-100 hover:text-zinc-400"
              } ${isBookmarked ? "opacity-100" : ""}`}
              title={isBookmarked ? "Remove bookmark" : "Bookmark"}
            >
              <Bookmark
                className={`w-3.5 h-3.5 ${isBookmarked ? "fill-current" : ""}`}
              />
            </button>

            <ExternalLink className="w-3 h-3 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>

        {/* Thumbnail */}
        {item.imageUrl && (
          <div className="flex-shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden bg-zinc-800">
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
    </div>
  );
}
