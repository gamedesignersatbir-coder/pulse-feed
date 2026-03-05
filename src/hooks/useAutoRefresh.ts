"use client";

import { useEffect, useRef, useCallback } from "react";

export function useAutoRefresh(
  callback: () => void,
  intervalMs: number,
  enabled: boolean
) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) return;

    const id = setInterval(() => {
      savedCallback.current();
    }, intervalMs);

    return () => clearInterval(id);
  }, [intervalMs, enabled]);
}

export function useKeyboardShortcut(
  key: string,
  callback: () => void,
  modifiers: { ctrl?: boolean; shift?: boolean; alt?: boolean } = {}
) {
  const handler = useCallback(
    (e: KeyboardEvent) => {
      if (
        e.key.toLowerCase() === key.toLowerCase() &&
        (!modifiers.ctrl || e.ctrlKey || e.metaKey) &&
        (!modifiers.shift || e.shiftKey) &&
        (!modifiers.alt || e.altKey)
      ) {
        e.preventDefault();
        callback();
      }
    },
    [key, callback, modifiers.ctrl, modifiers.shift, modifiers.alt]
  );

  useEffect(() => {
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handler]);
}
