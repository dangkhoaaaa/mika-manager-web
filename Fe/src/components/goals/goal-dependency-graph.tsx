"use client";

import { useQuery } from "@tanstack/react-query";
import { GitBranch, Lock } from "lucide-react";
import { tasksApi } from "@/lib/api";
import { TASK_STATUSES } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function GoalDependencyGraph({ goalId }: { goalId: string }) {
  const { data: nodes = [], isLoading } = useQuery({
    queryKey: ["goal-deps", goalId],
    queryFn: () => tasksApi.dependencies(goalId),
  });

  const nodeMap = Object.fromEntries(nodes.map((n) => [n.id, n]));

  return (
    <Card glass>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <GitBranch className="w-4 h-4" />
          Dependency Graph
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-8">Đang tải...</p>
        ) : nodes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Chưa có dependency. Thêm dependsOn khi tạo task.
          </p>
        ) : (
          <div className="space-y-3">
            {nodes.map((node, i) => {
              const statusInfo = TASK_STATUSES.find((s) => s.value === node.status);
              return (
                <div key={node.id} className="relative">
                  {i > 0 && (
                    <div className="absolute -top-3 left-6 w-0.5 h-3 bg-white/20" />
                  )}
                  <div
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg border",
                      node.blocked
                        ? "border-red-500/30 bg-red-500/5"
                        : "border-white/10 bg-white/5"
                    )}
                  >
                    <div
                      className={cn(
                        "w-3 h-3 rounded-full mt-1.5 shrink-0",
                        node.status === "task_done"
                          ? "bg-emerald-400"
                          : node.blocked
                          ? "bg-red-400"
                          : "bg-primary"
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{node.title}</p>
                        {node.blocked && <Lock className="w-3.5 h-3.5 text-red-400" />}
                      </div>
                      <div className="flex gap-2 mt-1 flex-wrap">
                        <span className={cn("text-xs px-2 py-0.5 rounded-full", statusInfo?.color)}>
                          {statusInfo?.label}
                        </span>
                        <span className="text-xs text-muted-foreground">{node.progress}%</span>
                      </div>
                      {node.dependsOn.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Phụ thuộc:{" "}
                          {node.dependsOn
                            .map((id) => nodeMap[id]?.title || id.slice(-6))
                            .join(" → ")}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
