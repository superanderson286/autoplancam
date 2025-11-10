"use client";

import { useState, useEffect } from 'react';

interface SafeLocaleDateProps {
  date: Date | string | null;
  fallback?: string;
}

/**
 * Este componente renderiza una fecha usando el locale del cliente de forma segura,
 * evitando errores de hidratación en Next.js.
 */
export function SafeLocaleDate({ date, fallback = 'Nunca' }: SafeLocaleDateProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    // Durante el renderizado del servidor y la hidratación inicial,
    // no renderizamos nada para evitar el desajuste.
    return null;
  }

  if (!date) {
    return <>{fallback}</>;
  }

  return <>{new Date(date).toLocaleString('en-GB')}</>;
}