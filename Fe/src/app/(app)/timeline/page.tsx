"use client";

import { useQuery } from "@tanstack/react-query";
import { GitCommit, Clock } from "lucide-react";
import { analyticsApi } from "@/lib/api";
import { MOODS } from "@/lib/types";
import { PageTransition, FadeIn } from "@/components/shared/motion";
import { DashboardSkeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate, formatHours } from "@/lib/utils";

export default function TimelinePage() {
  const { data: nodes = [], isLoading } = useQuery({
    queryKey: ["git-timeline"],
    queryFn: analyticsApi.timeline,
  });

  const branches = [...new Set(nodes.map((n) => n.branch))];

  if (isLoading) return <DashboardSkeleton />;

  return (
    <PageTransition className="p-6 max-w-4xl mx-auto space-y-6">
      <FadeIn>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GitCommit className="w-6 h-6" />
            Git-style Timeline
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Lịch sử học tập theo từng session — {branches.length} nhánh mục tiêu
          </p>
        </div>
      </FadeIn>

      <FadeIn delay={0.05}>
        {nodes.length === 0 ? (
          <Card glass>
            <CardContent className="py-16 text-center text-muted-foreground">
              Chưa có session nào. Bắt đầu ghi nhận tiến độ!
            </CardContent>
          </Card>
        ) : (
          <div className="relative">
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-white/10" />
            <div className="space-y-4">
              {nodes.map((node, i) => {
                const moodEmoji = MOODS.find((m) => m.value === node.mood)?.emoji;
                return (
                  <div key={node.id} className="relative pl-14">
                    <div
                      className="absolute left-4 w-5 h-5 rounded-full border-2 border-background flex items-center justify-center"
                      style={{ backgroundColor: node.goalColor || "#6366f1" }}
                    >
                      <span className="text-[10px]">{node.goalIcon}</span>
                    </div>

                    <Card glass className="hover:border-white/20 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className="text-xs px-2 py-0.5 rounded-full"
                                style={{ backgroundColor: `${node.goalColor}20`, color: node.goalColor }}
                              >
                                {node.branch}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {formatDate(node.date)}
                              </span>
                            </div>
                            <p className="text-sm font-medium mt-2">
                              {formatHours(node.hours)} · {node.tasks} tasks {moodEmoji}
                            </p>
                            {node.notes && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {node.notes}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                            <Clock className="w-3 h-3" />
                            #{nodes.length - i}
                          </div>
                        </div>
                        {node.hasEvidence && (
                          <span className="text-xs text-emerald-400 mt-2 inline-block">📷 Evidence</span>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </FadeIn>
    </PageTransition>
  );
}
