"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Import has been moved to Settings → Import. Redirect so old links still work. */
export default function ImportPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/settings?tab=import");
  }, [router]);
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <p className="text-gray-500 dark:text-gray-400">Redirecting to Settings…</p>
    </div>
  );
}
