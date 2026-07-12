"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { achievementsApi } from "@/lib/api";
import { PageTransition, FadeIn } from "@/components/shared/motion";
import { DashboardSkeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Trophy, Lock } from "lucide-react";

export default function AchievementsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["achievements"],
    queryFn: achievementsApi.list,
  });

  if (isLoading) return <DashboardSkeleton />;

  const all = data?.all || [];
  const unlocked = all.filter((a) => a.unlocked).length;

  return (
    <PageTransition className="p-6 max-w-4xl mx-auto space-y-6">
      <FadeIn>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="w-6 h-6 text-yellow-400" />
            Thành tựu
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {unlocked}/{all.length} thành tựu đã mở khóa
          </p>
        </div>
      </FadeIn>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {all.map((ach, i) => (
          <FadeIn key={ach.key} delay={i * 0.05}>
            <motion.div whileHover={{ scale: 1.02 }} transition={{ type: "spring", stiffness: 300 }}>
              <Card
                glass
                className={cn(
                  "transition-all duration-300",
                  ach.unlocked
                    ? "border-yellow-500/30 hover:border-yellow-500/50"
                    : "opacity-60"
                )}
              >
                <CardContent className="p-5 text-center">
                  <div className="relative inline-block mb-3">
                    <span className="text-4xl">{ach.unlocked ? ach.icon : "🔒"}</span>
                    {!ach.unlocked && (
                      <Lock className="w-4 h-4 absolute -bottom-1 -right-1 text-muted-foreground" />
                    )}
                  </div>
                  <h3 className="font-semibold text-sm">{ach.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{ach.description}</p>
                  {ach.unlocked && ach.unlockedAt && (
                    <p className="text-xs text-yellow-400/70 mt-2">
                      Mở khóa {new Date(ach.unlockedAt).toLocaleDateString("vi-VN")}
                    </p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </FadeIn>
        ))}
      </div>
    </PageTransition>
  );
}
