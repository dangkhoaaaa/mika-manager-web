"use client";

import { useEffect, useRef } from "react";
import { motion, useAnimation } from "framer-motion";

interface DualImageBackdropProps {
  baseImage?: string;
  overlayImage?: string;
  dimClassName?: string;
}

export function DualImageBackdrop({
  baseImage = "/images/Image-9.png",
  overlayImage = "/images/Image-8.png",
  dimClassName = "bg-black/35",
}: DualImageBackdropProps) {
  const overlayControls = useAnimation();
  const baseControls = useAnimation();
  const running = useRef(true);

  useEffect(() => {
    running.current = true;

    async function animate() {
      while (running.current) {
        await overlayControls.start({
          opacity: 0.92,
          scale: 1.08,
          x: 0,
          y: 0,
          transition: { duration: 4, ease: "easeOut" },
        });
        await overlayControls.start({
          scale: 1.14,
          x: "-0.8%",
          y: "-0.5%",
          transition: { duration: 5, ease: "easeInOut" },
        });
        await Promise.all([
          overlayControls.start({
            scale: 1.06,
            x: 0,
            y: 0,
            transition: { duration: 4, ease: "easeInOut" },
          }),
          baseControls.start({
            scale: 1.1,
            x: "-1.2%",
            y: "-0.8%",
            transition: { duration: 6, ease: "easeInOut" },
          }),
        ]);
        await baseControls.start({
          scale: 1,
          x: 0,
          y: 0,
          transition: { duration: 4, ease: "easeInOut" },
        });
        await overlayControls.start({
          opacity: 0,
          scale: 1.02,
          transition: { duration: 2, ease: "easeIn" },
        });
        await new Promise((r) => setTimeout(r, 2000));
      }
    }

    animate();
    return () => {
      running.current = false;
    };
  }, [overlayControls, baseControls]);

  return (
    <div className="fixed inset-0 z-0 overflow-hidden" aria-hidden>
      <motion.div
        animate={baseControls}
        initial={{ scale: 1, x: 0, y: 0 }}
        className="absolute inset-0 bg-cover bg-center will-change-transform"
        style={{ backgroundImage: `url('${baseImage}')` }}
      />
      <motion.div
        animate={overlayControls}
        initial={{ opacity: 0, scale: 1.02, x: 0, y: 0 }}
        className="absolute inset-0 bg-cover bg-center will-change-transform"
        style={{ backgroundImage: `url('${overlayImage}')` }}
      />
      <div className={`absolute inset-0 ${dimClassName}`} />
    </div>
  );
}
