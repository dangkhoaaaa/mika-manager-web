"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { UserPlus, UserMinus } from "lucide-react";
import { socialApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/store";
import { useRouter } from "next/navigation";

interface FollowButtonProps {
  userId: string;
  isFollowing: boolean;
  username?: string;
  onSuccess?: () => void;
}

export function FollowButton({ userId, isFollowing: initial, onSuccess }: FollowButtonProps) {
  const [following, setFollowing] = useState(initial);
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();

  const followMutation = useMutation({
    mutationFn: () => socialApi.follow(userId),
    onSuccess: () => {
      setFollowing(true);
      queryClient.invalidateQueries({ queryKey: ["public-profile"] });
      onSuccess?.();
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: () => socialApi.unfollow(userId),
    onSuccess: () => {
      setFollowing(false);
      queryClient.invalidateQueries({ queryKey: ["public-profile"] });
      onSuccess?.();
    },
  });

  function handleClick() {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    if (following) {
      unfollowMutation.mutate();
    } else {
      followMutation.mutate();
    }
  }

  const loading = followMutation.isPending || unfollowMutation.isPending;

  return (
    <Button
      variant={following ? "outline" : "default"}
      onClick={handleClick}
      disabled={loading}
      className="gap-2"
    >
      {following ? (
        <>
          <UserMinus className="w-4 h-4" />
          Đang theo dõi
        </>
      ) : (
        <>
          <UserPlus className="w-4 h-4" />
          Theo dõi
        </>
      )}
    </Button>
  );
}
