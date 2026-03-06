"use client";

import { FeedItem } from "@/types";
import { Zap } from "lucide-react";

interface BreakingTickerProps {
  items: FeedItem[];
}

const SEPARATOR = "   ///   ";

export default function BreakingTicker({ items }: BreakingTickerProps) {
  if (items.length === 0) return null;

  // Build segments so each title is individually clickable
  const segments = [...items, ...items]; // double for seamless loop

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

        {/* Scrolling text — pauses on hover so items are readable */}
        <div className="overflow-hidden flex-1 group/ticker">
          <div
            className="animate-ticker-scroll group-hover/ticker:[animation-play-state:paused] whitespace-nowrap py-2 px-4 flex items-center"
            style={{ animationDuration: `${Math.max(20, items.length * 8)}s` }}
          >
            {segments.map((item, i) => (
              <span key={`${item.id}-${i}`} className="inline-flex items-center">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-red-200 hover:text-white hover:underline transition-colors cursor-pointer"
                >
                  <span className="text-red-400 font-medium">{item.source}:</span>{" "}
                  {item.title}
                </a>
                <span className="text-red-700 mx-2">{SEPARATOR}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
