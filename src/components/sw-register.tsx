"use client";

import { useEffect } from "react";

// Registra o Service Worker só em produção (no dev ele brigaria com o HMR).
export function SwRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);
  return null;
}
