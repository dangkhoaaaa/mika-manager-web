"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Trash2, CheckCircle2 } from "lucide-react";
import { tasksApi } from "@/lib/api";
import type { GoalTask } from "@/lib/types";
import { TASK_STATUSES } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function SortableTask({
  task,
  onUpdate,
  onDelete,
}: {
  task: GoalTask;
  onUpdate: (id: string, data: Partial<GoalTask>) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const statusInfo = TASK_STATUSES.find((s) => s.value === task.status);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 p-3 rounded-lg bg-white/5 border border-white/5",
        isDragging && "opacity-50 ring-1 ring-primary"
      )}
    >
      <button
        className="cursor-grab text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-4 h-4" />
      </button>

      <button
        onClick={() =>
          onUpdate(task.id, {
            status: task.status === "task_done" ? "todo" : "task_done",
            progress: task.status === "task_done" ? 0 : 100,
          })
        }
        className={cn(
          "shrink-0",
          task.status === "task_done" ? "text-emerald-400" : "text-muted-foreground"
        )}
      >
        <CheckCircle2 className="w-5 h-5" />
      </button>

      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-sm font-medium truncate",
            task.status === "task_done" && "line-through text-muted-foreground"
          )}
        >
          {task.title}
        </p>
        <div className="flex gap-2 mt-1">
          <span className={cn("text-xs px-2 py-0.5 rounded-full", statusInfo?.color)}>
            {statusInfo?.label}
          </span>
          {task.estimatedHours > 0 && (
            <span className="text-xs text-muted-foreground">{task.estimatedHours}h</span>
          )}
        </div>
      </div>

      <select
        value={task.status}
        onChange={(e) => onUpdate(task.id, { status: e.target.value as GoalTask["status"] })}
        className="text-xs bg-white/5 border border-white/10 rounded px-2 py-1"
      >
        {TASK_STATUSES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>

      <Button variant="ghost" size="icon" onClick={() => onDelete(task.id)}>
        <Trash2 className="w-4 h-4 text-red-400" />
      </Button>
    </div>
  );
}

export function GoalTasksPanel({ goalId }: { goalId: string }) {
  const queryClient = useQueryClient();
  const [newTitle, setNewTitle] = useState("");

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["goal-tasks", goalId],
    queryFn: () => tasksApi.list(goalId),
  });

  const createMutation = useMutation({
    mutationFn: (title: string) => tasksApi.create(goalId, { title }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goal-tasks", goalId] });
      setNewTitle("");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<GoalTask> }) =>
      tasksApi.update(goalId, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goal-tasks", goalId] });
      queryClient.invalidateQueries({ queryKey: ["goal", goalId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => tasksApi.delete(goalId, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["goal-tasks", goalId] }),
  });

  const reorderMutation = useMutation({
    mutationFn: (order: string[]) => tasksApi.reorder(goalId, order),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["goal-tasks", goalId] }),
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = tasks.findIndex((t) => t.id === active.id);
    const newIndex = tasks.findIndex((t) => t.id === over.id);
    const newOrder = arrayMove(tasks, oldIndex, newIndex);
    reorderMutation.mutate(newOrder.map((t) => t.id));
  }

  const doneCount = tasks.filter((t) => t.status === "task_done").length;

  return (
    <Card glass>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <span>Tasks ({doneCount}/{tasks.length})</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input
            placeholder="Thêm task mới..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && newTitle && createMutation.mutate(newTitle)}
          />
          <Button
            onClick={() => newTitle && createMutation.mutate(newTitle)}
            disabled={!newTitle || createMutation.isPending}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-8">Đang tải...</p>
        ) : tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Chưa có task. Thêm task để theo dõi tiến độ chi tiết.
          </p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {tasks.map((task) => (
                  <SortableTask
                    key={task.id}
                    task={task}
                    onUpdate={(id, data) => updateMutation.mutate({ id, data })}
                    onDelete={(id) => deleteMutation.mutate(id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </CardContent>
    </Card>
  );
}
