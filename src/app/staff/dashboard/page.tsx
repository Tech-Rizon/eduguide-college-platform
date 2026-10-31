"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { sanitizeRelativeRedirect } from "@/lib/redirects";

export default function StaffDashboardDispatcherPage() {
  const { user, session, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/login?redirect=/staff/dashboard");
      return;
    }

    const resolveDestination = async () => {
      if (!session?.access_token) {
        router.replace("/dashboard");
        return;
      }

      try {
        const response = await fetch("/api/user-role", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (!response.ok) {
          router.replace("/dashboard");
          return;
        }

        const payload = await response.json();
        const destination = sanitizeRelativeRedirect(
          typeof payload?.dashboardPath === "string" ? payload.dashboardPath : null,
          "/dashboard"
        );
        const mfaRequiredForPrivilegedUser =
          Boolean(payload?.mfaRequired) &&
          (payload?.staffLevel === "manager" || payload?.staffLevel === "super_admin");

        if (mfaRequiredForPrivilegedUser) {
          router.replace(`/mfa/setup?redirect=${encodeURIComponent(destination)}`);
          return;
        }

        router.replace(destination);
      } catch {
        router.replace("/dashboard");
      }
    };

    resolveDestination();
  }, [loading, router, session?.access_token, user]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-200">
      Loading secure workspace...
    </div>
  );
}

