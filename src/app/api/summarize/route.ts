import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Simple in-memory cache to avoid re-summarizing the same items
const summaryCache = new Map<string, string>();
const MAX_CACHE = 500;

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENROUTER_API_KEY not configured" },
      { status: 501 }
    );
  }

  try {
    const { items } = await req.json();

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "No items provided" }, { status: 400 });
    }

    // Limit batch size
    const batch = items.slice(0, 10) as Array<{ id: string; title: string; summary: string; url?: string }>;

    // Normalize URL for cache key: strip trailing slash + query params that vary by session
    const cacheKey = (item: { id: string; url?: string }): string => {
      if (!item.url) return item.id;
      try {
        const u = new URL(item.url);
        return `${u.hostname}${u.pathname}`.replace(/\/$/, "");
      } catch {
        return item.id;
      }
    };

    // Check cache first (keyed by normalized URL to deduplicate cross-source stories)
    const uncached: Array<{ id: string; title: string; summary: string; url?: string }> = [];
    const results: Record<string, string> = {};

    for (const item of batch) {
      const key = cacheKey(item);
      const cached = summaryCache.get(key);
      if (cached) {
        results[item.id] = cached;
      } else {
        uncached.push(item);
      }
    }

    if (uncached.length === 0) {
      return NextResponse.json({ summaries: results });
    }

    // Build prompt for batch summarization
    const itemsList = uncached
      .map(
        (item, i) =>
          `[${i + 1}] Title: ${item.title}\nSummary: ${item.summary || "N/A"}`
      )
      .join("\n\n");

    // Use OpenRouter API (OpenAI-compatible format)
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://pulsefeed.app",
        "X-Title": "PulseFeed",
      },
      body: JSON.stringify({
        model: "anthropic/claude-haiku-4",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: `Generate a one-line summary (max 15 words) for each news item below. Be direct, informative, and capture the key point. Output ONLY numbered summaries matching the input numbers, one per line.\n\n${itemsList}`,
          },
        ],
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("OpenRouter API error:", res.status, errorText);
      return NextResponse.json(
        { error: "AI summarization failed", summaries: results },
        { status: 502 }
      );
    }

    const data = await res.json();
    // OpenRouter returns OpenAI-compatible format: data.choices[0].message.content
    const responseText = data.choices?.[0]?.message?.content || "";

    // Parse numbered responses
    const lines = responseText.split("\n").filter((l: string) => l.trim());
    for (let i = 0; i < uncached.length && i < lines.length; i++) {
      // Strip leading number/bracket/dot
      const summary = lines[i].replace(/^\[?\d+\]?\.?\s*/, "").trim();
      if (summary) {
        results[uncached[i].id] = summary;
        summaryCache.set(cacheKey(uncached[i]), summary);
      }
    }

    // Prune cache if too large
    if (summaryCache.size > MAX_CACHE) {
      const keys = Array.from(summaryCache.keys());
      for (let i = 0; i < keys.length - MAX_CACHE; i++) {
        summaryCache.delete(keys[i]);
      }
    }

    return NextResponse.json({ summaries: results });
  } catch (error) {
    console.error("Summarization error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
