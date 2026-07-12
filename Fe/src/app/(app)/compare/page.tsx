"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Swords, Share2, Copy, Check } from "lucide-react";
import { compareApi, goalsApi, searchApi } from "@/lib/api";
import type { CompareStats } from "@/lib/types";
import { PageTransition, FadeIn } from "@/components/shared/motion";
import { ContributionHeatmap } from "@/components/shared/heatmap";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn, formatHours } from "@/lib/utils";

const RANGES = [
  { value: "today", label: "Hôm nay" },
  { value: "week", label: "Tuần" },
  { value: "month", label: "Tháng" },
  { value: "year", label: "Năm" },
];

function CompareSide({ stats, label }: { stats: CompareStats; label: string }) {
  return (
    <div className="space-y-4">
      <div className="text-center">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="font-bold text-lg">{stats.userName}</p>
        {stats.goalTitle && (
          <p className="text-sm text-muted-foreground">
            {stats.goalIcon} {stats.goalTitle}
          </p>
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
        <div className="p-3 rounded-lg bg-white/5 text-center">
          <p className="text-xs text-muted-foreground">Tasks</p>
          <p className="font-bold">{stats.totalTasks}</p>
        </div>
        <div className="p-3 rounded-lg bg-white/5 text-center">
          <p className="text-xs text-muted-foreground">Tiến độ</p>
          <p className="font-bold">{stats.goalProgress?.toFixed(0) || 0}%</p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={120}>
        <BarChart data={stats.dailyHours || []}>
          <XAxis dataKey="date" tick={{ fontSize: 9 }} stroke="#666" hide />
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

export default function ComparePage() {
  const [userQuery, setUserQuery] = useState("");
  const [selectedUserB, setSelectedUserB] = useState<{ id: string; name: string } | null>(null);
  const [goalAId, setGoalAId] = useState("");
  const [goalBId, setGoalBId] = useState("");
  const [range, setRange] = useState("week");
  const [shareId, setShareId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: myGoals = [] } = useQuery({
    queryKey: ["my-goals"],
    queryFn: () => goalsApi.list(),
  });

  const { data: searchResult } = useQuery({
    queryKey: ["compare-search", userQuery],
    queryFn: () => searchApi.search(userQuery),
    enabled: userQuery.length >= 1,
  });

  const { data: compareResult, refetch, isFetching } = useQuery({
    queryKey: ["compare", selectedUserB?.id, goalAId, goalBId, range],
    queryFn: () =>
      compareApi.compare({
        userBId: selectedUserB!.id,
        goalAId: goalAId || undefined,
        goalBId: goalBId || undefined,
        range,
      }),
    enabled: !!selectedUserB,
  });

  const shareMutation = useMutation({
    mutationFn: () =>
      compareApi.share({
        userBId: selectedUserB!.id,
        goalAId: goalAId || undefined,
        goalBId: goalBId || undefined,
        range,
      }),
    onSuccess: (data) => setShareId(data.shareId),
  });

  function copyShareLink() {
    if (!shareId) return;
    const url = `${window.location.origin}/compare/${shareId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <PageTransition className="p-6 max-w-5xl mx-auto space-y-6">
      <FadeIn>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Swords className="w-6 h-6" />
            Competitive Mode
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            So sánh tiến độ với người khác — goals khác nhau cũng được
          </p>
        </div>
      </FadeIn>

      <FadeIn delay={0.05}>
        <Card glass>
          <CardHeader>
            <CardTitle className="text-base">Thiết lập so sánh</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Mục tiêu của bạn</Label>
                <select
                  value={goalAId}
                  onChange={(e) => setGoalAId(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-border bg-background/50 px-3 py-2 text-sm"
                >
                  <option value="">Tất cả goals</option>
                  {myGoals.map((g) => (
                    <option key={g.id} value={g.id}>{g.icon} {g.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Tìm đối thủ</Label>
                <Input
                  placeholder="Tên hoặc username..."
                  value={userQuery}
                  onChange={(e) => setUserQuery(e.target.value)}
                  className="mt-1.5"
                />
                {searchResult?.users && searchResult.users.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {searchResult.users.slice(0, 5).map((u) => (
                      <button
                        key={u.userId}
                        onClick={() => {
                          setSelectedUserB({ id: u.userId, name: u.username || u.userId });
                          setUserQuery(u.username || "");
                        }}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-white/10",
                          selectedUserB?.id === u.userId && "bg-primary/20"
                        )}
                      >
                        @{u.username}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {selectedUserB && (
              <div>
                <Label>Goal đối thủ (tùy chọn)</Label>
                <select
                  value={goalBId}
                  onChange={(e) => setGoalBId(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-border bg-background/50 px-3 py-2 text-sm"
                >
                  <option value="">Tất cả goals</option>
                  {searchResult?.goals
                    ?.filter((g) => g.userId === selectedUserB.id)
                    .map((g) => (
                      <option key={g.id} value={g.id}>{g.icon} {g.title}</option>
                    ))}
                </select>
              </div>
            )}

            <div className="flex gap-1 bg-white/5 rounded-lg p-1 w-fit">
              {RANGES.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setRange(r.value)}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-sm transition-all",
                    range === r.value ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <Button onClick={() => refetch()} disabled={!selectedUserB || isFetching}>
                {isFetching ? "Đang so sánh..." : "So sánh"}
              </Button>
              {compareResult && (
                <Button variant="outline" onClick={() => shareMutation.mutate()} className="gap-2">
                  <Share2 className="w-4 h-4" />
                  Chia sẻ
                </Button>
              )}
            </div>

            {shareId && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-white/5">
                <code className="text-xs flex-1">/compare/{shareId}</code>
                <Button size="sm" variant="ghost" onClick={copyShareLink}>
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </FadeIn>

      {compareResult && (
        <FadeIn delay={0.1}>
          <Card glass>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <CompareSide stats={compareResult.userA} label="Bạn" />
                <div className="hidden md:block w-px bg-white/10 absolute left-1/2" />
                <CompareSide stats={compareResult.userB} label="Đối thủ" />
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      )}
    </PageTransition>
  );
}
