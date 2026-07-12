"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { dashboardApi } from "@/lib/api";
import { useChartColors } from "@/lib/theme-store";
import { PageTransition, FadeIn } from "@/components/shared/motion";
import { StatCard } from "@/components/shared/stat-card";
import { DashboardSkeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Clock, TrendingUp, Flame } from "lucide-react";

const PERIODS = [
  { value: "weekly", label: "Tuần" },
  { value: "monthly", label: "Tháng" },
  { value: "yearly", label: "Năm" },
];

export default function StatisticsPage() {
  const [period, setPeriod] = useState("weekly");
  const { primary: chartColor } = useChartColors();

  const { data, isLoading } = useQuery({
    queryKey: ["statistics", period],
    queryFn: () => dashboardApi.statistics(period),
  });

  if (isLoading) return <DashboardSkeleton />;

  return (
    <PageTransition className="p-6 max-w-6xl mx-auto space-y-6">
      <FadeIn>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Thống kê</h1>
            <p className="text-muted-foreground text-sm">Phân tích tiến độ học tập</p>
          </div>
          <div className="flex gap-1 bg-white/5 rounded-lg p-1">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm transition-all",
                  period === p.value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </FadeIn>

      <FadeIn delay={0.05}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            title="Tổng giờ học"
            value={data?.totalHours || 0}
            suffix="h"
            decimals={1}
            icon={<Clock className="w-5 h-5 text-indigo-400" />}
          />
          <StatCard
            title="Trung bình / session"
            value={data?.avgSession || 0}
            suffix="h"
            decimals={1}
            icon={<TrendingUp className="w-5 h-5 text-emerald-400" />}
          />
          <StatCard
            title="Streak hiện tại"
            value={data?.currentStreak || 0}
            suffix=" ngày"
            icon={<Flame className="w-5 h-5 text-orange-400" />}
          />
        </div>
      </FadeIn>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FadeIn delay={0.1}>
          <Card glass>
            <CardHeader>
              <CardTitle className="text-base">Giờ học theo thời gian</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data?.chartData || []}>
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#666" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#666" />
                  <Tooltip
                    contentStyle={{ background: "#1a1a2e", border: "1px solid #333", borderRadius: 8 }}
                  />
                  <Bar dataKey="hours" fill={chartColor} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </FadeIn>

        <FadeIn delay={0.15}>
          <Card glass>
            <CardHeader>
              <CardTitle className="text-base">Phân bổ theo mục tiêu</CardTitle>
            </CardHeader>
            <CardContent>
              {(data?.categories || []).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-16">
                  Chưa có dữ liệu
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={data?.categories}
                      dataKey="hours"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={3}
                    >
                      {(data?.categories || []).map((entry, i) => (
                        <Cell key={i} fill={entry.color || "#6366f1"} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: "#1a1a2e", border: "1px solid #333", borderRadius: 8 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </FadeIn>
      </div>
    </PageTransition>
  );
}
