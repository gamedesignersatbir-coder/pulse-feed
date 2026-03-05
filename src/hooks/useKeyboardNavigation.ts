"use client";

import { useState, useCallback } from "react";
import { useKeyboardShortcut } from "./useAutoRefresh";

interface KeyboardNavCallbacks {
  onOpen: (index: number) => void;
  onRefresh: () => void;
  onFocusSearch: () => void;
  onBookmark: (index: number) => void;
  onMarkAllRead: () => void;
  onToggleHelp: () => void;
}

export function useKeyboardNavigation(
  itemCount: number,
  callbacks: KeyboardNavCallbacks
) {
  const [focusedIndex, setFocusedIndex] = useState(-1);

  // j = next item
  useKeyboardShortcut("j", () =>
    setFocusedIndex((i) => Math.min(i + 1, itemCount - 1))
  );

  // k = previous item
  useKeyboardShortcut("k", () =>
    setFocusedIndex((i) => Math.max(i - 1, 0))
  );

  // o or Enter = open focused item
  useKeyboardShortcut("o", () => {
    if (focusedIndex >= 0) callbacks.onOpen(focusedIndex);
  });

  // / = focus search
  useKeyboardShortcut("/", () => callbacks.onFocusSearch());

  // r = refresh
  useKeyboardShortcut("r", () => callbacks.onRefresh());

  // b = bookmark focused item
  useKeyboardShortcut("b", () => {
    if (focusedIndex >= 0) callbacks.onBookmark(focusedIndex);
  });

  // m = mark all as read
  useKeyboardShortcut("m", () => callbacks.onMarkAllRead());

  // ? = show help
  useKeyboardShortcut("?", () => callbacks.onToggleHelp(), { shift: true });

  // Escape = clear focus
  useKeyboardShortcut("Escape", () => setFocusedIndex(-1));

  const resetFocus = useCallback(() => setFocusedIndex(-1), []);

  return { focusedIndex, setFocusedIndex, resetFocus };
}
