"use client";

import { useEffect } from "react";

/** Registra o service worker para o celular permitir instalar o app. */
export default function RegistraSW() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // sem service worker o sistema funciona igual, só não oferece instalar
    });
  }, []);

  return null;
}
