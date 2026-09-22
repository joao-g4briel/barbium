"use client";

import { useEffect } from "react";

export function RegistrarServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Instalar o app continua funcionando sem o service worker em
        // navegadores mais antigos — só não ganha o prompt automático.
      });
    }
  }, []);

  return null;
}
