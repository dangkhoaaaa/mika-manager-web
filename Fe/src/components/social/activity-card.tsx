"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart, MessageCircle, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { socialApi } from "@/lib/api";
import type { TimelineItem } from "@/lib/types";
import { MOODS } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { cn, formatHours, formatDate } from "@/lib/utils";
import { useAuthStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface ActivityCardProps {
  item: TimelineItem;
  showUser?: boolean;
}

export function ActivityCard({ item, showUser = false }: ActivityCardProps) {
  const { log, goal, user, likeCount: initLikes, commentCount: initComments, isLiked: initLiked } = item;
  const [liked, setLiked] = useState(initLiked);
  const [likeCount, setLikeCount] = useState(initLikes);
  const [showComments, setShowComments] = useState(false);
  const [comment, setComment] = useState("");
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: comments = [], refetch } = useQuery({
    queryKey: ["comments", log.id],
    queryFn: () => socialApi.listComments(log.id, "log"),
    enabled: showComments,
  });

  const likeMutation = useMutation({
    mutationFn: async () => {
      if (liked) {
        await socialApi.unlike(log.id, "log");
      } else {
        await socialApi.like(log.id, "log");
      }
    },
    onSuccess: () => {
      setLiked(!liked);
      setLikeCount((c) => (liked ? c - 1 : c + 1));
    },
  });

  const commentMutation = useMutation({
    mutationFn: () => socialApi.comment(log.id, "log", comment),
    onSuccess: () => {
      setComment("");
      refetch();
      queryClient.invalidateQueries({ queryKey: ["public-timeline"] });
    },
  });

  function handleLike() {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    likeMutation.mutate();
  }

  function handleComment() {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    if (!comment.trim()) return;
    commentMutation.mutate();
  }

  const mood = MOODS.find((m) => m.value === log.mood);

  return (
    <Card glass className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
            style={{ backgroundColor: `${goal.color}20` }}
          >
            {goal.icon}
          </div>
          <div className="flex-1 min-w-0">
            {showUser && user.username && (
              <Link href={`/u/${user.username}`} className="text-xs text-primary hover:underline">
                @{user.username}
              </Link>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              {user.username ? (
                <Link
                  href={`/u/${user.username}/goals/${goal.id}`}
                  className="font-semibold text-sm hover:text-primary transition-colors"
                >
                  {goal.title}
                </Link>
              ) : (
                <span className="font-semibold text-sm">{goal.title}</span>
              )}
              <span className="text-xs text-muted-foreground">{formatDate(log.date)}</span>
            </div>

            <div className="flex items-center gap-3 mt-2 text-sm">
              <span className="font-semibold text-indigo-400">{formatHours(log.hoursStudied)}</span>
              <span className="text-muted-foreground">{log.tasksCompleted} tasks</span>
              {mood && <span>{mood.emoji}</span>}
            </div>

            {log.notes && (
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{log.notes}</p>
            )}

            {log.evidenceImages?.length > 0 && (
              <div className="flex gap-2 mt-3 flex-wrap">
                {log.evidenceImages.slice(0, 4).map((img, i) => (
                  <img
                    key={i}
                    src={img.url}
                    alt=""
                    className="w-20 h-20 rounded-lg object-cover"
                  />
                ))}
              </div>
            )}

            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/5">
              <button
                onClick={handleLike}
                className={cn(
                  "flex items-center gap-1.5 text-sm transition-colors",
                  liked ? "text-red-400" : "text-muted-foreground hover:text-red-400"
                )}
              >
                <motion.div animate={{ scale: liked ? [1, 1.3, 1] : 1 }} transition={{ duration: 0.3 }}>
                  <Heart className={cn("w-4 h-4", liked && "fill-current")} />
                </motion.div>
                {likeCount}
              </button>

              <button
                onClick={() => setShowComments(!showComments)}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                {showComments ? comments.length : initComments}
              </button>
            </div>

            <AnimatePresence>
              {showComments && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-3 space-y-2">
                    {comments.map((c) => (
                      <div key={c.id} className="text-sm bg-white/5 rounded-lg px-3 py-2">
                        <span className="font-medium text-xs">
                          {c.authorUsername ? (
                            <Link href={`/u/${c.authorUsername}`} className="hover:text-primary">
                              {c.authorName}
                            </Link>
                          ) : (
                            c.authorName
                          )}
                        </span>
                        <p className="text-muted-foreground mt-0.5">{c.content}</p>
                      </div>
                    ))}

                    <div className="flex gap-2">
                      <Input
                        placeholder="Viết bình luận..."
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleComment()}
                        className="text-sm h-8"
                      />
                      <Button size="sm" variant="ghost" onClick={handleComment} disabled={commentMutation.isPending}>
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
