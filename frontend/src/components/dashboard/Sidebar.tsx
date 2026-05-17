"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import clsx from "clsx";

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="relative z-20 w-64 flex-shrink-0 border-r border-white/10 bg-black/40 backdrop-blur-xl flex flex-col">
      <div className="p-6 border-b border-surface-border">
        <Link href="/dashboard" className="block">
          <span className="font-display text-2xl text-white">Mika</span>
          <span className="text-xs uppercase tracking-[0.2em] text-accent/80 block mt-1">
            Manager
          </span>
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        <NavLink
          href="/dashboard"
          active={pathname === "/dashboard"}
          icon={<LayoutGrid className="w-4 h-4" />}
          label="Projects"
        />
      </nav>

      <div className="p-4 border-t border-surface-border">
        <div className="flex items-center gap-3 mb-3 px-2">
          <div className="w-9 h-9 rounded-full bg-accent-muted/30 flex items-center justify-center text-sm font-medium text-accent-glow">
            {user?.name?.[0]?.toUpperCase() || "?"}
          </div>
          <div className="min-w-0">
            <p className="text-sm text-white truncate">{user?.name}</p>
            <p className="text-xs text-zinc-500 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition"
        >
          <LogOut className="w-4 h-4" /> Sign out
        </button>
      </div>
    </aside>
  );
}

function NavLink({
  href,
  active,
  icon,
  label,
}: {
  href: string;
  active: boolean;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={clsx(
        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition",
        active
          ? "bg-accent-muted/20 text-accent-glow border border-accent/20"
          : "text-zinc-400 hover:text-white hover:bg-white/5"
      )}
    >
      {icon}
      {label}
    </Link>
  );
}
