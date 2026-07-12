"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Target } from "lucide-react";
import { goalsApi } from "@/lib/api";
import type { Goal } from "@/lib/types";
import { PageTransition, FadeIn } from "@/components/shared/motion";
import { EmptyState } from "@/components/shared/stat-card";
import { GoalCardSkeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn, formatHours, getProgressPercent, daysRemaining } from "@/lib/utils";

function SortableGoalCard({ goal }: { goal: Goal }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: goal.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const progress = getProgressPercent(goal.totalHours, goal.targetHours);
  const remaining = daysRemaining(goal.deadline);

  return (
    <div ref={setNodeRef} style={style}>
      <Link href={`/goals/${goal.id}`}>
        <Card
          glass
          className={cn(
            "group hover:border-primary/40 transition-all duration-300 cursor-pointer",
            isDragging && "opacity-50 scale-[1.02] shadow-2xl"
          )}
        >
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <button
                {...attributes}
                {...listeners}
                className="mt-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
                onClick={(e) => e.preventDefault()}
              >
                <GripVertical className="w-4 h-4 text-muted-foreground" />
              </button>

              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                style={{ backgroundColor: `${goal.color}20` }}
              >
                {goal.icon}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold truncate">{goal.title}</h3>
                  <span
                    className={cn(
                      "text-xs px-2 py-0.5 rounded-full",
                      goal.status === "active" && "bg-emerald-500/20 text-emerald-400",
                      goal.status === "completed" && "bg-indigo-500/20 text-indigo-400",
                      goal.status === "paused" && "bg-yellow-500/20 text-yellow-400"
                    )}
                  >
                    {goal.status}
                  </span>
                </div>

                {goal.description && (
                  <p className="text-xs text-muted-foreground line-clamp-1 mb-3">
                    {goal.description}
                  </p>
                )}

                <Progress value={progress} className="mb-2" indicatorClassName={`bg-[${goal.color}]`} />

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{formatHours(goal.totalHours)} / {goal.targetHours}h</span>
                  {remaining !== null && <span>{remaining} ngày còn lại</span>}
                </div>

                {goal.tags.length > 0 && (
                  <div className="flex gap-1.5 mt-2 flex-wrap">
                    {goal.tags.map((tag) => (
                      <span key={tag} className="text-xs bg-white/5 px-2 py-0.5 rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}

export default function GoalsPage() {
  const queryClient = useQueryClient();
  const router = useRouter();

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ["goals"],
    queryFn: () => goalsApi.list(),
  });

  const reorderMutation = useMutation({
    mutationFn: (order: string[]) => goalsApi.reorder(order),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["goals"] }),
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = goals.findIndex((g) => g.id === active.id);
    const newIndex = goals.findIndex((g) => g.id === over.id);
    const reordered = arrayMove(goals, oldIndex, newIndex);
    reorderMutation.mutate(reordered.map((g) => g.id));
  }

  return (
    <PageTransition className="p-6 max-w-4xl mx-auto">
      <FadeIn>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Mục tiêu</h1>
            <p className="text-muted-foreground text-sm">{goals.length} mục tiêu</p>
          </div>
          <Button onClick={() => router.push("/goals/new")} className="gap-2">
            <Plus className="w-4 h-4" />
            Tạo mục tiêu
          </Button>
        </div>
      </FadeIn>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <GoalCardSkeleton key={i} />
          ))}
        </div>
      ) : goals.length === 0 ? (
        <EmptyState
          icon={<Target className="w-8 h-8 text-muted-foreground" />}
          title="Chưa có mục tiêu nào"
          description="Tạo mục tiêu học tập đầu tiên và bắt đầu hành trình của bạn"
          action={
            <Button onClick={() => router.push("/goals/new")} className="gap-2">
              <Plus className="w-4 h-4" />
              Tạo mục tiêu đầu tiên
            </Button>
          }
        />
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={goals.map((g) => g.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {goals.map((goal) => (
                <SortableGoalCard key={goal.id} goal={goal} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </PageTransition>
  );
}
