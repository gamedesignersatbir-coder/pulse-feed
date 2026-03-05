"use client";

import { FeedItem } from "@/types";
import { RSS_SOURCES, REDDIT_SOURCES } from "@/lib/feedSources";
import { Radio, Rss, Globe, Settings, RefreshCw } from "lucide-react";

interface SidebarProps {
  items: FeedItem[];
  isLoading: boolean;
  autoRefresh: boolean;
  lastUpdated: string | null;
  onRefresh: () => void;
  onToggleAutoRefresh: () => void;
}

export default function Sidebar({
  items,
  isLoading,
  autoRefresh,
  lastUpdated,
  onRefresh,
  onToggleAutoRefresh,
}: SidebarProps) {
  // Count items per source
  const sourceCounts = new Map<string, number>();
  for (const item of items) {
    sourceCounts.set(item.source, (sourceCounts.get(item.source) || 0) + 1);
  }

  const aiRssCount = items.filter(
    (i) => i.sourceType === "rss" && i.category === "ai"
  ).length;
  const gamingRssCount = items.filter(
    (i) => i.sourceType === "rss" && i.category === "gaming"
  ).length;
  const redditCount = items.filter((i) => i.sourceType === "reddit").length;
  const hnCount = items.filter((i) => i.sourceType === "hackernews").length;

  return (
    <div className="w-56 flex-shrink-0 border-r border-zinc-800 overflow-y-auto bg-surface-raised/50">
      <div className="p-4">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Radio className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-tight">
              PulseFeed
            </h1>
            <p className="text-[10px] text-zinc-500">AI & Gaming Radar</p>
          </div>
        </div>

        {/* Refresh controls */}
        <div className="mb-6 space-y-2">
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium hover:bg-indigo-500/20 transition-colors disabled:opacity-50"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`}
            />
            {isLoading ? "Fetching..." : "Refresh Now"}
          </button>

          <button
            onClick={onToggleAutoRefresh}
            className={`w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
              autoRefresh
                ? "bg-green-500/10 border border-green-500/20 text-green-400"
                : "bg-zinc-800/50 border border-zinc-700 text-zinc-500"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                autoRefresh ? "bg-green-500 animate-pulse" : "bg-zinc-600"
              }`}
            />
            Auto-refresh {autoRefresh ? "ON" : "OFF"}
          </button>

          {lastUpdated && (
            <p className="text-[10px] text-zinc-600 text-center">
              Updated {new Date(lastUpdated).toLocaleTimeString()}
            </p>
          )}
        </div>

        {/* Source sections */}
        <div className="space-y-4">
          {/* AI News */}
          <section>
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-2 flex items-center gap-1.5">
              <Rss className="w-3 h-3" />
              AI News
              <span className="ml-auto text-zinc-600">{aiRssCount}</span>
            </h3>
            <div className="space-y-0.5">
              {RSS_SOURCES.filter(
                (s) => s.category === "ai" && s.enabled
              ).map((source) => (
                <div
                  key={source.id}
                  className="flex items-center gap-2 px-2 py-1 rounded text-[11px] text-zinc-400 hover:bg-surface-overlay transition-colors"
                >
                  <span
                    className="w-5 text-center text-[10px] font-bold"
                    style={{ color: source.color }}
                  >
                    {source.icon}
                  </span>
                  <span className="flex-1 truncate">{source.name}</span>
                  <span className="text-zinc-600 text-[10px]">
                    {sourceCounts.get(source.name) || 0}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Gaming News */}
          <section>
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-2 flex items-center gap-1.5">
              <Rss className="w-3 h-3" />
              Gaming
              <span className="ml-auto text-zinc-600">{gamingRssCount}</span>
            </h3>
            <div className="space-y-0.5">
              {RSS_SOURCES.filter(
                (s) => s.category === "gaming" && s.enabled
              ).map((source) => (
                <div
                  key={source.id}
                  className="flex items-center gap-2 px-2 py-1 rounded text-[11px] text-zinc-400 hover:bg-surface-overlay transition-colors"
                >
                  <span
                    className="w-5 text-center text-[10px] font-bold"
                    style={{ color: source.color }}
                  >
                    {source.icon}
                  </span>
                  <span className="flex-1 truncate">{source.name}</span>
                  <span className="text-zinc-600 text-[10px]">
                    {sourceCounts.get(source.name) || 0}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Reddit */}
          <section>
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-2 flex items-center gap-1.5">
              <Globe className="w-3 h-3" />
              Reddit
              <span className="ml-auto text-zinc-600">{redditCount}</span>
            </h3>
            <div className="space-y-0.5">
              {REDDIT_SOURCES.filter((s) => s.enabled).map((source) => (
                <div
                  key={source.id}
                  className="flex items-center gap-2 px-2 py-1 rounded text-[11px] text-zinc-400 hover:bg-surface-overlay transition-colors"
                >
                  <span className="w-5 text-center text-[10px]">
                    {source.icon}
                  </span>
                  <span className="flex-1 truncate">{source.name}</span>
                  <span className="text-zinc-600 text-[10px]">
                    {sourceCounts.get(source.name) || 0}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Hacker News */}
          <section>
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-2 flex items-center gap-1.5">
              <Globe className="w-3 h-3" />
              Hacker News
              <span className="ml-auto text-zinc-600">{hnCount}</span>
            </h3>
          </section>
        </div>
      </div>
    </div>
  );
}
