"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Trophy, Target, Activity, ChevronRight, PartyPopper } from "lucide-react";
import { profileApi } from "@/lib/api";
import { PageTransition, FadeIn } from "@/components/shared/motion";
import { ContributionHeatmap } from "@/components/shared/heatmap";
import { FollowButton } from "@/components/social/follow-button";
import { CheerButton } from "@/components/social/cheer-button";
import { ActivityCard } from "@/components/social/activity-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { getInitials, formatHours, getProgressPercent } from "@/lib/utils";
import { useAuthStore } from "@/lib/store";

export default function PublicProfilePage() {
  const { username } = useParams<{ username: string }>();
  const { user: me, isAuthenticated } = useAuthStore();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["public-profile", username],
    queryFn: () => profileApi.getPublic(username),
  });

  const { data: timeline = [] } = useQuery({
    queryKey: ["public-timeline", username],
    queryFn: () => profileApi.getPublicTimeline(username),
    enabled: !!username,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) return null;

  const { user, profile, publicGoals, achievements, heatmap, isFollowing, recentCheers } = data;
  const isOwnProfile = isAuthenticated && me?.id === user.id;

  return (
    <PageTransition className="min-h-screen">
      <div className="relative h-48 bg-gradient-to-r from-indigo-600/30 to-purple-600/30">
        {profile.banner && (
          <img src={profile.banner} alt="" className="w-full h-full object-cover opacity-60" />
        )}
      </div>

      <div className="max-w-4xl mx-auto px-6 -mt-16 relative z-10 pb-12">
        <FadeIn>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
            <div className="flex items-end gap-4">
              <Avatar className="w-24 h-24 border-4 border-background">
                <AvatarImage src={profile.avatar} />
                <AvatarFallback className="text-2xl bg-indigo-500/20">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="mb-2">
                <h1 className="text-2xl font-bold">{user.name}</h1>
                <p className="text-muted-foreground">@{profile.username}</p>
                {profile.bio && <p className="text-sm mt-2 max-w-md">{profile.bio}</p>}
              </div>
            </div>

            {!isOwnProfile && (
              <div className="flex gap-2 shrink-0">
                <FollowButton
                  userId={user.id}
                  isFollowing={isFollowing}
                  username={profile.username}
                  onSuccess={() => refetch()}
                />
                <CheerButton userId={user.id} userName={user.name} />
              </div>
            )}

            {isOwnProfile && (
              <Link href="/profile" className="text-sm text-primary hover:underline shrink-0">
                Chỉnh sửa hồ sơ →
              </Link>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            {[
              { label: "Tổng giờ", value: formatHours(profile.totalHours) },
              { label: "Streak", value: `${profile.currentStreak} ngày` },
              { label: "Followers", value: profile.followersCount },
              { label: "Following", value: profile.followingCount },
            ].map((s) => (
              <Card key={s.label} glass>
                <CardContent className="p-4 text-center">
                  <p className="text-lg font-bold">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </FadeIn>

        {/* Timeline */}
        <FadeIn delay={0.05} className="mb-8">
          <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5" />
            Timeline hoạt động
          </h2>
          {timeline.length === 0 ? (
            <Card glass>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                Chưa có hoạt động công khai. Cần tạo mục tiêu với visibility = &quot;Công khai&quot; và ghi nhận tiến độ.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {timeline.map((item) => (
                <ActivityCard key={item.log.id} item={item} />
              ))}
            </div>
          )}
        </FadeIn>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <FadeIn delay={0.1}>
            <Card glass>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Mục tiêu công khai
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {publicGoals.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Chưa có mục tiêu công khai</p>
                ) : (
                  publicGoals.map((goal) => {
                    const progress = getProgressPercent(goal.totalHours, goal.targetHours);
                    return (
                      <Link
                        key={goal.id}
                        href={`/u/${profile.username}/goals/${goal.id}`}
                        className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group"
                      >
                        <span className="text-xl">{goal.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium group-hover:text-primary transition-colors">
                            {goal.title}
                          </p>
                          <Progress value={progress} className="mt-1.5 h-1" />
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatHours(goal.totalHours)} / {goal.targetHours}h · {progress}%
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary shrink-0" />
                      </Link>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </FadeIn>

          <div className="space-y-6">
            <FadeIn delay={0.15}>
              <Card glass>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-yellow-400" />
                    Thành tựu
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-3">
                    {achievements.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Chưa có thành tựu</p>
                    ) : (
                      achievements.map((a) => (
                        <div key={a.key} className="text-center" title={a.title}>
                          <span className="text-2xl">{a.icon}</span>
                          <p className="text-xs text-muted-foreground mt-1">{a.title}</p>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </FadeIn>

            {recentCheers && recentCheers.length > 0 && (
              <FadeIn delay={0.2}>
                <Card glass>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <PartyPopper className="w-4 h-4 text-pink-400" />
                      Lời cổ vũ
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {recentCheers.map((cheer, i) => (
                      <div key={i} className="text-sm bg-white/5 rounded-lg px-3 py-2">
                        <span className="font-medium text-xs text-indigo-300">{cheer.authorName}</span>
                        <p className="text-muted-foreground mt-0.5">{cheer.message}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </FadeIn>
            )}
          </div>
        </div>

        <FadeIn delay={0.25} className="mt-6">
          <Card glass>
            <CardHeader>
              <CardTitle className="text-base">Hoạt động 365 ngày</CardTitle>
            </CardHeader>
            <CardContent>
              <ContributionHeatmap
                data={heatmap as Record<string, { hours: number; count: number; level: number }>}
              />
            </CardContent>
          </Card>
        </FadeIn>

        {!isAuthenticated && (
          <p className="text-center mt-8">
            <Link href="/login" className="text-sm text-primary hover:underline">
              Đăng nhập để theo dõi, thích và bình luận
            </Link>
          </p>
        )}
      </div>
    </PageTransition>
  );
}
