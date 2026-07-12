"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { goalsApi } from "@/lib/api";
import { GOAL_COLORS, GOAL_ICONS } from "@/lib/types";
import { PageTransition } from "@/components/shared/motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useState } from "react";

const schema = z.object({
  title: z.string().min(1, "Tiêu đề bắt buộc"),
  description: z.string().optional(),
  targetHours: z.coerce.number().min(1, "Tối thiểu 1 giờ"),
  targetDays: z.coerce.number().min(1).optional(),
  deadline: z.string().optional(),
  visibility: z.enum(["private", "public"]).default("private"),
});

type FormData = z.infer<typeof schema>;

export default function NewGoalPage() {
  const router = useRouter();
  const [icon, setIcon] = useState("🎯");
  const [color, setColor] = useState(GOAL_COLORS[0]);
  const [tags, setTags] = useState("");
  const [tagInput, setTagInput] = useState("");

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { visibility: "private", targetHours: 100 },
  });

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      goalsApi.create({
        ...data,
        icon,
        color,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        startDate: new Date().toISOString().split("T")[0],
      }),
    onSuccess: (goal) => router.push(`/goals/${goal.id}`),
  });

  function addTag() {
    if (!tagInput.trim()) return;
    const current = tags ? tags.split(",").map((t) => t.trim()) : [];
    if (!current.includes(tagInput.trim())) {
      setTags([...current, tagInput.trim()].join(", "));
    }
    setTagInput("");
  }

  return (
    <PageTransition className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Tạo mục tiêu mới</h1>
        <p className="text-muted-foreground text-sm">Cam kết với hành trình học tập dài hạn</p>
      </div>

      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-6">
        <Card glass>
          <CardHeader>
            <CardTitle className="text-base">Thông tin cơ bản</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Biểu tượng</Label>
              <div className="flex gap-2 mt-2 flex-wrap">
                {GOAL_ICONS.map((i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setIcon(i)}
                    className={cn(
                      "w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-all",
                      icon === i ? "bg-primary/20 ring-2 ring-primary" : "bg-white/5 hover:bg-white/10"
                    )}
                  >
                    {i}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label>Màu sắc</Label>
              <div className="flex gap-2 mt-2">
                {GOAL_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={cn(
                      "w-8 h-8 rounded-full transition-all",
                      color === c && "ring-2 ring-white ring-offset-2 ring-offset-background"
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="title">Tiêu đề *</Label>
              <Input id="title" placeholder="VD: Học React trong 90 ngày" className="mt-1.5" {...register("title")} />
              {errors.title && <p className="text-red-400 text-xs mt-1">{errors.title.message}</p>}
            </div>

            <div>
              <Label htmlFor="description">Mô tả</Label>
              <textarea
                id="description"
                className="mt-1.5 w-full rounded-lg border border-border bg-background/50 px-3 py-2 text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Mục tiêu chi tiết của bạn..."
                {...register("description")}
              />
            </div>
          </CardContent>
        </Card>

        <Card glass>
          <CardHeader>
            <CardTitle className="text-base">Mục tiêu & Thời hạn</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="targetHours">Giờ học mục tiêu</Label>
              <Input id="targetHours" type="number" className="mt-1.5" {...register("targetHours")} />
            </div>
            <div>
              <Label htmlFor="targetDays">Số ngày mục tiêu</Label>
              <Input id="targetDays" type="number" className="mt-1.5" {...register("targetDays")} />
            </div>
            <div className="col-span-2">
              <Label htmlFor="deadline">Deadline</Label>
              <Input id="deadline" type="date" className="mt-1.5" {...register("deadline")} />
            </div>
            <div className="col-span-2">
              <Label>Tags</Label>
              <div className="flex gap-2 mt-1.5">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="Thêm tag..."
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                />
                <Button type="button" variant="secondary" onClick={addTag}>
                  Thêm
                </Button>
              </div>
              {tags && <p className="text-xs text-muted-foreground mt-1">{tags}</p>}
            </div>
            <div className="col-span-2">
              <Label>Hiển thị</Label>
              <select
                className="mt-1.5 w-full h-10 rounded-lg border border-border bg-background/50 px-3 text-sm"
                {...register("visibility")}
              >
                <option value="private">Riêng tư</option>
                <option value="public">Công khai</option>
              </select>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="button" variant="ghost" onClick={() => router.back()}>
            Hủy
          </Button>
          <Button type="submit" disabled={isSubmitting || mutation.isPending} className="flex-1">
            {mutation.isPending ? "Đang tạo..." : "Tạo mục tiêu"}
          </Button>
        </div>
      </form>
    </PageTransition>
  );
}
