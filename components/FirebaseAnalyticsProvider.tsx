// components/FirebaseAnalyticsProvider.tsx
"use client";

import { useEffect } from "react";
import { analytics } from "../firebase"; // Ruta corregida: asumiendo firebase.ts está en la raíz

export function FirebaseAnalyticsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // Este efecto se asegura de que el módulo de analytics se cargue
    // y se inicialice en el lado del cliente.
    if (analytics) {
      // Con firebase/compat, 'analytics' es directamente la instancia de Analytics o null, no una Promesa.
      // La lógica de inicialización ya se maneja en firebase.ts.
      console.log("Firebase Analytics (compat) está disponible.");
    }
  }, []);

  return <>{children}</>;
}
