"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SignInRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/planner");
  }, [router]);

  return null;
}
