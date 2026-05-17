"use client";

import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
  pointerWithin,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMemo, useRef, useState } from "react";
import type { BoardColumn, Task } from "@/lib/types";
import { randomTaskColor } from "@/lib/task-colors";
import { TaskFormModal, type TaskFormValues } from "./TaskFormModal";
import { Plus, Pencil, Trash2, GripVertical, Columns } from "lucide-react";
import clsx from "clsx";

interface KanbanBoardProps {
  columns: BoardColumn[];
  tasks: Task[];
  onColumnReorder: (items: { id: string; order: number }[]) => void;
  onColumnCreate: (label: string) => Promise<void>;
  onColumnUpdate: (id: string, label: string) => Promise<void>;
  onColumnDelete: (id: string) => Promise<void>;
  onTaskReorder: (items: { id: string; status: string; order: number }[]) => void;
  onTaskCreate: (values: TaskFormValues) => Promise<void>;
  onTaskUpdate: (id: string, patch: Partial<Task>) => Promise<void>;
  onTaskDelete: (id: string) => void;
}

export function KanbanBoard({
  columns,
  tasks,
  onColumnReorder,
  onColumnCreate,
  onColumnUpdate,
  onColumnDelete,
  onTaskReorder,
  onTaskCreate,
  onTaskUpdate,
  onTaskDelete,
}: KanbanBoardProps) {
  const sortedColumns = useMemo(
    () => [...columns].sort((a, b) => a.order - b.order),
    [columns]
  );

  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [activeColumnId, setActiveColumnId] = useState<string | null>(null);
  const [createForColumn, setCreateForColumn] = useState<string | null>(null);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [newColumnName, setNewColumnName] = useState("");
  const [addingColumn, setAddingColumn] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 6 },
    })
  );

  const tasksByColumn = useMemo(() => {
    const map: Record<string, Task[]> = {};
    for (const col of sortedColumns) {
      map[col.key] = [];
    }
    for (const t of tasks) {
      const key = t.status in map ? t.status : sortedColumns[0]?.key;
      if (key) map[key].push(t);
    }
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => a.order - b.order);
    }
    return map;
  }, [tasks, sortedColumns]);

  const activeTask = activeTaskId
    ? tasks.find((t) => t.id === activeTaskId)
    : undefined;

  const handleDragStart = (e: DragStartEvent) => {
    const id = String(e.active.id);
    if (id.startsWith("col-")) {
      setActiveColumnId(id.replace("col-", ""));
    } else {
      setActiveTaskId(id);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTaskId(null);
    setActiveColumnId(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);

    if (activeId.startsWith("col-")) {
      const colId = activeId.replace("col-", "");
      const overId = String(over.id);
      let targetId: string | null = null;
      if (overId.startsWith("col-")) {
        targetId = overId.replace("col-", "");
      } else if (overId.startsWith("drop-")) {
        const key = overId.replace("drop-", "");
        targetId = sortedColumns.find((c) => c.key === key)?.id ?? null;
      } else {
        const overTask = tasks.find((t) => t.id === overId);
        if (overTask) {
          targetId = sortedColumns.find((c) => c.key === overTask.status)?.id ?? null;
        }
      }
      if (!targetId) return;

      const order = sortedColumns.map((c) => c.id);
      const from = order.indexOf(colId);
      const to = order.indexOf(targetId);
      if (from < 0 || to < 0 || from === to) return;

      const next = [...order];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      onColumnReorder(next.map((id, i) => ({ id, order: i })));
      return;
    }

    const taskId = activeId;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    let newStatus = task.status;
    const overId = String(over.id);

    if (overId.startsWith("col-")) {
      newStatus = sortedColumns.find((c) => c.id === overId.replace("col-", ""))?.key || task.status;
    } else if (overId.startsWith("drop-")) {
      newStatus = overId.replace("drop-", "");
    } else {
      const overTask = tasks.find((t) => t.id === overId);
      if (overTask) newStatus = overTask.status;
    }

    const columnTasks = [...(tasksByColumn[newStatus] || [])].filter((t) => t.id !== taskId);
    let insertIndex = columnTasks.length;
    if (!overId.startsWith("col-") && !overId.startsWith("drop-")) {
      const idx = columnTasks.findIndex((t) => t.id === overId);
      if (idx >= 0) insertIndex = idx;
    }
    columnTasks.splice(insertIndex, 0, { ...task, status: newStatus });

    const updates: { id: string; status: string; order: number }[] = [];
    for (const col of sortedColumns) {
      const list =
        col.key === newStatus
          ? columnTasks
          : (tasksByColumn[col.key] || []).filter((t) => t.id !== taskId);
      list.forEach((t, i) => {
        updates.push({
          id: t.id,
          status: col.key === newStatus ? newStatus : t.status,
          order: i,
        });
      });
    }
    onTaskReorder(updates);
  };

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4 min-h-[480px] items-start">
          <SortableContext
            id="board-columns"
            items={sortedColumns.map((c) => `col-${c.id}`)}
            strategy={horizontalListSortingStrategy}
          >
            {sortedColumns.map((col) => (
              <SortableColumn
                key={col.id}
                column={col}
                tasks={tasksByColumn[col.key] || []}
                onAddTask={() => setCreateForColumn(col.key)}
                onEditColumn={onColumnUpdate}
                onDeleteColumn={onColumnDelete}
                canDelete={sortedColumns.length > 1}
                onTaskClick={setEditTask}
              />
            ))}
          </SortableContext>

          <div className="flex-shrink-0 w-64">
            {addingColumn ? (
              <div className="rounded-2xl border border-dashed border-white/20 bg-black/30 backdrop-blur-md p-3 space-y-2">
                <input
                  autoFocus
                  value={newColumnName}
                  onChange={(e) => setNewColumnName(e.target.value)}
                  placeholder="Column name"
                  className="w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-sm text-white"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="text-xs px-3 py-1.5 rounded-lg bg-accent-muted text-white"
                    onClick={async () => {
                      if (newColumnName.trim()) {
                        await onColumnCreate(newColumnName.trim());
                        setNewColumnName("");
                        setAddingColumn(false);
                      }
                    }}
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    className="text-xs text-zinc-400"
                    onClick={() => setAddingColumn(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAddingColumn(true)}
                className="flex items-center gap-2 w-full rounded-2xl border border-dashed border-white/20 bg-black/20 backdrop-blur-md px-4 py-3 text-sm text-zinc-400 hover:text-white hover:border-white/30 transition"
              >
                <Columns className="w-4 h-4" /> Add column
              </button>
            )}
          </div>
        </div>

        <DragOverlay>
          {activeTask ? <TaskCard task={activeTask} isDragging /> : null}
        </DragOverlay>
      </DndContext>

      {createForColumn && (
        <TaskFormModal
          mode="create"
          columns={sortedColumns}
          initial={{ status: createForColumn }}
          onClose={() => setCreateForColumn(null)}
          onSave={async (values) => {
            await onTaskCreate(values);
            setCreateForColumn(null);
          }}
        />
      )}

      {editTask && (
        <TaskFormModal
          mode="edit"
          columns={sortedColumns}
          initial={editTask}
          onClose={() => setEditTask(null)}
          onSave={async (values) => {
            await onTaskUpdate(editTask.id, values);
            setEditTask(null);
          }}
          onDelete={async () => onTaskDelete(editTask.id)}
        />
      )}
    </>
  );
}

