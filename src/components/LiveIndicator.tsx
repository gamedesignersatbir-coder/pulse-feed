"use client";

interface LiveIndicatorProps {
  isLive: boolean;
  itemCount: number;
}

export default function LiveIndicator({ isLive, itemCount }: LiveIndicatorProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5">
        <span
          className={`w-2 h-2 rounded-full ${
            isLive ? "bg-green-500 animate-pulse" : "bg-zinc-600"
          }`}
        />
        <span className="text-[11px] font-medium text-zinc-400">
          {isLive ? "LIVE" : "PAUSED"}
        </span>
      </div>
      <span className="text-[11px] text-zinc-600">
        {itemCount} stories tracked
      </span>
    </div>
  );
}
