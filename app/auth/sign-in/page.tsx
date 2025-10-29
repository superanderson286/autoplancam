"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthView } from "@daveyplate/better-auth-ui";
import { useSession } from "../../../lib/auth-client"; // Corrected import path

export default function SignInPage() {
  const router = useRouter();
  const { data } = useSession(); // Use the useSession hook

  useEffect(() => {
    if (data?.session) { // Check if session exists
      router.push("/planner");
    }
  }, [data?.session, router]); // Add data?.session to dependency array

  return (
    <div className="container mx-auto flex min-h-screen flex-col items-center justify-center">
      <AuthView view="SIGN_IN" 
      redirectTo="/planner"
      />
    </div>
  );
}
