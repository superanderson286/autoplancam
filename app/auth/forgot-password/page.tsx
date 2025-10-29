// app/auth/forgot-password/page.tsx
"use client";

import { AuthView } from "@daveyplate/better-auth-ui";

export default function ForgotPasswordPage() {
  // Nota: Si no quieres implementarlo, puedes usar un mensaje simple
  // o usa el AuthView con view="FORGOT_PASSWORD" si lo soportas.
  return (
    <div className="container mx-auto flex min-h-screen flex-col items-center justify-center">
      <AuthView view="FORGOT_PASSWORD" />
      {/* Si AuthView no soporta FORGOT_PASSWORD:
      <h1>Funcionalidad de recuperación de contraseña no disponible temporalmente.</h1>
      */}
    </div>
  );
}