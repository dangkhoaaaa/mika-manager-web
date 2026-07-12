"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Users, Search, Sparkles, UserPlus } from "lucide-react";
import { searchApi } from "@/lib/api";
import { PageTransition, FadeIn } from "@/components/shared/motion";
import { FollowButton } from "@/components/social/follow-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatHours } from "@/lib/utils";

function UserCard({
  userId,
  username,
  name,
  bio,
  totalHours,
  currentStreak,
}: {
  userId: string;
  username?: string;
  name?: string;
  bio?: string;
  totalHours?: number;
  currentStreak?: number;
}) {
  if (!username) return null;

  return (
    <Card glass className="hover:border-primary/30 transition-colors">
      <CardContent className="p-4 flex items-center gap-4">
        <Link href={`/u/${username}`}>
          <Avatar className="hover:ring-2 hover:ring-primary/50 transition-all">
            <AvatarFallback className="bg-primary/20 text-primary">
              {username[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Link>
        <Link href={`/u/${username}`} className="flex-1 min-w-0">
          <p className="font-medium">{name || username}</p>
          <p className="text-sm text-muted-foreground">@{username}</p>
          {bio && <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{bio}</p>}
          <p className="text-xs text-muted-foreground mt-1">
            {formatHours(totalHours || 0)} · Streak {currentStreak || 0} ngày
          </p>
        </Link>
        <FollowButton userId={userId} isFollowing={false} />
      </CardContent>
    </Card>
  );
}

export default function ExplorePage() {
  const [query, setQuery] = useState("");

  const { data: suggested = [], isLoading: loadingSuggested } = useQuery({
    queryKey: ["suggested-users"],
    queryFn: searchApi.suggested,
  });

  const { data, isFetching } = useQuery({
    queryKey: ["explore-users", query],
    queryFn: () => searchApi.search(query),
    enabled: query.length >= 1,
  });

  const showSearch = query.length >= 1;

  return (
    <PageTransition className="p-6 max-w-3xl mx-auto space-y-6">
      <FadeIn>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6" />
            Khám phá
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Tìm và theo dõi hành trình học tập của người khác
          </p>
        </div>
      </FadeIn>

      <FadeIn delay={0.05}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Tìm theo username hoặc tên..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </FadeIn>

      {showSearch ? (
        <FadeIn delay={0.1}>
          {isFetching ? (
            <p className="text-sm text-muted-foreground text-center py-8">Đang tìm...</p>
          ) : (data?.users || []).length === 0 ? (
            <Card glass>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                Không tìm thấy người dùng &quot;{query}&quot;
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {data?.users.map((u) => (
                <UserCard
                  key={u.userId}
                  userId={u.userId}
                  username={u.username}
                  bio={u.bio}
                  totalHours={u.totalHours}
                  currentStreak={u.currentStreak}
                />
              ))}
            </div>
          )}
        </FadeIn>
      ) : (
        <FadeIn delay={0.1}>
          <Card glass>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Đề xuất bạn bè
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingSuggested ? (
                <p className="text-sm text-muted-foreground text-center py-8">Đang tải...</p>
              ) : suggested.length === 0 ? (
                <div className="text-center py-8 space-y-2">
                  <UserPlus className="w-8 h-8 text-muted-foreground mx-auto" />
                  <p className="text-sm text-muted-foreground">
                    Chưa có người dùng khác. Mời bạn bè đăng ký!
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {suggested.map((u) => (
                    <UserCard
                      key={u.userId}
                      userId={u.userId}
                      username={u.username}
                      name={u.name}
                      bio={u.bio}
                      totalHours={u.totalHours}
                      currentStreak={u.currentStreak}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </FadeIn>
      )}
    </PageTransition>
  );
}
