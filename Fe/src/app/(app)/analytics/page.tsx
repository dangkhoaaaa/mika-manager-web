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
  LineChart,
  Line,
} from "recharts";
import { BarChart3, Clock, Flame, Target, TrendingUp } from "lucide-react";
import { analyticsApi } from "@/lib/api";
import { useChartColors } from "@/lib/theme-store";
import { PageTransition, FadeIn } from "@/components/shared/motion";
import { StatCard } from "@/components/shared/stat-card";
import { DashboardSkeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const PERIODS = [
  { value: "daily", label: "30 ngày" },
  { value: "weekly", label: "12 tuần" },
  { value: "monthly", label: "Tháng" },
  { value: "yearly", label: "Năm" },
];

export default function AnalyticsPage() {
  const [period, setPeriod] = useState("monthly");
  const { primary: chartColor } = useChartColors();

  const { data, isLoading } = useQuery({
    queryKey: ["analytics", period],
    queryFn: () => analyticsApi.advanced(period),
  });

  if (isLoading) return <DashboardSkeleton />;

  return (
    <PageTransition className="p-6 max-w-6xl mx-auto space-y-6">
      <FadeIn>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="w-6 h-6" />
              Analytics nâng cao
            </h1>
            <p className="text-muted-foreground text-sm">Phân tích chi tiết tiến độ học tập</p>
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            title="Tổng giờ"
            value={data?.totalHours || 0}
            suffix="h"
            decimals={1}
            icon={<Clock className="w-5 h-5 text-indigo-400" />}
          />
          <StatCard
            title="Session dài nhất"
            value={data?.longestSession || 0}
            suffix="h"
            decimals={1}
            icon={<TrendingUp className="w-5 h-5 text-emerald-400" />}
          />
          <StatCard
            title="Ngày hoạt động"
            value={data?.activeDays || 0}
            icon={<Target className="w-5 h-5 text-cyan-400" />}
          />
          <StatCard
            title="Consistency"
            value={data?.consistency || 0}
            suffix="%"
            decimals={0}
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
                <LineChart data={data?.chartData || []}>
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#666" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#666" />
                  <Tooltip
                    contentStyle={{ background: "#1a1a2e", border: "1px solid #333", borderRadius: 8 }}
                  />
                  <Line type="monotone" dataKey="hours" stroke={chartColor} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </FadeIn>

        <FadeIn delay={0.15}>
          <Card glass>
            <CardHeader>
              <CardTitle className="text-base">Theo mục tiêu</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data?.perGoal || []} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 11 }} stroke="#666" />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={100} stroke="#666" />
                  <Tooltip
                    contentStyle={{ background: "#1a1a2e", border: "1px solid #333", borderRadius: 8 }}
                  />
                  <Bar dataKey="hours" fill={chartColor} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </FadeIn>
      </div>
    </PageTransition>
  );
}
