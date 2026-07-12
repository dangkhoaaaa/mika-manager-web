"use client";

import { Check, Palette } from "lucide-react";
import { PageTransition, FadeIn } from "@/components/shared/motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { COLOR_THEMES, type ColorTheme } from "@/lib/themes";
import { useThemeStore } from "@/lib/theme-store";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const { themeId, setTheme } = useThemeStore();

  return (
    <PageTransition className="p-6 max-w-2xl mx-auto space-y-6">
      <FadeIn>
        <div>
          <h1 className="text-2xl font-bold">Cài đặt</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Tùy chỉnh giao diện và màu sắc ứng dụng
          </p>
        </div>
      </FadeIn>

      <FadeIn delay={0.05}>
        <Card glass>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Palette className="w-4 h-4" />
              Combo màu
            </CardTitle>
            <CardDescription>
              Thay đổi màu chủ đạo cho charts, buttons và accents
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {COLOR_THEMES.map((theme) => (
              <button
                key={theme.id}
                onClick={() => setTheme(theme.id as ColorTheme)}
                className={cn(
                  "w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left",
                  themeId === theme.id
                    ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                    : "border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20"
                )}
              >
                <div className="flex gap-1 shrink-0">
                  {theme.preview.map((color) => (
                    <div
                      key={color}
                      className="w-8 h-8 rounded-lg shadow-inner"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{theme.name}</p>
                  <p className="text-xs text-muted-foreground">{theme.description}</p>
                </div>
                {themeId === theme.id && (
                  <Check className="w-5 h-5 text-primary shrink-0" />
                )}
              </button>
            ))}
          </CardContent>
        </Card>
      </FadeIn>

      <FadeIn delay={0.1}>
        <Card glass>
          <CardHeader>
            <CardTitle className="text-base">Xem trước</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-2">
                <div className="h-10 flex-1 rounded-lg bg-primary flex items-center justify-center text-primary-foreground text-sm font-medium">
                  Button Primary
                </div>
                <div className="h-10 flex-1 rounded-lg bg-secondary flex items-center justify-center text-sm">
                  Secondary
                </div>
              </div>
              <div className="h-3 rounded-full bg-secondary overflow-hidden">
                <div className="h-full w-2/3 bg-primary rounded-full" />
              </div>
              <div className="flex gap-1">
                {[0, 1, 2, 3, 4].map((l) => (
                  <div
                    key={l}
                    className="w-4 h-4 rounded-sm heatmap-preview"
                    data-level={l}
                  />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </FadeIn>
    </PageTransition>
  );
}
