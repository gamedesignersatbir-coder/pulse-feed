"use client";

import { useState, useCallback, useEffect } from "react";
import { FeedItem, FilterState } from "@/types";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import FeedCard from "./FeedCard";
import FilterBar from "./FilterBar";
import BreakingTicker from "./BreakingTicker";
import TrendingPanel from "./TrendingPanel";
import Sidebar from "./Sidebar";
import LiveIndicator from "./LiveIndicator";

const DEFAULT_FILTERS: FilterState = {
  categories: [],
  sources: [],
  minDramaScore: 0,
  breakingOnly: false,
  searchQuery: "",
};

export default function Dashboard() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFeeds = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch("/api/feeds");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setItems(data.items || []);
      setLastUpdated(data.meta?.fetchedAt || new Date().toISOString());
    } catch (err) {
      setError("Failed to load feeds. Retrying...");
      console.error("Fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchFeeds();
  }, [fetchFeeds]);

  // Auto-refresh every 2 minutes
  useAutoRefresh(fetchFeeds, 120_000, autoRefresh);

  // Filter items
  const filteredItems = items.filter((item) => {
    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      if (
        !item.title.toLowerCase().includes(q) &&
        !item.summary.toLowerCase().includes(q) &&
        !item.source.toLowerCase().includes(q) &&
        !item.tags.some((t) => t.toLowerCase().includes(q))
      ) {
        return false;
      }
    }

    if (
      filters.categories.length > 0 &&
      !filters.categories.includes(item.category)
    ) {
      return false;
    }

    if (
      filters.sources.length > 0 &&
      !filters.sources.includes(item.sourceType)
    ) {
      return false;
    }

    if (filters.breakingOnly && !item.isBreaking) {
      return false;
    }

    if (item.dramaScore < filters.minDramaScore) {
      return false;
    }

    return true;
  });

  const breakingItems = items.filter((i) => i.isBreaking);
  const dramaItems = items.filter((i) => i.dramaScore >= 35);

  return (
    <div className="flex h-screen bg-surface text-zinc-100 overflow-hidden">
      {/* Left Sidebar */}
      <Sidebar
        items={items}
        isLoading={isLoading}
        autoRefresh={autoRefresh}
        lastUpdated={lastUpdated}
        onRefresh={fetchFeeds}
        onToggleAutoRefresh={() => setAutoRefresh(!autoRefresh)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Breaking Ticker */}
        <BreakingTicker items={breakingItems} />

        {/* Filter Bar */}
        <FilterBar
          filters={filters}
          onFilterChange={setFilters}
          totalItems={filteredItems.length}
          dramaItems={dramaItems.length}
          breakingItems={breakingItems.length}
        />

        {/* Feed */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto p-4">
            {/* Status bar */}
            <div className="flex items-center justify-between mb-4">
              <LiveIndicator
                isLive={autoRefresh}
                itemCount={items.length}
              />
              {error && (
                <span className="text-xs text-red-400">{error}</span>
              )}
            </div>

            {/* Loading state */}
            {isLoading && items.length === 0 && (
              <div className="space-y-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-zinc-800 bg-surface-raised p-4 animate-pulse"
                  >
                    <div className="flex gap-3">
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-24 bg-zinc-800 rounded" />
                        <div className="h-4 w-full bg-zinc-800 rounded" />
                        <div className="h-4 w-3/4 bg-zinc-800 rounded" />
                        <div className="h-3 w-1/2 bg-zinc-800 rounded" />
                      </div>
                      <div className="w-20 h-20 bg-zinc-800 rounded-lg flex-shrink-0" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Empty state */}
            {!isLoading && filteredItems.length === 0 && items.length > 0 && (
              <div className="text-center py-16">
                <p className="text-zinc-500 text-sm">
                  No items match your filters.
                </p>
                <button
                  onClick={() => setFilters(DEFAULT_FILTERS)}
                  className="mt-2 text-xs text-indigo-400 hover:text-indigo-300"
                >
                  Clear all filters
                </button>
              </div>
            )}

            {/* Feed items */}
            <div className="space-y-3">
              {filteredItems.map((item) => (
                <FeedCard key={item.id} item={item} />
              ))}
            </div>

            {/* Bottom padding */}
            <div className="h-8" />
          </div>
        </div>
      </div>

      {/* Right Panel - Trending */}
      <TrendingPanel items={items} />
    </div>
  );
}
