"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { FeedItem, FilterState } from "@/types";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { useKeyboardNavigation } from "@/hooks/useKeyboardNavigation";
import { useNotifications, requestNotificationPermission } from "@/hooks/useNotifications";
import {
  loadFilters,
  saveFilters,
  loadReadItems,
  saveReadItems,
  loadBookmarkedItems,
  saveBookmarkedItems,
  loadBookmarkIds,
  loadSettings,
  saveSettings,
  UserSettings,
} from "@/lib/storage";
import { loadDisabledSourceIds } from "@/lib/sourceManager";
import { storeItems, pruneOldItems } from "@/lib/itemHistory";
import FeedCard from "./FeedCard";
import FilterBar from "./FilterBar";
import BreakingTicker from "./BreakingTicker";
import TrendingPanel from "./TrendingPanel";
import Sidebar from "./Sidebar";
import LiveIndicator from "./LiveIndicator";
import KeyboardShortcutsHelp from "./KeyboardShortcutsHelp";
import SettingsPanel from "./SettingsPanel";
import HistorySearch from "./HistorySearch";
import { Menu, TrendingUp, CheckCheck } from "lucide-react";

const DEFAULT_FILTERS: FilterState = {
  categories: [],
  sources: [],
  minDramaScore: 0,
  breakingOnly: false,
  bookmarksOnly: false,
  searchQuery: "",
  sortOrder: "importance",
};

