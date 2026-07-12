"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PartyPopper } from "lucide-react";
import { socialApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/lib/store";
import { useRouter } from "next/navigation";

interface CheerButtonProps {
  userId: string;
  userName: string;
}

const CHEER_MESSAGES = [
  "Cố lên! 💪",
  "Tuyệt vời! 🔥",
  "Keep going! 🚀",
  "Bạn làm tốt lắm! ⭐",
];

export function CheerButton({ userId, userName }: CheerButtonProps) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (msg: string) => socialApi.cheer(userId, msg),
    onSuccess: () => {
      setSent(true);
      setOpen(false);
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["public-profile"] });
      setTimeout(() => setSent(false), 3000);
    },
  });

  function handleCheer(msg?: string) {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    mutation.mutate(msg || message || "Cố lên! 💪");
  }

  if (sent) {
    return (
      <Button variant="glass" disabled className="gap-2 text-emerald-400">
        <PartyPopper className="w-4 h-4" />
        Đã gửi cổ vũ!
      </Button>
    );
  }

  return (
    <div className="relative">
      <Button variant="glass" onClick={() => setOpen(!open)} className="gap-2">
        <PartyPopper className="w-4 h-4" />
        Cổ vũ {userName.split(" ")[0]}
      </Button>

      {open && (
        <div className="absolute top-full mt-2 right-0 z-20 w-72 glass-strong rounded-xl p-4 shadow-xl border border-white/10">
          <p className="text-sm font-medium mb-3">Gửi lời cổ vũ</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {CHEER_MESSAGES.map((msg) => (
              <button
                key={msg}
                onClick={() => handleCheer(msg)}
                className="text-xs px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              >
                {msg}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Hoặc viết riêng..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="text-sm"
            />
            <Button size="sm" onClick={() => handleCheer()} disabled={mutation.isPending}>
              Gửi
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
