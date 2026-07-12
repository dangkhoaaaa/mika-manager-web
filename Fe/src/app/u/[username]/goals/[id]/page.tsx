"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Clock,
  BarChart3,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { profileApi } from "@/lib/api";
import { MOODS } from "@/lib/types";
import { PageTransition, FadeIn, ProgressRing } from "@/components/shared/motion";
import { ContributionHeatmap } from "@/components/shared/heatmap";
import { FollowButton } from "@/components/social/follow-button";
import { CheerButton } from "@/components/social/cheer-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials, formatHours, formatDate, daysRemaining } from "@/lib/utils";
import { useAuthStore } from "@/lib/store";

export default function PublicGoalPage() {
  const { username, id } = useParams<{ username: string; id: string }>();
  const router = useRouter();
  const { user: me, isAuthenticated } = useAuthStore();

  const { data, isLoading } = useQuery({
    queryKey: ["public-goal", username, id],
    queryFn: () => profileApi.getPublicGoal(username, id),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) return null;

  const { goal, user, profile, logs, chartData, progress, remainingDays, heatmap, isFollowing } = data;
  const isOwn = isAuthenticated && me?.id === user.id;
  const remaining = remainingDays ?? daysRemaining(goal.deadline);

  return (
    <PageTransition className="min-h-screen pb-12">
      <div className="max-w-4xl mx-auto px-6 pt-6">
        <FadeIn>
          <button
            onClick={() => router.push(`/u/${username}`)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            @{username}
          </button>

          {/* Author bar */}
          <div className="flex items-center justify-between mb-6">
            <Link href={`/u/${username}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <Avatar className="w-10 h-10">
                <AvatarImage src={profile.avatar} />
                <AvatarFallback className="bg-indigo-500/20 text-sm">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-sm">{user.name}</p>
                <p className="text-xs text-muted-foreground">@{username}</p>
              </div>
            </Link>
            {!isOwn && (
              <div className="flex gap-2">
                <FollowButton userId={user.id} isFollowing={isFollowing} />
                <CheerButton userId={user.id} userName={user.name} />
              </div>
            )}
          </div>

          <div className="flex items-start gap-6">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shrink-0"
              style={{ backgroundColor: `${goal.color}20` }}
            >
              {goal.icon}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">{goal.title}</h1>
              {goal.description && (
                <p className="text-muted-foreground mt-1">{goal.description}</p>
              )}
              <div className="flex gap-4 mt-3 text-sm text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {formatHours(goal.totalHours)} / {goal.targetHours}h
                </span>
                {remaining !== null && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {remaining} ngày còn lại
                  </span>
                )}
                <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">
                  {goal.status}
                </span>
              </div>
              {goal.tags?.length > 0 && (
                <div className="flex gap-1.5 mt-3 flex-wrap">
                  {goal.tags.map((tag) => (
                    <span key={tag} className="text-xs bg-white/5 px-2 py-0.5 rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </FadeIn>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
          <FadeIn delay={0.05}>
            <Card glass className="flex flex-col items-center py-8">
              <ProgressRing progress={progress} color={goal.color} size={140} />
              <p className="text-sm text-muted-foreground mt-4">
                {goal.completedDays} ngày đã học
              </p>
            </Card>
          </FadeIn>

          <FadeIn delay={0.1} className="lg:col-span-2">
            <Card glass>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Biểu đồ tuần
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="pubColorHours" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={goal.color} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={goal.color} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#666" />
                    <YAxis tick={{ fontSize: 11 }} stroke="#666" />
                    <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid #333", borderRadius: 8 }} />
                    <Area type="monotone" dataKey="hours" stroke={goal.color} fill="url(#pubColorHours)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </FadeIn>
        </div>

        <FadeIn delay={0.15} className="mt-6">
          <Card glass>
            <CardHeader>
              <CardTitle className="text-base">Nhật ký học tập</CardTitle>
            </CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Chưa có nhật ký</p>
              ) : (
                <div className="space-y-3">
                  {logs.map((log) => (
                    <div key={log.id} className="p-4 rounded-lg bg-white/5 border border-white/5">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-medium">{formatDate(log.date)}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {log.tasksCompleted} tasks · {MOODS.find((m) => m.value === log.mood)?.emoji}
                          </p>
                        </div>
                        <span className="text-sm font-semibold text-indigo-400">
                          {formatHours(log.hoursStudied)}
                        </span>
                      </div>
                      {log.notes && (
                        <p className="text-sm text-muted-foreground mt-2">{log.notes}</p>
                      )}
                      {log.evidenceImages?.length > 0 && (
                        <div className="flex gap-2 mt-3 flex-wrap">
                          {log.evidenceImages.map((img, i) => (
                            <img key={i} src={img.url} alt="" className="w-24 h-24 rounded-lg object-cover" />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </FadeIn>

        <FadeIn delay={0.2} className="mt-6">
          <Card glass>
            <CardHeader>
              <CardTitle className="text-base">Heatmap</CardTitle>
            </CardHeader>
            <CardContent>
              <ContributionHeatmap
                data={heatmap as Record<string, { hours: number; count: number; level: number }>}
              />
            </CardContent>
          </Card>
        </FadeIn>
      </div>
    </PageTransition>
  );
}
