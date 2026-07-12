"use client";

import { Target, Flame, Clock, Trophy, BookOpen, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { AnimatedCounter } from "@/components/shared/animated-counter";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: number;
  suffix?: string;
  decimals?: number;
  icon: React.ReactNode;
  gradient?: string;
  className?: string;
}

export function StatCard({
  title,
  value,
  suffix = "",
  decimals = 0,
  icon,
  gradient = "from-indigo-500/20 to-purple-500/20",
  className,
}: StatCardProps) {
  return (
    <Card glass className={cn("group hover:border-primary/30 transition-all duration-300", className)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">{title}</p>
            <p className="text-3xl font-bold tracking-tight">
              <AnimatedCounter value={value} suffix={suffix} decimals={decimals} />
            </p>
          </div>
          <div className={cn("p-2.5 rounded-xl bg-gradient-to-br", gradient)}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function TodayStats({
  todayHours,
  currentStreak,
  totalHours,
  weeklyHours,
}: {
  todayHours: number;
  currentStreak: number;
  totalHours: number;
  weeklyHours: number;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        title="Hôm nay"
        value={todayHours}
        suffix="h"
        decimals={1}
        icon={<Clock className="w-5 h-5 text-indigo-400" />}
        gradient="from-indigo-500/20 to-blue-500/20"
      />
      <StatCard
        title="Streak hiện tại"
        value={currentStreak}
        suffix=" ngày"
        icon={<Flame className="w-5 h-5 text-orange-400" />}
        gradient="from-orange-500/20 to-red-500/20"
      />
      <StatCard
        title="Tuần này"
        value={weeklyHours}
        suffix="h"
        decimals={1}
        icon={<Calendar className="w-5 h-5 text-emerald-400" />}
        gradient="from-emerald-500/20 to-teal-500/20"
      />
      <StatCard
        title="Tổng giờ học"
        value={totalHours}
        suffix="h"
        decimals={0}
        icon={<BookOpen className="w-5 h-5 text-purple-400" />}
        gradient="from-purple-500/20 to-pink-500/20"
      />
    </div>
  );
}

export function GoalStats({ active, completed }: { active: number; completed: number }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <StatCard
        title="Mục tiêu đang học"
        value={active}
        icon={<Target className="w-5 h-5 text-indigo-400" />}
      />
      <StatCard
        title="Đã hoàn thành"
        value={completed}
        icon={<Trophy className="w-5 h-5 text-yellow-400" />}
        gradient="from-yellow-500/20 to-amber-500/20"
      />
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="p-4 rounded-2xl bg-muted/30 mb-4">{icon}</div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm max-w-sm mb-6">{description}</p>
      {action}
    </div>
  );
}