export default function Dashboard() {
  // ── Core feed state ──
  const [items, setItems] = useState<FeedItem[]>([]);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ── New stories buffer (holds next fetch until user chooses to load) ──
  const [pendingItems, setPendingItems] = useState<FeedItem[]>([]);
  const [newItemCount, setNewItemCount] = useState(0);

  // ── IDs currently being AI-summarized ──
  const [summarizingIds, setSummarizingIds] = useState<Set<string>>(new Set());

  // ── Persisted settings ──
  const [settings, setSettings] = useState<UserSettings>({
    autoRefresh: true,
    notificationsEnabled: false,
    soundEnabled: true,
  });

  // ── Read/Unread tracking ──
  const [readItems, setReadItems] = useState<Set<string>>(new Set());

  // ── Bookmarks (full item data persisted) ──
  const [bookmarkedItems, setBookmarkedItems] = useState<FeedItem[]>([]);
  const [bookmarkIds, setBookmarkIds] = useState<Set<string>>(new Set());

  // ── Mobile sidebar toggles ──
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [trendingOpen, setTrendingOpen] = useState(false);

  // ── Modals ──
  const [showHelp, setShowHelp] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // ── Search ref for keyboard shortcut ──
  const searchRef = useRef<HTMLInputElement>(null);

  // ── Feed scroll container ref — scroll to top on filter change ──
  const feedScrollRef = useRef<HTMLDivElement>(null);

  // ── Session-level summary cache keyed by item URL ──
  // Survives feed refreshes so each story is only summarized once per session.
  const summaryCache = useRef<Map<string, string>>(new Map());

  // ── Load persisted state on mount ──
  useEffect(() => {
    setFilters(loadFilters(DEFAULT_FILTERS));
    setReadItems(loadReadItems());
    setBookmarkedItems(loadBookmarkedItems());
    setBookmarkIds(loadBookmarkIds());
    setSettings(loadSettings());
    // Prune old history items on mount
    pruneOldItems().catch(() => {});
  }, []);

  // ── Persist filters on change + scroll to top ──
  useEffect(() => {
    saveFilters(filters);
    feedScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [filters]);

  // ── Persist settings on change ──
  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  // ── AI Summarization ──
  // 1. Immediately applies any cached summaries (by URL) from previous fetches.
  // 2. Fetches new summaries in rolling batches of 10, storing results in the
  //    session cache so refreshes never re-summarize the same story.
  const fetchSummaries = useCallback(async (feedItems: FeedItem[]) => {
    // Apply cached summaries instantly — no API call needed
    const fromCache: Record<string, string> = {};
    for (const item of feedItems) {
      const cached = summaryCache.current.get(item.url);
      if (cached) fromCache[item.id] = cached;
    }
    if (Object.keys(fromCache).length > 0) {
      setItems((prev) =>
        prev.map((item) =>
          fromCache[item.id] ? { ...item, aiSummary: fromCache[item.id] } : item
        )
      );
    }

    // Only request summaries for items not already in cache.
    // Skip GitHub repos and Steam patch notes — they're already structured/descriptive.
    const unsummarized = feedItems.filter(
      (item) =>
        !item.aiSummary &&
        !summaryCache.current.has(item.url) &&
        item.sourceType !== "github" &&
        item.sourceType !== "steam"
    );

    if (unsummarized.length === 0) return;

    // Mark all unsummarized items as in-progress
    setSummarizingIds(new Set(unsummarized.map((i) => i.id)));

    for (let i = 0; i < unsummarized.length; i += 10) {
      const batch = unsummarized.slice(i, i + 10);
      try {
        const res = await fetch("/api/summarize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: batch.map((item) => ({ id: item.id, title: item.title, summary: item.summary, url: item.url })) }),
        });

        if (!res.ok) break;

        const data = await res.json();
        const summaries: Record<string, string> = data.summaries || {};

        // Persist to session cache by URL
        for (const item of batch) {
          if (summaries[item.id]) summaryCache.current.set(item.url, summaries[item.id]);
        }

        if (Object.keys(summaries).length > 0) {
          setItems((prev) =>
            prev.map((item) =>
              summaries[item.id] ? { ...item, aiSummary: summaries[item.id] } : item
            )
          );
          // Remove completed batch from summarizing set
          setSummarizingIds((prev) => {
            const next = new Set(prev);
            batch.forEach((item) => next.delete(item.id));
            return next;
          });
        }
      } catch {
        break;
      }

      if (i + 10 < unsummarized.length) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    }
    setSummarizingIds(new Set());
  }, []);

  // ── Fetch feeds ──
  const fetchFeeds = useCallback(async (isBackground = false) => {
    try {
      if (!isBackground) setIsLoading(true);
      setError(null);
      const disabledIds = Array.from(loadDisabledSourceIds());
      const params = disabledIds.length > 0
        ? `?disabled=${disabledIds.join(",")}`
        : "";
      const res = await fetch(`/api/feeds${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      const feedItems: FeedItem[] = data.items || [];
      setItems((prev) => {
        if (prev.length === 0) return feedItems; // first load — show immediately
        const currentIds = new Set(prev.map((i) => i.id));
        const genuinelyNew = feedItems.filter((i) => !currentIds.has(i.id));
        if (genuinelyNew.length > 0) {
          setPendingItems(feedItems);
          // Only count new items that would be visible under current filters
          const visibleNew = genuinelyNew.filter((item) => {
            if (filters.categories.length > 0 && !filters.categories.includes(item.category)) return false;
            if (filters.sources.length > 0 && !filters.sources.includes(item.sourceType)) return false;
            if (filters.breakingOnly && !item.isBreaking) return false;
            if (item.dramaScore < filters.minDramaScore) return false;
            return true;
          });
          setNewItemCount(visibleNew.length > 0 ? genuinelyNew.length : 0);
          return prev; // keep current items visible
        }
        return feedItems; // no new items, silent update
      });
      setLastUpdated(data.meta?.fetchedAt || new Date().toISOString());

      // Store items in IndexedDB for history
      storeItems(feedItems).catch(() => {});

      // Fire off AI summarization in the background
      fetchSummaries(feedItems);
    } catch (err) {
      setError("Failed to load feeds. Retrying...");
      console.error("Fetch error:", err);
    } finally {
      if (!isBackground) setIsLoading(false);
    }
  }, [fetchSummaries]);

  // Initial fetch
  useEffect(() => {
    fetchFeeds();
  }, [fetchFeeds]);

  const backgroundRefresh = useCallback(() => fetchFeeds(true), [fetchFeeds]);

  // Auto-refresh every 2 minutes
  const { secondsUntilRefresh } = useAutoRefresh(backgroundRefresh, 120_000, settings.autoRefresh);

  // ── Notifications ──
  useNotifications(items, settings.notificationsEnabled, settings.soundEnabled);

  // ── Read/Unread handlers ──
  const markAsRead = useCallback((id: string) => {
    setReadItems((prev) => {
      const next = new Set(prev);
      next.add(id);
      saveReadItems(next);
      return next;
    });
  }, []);

  const markAllAsRead = useCallback(() => {
    setReadItems((prev) => {
      const next = new Set(prev);
      for (const item of items) {
        next.add(item.id);
      }
      saveReadItems(next);
      return next;
    });
  }, [items]);

  // ── Trending topic click → search filter ──
  const handleTopicClick = useCallback((topic: string) => {
    setFilters((prev) => ({ ...prev, searchQuery: topic }));
  }, []);

  // ── New stories banner handler ──
  const loadNewStories = useCallback(() => {
    if (pendingItems.length === 0) return;
    setItems(pendingItems);
    setPendingItems([]);
    setNewItemCount(0);
    fetchSummaries(pendingItems);
    storeItems(pendingItems).catch(() => {});
  }, [pendingItems, fetchSummaries]);

  // ── Bookmark handlers ──
  const toggleBookmark = useCallback(
    (id: string) => {
      setBookmarkedItems((prev) => {
        let next: FeedItem[];
        if (prev.some((i) => i.id === id)) {
          next = prev.filter((i) => i.id !== id);
        } else {
          const item = items.find((i) => i.id === id);
          if (item) {
            next = [...prev, item];
          } else {
            next = prev;
          }
        }
        saveBookmarkedItems(next);
        setBookmarkIds(new Set(next.map((i) => i.id)));
        return next;
      });
    },
    [items]
  );

  // ── Settings handlers ──
  const toggleAutoRefresh = useCallback(() => {
    setSettings((prev) => ({ ...prev, autoRefresh: !prev.autoRefresh }));
  }, []);

  const toggleNotifications = useCallback(async () => {
    if (!settings.notificationsEnabled) {
      const granted = await requestNotificationPermission();
      if (granted) {
        setSettings((prev) => ({ ...prev, notificationsEnabled: true }));
      }
    } else {
      setSettings((prev) => ({ ...prev, notificationsEnabled: false }));
    }
  }, [settings.notificationsEnabled]);

  const toggleSound = useCallback(() => {
    setSettings((prev) => ({ ...prev, soundEnabled: !prev.soundEnabled }));
  }, []);

  // ── Filter items ──
  const filteredItems = useMemo(() => {
    const sourceItems = filters.bookmarksOnly ? bookmarkedItems : items;

    const filtered = sourceItems.filter((item) => {
      if (filters.searchQuery) {
        const q = filters.searchQuery.toLowerCase();
        if (
          !item.title.toLowerCase().includes(q) &&
          !item.summary.toLowerCase().includes(q) &&
          !(item.aiSummary ?? "").toLowerCase().includes(q) &&
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

    // Apply sort order
    const sorted = [...filtered];
    switch (filters.sortOrder) {
      case "recent":
        sorted.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
        break;
      case "engagement":
        sorted.sort((a, b) => {
          const scoreA = (a.engagement.upvotes ?? 0) + (a.engagement.comments ?? 0) * 2 + (a.engagement.score ?? 0);
          const scoreB = (b.engagement.upvotes ?? 0) + (b.engagement.comments ?? 0) * 2 + (b.engagement.score ?? 0);
          return scoreB - scoreA;
        });
        break;
      case "drama":
        sorted.sort((a, b) => b.dramaScore - a.dramaScore);
        break;
      default: // "importance" — breaking > drama > recency (already sorted by server)
        break;
    }
    return sorted;
  }, [items, bookmarkedItems, filters]);
  const breakingItems = items.filter((i) => i.isBreaking);
  const dramaItems = items.filter((i) => i.dramaScore >= 35);

  // ── Keyboard navigation ──
  const { focusedIndex } = useKeyboardNavigation(filteredItems.length, {
    onOpen: (index) => {
      const item = filteredItems[index];
      if (item) {
        markAsRead(item.id);
        window.open(item.url, "_blank", "noopener,noreferrer");
      }
    },
    onRefresh: fetchFeeds,
    onFocusSearch: () => searchRef.current?.focus(),
    onBookmark: (index) => {
      const item = filteredItems[index];
      if (item) toggleBookmark(item.id);
    },
    onMarkAllRead: markAllAsRead,
    onToggleHelp: () => setShowHelp((v) => !v),
  });

  return (
    <div className="flex h-screen bg-surface text-stone-100 overflow-hidden">
      {/* Mobile overlay backdrop */}
      {(sidebarOpen || trendingOpen) && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => {
            setSidebarOpen(false);
            setTrendingOpen(false);
          }}
        />
      )}

      {/* Left Sidebar */}
      <Sidebar
        items={items}
        filteredItems={filteredItems}
        isLoading={isLoading}
        autoRefresh={settings.autoRefresh}
        secondsUntilRefresh={secondsUntilRefresh}
        lastUpdated={lastUpdated}
        notificationsEnabled={settings.notificationsEnabled}
        soundEnabled={settings.soundEnabled}
        onRefresh={fetchFeeds}
        onToggleAutoRefresh={toggleAutoRefresh}
        onToggleNotifications={toggleNotifications}
        onToggleSound={toggleSound}
        onOpenSettings={() => setShowSettings(true)}
        onOpenHistory={() => setShowHistory(true)}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <div className="flex items-center justify-between px-3 py-2 md:hidden border-b border-stone-700/60 bg-surface-raised">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-lg hover:bg-surface-overlay text-stone-400"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <span className="text-[10px] text-white font-bold">P</span>
            </div>
            <span className="text-xs font-bold text-white">PulseFeed</span>
          </div>
          <button
            onClick={() => setTrendingOpen(true)}
            className="p-1.5 rounded-lg hover:bg-surface-overlay text-stone-400"
          >
            <TrendingUp className="w-5 h-5" />
          </button>
        </div>

        {/* Breaking Ticker */}
        <BreakingTicker items={breakingItems} />

        {/* Filter Bar */}
        <FilterBar
          filters={filters}
          onFilterChange={setFilters}
          totalItems={filteredItems.length}
          dramaItems={dramaItems.length}
          breakingItems={breakingItems.length}
          bookmarkCount={bookmarkedItems.length}
          searchRef={searchRef}
        />

        {/* Feed */}
        <div ref={feedScrollRef} className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto p-3 md:p-4">
            {/* Status bar */}
            <div className="flex items-center justify-between mb-4">
              <LiveIndicator
                isLive={settings.autoRefresh}
                itemCount={items.length}
                unreadCount={items.filter((i) => !readItems.has(i.id)).length}
              />
              <div className="flex items-center gap-2">
                {error && (
                  <button
                    onClick={() => fetchFeeds()}
                    className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors"
                    title="Click to retry"
                  >
                    <span>{error}</span>
                    <span className="underline">Retry</span>
                  </button>
                )}
                <button
                  onClick={markAllAsRead}
                  className="flex items-center gap-1 text-[11px] text-stone-600 hover:text-stone-400 transition-colors"
                  title="Mark all as read (m)"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Mark all read</span>
                </button>
              </div>
            </div>

            {/* New stories banner */}
            {newItemCount > 0 && (
              <button
                onClick={loadNewStories}
                className="w-full mb-4 py-2 px-4 rounded-lg bg-indigo-600/20 border border-indigo-500/40 text-indigo-300 text-xs font-medium hover:bg-indigo-600/30 transition-colors flex items-center justify-center gap-2"
              >
                <span>↑</span>
                <span>Load {newItemCount} new {newItemCount === 1 ? "story" : "stories"}</span>
              </button>
            )}

            {/* Loading state */}
            {isLoading && items.length === 0 && (
              <div className="space-y-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-stone-700 bg-surface-raised p-4 animate-pulse"
                  >
                    <div className="flex gap-3">
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-24 bg-stone-800 rounded" />
                        <div className="h-4 w-full bg-stone-800 rounded" />
                        <div className="h-4 w-3/4 bg-stone-800 rounded" />
                        <div className="h-3 w-1/2 bg-stone-800 rounded" />
                      </div>
                      <div className="w-20 h-20 bg-stone-800 rounded-lg flex-shrink-0" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Empty state */}
            {!isLoading && filteredItems.length === 0 && items.length > 0 && (
              <div className="text-center py-16">
                <p className="text-stone-500 text-sm">
                  {filters.bookmarksOnly
                    ? "No bookmarked items yet. Click the bookmark icon on any card to save it."
                    : "No items match your filters."}
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
              {filteredItems.map((item, index) => (
                <FeedCard
                  key={item.id}
                  item={item}
                  isRead={readItems.has(item.id)}
                  isBookmarked={bookmarkIds.has(item.id)}
                  isFocused={focusedIndex === index}
                  isSummarizing={summarizingIds.has(item.id)}
                  searchQuery={filters.searchQuery}
                  onMarkRead={markAsRead}
                  onToggleBookmark={toggleBookmark}
                />
              ))}
            </div>

            {/* Bottom padding */}
            <div className="h-8" />
          </div>
        </div>
      </div>

      {/* Right Panel - Trending */}
      <TrendingPanel
        items={items}
        isOpen={trendingOpen}
        onClose={() => setTrendingOpen(false)}
        onTopicClick={handleTopicClick}
      />

      {/* Keyboard shortcuts help modal */}
      <KeyboardShortcutsHelp
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
      />

      {/* Settings panel modal */}
      <SettingsPanel
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />

      {/* History search modal */}
      <HistorySearch
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
      />
    </div>
  );
}
