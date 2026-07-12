"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Target, User, X } from "lucide-react";
import Link from "next/link";
import { searchApi } from "@/lib/api";
import { useUIStore } from "@/lib/store";
import { Input } from "@/components/ui/input";

export function SearchModal() {
  const { searchOpen, setSearchOpen } = useUIStore();
  const [query, setQuery] = useState("");

  const { data, isFetching } = useQuery({
    queryKey: ["search", query],
    queryFn: () => searchApi.search(query),
    enabled: query.length >= 2,
  });

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === "Escape") setSearchOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setSearchOpen]);

  if (!searchOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSearchOpen(false)} />
      <div className="relative w-full max-w-lg glass-strong rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
        <div className="flex items-center gap-3 px-4 border-b border-white/10">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <Input
            autoFocus
            placeholder="Tìm mục tiêu, người dùng..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="border-0 bg-transparent focus-visible:ring-0 h-12"
          />
          <button onClick={() => setSearchOpen(false)} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {query.length < 2 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nhập ít nhất 2 ký tự để tìm kiếm
            </p>
          ) : isFetching ? (
            <p className="text-sm text-muted-foreground text-center py-8">Đang tìm...</p>
          ) : (
            <>
              {(data?.goals || []).length > 0 && (
                <div className="mb-3">
                  <p className="text-xs text-muted-foreground px-2 py-1">Mục tiêu</p>
                  {data?.goals.map((goal) => (
                    <Link
                      key={goal.id}
                      href={`/goals/${goal.id}`}
                      onClick={() => setSearchOpen(false)}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors"
                    >
                      <span className="text-lg">{goal.icon}</span>
                      <div>
                        <p className="text-sm font-medium">{goal.title}</p>
                        <p className="text-xs text-muted-foreground">{goal.status}</p>
                      </div>
                      <Target className="w-3 h-3 text-muted-foreground ml-auto" />
                    </Link>
                  ))}
                </div>
              )}

              {(data?.users || []).length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground px-2 py-1">Người dùng</p>
                  {data?.users.map((u) => (
                    <Link
                      key={u.userId}
                      href={`/u/${u.username}`}
                      onClick={() => setSearchOpen(false)}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-xs">
                        {u.username?.[0]?.toUpperCase() || "?"}
                      </div>
                      <div>
                        <p className="text-sm font-medium">@{u.username}</p>
                        <p className="text-xs text-muted-foreground">{u.bio?.slice(0, 40)}</p>
                      </div>
                      <User className="w-3 h-3 text-muted-foreground ml-auto" />
                    </Link>
                  ))}
                </div>
              )}

              {!data?.goals?.length && !data?.users?.length && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Không tìm thấy kết quả
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
