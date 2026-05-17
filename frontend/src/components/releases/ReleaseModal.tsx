"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import type { VersionRelease } from "@/lib/types";
import { Rocket, X } from "lucide-react";

const fieldClass =
  "w-full rounded-xl bg-surface-elevated/90 border border-surface-border px-4 py-2.5 text-sm text-white placeholder:text-zinc-500";

export interface ReleaseFormValues {
  version: string;
  title: string;
  summary: string;
  features: string[];
  fixes: string[];
  isPublished: boolean;
}

interface ReleaseModalProps {
  mode?: "create" | "edit";
  initial?: VersionRelease;
  onClose: () => void;
  onSubmit: (values: ReleaseFormValues) => Promise<void>;
}

export function ReleaseModal({
  mode = "create",
  initial,
  onClose,
  onSubmit,
}: ReleaseModalProps) {
  const [version, setVersion] = useState("");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [features, setFeatures] = useState("");
  const [fixes, setFixes] = useState("");
  const [isPublished, setIsPublished] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!initial) return;
    setVersion(initial.version);
    setTitle(initial.title);
    setSummary(initial.summary);
    setFeatures((initial.features || []).join("\n"));
    setFixes((initial.fixes || []).join("\n"));
    setIsPublished(initial.isPublished);
  }, [initial]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!version.trim()) return;
    setSaving(true);
    try {
      await onSubmit({
        version: version.trim(),
        title,
        summary,
        features: features.split("\n").map((s) => s.trim()).filter(Boolean),
        fixes: fixes.split("\n").map((s) => s.trim()).filter(Boolean),
        isPublished,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const isEdit = mode === "edit";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg rounded-2xl border border-white/15 bg-surface-card/95 backdrop-blur-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-2 w-full bg-gradient-to-r from-accent-muted to-accent" />
        <div className="p-6 space-y-4 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Rocket className="w-5 h-5 text-accent-glow" />
              <h2 className="text-lg font-semibold text-white">
                {isEdit ? "Edit release" : "New release"}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-zinc-500 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <label className="block">
            <span className="text-xs text-zinc-500 mb-1 block">Version *</span>
            <input
              required
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="1.2.0"
              className={fieldClass}
            />
          </label>

          <label className="block">
            <span className="text-xs text-zinc-500 mb-1 block">Title</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Spring update"
              className={fieldClass}
            />
          </label>

          <label className="block">
            <span className="text-xs text-zinc-500 mb-1 block">Summary</span>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={2}
              className={fieldClass}
            />
          </label>

          <label className="block">
            <span className="text-xs text-zinc-500 mb-1 block">
              Features (one per line)
            </span>
            <textarea
              value={features}
              onChange={(e) => setFeatures(e.target.value)}
              rows={4}
              className={fieldClass}
            />
          </label>

          <label className="block">
            <span className="text-xs text-zinc-500 mb-1 block">
              Fixes (one per line)
            </span>
            <textarea
              value={fixes}
              onChange={(e) => setFixes(e.target.value)}
              rows={3}
              className={fieldClass}
            />
          </label>

          <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer">
            <input
              type="checkbox"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
              className="rounded border-surface-border"
            />
            Publish to public changelog API
          </label>

          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving
                ? isEdit
                  ? "Saving..."
                  : "Publishing..."
                : isEdit
                  ? "Save changes"
                  : "Publish release"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
