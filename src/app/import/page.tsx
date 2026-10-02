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
    <div className="min-h-screen flex items-center justify-center bg-paper">
      <p className="text-muted">Redirecting to Settings…</p>
    </div>
  );
}
