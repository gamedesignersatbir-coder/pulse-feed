# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server (http://localhost:3000)
npm run build    # Production build
npm run lint     # ESLint via Next.js
npm run start    # Start production server
```

No test suite is configured.

## Environment Variables

Copy `.env.example` to `.env.local`. All variables are optional:

- `OPENROUTER_API_KEY` — enables AI summarization via OpenRouter (uses `anthropic/claude-haiku-4` model)
- `TWITTER_BEARER_TOKEN` — enables Twitter feed (not yet implemented in parsers)
- `REFRESH_INTERVAL` — feed refresh interval in seconds (default: 120)

Note: `.env.example` mentions `ANTHROPIC_API_KEY` but the summarize route actually uses `OPENROUTER_API_KEY`.

## Architecture

**Next.js 14 App Router** with TypeScript and Tailwind CSS. No database — all persistence is client-side.

### Data Flow

1. `GET /api/feeds` — server-side route that fetches all sources in parallel and returns normalized `FeedItem[]`
2. `POST /api/summarize` — server-side route that calls OpenRouter API to batch-summarize items (in-memory cache, max 500 entries)
3. `Dashboard.tsx` — single orchestrating client component that manages all state, fetches feeds, triggers summarization, and renders the layout

### Source Parsers (`src/lib/`)

Each source type has its own parser that returns `FeedItem[]`:
- `rssParser.ts` — RSS/Atom feeds + Reddit JSON API + Hacker News Firebase API
- `blueskyParser.ts` — Bluesky AT Protocol public API
- `githubTrending.ts` — GitHub trending repositories via scraping
- `steamParser.ts` — Steam game news via Steam API

After parsing, `scorer.ts` runs on every item to compute:
- `dramaScore` (0–100) via keyword matching + engagement signals
- `dramaLevel` ("none" | "mild" | "spicy" | "nuclear")
- `isBreaking` flag
- `tags[]` (entity extraction: OpenAI, Google, Nintendo, etc.)

### Feed Sources (`src/lib/feedSources.ts`)

Central registry of all `FeedSourceConfig` objects. Add new sources here by appending to `RSS_SOURCES`, `REDDIT_SOURCES`, or creating new named exports for custom source types.

### Client Persistence

Two storage layers used on the client:
- **localStorage** (via `src/lib/storage.ts`): filters, read items (max 2000 IDs), bookmarks (full `FeedItem` data), settings, trending snapshots
- **IndexedDB** (via `src/lib/itemHistory.ts`): full feed item history, 7-day retention, searched by `HistorySearch` component

User-managed source overrides (enable/disable built-in sources, add custom RSS) are in `src/lib/sourceManager.ts`.

### Key Types (`src/types/index.ts`)

`FeedItem` is the central data type flowing through the entire app. Notable fields: `dramaScore`, `dramaLevel`, `isBreaking`, `aiSummary`, `engagement`, `tags`, `sourceType` (union of source kinds), `category` (ai | gaming | drama | breaking | social | general).

### Component Layout

`Dashboard.tsx` renders a three-column layout:
- Left: `Sidebar` (source stats, settings shortcuts)
- Center: `BreakingTicker` + `FilterBar` + `FeedCard` list
- Right: `TrendingPanel` (topic velocity tracking)

Modals: `KeyboardShortcutsHelp`, `SettingsPanel`, `HistorySearch`

Hooks: `useAutoRefresh`, `useKeyboardNavigation`, `useNotifications`
