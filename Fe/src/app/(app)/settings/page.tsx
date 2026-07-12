"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Check, Palette, Sparkles } from "lucide-react";
import { PageTransition, FadeIn } from "@/components/shared/motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { COLOR_THEMES, type ColorTheme } from "@/lib/themes";
import { useThemeStore } from "@/lib/theme-store";
import { preferencesApi } from "@/lib/api";
import { THEME_PRESETS, type UserPreferences } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export default function SettingsPage() {
  const { themeId, setTheme } = useThemeStore();
  const [prefs, setPrefs] = useState<Partial<UserPreferences>>({});

  const { data: serverPrefs } = useQuery({
    queryKey: ["preferences"],
    queryFn: preferencesApi.get,
  });

  const saveMutation = useMutation({
    mutationFn: preferencesApi.update,
  });

  useEffect(() => {
    if (serverPrefs) setPrefs(serverPrefs);
  }, [serverPrefs]);

  function updatePref<K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) {
    setPrefs((p) => ({ ...p, [key]: value }));
  }

  function handleSave() {
    saveMutation.mutate(prefs);
  }

  return (
    <PageTransition className="p-6 max-w-2xl mx-auto space-y-6">
      <FadeIn>
        <div>
          <h1 className="text-2xl font-bold">Cài đặt</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Tùy chỉnh giao diện và đồng bộ preferences
          </p>
        </div>
      </FadeIn>

      <FadeIn delay={0.05}>
        <Card glass>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Palette className="w-4 h-4" />
              Combo màu (local)
            </CardTitle>
            <CardDescription>Thay đổi màu charts và accents ngay lập tức</CardDescription>
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
                    : "border-white/10 bg-white/5 hover:bg-white/10"
                )}
              >
                <div className="flex gap-1 shrink-0">
                  {theme.preview.map((color) => (
                    <div key={color} className="w-8 h-8 rounded-lg" style={{ backgroundColor: color }} />
                  ))}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{theme.name}</p>
                  <p className="text-xs text-muted-foreground">{theme.description}</p>
                </div>
                {themeId === theme.id && <Check className="w-5 h-5 text-primary" />}
              </button>
            ))}
          </CardContent>
        </Card>
      </FadeIn>

      <FadeIn delay={0.1}>
        <Card glass>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Theme Presets (đồng bộ server)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {THEME_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => updatePref("themePreset", preset.id)}
                  className={cn(
                    "p-3 rounded-xl border text-left transition-all",
                    prefs.themePreset === preset.id
                      ? "border-primary bg-primary/10"
                      : "border-white/10 hover:border-white/20"
                  )}
                >
                  <div className="flex gap-1 mb-2">
                    {preset.colors.map((c) => (
                      <div key={c} className="w-5 h-5 rounded" style={{ backgroundColor: c }} />
                    ))}
                  </div>
                  <p className="text-sm font-medium">{preset.name}</p>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Accent color</Label>
                <input
                  type="color"
                  value={prefs.accentColor || "#6366f1"}
                  onChange={(e) => updatePref("accentColor", e.target.value)}
                  className="mt-1.5 w-full h-10 rounded-lg cursor-pointer"
                />
              </div>
              <div>
                <Label>Background</Label>
                <input
                  type="color"
                  value={prefs.backgroundColor || "#0f0f1a"}
                  onChange={(e) => updatePref("backgroundColor", e.target.value)}
                  className="mt-1.5 w-full h-10 rounded-lg cursor-pointer"
                />
              </div>
            </div>

            <div>
              <Label>Card density</Label>
              <select
                value={prefs.cardDensity || "comfortable"}
                onChange={(e) => updatePref("cardDensity", e.target.value as UserPreferences["cardDensity"])}
                className="mt-1.5 w-full rounded-lg border border-border bg-background/50 px-3 py-2 text-sm"
              >
                <option value="compact">Compact</option>
                <option value="comfortable">Comfortable</option>
                <option value="spacious">Spacious</option>
              </select>
            </div>

            <div>
              <Label>Animation speed</Label>
              <select
                value={prefs.animationSpeed || "normal"}
                onChange={(e) => updatePref("animationSpeed", e.target.value as UserPreferences["animationSpeed"])}
                className="mt-1.5 w-full rounded-lg border border-border bg-background/50 px-3 py-2 text-sm"
              >
                <option value="slow">Chậm</option>
                <option value="normal">Bình thường</option>
                <option value="fast">Nhanh</option>
              </select>
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={prefs.reduceMotion || false}
                onChange={(e) => updatePref("reduceMotion", e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">Giảm chuyển động (reduce motion)</span>
            </label>

            <Button onClick={handleSave} disabled={saveMutation.isPending} className="w-full">
              {saveMutation.isPending ? "Đang lưu..." : "Lưu preferences"}
            </Button>
          </CardContent>
        </Card>
      </FadeIn>
    </PageTransition>
  );
}
