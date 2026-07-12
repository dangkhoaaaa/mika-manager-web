"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { analyticsApi } from "@/lib/api";
import { PageTransition, FadeIn } from "@/components/shared/motion";
import { DashboardSkeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatHours } from "@/lib/utils";
import type { CalendarDay } from "@/lib/types";

const WEEKDAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const MONTHS = [
  "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
  "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12",
];

function DayCell({ day, selected, onClick }: {
  day: CalendarDay;
  selected: boolean;
  onClick: () => void;
}) {
  const dayNum = parseInt(day.date.split("-")[2], 10);
  const hasActivity = day.hoursStudied > 0;

  return (
    <button
      onClick={onClick}
      className={cn(
        "aspect-square p-1 rounded-lg border text-left transition-all",
        selected ? "border-primary bg-primary/10 ring-1 ring-primary" : "border-white/5 hover:border-white/20",
        hasActivity && !selected && "bg-emerald-500/10"
      )}
    >
      <span className="text-xs font-medium">{dayNum}</span>
      {hasActivity && (
        <div className="mt-1">
          <div
            className="h-1 rounded-full bg-primary"
            style={{ width: `${Math.min(100, day.hoursStudied * 20)}%` }}
          />
          <span className="text-[10px] text-muted-foreground">{day.hoursStudied}h</span>
        </div>
      )}
    </button>
  );
}

export default function CalendarPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["calendar", year, month],
    queryFn: () => analyticsApi.calendar(year, month),
  });

  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  }

  function nextMonth() {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  }

  const firstDay = new Date(year, month - 1, 1).getDay();
  const days = data?.days || [];
  const padding = Array(firstDay).fill(null);

  if (isLoading) return <DashboardSkeleton />;

  return (
    <PageTransition className="p-6 max-w-4xl mx-auto space-y-6">
      <FadeIn>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <CalendarIcon className="w-6 h-6" />
              Lịch học tập
            </h1>
            <p className="text-muted-foreground text-sm">Xem tiến độ theo từng ngày</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-white/10">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="font-medium min-w-[120px] text-center">
              {MONTHS[month - 1]} {year}
            </span>
            <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-white/10">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </FadeIn>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <FadeIn delay={0.05} className="lg:col-span-2">
          <Card glass>
            <CardContent className="p-4">
              <div className="grid grid-cols-7 gap-1 mb-2">
                {WEEKDAYS.map((d) => (
                  <div key={d} className="text-center text-xs text-muted-foreground py-1">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {padding.map((_, i) => <div key={`pad-${i}`} />)}
                {days.map((day) => (
                  <DayCell
                    key={day.date}
                    day={day}
                    selected={selectedDay?.date === day.date}
                    onClick={() => setSelectedDay(day)}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </FadeIn>

        <FadeIn delay={0.1}>
          <Card glass>
            <CardHeader>
              <CardTitle className="text-base">
                {selectedDay ? selectedDay.date : "Chọn ngày"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedDay && selectedDay.hoursStudied > 0 ? (
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Giờ học</span>
                    <span className="font-medium">{formatHours(selectedDay.hoursStudied)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Tasks</span>
                    <span className="font-medium">{selectedDay.tasksCompleted}</span>
                  </div>
                  {selectedDay.mood && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Cảm xúc</span>
                      <span>{selectedDay.mood}</span>
                    </div>
                  )}
                  {selectedDay.hasEvidence && (
                    <p className="text-xs text-emerald-400">📷 Có bằng chứng</p>
                  )}
                  {selectedDay.hasNotes && (
                    <p className="text-xs text-muted-foreground">📝 Có ghi chú</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {selectedDay ? "Không có hoạt động" : "Click vào ngày để xem chi tiết"}
                </p>
              )}
            </CardContent>
          </Card>
        </FadeIn>
      </div>
    </PageTransition>
  );
}
