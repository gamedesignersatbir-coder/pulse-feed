"use client";

import { FeedCategory, FeedSource, FilterState, SortOrder } from "@/types";
import { categoryLabel } from "@/lib/utils";
import {
  Search,
  Flame,
  Zap,
  Bookmark,
  ArrowUpDown,
  X,
} from "lucide-react";

const SORT_OPTIONS: { value: SortOrder; label: string }[] = [
  { value: "importance", label: "Top" },
  { value: "recent", label: "New" },
  { value: "engagement", label: "Hot" },
  { value: "drama", label: "Drama" },
];

interface FilterBarProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  totalItems: number;
  dramaItems: number;
  breakingItems: number;
  bookmarkCount: number;
  searchRef?: React.RefObject<HTMLInputElement>;
}

const CATEGORIES: FeedCategory[] = ["ai", "gaming", "social", "general"];
const SOURCES: { value: FeedSource; label: string }[] = [
  { value: "rss", label: "News" },
  { value: "reddit", label: "Reddit" },
  { value: "hackernews", label: "HN" },
  { value: "bluesky", label: "Bsky" },
  { value: "github", label: "GitHub" },
  { value: "steam", label: "Steam" },
];

export default function FilterBar({
  filters,
  onFilterChange,
  totalItems,
  dramaItems,
  breakingItems,
  bookmarkCount,
  searchRef,
}: FilterBarProps) {
  const isFiltered =
    filters.categories.length > 0 ||
    filters.sources.length > 0 ||
    filters.breakingOnly ||
    filters.bookmarksOnly ||
    filters.minDramaScore > 0 ||
    filters.searchQuery.length > 0 ||
    filters.sortOrder !== "importance";

  const clearAll = () =>
    onFilterChange({
      categories: [],
      sources: [],
      minDramaScore: 0,
      breakingOnly: false,
      bookmarksOnly: false,
      searchQuery: "",
      sortOrder: "importance",
    });

  const toggleCategory = (cat: FeedCategory) => {
    const cats = filters.categories.includes(cat)
      ? filters.categories.filter((c) => c !== cat)
      : [...filters.categories, cat];
    onFilterChange({ ...filters, categories: cats });
  };

  const toggleSource = (src: FeedSource) => {
    const sources = filters.sources.includes(src)
      ? filters.sources.filter((s) => s !== src)
      : [...filters.sources, src];
    onFilterChange({ ...filters, sources: sources });
  };

  return (
    <div className="border-b border-stone-700/60 bg-surface-raised/80 backdrop-blur-sm sticky top-0 z-20">
      <div className="flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2.5 overflow-x-auto">
        {/* Search */}
        <div className="relative flex-shrink-0 w-40 md:w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-500" />
          <input
            ref={searchRef as React.RefObject<HTMLInputElement>}
            type="text"
            placeholder="Search feeds... ( / )"
            value={filters.searchQuery}
            onChange={(e) =>
              onFilterChange({ ...filters, searchQuery: e.target.value })
            }
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                onFilterChange({ ...filters, searchQuery: "" });
                (e.target as HTMLInputElement).blur();
              }
            }}
            className="w-full bg-surface pl-8 pr-7 py-1.5 rounded-lg text-xs text-stone-200 placeholder-stone-600 border border-stone-700 focus:border-stone-500 focus:outline-none transition-colors"
          />
          {filters.searchQuery && (
            <button
              onClick={() => onFilterChange({ ...filters, searchQuery: "" })}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Category toggles */}
        <div className="flex items-center gap-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => toggleCategory(cat)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all whitespace-nowrap ${
                filters.categories.length === 0 ||
                filters.categories.includes(cat)
                  ? cat === "ai"
                    ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                    : cat === "gaming"
                      ? "bg-green-500/20 text-green-400 border border-green-500/30"
                      : cat === "social"
                        ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                        : "bg-stone-500/20 text-stone-400 border border-stone-500/30"
                  : "text-stone-600 border border-transparent hover:text-stone-400"
              }`}
            >
              {categoryLabel(cat)}
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-stone-700/60 flex-shrink-0 hidden md:block" />

        {/* Source toggles */}
        <div className="flex items-center gap-1">
          {SOURCES.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => toggleSource(value)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all whitespace-nowrap ${
                filters.sources.length === 0 || filters.sources.includes(value)
                  ? "bg-stone-700/50 text-stone-300 border border-stone-600/50"
                  : "text-stone-600 border border-transparent hover:text-stone-400"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-stone-700/60 flex-shrink-0 hidden md:block" />

        {/* Special filters */}
        <button
          onClick={() =>
            onFilterChange({
              ...filters,
              breakingOnly: !filters.breakingOnly,
              bookmarksOnly: false,
            })
          }
          className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all whitespace-nowrap ${
            filters.breakingOnly
              ? "bg-red-500/20 text-red-400 border border-red-500/30"
              : "text-stone-600 border border-transparent hover:text-stone-400"
          }`}
        >
          <Zap className="w-3 h-3" />
          <span className="hidden sm:inline">Breaking</span>
          {breakingItems > 0 && (
            <span className="ml-1 bg-red-500/30 text-red-400 px-1.5 rounded-full text-[10px]">
              {breakingItems}
            </span>
          )}
        </button>

        <button
          onClick={() =>
            onFilterChange({
              ...filters,
              minDramaScore: filters.minDramaScore > 0 ? 0 : 35,
              bookmarksOnly: false,
            })
          }
          className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all whitespace-nowrap ${
            filters.minDramaScore > 0
              ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
              : "text-stone-600 border border-transparent hover:text-stone-400"
          }`}
        >
          <Flame className="w-3 h-3" />
          <span className="hidden sm:inline">Drama</span>
          {dramaItems > 0 && (
            <span className="ml-1 bg-orange-500/30 text-orange-400 px-1.5 rounded-full text-[10px]">
              {dramaItems}
            </span>
          )}
        </button>

        {/* Bookmarks filter */}
        <button
          onClick={() =>
            onFilterChange({
              ...filters,
              bookmarksOnly: !filters.bookmarksOnly,
              breakingOnly: false,
              minDramaScore: 0,
            })
          }
          className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all whitespace-nowrap ${
            filters.bookmarksOnly
              ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
              : "text-stone-600 border border-transparent hover:text-stone-400"
          }`}
        >
          <Bookmark className="w-3 h-3" />
          <span className="hidden sm:inline">Saved</span>
          {bookmarkCount > 0 && (
            <span className="ml-1 bg-amber-500/30 text-amber-400 px-1.5 rounded-full text-[10px]">
              {bookmarkCount}
            </span>
          )}
        </button>

        <div className="w-px h-5 bg-stone-700/60 flex-shrink-0 hidden md:block" />

        {/* Sort order */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <ArrowUpDown className="w-3 h-3 text-stone-600 hidden sm:block" />
          {SORT_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => onFilterChange({ ...filters, sortOrder: value })}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all whitespace-nowrap ${
                filters.sortOrder === value
                  ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                  : "text-stone-600 border border-transparent hover:text-stone-400"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Clear filters */}
        {isFiltered && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-stone-500 hover:text-stone-200 hover:bg-surface-overlay transition-all whitespace-nowrap flex-shrink-0"
            title="Clear all filters"
          >
            <X className="w-3 h-3" />
            <span className="hidden sm:inline">Clear</span>
          </button>
        )}

        {/* Item count */}
        <div className="ml-auto text-[11px] text-stone-600 whitespace-nowrap">
          {totalItems} items
        </div>
      </div>
    </div>
  );
}
