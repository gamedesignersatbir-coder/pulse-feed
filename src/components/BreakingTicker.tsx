"use client";

import { FeedItem } from "@/types";
import { Zap } from "lucide-react";

interface BreakingTickerProps {
  items: FeedItem[];
}

export default function BreakingTicker({ items }: BreakingTickerProps) {
  if (items.length === 0) return null;

  const tickerText = items
    .map((item) => `${item.source}: ${item.title}`)
    .join("  ///  ");

  return (
    <div className="relative bg-red-950/40 border-b border-red-500/20 overflow-hidden">
      <div className="flex items-center">
        {/* Static badge */}
        <div className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 bg-red-600 z-10">
          <Zap className="w-3.5 h-3.5 fill-white text-white animate-pulse-glow" />
          <span className="text-xs font-bold uppercase tracking-wider text-white">
            Breaking
          </span>
        </div>

        {/* Scrolling text */}
        <div className="overflow-hidden flex-1">
          <div className="animate-ticker-scroll whitespace-nowrap py-2 px-4">
            <span className="text-sm text-red-200">
              {tickerText}  ///  {tickerText}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
