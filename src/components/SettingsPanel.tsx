"use client";

import { useState } from "react";
import { FeedSourceConfig } from "@/types";
import { RSS_SOURCES, REDDIT_SOURCES } from "@/lib/feedSources";
import { loadCustomSources, saveCustomSources, loadDisabledSourceIds, toggleSourceEnabled } from "@/lib/sourceManager";
import { X, Plus, Trash2, Rss, Globe } from "lucide-react";

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const [disabledIds, setDisabledIds] = useState<Set<string>>(loadDisabledSourceIds);
  const [customSources, setCustomSources] = useState<FeedSourceConfig[]>(loadCustomSources);
  const [newUrl, setNewUrl] = useState("");
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState<"ai" | "gaming" | "general">("ai");

  if (!isOpen) return null;

  const handleToggle = (id: string) => {
    toggleSourceEnabled(id);
    setDisabledIds(loadDisabledSourceIds());
  };

  const handleAddCustom = () => {
    if (!newUrl.trim() || !newName.trim()) return;
    const source: FeedSourceConfig = {
      id: `custom-${Date.now()}`,
      name: newName.trim(),
      url: newUrl.trim(),
      type: "rss",
      category: newCategory,
      icon: "✦",
      color: "#6366f1",
      enabled: true,
    };
    const updated = [...customSources, source];
    setCustomSources(updated);
    saveCustomSources(updated);
    setNewUrl("");
    setNewName("");
  };

  const handleRemoveCustom = (id: string) => {
    const updated = customSources.filter((s) => s.id !== id);
    setCustomSources(updated);
    saveCustomSources(updated);
  };

  const allSources = [
    { label: "AI News (RSS)", sources: RSS_SOURCES.filter((s) => s.category === "ai"), icon: <Rss className="w-3 h-3" /> },
    { label: "Gaming News (RSS)", sources: RSS_SOURCES.filter((s) => s.category === "gaming"), icon: <Rss className="w-3 h-3" /> },
    { label: "Reddit", sources: REDDIT_SOURCES, icon: <Globe className="w-3 h-3" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-surface-raised border border-zinc-700 rounded-xl w-full max-w-lg max-h-[80vh] overflow-hidden shadow-2xl animate-slide-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-100">Source Management</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-surface-overlay text-zinc-500 hover:text-zinc-300">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(80vh-60px)] p-5 space-y-6">
          {/* Built-in sources */}
          {allSources.map(({ label, sources, icon }) => (
            <section key={label}>
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-2 flex items-center gap-1.5">
                {icon}
                {label}
              </h3>
              <div className="space-y-1">
                {sources.map((source) => {
                  const enabled = !disabledIds.has(source.id);
                  return (
                    <label
                      key={source.id}
                      className="flex items-center gap-3 px-3 py-1.5 rounded-lg hover:bg-surface-overlay transition-colors cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={enabled}
                        onChange={() => handleToggle(source.id)}
                        className="w-3.5 h-3.5 rounded border-zinc-600 bg-zinc-800 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-0"
                      />
                      <span
                        className="w-5 text-center text-[10px] font-bold"
                        style={{ color: source.color }}
                      >
                        {source.icon}
                      </span>
                      <span className={`text-xs flex-1 ${enabled ? "text-zinc-300" : "text-zinc-600 line-through"}`}>
                        {source.name}
                      </span>
                    </label>
                  );
                })}
              </div>
            </section>
          ))}

          {/* Custom sources */}
          <section>
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-2 flex items-center gap-1.5">
              <Plus className="w-3 h-3" />
              Custom RSS Feeds
            </h3>

            {customSources.length > 0 && (
              <div className="space-y-1 mb-3">
                {customSources.map((source) => (
                  <div
                    key={source.id}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-overlay"
                  >
                    <span className="text-[10px] text-indigo-400">✦</span>
                    <span className="text-xs text-zinc-300 flex-1 truncate">{source.name}</span>
                    <span className="text-[10px] text-zinc-600 truncate max-w-[120px]">{source.url}</span>
                    <button
                      onClick={() => handleRemoveCustom(source.id)}
                      className="p-0.5 text-zinc-600 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add form */}
            <div className="space-y-2 p-3 rounded-lg border border-zinc-800 bg-surface">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Feed name (e.g. My Blog)"
                className="w-full bg-surface-overlay px-3 py-1.5 rounded text-xs text-zinc-200 placeholder-zinc-600 border border-zinc-700 focus:border-zinc-500 focus:outline-none"
              />
              <input
                type="url"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="RSS feed URL (e.g. https://example.com/feed.xml)"
                className="w-full bg-surface-overlay px-3 py-1.5 rounded text-xs text-zinc-200 placeholder-zinc-600 border border-zinc-700 focus:border-zinc-500 focus:outline-none"
              />
              <div className="flex items-center gap-2">
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as "ai" | "gaming" | "general")}
                  className="bg-surface-overlay px-2 py-1.5 rounded text-xs text-zinc-300 border border-zinc-700 focus:outline-none"
                >
                  <option value="ai">AI</option>
                  <option value="gaming">Gaming</option>
                  <option value="general">General</option>
                </select>
                <button
                  onClick={handleAddCustom}
                  disabled={!newUrl.trim() || !newName.trim()}
                  className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/30 disabled:opacity-40 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  Add Feed
                </button>
              </div>
            </div>
          </section>

          <p className="text-[10px] text-zinc-600 text-center">
            Changes take effect on next feed refresh.
          </p>
        </div>
      </div>
    </div>
  );
}
