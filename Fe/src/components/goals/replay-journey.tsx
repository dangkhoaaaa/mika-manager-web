"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, RotateCcw, FastForward } from "lucide-react";
import { analyticsApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatHours } from "@/lib/utils";

export function ReplayJourney({ goalId }: { goalId?: string }) {
  const [playing, setPlaying] = useState(false);
  const [frameIndex, setFrameIndex] = useState(0);
  const [speed, setSpeed] = useState(800);

  const { data: frames = [] } = useQuery({
    queryKey: ["replay", goalId],
    queryFn: () => analyticsApi.replay(goalId),
  });

  useEffect(() => {
    if (!playing || frames.length === 0) return;
    if (frameIndex >= frames.length - 1) {
      setPlaying(false);
      return;
    }
    const timer = setTimeout(() => setFrameIndex((i) => i + 1), speed);
    return () => clearTimeout(timer);
  }, [playing, frameIndex, frames.length, speed]);

  const frame = frames[frameIndex];

  return (
    <Card glass>
      <CardHeader>
        <CardTitle className="text-base">Replay Journey</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {frames.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Chưa có dữ liệu để replay
          </p>
        ) : (
          <>
            <div className="relative h-48 rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-white/10 overflow-hidden">
              <AnimatePresence mode="wait">
                {frame && (
                  <motion.div
                    key={frameIndex}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="absolute inset-0 p-6 flex flex-col justify-center"
                  >
                    <p className="text-xs text-muted-foreground">
                      Ngày {frameIndex + 1} / {frames.length}
                    </p>
                    <p className="text-xl font-bold mt-1">{formatDate(frame.date)}</p>
                    <div className="flex gap-4 mt-3 text-sm">
                      <span>{formatHours(frame.hoursStudied)} học</span>
                      <span>{frame.tasksCompleted} tasks</span>
                      <span>🔥 {frame.streak} streak</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      Tổng: {formatHours(frame.totalHours)}
                    </p>
                    {frame.notes && (
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                        {frame.notes}
                      </p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${((frameIndex + 1) / frames.length) * 100}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  setFrameIndex(0);
                  setPlaying(false);
                }}
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
              <Button
                size="icon"
                onClick={() => setPlaying(!playing)}
              >
                {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSpeed(speed === 800 ? 400 : speed === 400 ? 200 : 800)}
              >
                <FastForward className="w-4 h-4" />
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
