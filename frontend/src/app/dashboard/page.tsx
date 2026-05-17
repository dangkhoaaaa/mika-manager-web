"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Project } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { ExternalLink, Plus, FolderKanban } from "lucide-react";

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", deployUrl: "" });

  const load = async () => {
    try {
      const data = await api<Project[]>("/api/projects");
      setProjects(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const createProject = async (e: React.FormEvent) => {
    e.preventDefault();
    await api<Project>("/api/projects", {
      method: "POST",
      body: JSON.stringify(form),
    });
    setForm({ name: "", description: "", deployUrl: "" });
    setShowModal(false);
    load();
  };

  return (
    <div className="p-8 max-w-6xl mx-auto min-h-full">
      <header className="flex items-end justify-between mb-10">
        <div>
          <h1 className="text-3xl font-semibold text-white">Your projects</h1>
          <p className="text-zinc-500 mt-1 text-sm">
            Track tasks, bugs, features & releases for every web app you ship.
          </p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4" /> New project
        </Button>
      </header>

      {loading ? (
        <p className="text-zinc-500">Loading...</p>
      ) : projects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-surface-border p-16 text-center">
          <FolderKanban className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
          <p className="text-zinc-400">No projects yet. Create your first one.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/dashboard/projects/${p.id}`}
              className="group rounded-2xl border border-white/15 bg-black/35 backdrop-blur-xl p-5 hover:border-accent/40 hover:shadow-glow transition"
            >
              <div
                className="w-10 h-10 rounded-xl mb-4 flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: p.color }}
              >
                {p.name[0]}
              </div>
              <h2 className="text-lg font-medium text-white group-hover:text-accent-glow transition">
                {p.name}
              </h2>
              <p className="text-xs text-zinc-500 mt-1 line-clamp-2">
                {p.description || "No description"}
              </p>
              {p.deployUrl && (
                <span className="inline-flex items-center gap-1 mt-3 text-xs text-zinc-500 truncate max-w-full">
                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                  {p.deployUrl.replace(/^https?:\/\//, "")}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <form
            onSubmit={createProject}
            className="w-full max-w-md rounded-2xl bg-surface-card/95 backdrop-blur-xl border border-white/15 p-6 space-y-4"
          >
            <h3 className="text-lg font-medium text-white">New project</h3>
            <input
              required
              placeholder="Project name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-xl bg-surface-elevated border border-surface-border px-4 py-3 text-sm text-white"
            />
            <textarea
              placeholder="Description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full rounded-xl bg-surface-elevated border border-surface-border px-4 py-3 text-sm text-white min-h-[80px]"
            />
            <input
              placeholder="Deploy URL (https://...)"
              value={form.deployUrl}
              onChange={(e) => setForm({ ...form, deployUrl: e.target.value })}
              className="w-full rounded-xl bg-surface-elevated border border-surface-border px-4 py-3 text-sm text-white"
            />
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="ghost" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button type="submit">Create</Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
