"use client";

import { AuthView } from "@daveyplate/better-auth-ui";

export default function SignInPage() {
  return (
    <div className="container mx-auto flex min-h-screen flex-col items-center justify-center">
      <AuthView view="SIGN_IN" />
    </div>
  );
}
