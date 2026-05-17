"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api, API_URL } from "@/lib/api";
import type {
  Project,
  BoardColumn,
  Task,
  BugReport,
  FeatureRequest,
  VersionRelease,
} from "@/lib/types";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import type { TaskFormValues } from "@/components/kanban/TaskFormModal";
import { ReleaseModal } from "@/components/releases/ReleaseModal";
import { Button } from "@/components/ui/Button";
import {
  ArrowLeft,
  Bug,
  Copy,
  Lightbulb,
  RefreshCw,
  Pencil,
  Rocket,
  Settings,
  Trash2,
} from "lucide-react";
import clsx from "clsx";

type Tab = "board" | "bugs" | "features" | "releases" | "api";

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const [project, setProject] = useState<Project | null>(null);
  const [columns, setColumns] = useState<BoardColumn[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [bugs, setBugs] = useState<BugReport[]>([]);
  const [features, setFeatures] = useState<FeatureRequest[]>([]);
  const [releases, setReleases] = useState<VersionRelease[]>([]);
  const [tab, setTab] = useState<Tab>("board");
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    const [p, cols, t, b, f, r] = await Promise.all([
      api<Project>(`/api/projects/${id}`),
      api<BoardColumn[]>(`/api/projects/${id}/columns`),
      api<Task[]>(`/api/projects/${id}/tasks`),
      api<BugReport[]>(`/api/projects/${id}/bugs`),
      api<FeatureRequest[]>(`/api/projects/${id}/features`),
      api<VersionRelease[]>(`/api/projects/${id}/releases`),
    ]);
    setProject(p);
    setColumns(cols);
    setTasks(t);
    setBugs(b);
    setFeatures(f);
    setReleases(r);
  }, [id]);

  useEffect(() => {
    load().catch(console.error);
  }, [load]);

  useEffect(() => {
    const t = searchParams.get("tab");
    if (t === "bugs" || t === "features" || t === "board" || t === "releases" || t === "api") {
      setTab(t);
    }
  }, [searchParams]);

  if (!project) {
    return <p className="p-8 text-zinc-500">Loading project...</p>;
  }

  const copyKey = () => {
    navigator.clipboard.writeText(project.apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-8 min-h-full">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-white mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-white flex items-center gap-3">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: project.color }}
            />
            {project.name}
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            slug: <code className="text-accent/80">{project.slug}</code>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => load()}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <div className="flex gap-2 flex-wrap border-b border-surface-border mb-6">
        {(
          [
            ["board", "Kanban", null],
            ["bugs", "Bugs", bugs.length],
            ["features", "Features", features.length],
            ["releases", "Releases", releases.length],
            ["api", "Public API", null],
          ] as const
        ).map(([key, label, count]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={clsx(
              "px-4 py-2 text-sm rounded-t-lg border-b-2 -mb-px transition",
              tab === key
                ? "border-accent text-white"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            )}
          >
            {label}
            {count != null && count > 0 && (
              <span className="ml-1.5 text-xs bg-white/10 px-1.5 py-0.5 rounded-full">
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "board" && (
        <KanbanBoard
          columns={columns}
          tasks={tasks}
          onColumnReorder={async (items) => {
            const updated = await api<BoardColumn[]>(
              `/api/projects/${id}/columns/reorder`,
              { method: "PATCH", body: JSON.stringify(items) }
            );
            setColumns(updated);
          }}
          onColumnCreate={async (label) => {
            const col = await api<BoardColumn>(`/api/projects/${id}/columns`, {
              method: "POST",
              body: JSON.stringify({ label }),
            });
            setColumns((prev) => [...prev, col]);
          }}
          onColumnUpdate={async (columnId, label) => {
            const col = await api<BoardColumn>(
              `/api/projects/${id}/columns/${columnId}`,
              { method: "PATCH", body: JSON.stringify({ label }) }
            );
            setColumns((prev) => prev.map((c) => (c.id === columnId ? col : c)));
          }}
          onColumnDelete={async (columnId) => {
            await api(`/api/projects/${id}/columns/${columnId}`, {
              method: "DELETE",
            });
            load();
          }}
          onTaskReorder={async (items) => {
            const updated = await api<Task[]>(
              `/api/projects/${id}/tasks/reorder`,
              { method: "PATCH", body: JSON.stringify(items) }
            );
            setTasks(updated);
          }}
          onTaskCreate={async (values: TaskFormValues) => {
            await api(`/api/projects/${id}/tasks`, {
              method: "POST",
              body: JSON.stringify(values),
            });
            load();
          }}
          onTaskUpdate={async (taskId, patch) => {
            const updated = await api<Task>(`/api/projects/${id}/tasks/${taskId}`, {
              method: "PATCH",
              body: JSON.stringify(patch),
            });
            setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
          }}
          onTaskDelete={async (taskId) => {
            await api(`/api/projects/${id}/tasks/${taskId}`, { method: "DELETE" });
            load();
          }}
        />
      )}

      {tab === "bugs" && (
        <ReportList
          icon={<Bug className="w-4 h-4 text-red-400" />}
          empty="No bug reports yet"
          items={bugs.map((b) => ({
            id: b.id,
            title: b.title,
            meta: `${b.severity} · ${b.status} · ${b.reporterEmail || "anonymous"}`,
            sub: b.pageUrl,
          }))}
          onStatus={async (bugId, status) => {
            await api(`/api/projects/${id}/bugs/${bugId}`, {
              method: "PATCH",
              body: JSON.stringify({ status }),
            });
            load();
          }}
          statuses={["open", "acknowledged", "in_progress", "resolved", "closed"]}
        />
      )}

      {tab === "features" && (
        <ReportList
          icon={<Lightbulb className="w-4 h-4 text-amber-400" />}
          empty="No feature requests yet"
          items={features.map((f) => ({
            id: f.id,
            title: f.title,
            meta: `${f.status} · ${f.reporterEmail || "anonymous"}`,
            sub: f.description,
          }))}
          onStatus={async (fid, status) => {
            await api(`/api/projects/${id}/features/${fid}`, {
              method: "PATCH",
              body: JSON.stringify({ status }),
            });
            load();
          }}
          statuses={[
            "submitted",
            "under_review",
            "planned",
            "in_progress",
            "shipped",
            "declined",
          ]}
        />
      )}

      {tab === "releases" && (
        <ReleasesPanel projectId={id} releases={releases} onRefresh={load} />
      )}

      {tab === "api" && (
        <ApiDocsPanel
          project={project}
          apiUrl={API_URL}
          copied={copied}
          onCopy={copyKey}
          onRegenerate={async () => {
            const res = await api<{ apiKey: string }>(
              `/api/projects/${id}/regenerate-key`,
              { method: "POST" }
            );
            setProject({ ...project, apiKey: res.apiKey });
          }}
        />
      )}
    </div>
  );
}

function ReportList({
  icon,
  empty,
  items,
  onStatus,
  statuses,
}: {
  icon: React.ReactNode;
  empty: string;
  items: { id: string; title: string; meta: string; sub?: string }[];
  onStatus: (id: string, status: string) => void;
  statuses: string[];
}) {
  if (items.length === 0) {
    return <p className="text-zinc-500">{empty}</p>;
  }
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li
          key={item.id}
          className="rounded-xl border border-surface-border bg-surface-card p-4 flex gap-4"
        >
          <div className="mt-1">{icon}</div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-white">{item.title}</p>
            <p className="text-xs text-zinc-500 mt-1">{item.meta}</p>
            {item.sub && (
              <p className="text-sm text-zinc-400 mt-2 line-clamp-2">{item.sub}</p>
            )}
          </div>
          <select
            className="text-xs rounded-lg bg-surface-elevated border border-surface-border px-2 py-1 text-zinc-300"
            onChange={(e) => onStatus(item.id, e.target.value)}
            defaultValue=""
          >
            <option value="" disabled>
              Update status
            </option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </li>
      ))}
    </ul>
  );
}

