import { TrialForm } from "./TrialForm";
import { Suspense } from "react";

export default function TrialPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-900">
      <Suspense fallback={<div>Loading...</div>}>
        <TrialForm />
      </Suspense>
    </div>
  );
}
