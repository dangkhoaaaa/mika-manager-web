"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ImageIcon } from "lucide-react";
import { goalsApi } from "@/lib/api";
import { PageTransition, FadeIn } from "@/components/shared/motion";
import { EmptyState } from "@/components/shared/stat-card";
import { DashboardSkeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";

export default function GalleryPage() {
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["gallery"],
    queryFn: () => goalsApi.gallery(),
  });

  if (isLoading) return <DashboardSkeleton />;

  const allImages = items.flatMap((item) =>
    item.images.map((img) => ({ ...img, date: item.date, logId: item.logId }))
  );

  return (
    <PageTransition className="p-6 max-w-6xl mx-auto space-y-6">
      <FadeIn>
        <div>
          <h1 className="text-2xl font-bold">Gallery</h1>
          <p className="text-muted-foreground text-sm">{allImages.length} ảnh bằng chứng</p>
        </div>
      </FadeIn>

      {allImages.length === 0 ? (
        <EmptyState
          icon={<ImageIcon className="w-8 h-8 text-muted-foreground" />}
          title="Gallery trống"
          description="Upload ảnh bằng chứng khi ghi nhận tiến độ học tập"
        />
      ) : (
        <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4">
          {allImages.map((img, i) => (
            <FadeIn key={`${img.logId}-${i}`} delay={(i % 8) * 0.05}>
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="break-inside-avoid rounded-xl overflow-hidden glass group cursor-pointer"
              >
                <img
                  src={img.url}
                  alt={img.name}
                  className="w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-xs text-muted-foreground">{formatDate(img.date)}</p>
                </div>
              </motion.div>
            </FadeIn>
          ))}
        </div>
      )}
    </PageTransition>
  );
}
