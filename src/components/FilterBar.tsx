"use client";

import { FeedCategory, FeedSource, FilterState } from "@/types";
import { categoryLabel } from "@/lib/utils";
import {
  Search,
  Flame,
  Zap,
  Bookmark,
} from "lucide-react";

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
    <div className="border-b border-zinc-800 bg-surface-raised/80 backdrop-blur-sm sticky top-0 z-20">
      <div className="flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2.5 overflow-x-auto">
        {/* Search */}
        <div className="relative flex-shrink-0 w-40 md:w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
          <input
            ref={searchRef as React.RefObject<HTMLInputElement>}
            type="text"
            placeholder="Search feeds... ( / )"
            value={filters.searchQuery}
            onChange={(e) =>
              onFilterChange({ ...filters, searchQuery: e.target.value })
            }
            className="w-full bg-surface pl-8 pr-3 py-1.5 rounded-lg text-xs text-zinc-200 placeholder-zinc-600 border border-zinc-800 focus:border-zinc-600 focus:outline-none transition-colors"
          />
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
                        : "bg-zinc-500/20 text-zinc-400 border border-zinc-500/30"
                  : "text-zinc-600 border border-transparent hover:text-zinc-400"
              }`}
            >
              {categoryLabel(cat)}
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-zinc-800 flex-shrink-0 hidden md:block" />

        {/* Source toggles */}
        <div className="flex items-center gap-1">
          {SOURCES.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => toggleSource(value)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all whitespace-nowrap ${
                filters.sources.length === 0 || filters.sources.includes(value)
                  ? "bg-zinc-700/50 text-zinc-300 border border-zinc-600/50"
                  : "text-zinc-600 border border-transparent hover:text-zinc-400"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-zinc-800 flex-shrink-0 hidden md:block" />

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
              : "text-zinc-600 border border-transparent hover:text-zinc-400"
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
              : "text-zinc-600 border border-transparent hover:text-zinc-400"
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
              : "text-zinc-600 border border-transparent hover:text-zinc-400"
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

        {/* Item count */}
        <div className="ml-auto text-[11px] text-zinc-600 whitespace-nowrap">
          {totalItems} items
        </div>
      </div>
    </div>
  );
}
