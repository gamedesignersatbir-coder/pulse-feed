import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Simple in-memory cache to avoid re-summarizing the same items
const summaryCache = new Map<string, string>();
const MAX_CACHE = 500;

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not configured" },
      { status: 501 }
    );
  }

  try {
    const { items } = await req.json();

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "No items provided" }, { status: 400 });
    }

    // Limit batch size
    const batch = items.slice(0, 10);

    // Check cache first
    const uncached: Array<{ id: string; title: string; summary: string }> = [];
    const results: Record<string, string> = {};

    for (const item of batch) {
      const cached = summaryCache.get(item.id);
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

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-20250414",
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
      console.error("Anthropic API error:", res.status, errorText);
      return NextResponse.json(
        { error: "AI summarization failed", summaries: results },
        { status: 502 }
      );
    }

    const data = await res.json();
    const responseText = data.content?.[0]?.text || "";

    // Parse numbered responses
    const lines = responseText.split("\n").filter((l: string) => l.trim());
    for (let i = 0; i < uncached.length && i < lines.length; i++) {
      // Strip leading number/bracket/dot
      const summary = lines[i].replace(/^\[?\d+\]?\.?\s*/, "").trim();
      if (summary) {
        results[uncached[i].id] = summary;
        summaryCache.set(uncached[i].id, summary);
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
