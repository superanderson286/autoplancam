"use client";

import { AuthView } from "@daveyplate/better-auth-ui";

export default function SignUpPage() {
  return (
    <div className="container mx-auto flex min-h-screen flex-col items-center justify-center">
      <AuthView view="SIGN_UP" />
    </div>
  );
}
