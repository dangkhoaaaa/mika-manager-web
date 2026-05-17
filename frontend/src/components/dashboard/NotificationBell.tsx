"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Bell, Bug, Lightbulb } from "lucide-react";
import clsx from "clsx";

export interface NotificationItem {
  id: string;
  type: "bug" | "feature";
  projectId: string;
  projectName: string;
  title: string;
  description: string;
  createdAt: string;
}

export function NotificationBell() {
  const router = useRouter();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api<NotificationItem[]>("/api/notifications");
      setItems(data);
    } catch {
      /* ignore when offline */
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, [load]);

  const markRead = async (item: NotificationItem) => {
    await api(`/api/notifications/${item.type}/${item.id}/read`, {
      method: "POST",
    });
    setItems((prev) => prev.filter((i) => i.id !== item.id || i.type !== item.type));
  };

  const handleClick = async (item: NotificationItem) => {
    await markRead(item);
    setOpen(false);
    const tab = item.type === "bug" ? "bugs" : "features";
    router.push(`/dashboard/projects/${item.projectId}?tab=${tab}`);
  };

  const markAllRead = async () => {
    await api("/api/notifications/read-all", { method: "POST" });
    setItems([]);
    setOpen(false);
  };

  return (
    <div className="fixed top-4 right-4 z-50">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative flex items-center justify-center w-11 h-11 rounded-xl bg-surface-card border border-surface-border text-zinc-300 hover:text-white hover:border-accent/40 shadow-lg transition"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {items.length > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white px-1">
            {items.length > 9 ? "9+" : items.length}
          </span>
        )}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-surface-border bg-surface-card shadow-2xl overflow-hidden z-50">
            <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border">
              <span className="text-sm font-medium text-white">Notifications</span>
              {items.length > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="text-xs text-accent hover:underline"
                >
                  Mark all read
                </button>
              )}
            </div>
            <ul className="max-h-[360px] overflow-y-auto">
              {items.length === 0 ? (
                <li className="px-4 py-8 text-center text-sm text-zinc-500">
                  No new reports
                </li>
              ) : (
                items.map((item) => (
                  <li key={`${item.type}-${item.id}`}>
                    <button
                      type="button"
                      onClick={() => handleClick(item)}
                      className="w-full text-left px-4 py-3 hover:bg-white/5 border-b border-surface-border/50 transition flex gap-3"
                    >
                      <span
                        className={clsx(
                          "mt-0.5 shrink-0",
                          item.type === "bug" ? "text-red-400" : "text-amber-400"
                        )}
                      >
                        {item.type === "bug" ? (
                          <Bug className="w-4 h-4" />
                        ) : (
                          <Lightbulb className="w-4 h-4" />
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="text-xs text-zinc-500 block">
                          {item.projectName} ·{" "}
                          {item.type === "bug" ? "Bug" : "Feature"}
                        </span>
                        <span className="text-sm text-white font-medium line-clamp-1">
                          {item.title}
                        </span>
                        {item.description && (
                          <span className="text-xs text-zinc-500 line-clamp-2 mt-0.5 block">
                            {item.description}
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
