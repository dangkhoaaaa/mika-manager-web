import { DualImageBackdrop } from "@/components/ui/DualImageBackdrop";

export function AuthBackdrop() {
  return (
    <DualImageBackdrop
      baseImage="/images/Image-9.png"
      overlayImage="/images/Image-8.png"
      dimClassName="bg-black/35"
    />
  );
}
