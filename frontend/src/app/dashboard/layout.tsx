"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { DashboardBackdrop } from "@/components/dashboard/DashboardBackdrop";
import { NotificationBell } from "@/components/dashboard/NotificationBell";
import { WakeupPing } from "@/components/infra/WakeupPing";
import { Loader2 } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="relative flex min-h-screen">
      <WakeupPing />
      <DashboardBackdrop />
      <Sidebar />
      <main className="relative z-10 flex-1 overflow-auto">
        <NotificationBell />
        {children}
      </main>
    </div>
  );
}