function SortableColumn({
  column,
  tasks,
  onAddTask,
  onEditColumn,
  onDeleteColumn,
  canDelete,
  onTaskClick,
}: {
  column: BoardColumn;
  tasks: Task[];
  onAddTask: () => void;
  onEditColumn: (id: string, label: string) => Promise<void>;
  onDeleteColumn: (id: string) => Promise<void>;
  canDelete: boolean;
  onTaskClick: (task: Task) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `col-${column.id}` });

  const { setNodeRef: setDropRef } = useDroppable({ id: `drop-${column.key}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(column.label);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx(
        "flex-shrink-0 w-72 flex flex-col rounded-2xl border border-white/15 bg-black/35 backdrop-blur-xl",
        isDragging && "opacity-60 ring-2 ring-accent/40"
      )}
    >
      <div className="flex items-center gap-1 px-3 py-3 border-b border-white/10">
        <button
          type="button"
          className="text-zinc-500 hover:text-zinc-300 cursor-grab p-1"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="w-4 h-4" />
        </button>
        {editing ? (
          <input
            autoFocus
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onBlur={async () => {
              setEditing(false);
              if (label.trim() && label !== column.label) {
                await onEditColumn(column.id, label.trim());
              }
            }}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
            className="flex-1 bg-white/10 rounded px-2 py-1 text-sm text-white"
          />
        ) : (
          <h3 className="flex-1 text-sm font-medium text-white truncate">{column.label}</h3>
        )}
        <span className="text-xs text-zinc-500 bg-white/10 px-2 py-0.5 rounded-full">
          {tasks.length}
        </span>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="p-1 text-zinc-500 hover:text-white"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        {canDelete && (
          <button
            type="button"
            onClick={async () => {
              if (confirm(`Delete column "${column.label}"? Tasks move to another column.`)) {
                await onDeleteColumn(column.id);
              }
            }}
            className="p-1 text-zinc-500 hover:text-red-400"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <SortableContext
        id={column.key}
        items={tasks.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div ref={setDropRef} className="flex-1 p-2 space-y-2 min-h-[140px]">
          {tasks.map((task) => (
            <SortableTask key={task.id} task={task} onOpen={onTaskClick} />
          ))}
        </div>
      </SortableContext>

      <div className="p-2 border-t border-white/10">
        <button
          type="button"
          onClick={onAddTask}
          className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white w-full px-2 py-2 rounded-lg hover:bg-white/5"
        >
          <Plus className="w-3 h-3" /> Add task
        </button>
      </div>
    </div>
  );
}

function SortableTask({
  task,
  onOpen,
}: {
  task: Task;
  onOpen: (task: Task) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const dragListeners = {
    ...listeners,
    onPointerDown: (e: React.PointerEvent) => {
      listeners?.onPointerDown?.(e);
      pointerStart.current = { x: e.clientX, y: e.clientY };
    },
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx("touch-none", isDragging && "opacity-50")}
      {...attributes}
      {...dragListeners}
      onClick={(e) => {
        const start = pointerStart.current;
        if (!start) return;
        const dist = Math.hypot(e.clientX - start.x, e.clientY - start.y);
        if (dist < 8) onOpen(task);
        pointerStart.current = null;
      }}
    >
      <TaskCard task={task} isDragging={isDragging} />
    </div>
  );
}

function priorityBadge(priority: string) {
  const map: Record<string, string> = {
    low: "bg-zinc-500/30 text-zinc-300",
    medium: "bg-blue-500/30 text-blue-200",
    high: "bg-orange-500/30 text-orange-200",
    urgent: "bg-red-500/30 text-red-200",
  };
  return map[priority] || map.medium;
}

function TaskCard({
  task,
  isDragging,
}: {
  task: Task;
  isDragging?: boolean;
  onPointerDown?: () => void;
}) {
  const cardColor = task.color || randomTaskColor();

  return (
    <div
      className={clsx(
        "rounded-xl border border-white/10 p-3 shadow-sm cursor-grab active:cursor-grabbing select-none",
        isDragging && "ring-2 ring-white/40 rotate-1"
      )}
      style={{
        backgroundColor: `${cardColor}33`,
        borderLeftWidth: 4,
        borderLeftColor: cardColor,
      }}
    >
      <p className="text-sm text-white font-medium leading-snug">{task.title}</p>
      {task.description && (
        <p className="text-xs text-white/55 mt-1 line-clamp-2">{task.description}</p>
      )}
      <span
        className={clsx(
          "inline-block mt-2 text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded",
          priorityBadge(task.priority)
        )}
      >
        {task.priority}
      </span>
    </div>
  );
}
