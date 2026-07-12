"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import confetti from "canvas-confetti";
import {
  ArrowLeft,
  Calendar,
  Clock,
  CheckCircle2,
  ImagePlus,
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
import { goalsApi, logsApi, uploadApi } from "@/lib/api";
import { MOODS } from "@/lib/types";
import { PageTransition, FadeIn, ProgressRing } from "@/components/shared/motion";
import { ContributionHeatmap } from "@/components/shared/heatmap";
import { DashboardSkeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn, formatHours, formatDate, daysRemaining } from "@/lib/utils";

export default function GoalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [hours, setHours] = useState("");
  const [tasks, setTasks] = useState("");
  const [notes, setNotes] = useState("");
  const [mood, setMood] = useState("good");
  const [difficulty, setDifficulty] = useState(3);
  const [evidence, setEvidence] = useState<{ url: string; name: string; type: string; publicId: string; size: number }[]>([]);
  const [uploading, setUploading] = useState(false);

  const { data: goal, isLoading } = useQuery({
    queryKey: ["goal", id],
    queryFn: () => goalsApi.get(id),
  });

  const { data: stats } = useQuery({
    queryKey: ["goal-stats", id],
    queryFn: () => goalsApi.stats(id),
    enabled: !!id,
  });

  const { data: logs = [] } = useQuery({
    queryKey: ["goal-logs", id],
    queryFn: () => logsApi.list(id),
    enabled: !!id,
  });

  const { data: heatmap = {} } = useQuery({
    queryKey: ["goal-heatmap", id],
    queryFn: () => goalsApi.heatmap(id),
    enabled: !!id,
  });

  const logMutation = useMutation({
    mutationFn: () =>
      logsApi.create(id, {
        hoursStudied: parseFloat(hours) || 0,
        tasksCompleted: parseInt(tasks) || 0,
        notes,
        mood,
        difficulty,
        evidenceImages: evidence.filter((e) => e.type === "image"),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goal", id] });
      queryClient.invalidateQueries({ queryKey: ["goal-stats", id] });
      queryClient.invalidateQueries({ queryKey: ["goal-logs", id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setHours("");
      setTasks("");
      setNotes("");
      setEvidence([]);
    },
  });

  const completeMutation = useMutation({
    mutationFn: () => goalsApi.update(id, { status: "completed" }),
    onSuccess: () => {
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
      queryClient.invalidateQueries({ queryKey: ["goal", id] });
    },
  });

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const result = await uploadApi.upload(file);
      setEvidence((prev) => [...prev, result]);
    } finally {
      setUploading(false);
    }
  }

  if (isLoading) return <DashboardSkeleton />;
  if (!goal) return null;

  const progress = stats?.progress ?? 0;
  const remaining = daysRemaining(goal.deadline);

  return (
    <PageTransition className="p-6 max-w-5xl mx-auto space-y-6">
      <FadeIn>
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại
        </button>

        <div className="flex items-start gap-6">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shrink-0"
            style={{ backgroundColor: `${goal.color}20` }}
          >
            {goal.icon}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold">{goal.title}</h1>
              <span className={cn(
                "text-xs px-2.5 py-1 rounded-full",
                goal.status === "active" ? "bg-emerald-500/20 text-emerald-400" : "bg-indigo-500/20 text-indigo-400"
              )}>
                {goal.status}
              </span>
            </div>
            {goal.description && (
              <p className="text-muted-foreground mt-1">{goal.description}</p>
            )}
            <div className="flex gap-4 mt-3 text-sm text-muted-foreground">
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
            </div>
          </div>
          {goal.status === "active" && (
            <Button
              variant="outline"
              onClick={() => completeMutation.mutate()}
              className="gap-2 shrink-0"
            >
              <CheckCircle2 className="w-4 h-4" />
              Hoàn thành
            </Button>
          )}
        </div>
      </FadeIn>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <FadeIn delay={0.05} className="lg:col-span-1">
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
                <AreaChart data={stats?.chartData || []}>
                  <defs>
                    <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={goal.color} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={goal.color} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#666" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#666" />
                  <Tooltip
                    contentStyle={{ background: "#1a1a2e", border: "1px solid #333", borderRadius: 8 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="hours"
                    stroke={goal.color}
                    fill="url(#colorHours)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </FadeIn>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FadeIn delay={0.15}>
          <Card glass>
            <CardHeader>
              <CardTitle className="text-base">Ghi nhận hôm nay</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Giờ học</Label>
                  <Input
                    type="number"
                    step="0.5"
                    placeholder="2.5"
                    className="mt-1.5"
                    value={hours}
                    onChange={(e) => setHours(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Tasks hoàn thành</Label>
                  <Input
                    type="number"
                    placeholder="5"
                    className="mt-1.5"
                    value={tasks}
                    onChange={(e) => setTasks(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label>Cảm xúc</Label>
                <div className="flex gap-2 mt-2">
                  {MOODS.map((m) => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => setMood(m.value)}
                      className={cn(
                        "flex flex-col items-center gap-1 p-2 rounded-lg transition-all text-xs",
                        mood === m.value ? "bg-primary/20 ring-1 ring-primary" : "bg-white/5 hover:bg-white/10"
                      )}
                    >
                      <span className="text-lg">{m.emoji}</span>
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label>Độ khó: {difficulty}/5</Label>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={difficulty}
                  onChange={(e) => setDifficulty(parseInt(e.target.value))}
                  className="w-full mt-2 accent-primary"
                />
              </div>

              <div>
                <Label>Ghi chú</Label>
                <textarea
                  className="mt-1.5 w-full rounded-lg border border-border bg-background/50 px-3 py-2 text-sm min-h-[60px] focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Hôm nay học được gì..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div>
                <Label>Bằng chứng</Label>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {evidence.map((e, i) => (
                    <img key={i} src={e.url} alt={e.name} className="w-16 h-16 rounded-lg object-cover" />
                  ))}
                  <label className="w-16 h-16 rounded-lg border border-dashed border-white/20 flex items-center justify-center cursor-pointer hover:bg-white/5 transition-colors">
                    <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
                    {uploading ? (
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <ImagePlus className="w-5 h-5 text-muted-foreground" />
                    )}
                  </label>
                </div>
              </div>

              <Button
                onClick={() => logMutation.mutate()}
                disabled={logMutation.isPending || !hours}
                className="w-full"
              >
                {logMutation.isPending ? "Đang lưu..." : "Lưu tiến độ hôm nay"}
              </Button>
            </CardContent>
          </Card>
        </FadeIn>

        <FadeIn delay={0.2}>
          <Card glass>
            <CardHeader>
              <CardTitle className="text-base">Nhật ký học tập</CardTitle>
            </CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Chưa có nhật ký nào
                </p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {logs.map((log) => (
                    <div key={log.id} className="p-3 rounded-lg bg-white/5 border border-white/5">
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
                        <p className="text-xs text-muted-foreground mt-2">{log.notes}</p>
                      )}
                      {log.evidenceImages?.length > 0 && (
                        <div className="flex gap-1.5 mt-2">
                          {log.evidenceImages.map((img, i) => (
                            <img key={i} src={img.url} alt="" className="w-10 h-10 rounded object-cover" />
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
      </div>

      <FadeIn delay={0.25}>
        <Card glass>
          <CardHeader>
            <CardTitle className="text-base">Heatmap</CardTitle>
          </CardHeader>
          <CardContent>
            <ContributionHeatmap data={heatmap as Record<string, { hours: number; count: number; level: number }>} />
          </CardContent>
        </Card>
      </FadeIn>
    </PageTransition>
  );
}
