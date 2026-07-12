"use client";

import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils";
import type { DashboardData } from "@/lib/types";

interface HeatmapProps {
  data: DashboardData["heatmap"] | Record<string, { hours?: number; count?: number; level?: number }>;
  className?: string;
}

export function ContributionHeatmap({ data, className }: HeatmapProps) {
  const today = new Date();
  const weeks: Date[][] = [];
  let currentWeek: Date[] = [];

  for (let i = 364; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    currentWeek.push(date);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  if (currentWeek.length > 0) weeks.push(currentWeek);

  function getLevel(date: Date): number {
    const key = date.toISOString().split("T")[0];
    const entry = data[key];
    if (!entry) return 0;
    if ("level" in entry && entry.level !== undefined) return entry.level;
    const hours = entry.hours || 0;
    if (hours === 0) return 0;
    if (hours < 1) return 1;
    if (hours < 3) return 2;
    if (hours < 5) return 3;
    return 4;
  }

  return (
    <div className={cn("overflow-x-auto", className)}>
      <div className="flex gap-[3px] min-w-max">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[3px]">
            {week.map((date, di) => {
              const level = getLevel(date);
              const key = date.toISOString().split("T")[0];
              const entry = data[key];
              return (
                <div
                  key={di}
                  title={`${formatDate(date)}: ${entry?.hours?.toFixed(1) || 0}h`}
                  className={cn(
                    "w-[11px] h-[11px] rounded-sm transition-colors hover:ring-1 hover:ring-white/30 cursor-default",
                    `heatmap-${level}`
                  )}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
        <span>Ít</span>
        {[0, 1, 2, 3, 4].map((l) => (
          <div key={l} className={cn("w-[11px] h-[11px] rounded-sm", `heatmap-${l}`)} />
        ))}
        <span>Nhiều</span>
      </div>
    </div>
  );
}
