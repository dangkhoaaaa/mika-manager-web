"use client";

import { useForm } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { User, Save } from "lucide-react";
import { profileApi } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { PageTransition, FadeIn } from "@/components/shared/motion";
import { DashboardSkeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials, formatHours } from "@/lib/utils";

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const { user, setProfile } = useAuthStore();

  const { data, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: profileApi.getMe,
  });

  const { register, handleSubmit } = useForm({
    values: {
      name: data?.user.name || "",
      username: data?.profile.username || "",
      bio: data?.profile.bio || "",
    },
  });

  const mutation = useMutation({
    mutationFn: profileApi.update,
    onSuccess: (result) => {
      setProfile(result.profile);
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });

  if (isLoading) return <DashboardSkeleton />;

  const profile = data?.profile;

  return (
    <PageTransition className="p-6 max-w-3xl mx-auto space-y-6">
      <FadeIn>
        <div className="relative rounded-2xl overflow-hidden glass h-40">
          {profile?.banner ? (
            <img src={profile.banner} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-indigo-600/30 to-purple-600/30" />
          )}
          <div className="absolute bottom-4 left-6 flex items-end gap-4">
            <Avatar className="w-20 h-20 border-4 border-background">
              <AvatarImage src={profile?.avatar} />
              <AvatarFallback className="text-xl bg-indigo-500/20">
                {user ? getInitials(user.name) : "?"}
              </AvatarFallback>
            </Avatar>
            <div className="mb-1">
              <h1 className="text-xl font-bold">{user?.name}</h1>
              {profile?.username && (
                <p className="text-sm text-muted-foreground">@{profile.username}</p>
              )}
            </div>
          </div>
        </div>
      </FadeIn>

      <FadeIn delay={0.05}>
        {profile?.username && (
          <Card glass className="mb-4">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Hồ sơ công khai</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Chia sẻ hành trình học tập của bạn
                </p>
              </div>
              <Link
                href={`/u/${profile.username}`}
                className="text-sm text-primary hover:underline"
              >
                /u/{profile.username} →
              </Link>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Tổng giờ", value: formatHours(profile?.totalHours || 0) },
            { label: "Streak", value: `${profile?.currentStreak || 0} ngày` },
            { label: "Followers", value: profile?.followersCount || 0 },
            { label: "Following", value: profile?.followingCount || 0 },
          ].map((stat) => (
            <Card key={stat.label} glass>
              <CardContent className="p-4 text-center">
                <p className="text-lg font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </FadeIn>

      <FadeIn delay={0.1}>
        <Card glass>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="w-4 h-4" />
              Chỉnh sửa hồ sơ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleSubmit((d) => mutation.mutate(d))}
              className="space-y-4"
            >
              <div>
                <Label htmlFor="name">Họ tên</Label>
                <Input id="name" className="mt-1.5" {...register("name")} />
              </div>
              <div>
                <Label htmlFor="username">Username</Label>
                <Input id="username" placeholder="username" className="mt-1.5" {...register("username")} />
              </div>
              <div>
                <Label htmlFor="bio">Bio</Label>
                <textarea
                  id="bio"
                  className="mt-1.5 w-full rounded-lg border border-border bg-background/50 px-3 py-2 text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Giới thiệu về bạn..."
                  {...register("bio")}
                />
              </div>
              <Button type="submit" disabled={mutation.isPending} className="gap-2">
                <Save className="w-4 h-4" />
                {mutation.isPending ? "Đang lưu..." : "Lưu thay đổi"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </FadeIn>
    </PageTransition>
  );
}
