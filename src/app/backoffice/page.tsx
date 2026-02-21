"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function BackofficeRootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/staff/dashboard");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-200">
      Loading backoffice...
    </div>
  );
}

