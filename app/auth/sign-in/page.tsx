"use client";

//import { useEffect } from "react";
//import { useRouter } from "next/navigation";
// import { authClient } from "../../../lib/auth-client.js"; // No se usa en esta versión
import { SignInForm } from "@/app/auth//sign-in/SignInForm";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-950">
      <SignInForm />
    </div>
  );
}


//export default function SignInPage() {
  //const router = useRouter();
  //const { data } = useSession(); // Use the useSession hook

  //useEffect(() => {
    //if (data?.session) { // Check if session exists
      //router.push("/planner");
    //}
  //}, [data?.session, router]); // Add data?.session to dependency array

  //return (
    //<div className="container mx-auto flex min-h-screen flex-col items-center justify-center">
      {/* <AuthView view="SIGN_IN" redirectTo="/planner" /> */}
    //</div>
  //);
//}
