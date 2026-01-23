import { Suspense } from "react";
import AuthLanding from "@/components/AuthLanding";

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-emerald-600 border-r-transparent"></div>
            <p className="mt-4 text-sm text-slate-600">Loading...</p>
          </div>
        </div>
      }
    >
      <AuthLanding />
    </Suspense>
  );
}
