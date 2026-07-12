"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Plus, Quote, Activity } from "lucide-react";
import { dashboardApi } from "@/lib/api";
import { PageTransition, FadeIn } from "@/components/shared/motion";
import { TodayStats, GoalStats, EmptyState } from "@/components/shared/stat-card";
import { ContributionHeatmap } from "@/components/shared/heatmap";
import { DashboardSkeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatHours, formatDate } from "@/lib/utils";

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: dashboardApi.get,
  });

  if (isLoading) return <DashboardSkeleton />;

  if (!data) return null;

  return (
    <PageTransition className="p-6 space-y-6 max-w-7xl mx-auto">
      <FadeIn>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Tiến độ học tập hôm nay
            </p>
          </div>
          <Link href="/goals/new">
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Ghi nhận tiến độ
            </Button>
          </Link>
        </div>
      </FadeIn>

      <FadeIn delay={0.05}>
        <TodayStats
          todayHours={data.todayHours}
          currentStreak={data.currentStreak}
          totalHours={data.totalHours}
          weeklyHours={data.weeklyHours}
        />
      </FadeIn>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <FadeIn delay={0.1} className="lg:col-span-2">
          <Card glass>
            <CardHeader>
              <CardTitle className="text-base">Hoạt động 365 ngày</CardTitle>
            </CardHeader>
            <CardContent>
              <ContributionHeatmap data={data.heatmap} />
            </CardContent>
          </Card>
        </FadeIn>

        <FadeIn delay={0.15}>
          <Card glass className="h-full">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Quote className="w-4 h-4 text-indigo-400" />
                Câu nói hôm nay
              </CardTitle>
            </CardHeader>
            <CardContent>
              <blockquote className="text-sm italic text-muted-foreground leading-relaxed">
                &ldquo;{data.quote}&rdquo;
              </blockquote>
              <div className="mt-6 pt-4 border-t border-white/5">
                <p className="text-xs text-muted-foreground mb-2">Thành tựu</p>
                <div className="flex items-center gap-3">
                  <Progress
                    value={(data.achievementProgress.unlocked / data.achievementProgress.total) * 100}
                    className="flex-1"
                  />
                  <span className="text-sm font-medium">
                    {data.achievementProgress.unlocked}/{data.achievementProgress.total}
                  </span>
                </div>
                <div className="flex gap-2 mt-3 flex-wrap">
                  {data.achievements.slice(0, 3).map((a) => (
                    <span key={a.key} className="text-lg" title={a.title}>
                      {a.icon}
                    </span>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FadeIn delay={0.2}>
          <GoalStats active={data.activeGoals} completed={data.completedGoals} />
        </FadeIn>

        <FadeIn delay={0.25}>
          <Card glass>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Hoạt động gần đây
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.recentActivities.length === 0 ? (
                <EmptyState
                  icon={<Activity className="w-8 h-8 text-muted-foreground" />}
                  title="Chưa có hoạt động"
                  description="Bắt đầu ghi nhận tiến độ học tập hôm nay"
                  action={
                    <Link href="/goals">
                      <Button size="sm">Xem mục tiêu</Button>
                    </Link>
                  }
                />
              ) : (
                <div className="space-y-3">
                  {data.recentActivities.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"
                    >
                      <div>
                        <p className="text-sm font-medium">{formatDate(log.date)}</p>
                        <p className="text-xs text-muted-foreground">
                          {log.tasksCompleted} tasks · {log.mood}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-indigo-400">
                        {formatHours(log.hoursStudied)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </FadeIn>
      </div>
    </PageTransition>
  );
}
