"use client";

import { FeedItem } from "@/types";
import { RSS_SOURCES, REDDIT_SOURCES } from "@/lib/feedSources";
import {
  Radio,
  Rss,
  Globe,
  RefreshCw,
  Bell,
  BellOff,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";

interface SidebarProps {
  items: FeedItem[];
  isLoading: boolean;
  autoRefresh: boolean;
  lastUpdated: string | null;
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  onRefresh: () => void;
  onToggleAutoRefresh: () => void;
  onToggleNotifications: () => void;
  onToggleSound: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({
  items,
  isLoading,
  autoRefresh,
  lastUpdated,
  notificationsEnabled,
  soundEnabled,
  onRefresh,
  onToggleAutoRefresh,
  onToggleNotifications,
  onToggleSound,
  isOpen,
  onClose,
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
    <div
      className={`
        fixed inset-y-0 left-0 z-40 w-64 md:w-56 transform transition-transform duration-200 ease-in-out
        md:relative md:translate-x-0 md:flex-shrink-0
        border-r border-zinc-800 overflow-y-auto bg-surface-raised
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
      `}
    >
      <div className="p-4">
        {/* Logo + close button */}
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Radio className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-sm font-bold text-white tracking-tight">
              PulseFeed
            </h1>
            <p className="text-[10px] text-zinc-500">AI & Gaming Radar</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-surface-overlay text-zinc-500 md:hidden"
          >
            <X className="w-4 h-4" />
          </button>
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

          <div className="flex gap-1.5">
            {/* Auto-refresh toggle */}
            <button
              onClick={onToggleAutoRefresh}
              className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                autoRefresh
                  ? "bg-green-500/10 border border-green-500/20 text-green-400"
                  : "bg-zinc-800/50 border border-zinc-700 text-zinc-500"
              }`}
              title="Toggle auto-refresh (r)"
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  autoRefresh ? "bg-green-500 animate-pulse" : "bg-zinc-600"
                }`}
              />
              Auto
            </button>

            {/* Notifications toggle */}
            <button
              onClick={onToggleNotifications}
              className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                notificationsEnabled
                  ? "bg-amber-500/10 border border-amber-500/20 text-amber-400"
                  : "bg-zinc-800/50 border border-zinc-700 text-zinc-500"
              }`}
              title="Toggle breaking news notifications"
            >
              {notificationsEnabled ? (
                <Bell className="w-3 h-3" />
              ) : (
                <BellOff className="w-3 h-3" />
              )}
              Alerts
            </button>

            {/* Sound toggle */}
            <button
              onClick={onToggleSound}
              className={`px-2 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                soundEnabled
                  ? "bg-cyan-500/10 border border-cyan-500/20 text-cyan-400"
                  : "bg-zinc-800/50 border border-zinc-700 text-zinc-500"
              }`}
              title="Toggle sound"
            >
              {soundEnabled ? (
                <Volume2 className="w-3 h-3" />
              ) : (
                <VolumeX className="w-3 h-3" />
              )}
            </button>
          </div>

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

        {/* Keyboard hint */}
        <div className="mt-6 pt-4 border-t border-zinc-800">
          <p className="text-[10px] text-zinc-600 text-center">
            Press <kbd className="px-1 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono text-[9px]">?</kbd> for keyboard shortcuts
          </p>
        </div>
      </div>
    </div>
  );
}
