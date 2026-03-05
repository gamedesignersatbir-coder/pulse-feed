"use client";

import { useState, useCallback, useEffect, useRef } from "react";
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
};

export default function Dashboard() {
  // ── Core feed state ──
  const [items, setItems] = useState<FeedItem[]>([]);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  // ── Persist filters on change ──
  useEffect(() => {
    saveFilters(filters);
  }, [filters]);

  // ── Persist settings on change ──
  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  // ── AI Summarization ──
  const fetchSummaries = useCallback(async (feedItems: FeedItem[]) => {
    try {
      const unsummarized = feedItems
        .filter((item) => !item.aiSummary)
        .slice(0, 10)
        .map((item) => ({
          id: item.id,
          title: item.title,
          summary: item.summary,
        }));

      if (unsummarized.length === 0) return;

      const res = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: unsummarized }),
      });

      if (!res.ok) return;
      const data = await res.json();
      const summaries: Record<string, string> = data.summaries || {};

      if (Object.keys(summaries).length > 0) {
        setItems((prev) =>
          prev.map((item) =>
            summaries[item.id]
              ? { ...item, aiSummary: summaries[item.id] }
              : item
          )
        );
      }
    } catch {
      // AI summarization is optional — fail silently
    }
  }, []);

  // ── Fetch feeds ──
  const fetchFeeds = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch("/api/feeds");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      const feedItems: FeedItem[] = data.items || [];
      setItems(feedItems);
      setLastUpdated(data.meta?.fetchedAt || new Date().toISOString());

      // Store items in IndexedDB for history
      storeItems(feedItems).catch(() => {});

      // Fire off AI summarization in the background
      fetchSummaries(feedItems);
    } catch (err) {
      setError("Failed to load feeds. Retrying...");
      console.error("Fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [fetchSummaries]);

  // Initial fetch
  useEffect(() => {
    fetchFeeds();
  }, [fetchFeeds]);

  // Auto-refresh every 2 minutes
  useAutoRefresh(fetchFeeds, 120_000, settings.autoRefresh);

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
  const getFilteredItems = useCallback(() => {
    const sourceItems = filters.bookmarksOnly ? bookmarkedItems : items;

    return sourceItems.filter((item) => {
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
  }, [items, bookmarkedItems, filters]);

  const filteredItems = getFilteredItems();
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
    <div className="flex h-screen bg-surface text-zinc-100 overflow-hidden">
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
        isLoading={isLoading}
        autoRefresh={settings.autoRefresh}
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
        <div className="flex items-center justify-between px-3 py-2 md:hidden border-b border-zinc-800 bg-surface-raised">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-lg hover:bg-surface-overlay text-zinc-400"
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
            className="p-1.5 rounded-lg hover:bg-surface-overlay text-zinc-400"
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
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto p-3 md:p-4">
            {/* Status bar */}
            <div className="flex items-center justify-between mb-4">
              <LiveIndicator
                isLive={settings.autoRefresh}
                itemCount={items.length}
              />
              <div className="flex items-center gap-2">
                {error && (
                  <span className="text-xs text-red-400">{error}</span>
                )}
                <button
                  onClick={markAllAsRead}
                  className="flex items-center gap-1 text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors"
                  title="Mark all as read (m)"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Mark all read</span>
                </button>
              </div>
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
