import { Suspense } from "react";
import ProcessingClient from "./ProcessingClient";

export default function ProcessingPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-dark-950 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-purple-400 border-t-transparent animate-spin" />
        </main>
      }
    >
      <ProcessingClient />
    </Suspense>
  );
}
