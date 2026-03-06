"use client";

interface LiveIndicatorProps {
  isLive: boolean;
  itemCount: number;
  unreadCount: number;
}

export default function LiveIndicator({ isLive, itemCount, unreadCount }: LiveIndicatorProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5">
        <span
          className={`w-2 h-2 rounded-full ${
            isLive ? "bg-green-500 animate-pulse" : "bg-stone-600"
          }`}
        />
        <span className="text-[11px] font-medium text-stone-400">
          {isLive ? "LIVE" : "PAUSED"}
        </span>
      </div>
      <span className="text-[11px] text-stone-600">
        {itemCount} stories
      </span>
      {unreadCount > 0 && (
        <span className="text-[11px] text-indigo-400 font-medium">
          {unreadCount} unread
        </span>
      )}
    </div>
  );
}
