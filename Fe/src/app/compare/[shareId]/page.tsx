"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Swords } from "lucide-react";
import { compareApi } from "@/lib/api";
import type { CompareStats } from "@/lib/types";
import { ContributionHeatmap } from "@/components/shared/heatmap";
import { Card, CardContent } from "@/components/ui/card";
import { formatHours } from "@/lib/utils";

function CompareSide({ stats, label }: { stats: CompareStats; label: string }) {
  return (
    <div className="space-y-4">
      <div className="text-center">
        <p className="text-xs text-muted-foreground uppercase">{label}</p>
        <p className="font-bold text-lg">{stats.userName}</p>
        {stats.goalTitle && (
          <p className="text-sm text-muted-foreground">{stats.goalIcon} {stats.goalTitle}</p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="p-3 rounded-lg bg-white/5 text-center">
          <p className="text-xs text-muted-foreground">Giờ học</p>
          <p className="font-bold">{formatHours(stats.totalHours)}</p>
        </div>
        <div className="p-3 rounded-lg bg-white/5 text-center">
          <p className="text-xs text-muted-foreground">Streak</p>
          <p className="font-bold">{stats.currentStreak} 🔥</p>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={100}>
        <BarChart data={stats.dailyHours || []}>
          <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid #333", borderRadius: 8 }} />
          <Bar dataKey="hours" fill={stats.goalColor || "#6366f1"} radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      <ContributionHeatmap
        data={stats.heatmap as Record<string, { hours: number; count: number; level: number }>}
      />
    </div>
  );
}

export default function PublicComparePage() {
  const { shareId } = useParams<{ shareId: string }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ["compare-share", shareId],
    queryFn: () => compareApi.getShare(shareId),
    enabled: !!shareId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Link so sánh không tồn tại</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 max-w-5xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold flex items-center justify-center gap-2">
          <Swords className="w-6 h-6" />
          Progress Challenge — So sánh
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Khoảng: {data.range}</p>
      </div>

      <Card glass>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <CompareSide stats={data.userA} label="User A" />
            <CompareSide stats={data.userB} label="User B" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
