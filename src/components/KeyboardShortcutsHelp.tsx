"use client";

import { X } from "lucide-react";

interface KeyboardShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  { key: "j", description: "Next item" },
  { key: "k", description: "Previous item" },
  { key: "o", description: "Open focused item" },
  { key: "/", description: "Focus search" },
  { key: "r", description: "Refresh feeds" },
  { key: "b", description: "Bookmark focused item" },
  { key: "m", description: "Mark all as read" },
  { key: "?", description: "Show this help" },
  { key: "Esc", description: "Clear focus / Close" },
];

export default function KeyboardShortcutsHelp({
  isOpen,
  onClose,
}: KeyboardShortcutsHelpProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-surface-raised border border-stone-700 rounded-xl p-6 w-80 shadow-2xl animate-slide-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-stone-100">
            Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-surface-overlay text-stone-500 hover:text-stone-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2">
          {SHORTCUTS.map(({ key, description }) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-xs text-stone-400">{description}</span>
              <kbd className="px-2 py-0.5 rounded bg-stone-800 border border-stone-700 text-[11px] font-mono text-stone-300 min-w-[28px] text-center">
                {key}
              </kbd>
            </div>
          ))}
        </div>

        <p className="mt-4 text-[10px] text-stone-600 text-center">
          Shortcuts are disabled when typing in search
        </p>
      </div>
    </div>
  );
}
