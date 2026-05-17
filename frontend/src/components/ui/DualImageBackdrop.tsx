"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

interface DualImageBackdropProps {
  baseImage: string;
  overlayImage: string;
  overlayClassName?: string;
  dimClassName?: string;
  className?: string;
}

export function DualImageBackdrop({
  baseImage,
  overlayImage,
  overlayClassName = "bg-cover bg-center",
  dimClassName = "bg-black/45",
  className = "fixed inset-0 z-0",
}: DualImageBackdropProps) {
  const baseRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const base = baseRef.current;
    const overlay = overlayRef.current;
    if (!base || !overlay) return;

    gsap.set(base, { scale: 1, xPercent: 0, yPercent: 0 });
    gsap.set(overlay, { opacity: 0, scale: 1.02 });

    const tl = gsap.timeline({ repeat: -1, repeatDelay: 2 });
    tl.to(overlay, {
      opacity: 0.92,
      scale: 1.08,
      duration: 4,
      ease: "power2.out",
    })
      .to(overlay, {
        scale: 1.14,
        xPercent: -0.8,
        yPercent: -0.5,
        duration: 5,
        ease: "sine.inOut",
      })
      .to(overlay, {
        scale: 1.06,
        xPercent: 0,
        yPercent: 0,
        duration: 4,
        ease: "sine.inOut",
      })
      .to(
        base,
        { scale: 1.1, xPercent: -1.2, yPercent: -0.8, duration: 6, ease: "sine.inOut" },
        0
      )
      .to(base, { scale: 1, xPercent: 0, yPercent: 0, duration: 4, ease: "sine.inOut" }, "-=2");

    return () => {
      tl.kill();
    };
  }, [baseImage, overlayImage]);

  return (
    <div className={className} aria-hidden>
      <div
        ref={baseRef}
        className="absolute inset-0 bg-cover bg-center will-change-transform"
        style={{ backgroundImage: `url('${baseImage}')` }}
      />
      <div
        ref={overlayRef}
        className={`absolute inset-0 will-change-transform ${overlayClassName}`}
        style={{ backgroundImage: `url('${overlayImage}')` }}
      />
      <div className={`absolute inset-0 ${dimClassName}`} />
    </div>
  );
}
