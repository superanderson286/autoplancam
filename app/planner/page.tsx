"use client";

import { signOut } from "../../lib/auth-client";
import { useRouter } from "next/navigation";

export default function PlannerPage() {
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/");
        },
      },
    });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
      <h1 className="text-4xl font-bold mb-4">Planner</h1>
      <p className="text-lg">This is a simple planner page. More features will be added soon!</p>
      <button
        onClick={handleSignOut}
        className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded"
      >
        Sign Out
      </button>
    </div>
  );
}
