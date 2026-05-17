import { DualImageBackdrop } from "@/components/ui/DualImageBackdrop";

export function DashboardBackdrop() {
  return (
    <DualImageBackdrop
      baseImage="/images/Image-4.png"
      overlayImage="/images/Image-5.png"
      dimClassName="bg-black/50"
    />
  );
}