function ReleasesPanel({
  projectId,
  releases,
  onRefresh,
}: {
  projectId: string;
  releases: VersionRelease[];
  onRefresh: () => void;
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<VersionRelease | null>(null);

  const handleDelete = async (release: VersionRelease) => {
    if (!confirm(`Delete release v${release.version}?`)) return;
    await api(`/api/projects/${projectId}/releases/${release.id}`, {
      method: "DELETE",
    });
    onRefresh();
  };

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button onClick={() => setShowCreate(true)}>
          <Rocket className="w-4 h-4" /> New release
        </Button>
      </div>
      {releases.length === 0 ? (
        <p className="text-zinc-500">No releases yet.</p>
      ) : (
        <div className="space-y-4">
          {releases.map((r) => (
            <article
              key={r.id}
              className="rounded-xl border border-white/15 bg-black/35 backdrop-blur-xl p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-lg font-mono text-accent-glow">v{r.version}</span>
                  {r.isPublished && (
                    <span className="text-[10px] uppercase bg-green-500/20 text-green-400 px-2 py-0.5 rounded">
                      published
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setEditing(r)}
                    className="p-2 text-zinc-500 hover:text-white rounded-lg hover:bg-white/10 transition"
                    title="Edit release"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(r)}
                    className="p-2 text-zinc-500 hover:text-red-400 rounded-lg hover:bg-white/10 transition"
                    title="Delete release"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <h3 className="text-white font-medium mt-2">{r.title}</h3>
              <p className="text-sm text-zinc-400 mt-1">{r.summary}</p>
              {r.features?.length > 0 && (
                <ul className="mt-3 text-sm text-zinc-300 list-disc pl-5 space-y-1">
                  {r.features.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              )}
              {r.fixes?.length > 0 && (
                <ul className="mt-3 text-sm text-zinc-400 list-disc pl-5 space-y-1">
                  {r.fixes.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              )}
            </article>
          ))}
        </div>
      )}

      {showCreate && (
        <ReleaseModal
          mode="create"
          onClose={() => setShowCreate(false)}
          onSubmit={async (values) => {
            await api(`/api/projects/${projectId}/releases`, {
              method: "POST",
              body: JSON.stringify(values),
            });
            onRefresh();
          }}
        />
      )}

      {editing && (
        <ReleaseModal
          mode="edit"
          initial={editing}
          onClose={() => setEditing(null)}
          onSubmit={async (values) => {
            await api(`/api/projects/${projectId}/releases/${editing.id}`, {
              method: "PATCH",
              body: JSON.stringify(values),
            });
            onRefresh();
          }}
        />
      )}
    </div>
  );
}

function ApiDocsPanel({
  project,
  apiUrl,
  copied,
  onCopy,
  onRegenerate,
}: {
  project: Project;
  apiUrl: string;
  copied: boolean;
  onCopy: () => void;
  onRegenerate: () => void;
}) {
  const base = `${apiUrl}/api/public/${project.slug}`;
  const snippets = [
    {
      title: "Report bug (from Web A)",
      code: `fetch("${base}/bugs", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-API-Key": "${project.apiKey}"
  },
  body: JSON.stringify({
    title: "Button broken on checkout",
    description: "Clicking Pay does nothing",
    pageUrl: window.location.href,
    reporterEmail: "user@example.com",
    severity: "high"
  })
})`,
    },
    {
      title: "Request feature",
      code: `fetch("${base}/features", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-API-Key": "${project.apiKey}"
  },
  body: JSON.stringify({
    title: "Dark mode",
    description: "Please add dark theme for night usage",
    reporterName: "Alex"
  })
})`,
    },
    {
      title: "Show changelog to users (latest)",
      code: `const res = await fetch("${base}/changelog?latest=true");
const { releases } = await res.json();
// releases[0] → version, features, fixes, summary`,
    },
  ];

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="rounded-xl border border-surface-border bg-surface-card p-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-sm text-zinc-400">API Key</p>
            <code className="text-xs text-accent-glow break-all">{project.apiKey}</code>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onCopy}>
              <Copy className="w-4 h-4" />
              {copied ? "Copied!" : "Copy"}
            </Button>
            <Button variant="ghost" onClick={onRegenerate}>
              <Settings className="w-4 h-4" /> Regenerate
            </Button>
          </div>
        </div>
      </div>

      {snippets.map((s) => (
        <div key={s.title}>
          <h4 className="text-sm font-medium text-white mb-2">{s.title}</h4>
          <pre className="text-xs bg-black/40 border border-surface-border rounded-xl p-4 overflow-x-auto text-zinc-300">
            {s.code}
          </pre>
        </div>
      ))}
    </div>
  );
}
