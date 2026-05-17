"use client";

import { useEffect, useState } from "react";
import type { BoardColumn, Task } from "@/lib/types";
import { PRIORITY_OPTIONS, TASK_COLOR_PRESETS, randomTaskColor } from "@/lib/task-colors";
import { Button } from "@/components/ui/Button";
import { X, Trash2 } from "lucide-react";
import clsx from "clsx";

const fieldClass =
  "w-full rounded-xl bg-surface-elevated/90 border border-surface-border px-3 py-2.5 text-sm text-white";

export interface TaskFormValues {
  title: string;
  description: string;
  status: string;
  priority: string;
  color: string;
}

interface TaskFormModalProps {
  mode: "create" | "edit";
  columns: BoardColumn[];
  initial?: Partial<Task> & { status?: string };
  onClose: () => void;
  onSave: (values: TaskFormValues) => Promise<void>;
  onDelete?: () => Promise<void>;
}

export function TaskFormModal({
  mode,
  columns,
  initial,
  onClose,
  onSave,
  onDelete,
}: TaskFormModalProps) {
  const defaultStatus = initial?.status || columns[0]?.key || "backlog";
  const [title, setTitle] = useState(initial?.title || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [status, setStatus] = useState(defaultStatus);
  const [priority, setPriority] = useState(initial?.priority || "medium");
  const [color, setColor] = useState(initial?.color || randomTaskColor());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initial) {
      setTitle(initial.title || "");
      setDescription(initial.description || "");
      setStatus(initial.status || columns[0]?.key || "backlog");
      setPriority(initial.priority || "medium");
      setColor(initial.color || randomTaskColor());
    }
  }, [initial, columns]);

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await onSave({
        title: title.trim(),
        description,
        status,
        priority,
        color,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-white/15 bg-surface-card/95 backdrop-blur-xl shadow-2xl overflow-hidden"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        <div className="h-2 w-full" style={{ backgroundColor: color }} />
        <div className="p-6 space-y-4 max-h-[90vh] overflow-y-auto">
          <div className="flex items-start justify-between gap-4">
            <h2 className="text-lg font-semibold text-white">
              {mode === "create" ? "New task" : "Edit task"}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="text-zinc-500 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <label className="block">
            <span className="text-xs text-zinc-500 mb-1 block">Title *</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={fieldClass}
              autoFocus
            />
          </label>

          <label className="block">
            <span className="text-xs text-zinc-500 mb-1 block">Description</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Mô tả chi tiết..."
              className={clsx(fieldClass, "min-h-[100px] resize-y")}
            />
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="text-xs text-zinc-500 mb-1 block">Column</span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className={fieldClass}
              >
                {columns.map((c) => (
                  <option key={c.id} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-zinc-500 mb-1 block">Priority</span>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className={fieldClass}
              >
                {PRIORITY_OPTIONS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div>
            <span className="text-xs text-zinc-500 mb-2 block">Card color</span>
            <div className="flex flex-wrap gap-2 items-center">
              {TASK_COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={clsx(
                    "w-8 h-8 rounded-lg border-2 transition",
                    color === c ? "border-white scale-110" : "border-transparent"
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2 justify-between">
            {mode === "edit" && onDelete ? (
              <Button
                type="button"
                variant="danger"
                onClick={async () => {
                  if (confirm("Delete this task?")) {
                    await onDelete();
                    onClose();
                  }
                }}
              >
                <Trash2 className="w-4 h-4" /> Delete
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                disabled={saving || !title.trim()}
              >
                {saving ? "Saving..." : mode === "create" ? "Create" : "Save"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
