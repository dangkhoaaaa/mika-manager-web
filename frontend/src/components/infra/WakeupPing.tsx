"use client";

import { useEffect, useRef } from "react";
import { API_URL } from "@/lib/api";

export function WakeupPing() {
  const lastPingRef = useRef(0);

  useEffect(() => {
    const ping = () => {
      const now = Date.now();
      if (now - lastPingRef.current < 45_000) return;
      lastPingRef.current = now;
      fetch(`${API_URL}/wake`, { method: "GET", cache: "no-store" }).catch(() => {});
    };

    ping();

    const timer = window.setInterval(ping, 15 * 60 * 1000);

    const onVisible = () => {
      if (document.visibilityState === "visible") ping();
    };
    const onFocus = () => ping();

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  return null;
}
