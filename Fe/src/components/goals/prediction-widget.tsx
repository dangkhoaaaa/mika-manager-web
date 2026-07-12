"use client";

import { useQuery } from "@tanstack/react-query";
import { TrendingUp, TrendingDown, Target, Calendar } from "lucide-react";
import { tasksApi } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatDate } from "@/lib/utils";

export function PredictionWidget({ goalId }: { goalId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["goal-prediction", goalId],
    queryFn: () => tasksApi.prediction(goalId),
  });

  if (isLoading) {
    return (
      <Card glass>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Đang phân tích...
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <Card glass>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Target className="w-4 h-4" />
          Dự đoán hoàn thành
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          className={cn(
            "p-4 rounded-xl border",
            data.onTrack
              ? "border-emerald-500/30 bg-emerald-500/10"
              : "border-amber-500/30 bg-amber-500/10"
          )}
        >
          <div className="flex items-center gap-2 mb-2">
            {data.onTrack ? (
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            ) : (
              <TrendingDown className="w-5 h-5 text-amber-400" />
            )}
            <span className="font-medium text-sm">
              {data.onTrack ? "Đúng tiến độ" : "Chậm tiến độ"}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{data.message}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-white/5">
            <p className="text-xs text-muted-foreground">Tiến độ</p>
            <p className="text-lg font-bold">{data.progressPercent.toFixed(0)}%</p>
          </div>
          <div className="p-3 rounded-lg bg-white/5">
            <p className="text-xs text-muted-foreground">Giờ còn lại</p>
            <p className="text-lg font-bold">{data.hoursRemaining.toFixed(1)}h</p>
          </div>
          <div className="p-3 rounded-lg bg-white/5">
            <p className="text-xs text-muted-foreground">TB / ngày</p>
            <p className="text-lg font-bold">{data.avgHoursPerDay}h</p>
          </div>
          <div className="p-3 rounded-lg bg-white/5">
            <p className="text-xs text-muted-foreground">Cần / ngày</p>
            <p className="text-lg font-bold">{data.requiredHoursPerDay}h</p>
          </div>
        </div>

        {data.estimatedCompletion && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            Dự kiến hoàn thành: {formatDate(data.estimatedCompletion)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
