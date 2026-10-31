"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { sanitizeRelativeRedirect } from "@/lib/redirects";

type StaffAccessPayload = {
  role: "student" | "staff";
  staffLevel: "tutor" | "support" | "manager" | "super_admin" | null;
  mfaAal: string | null;
  mfaVerified: boolean;
  mfaRequired: boolean;
  isStaffView: boolean;
  isManagerView: boolean;
  isSuperAdmin: boolean;
  canManageRoles: boolean;
  canManageTickets: boolean;
  dashboardPath: string;
};

type UseStaffAccessOptions = {
  allowedLevels?: Array<"tutor" | "support" | "manager" | "super_admin">;
  redirectUnauthorizedTo?: string;
};

export function useStaffAccess(options: UseStaffAccessOptions = {}) {
  const { allowedLevels, redirectUnauthorizedTo = "/dashboard" } = options;
  const { user, session, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [staffAccess, setStaffAccess] = useState<StaffAccessPayload | null>(null);
  const [accessLoading, setAccessLoading] = useState(true);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      const redirect = pathname ? `?redirect=${encodeURIComponent(pathname)}` : "";
      router.replace(`/login${redirect}`);
      return;
    }

    const loadAccess = async () => {
      if (!session?.access_token) {
        setAccessLoading(false);
        router.replace(redirectUnauthorizedTo);
        return;
      }

      try {
        const response = await fetch("/api/user-role", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (!response.ok) {
          router.replace(redirectUnauthorizedTo);
          return;
        }

        const payload = (await response.json()) as StaffAccessPayload;
        if (!payload?.isStaffView) {
          router.replace(redirectUnauthorizedTo);
          return;
        }

        if (payload.mfaRequired) {
          const staffDashboard = sanitizeRelativeRedirect(payload.dashboardPath, "/staff/dashboard");
          const mfaTarget = sanitizeRelativeRedirect(pathname, staffDashboard);
          router.replace(`/mfa/setup?redirect=${encodeURIComponent(mfaTarget)}`);
          return;
        }

        if (allowedLevels?.length && (!payload.staffLevel || !allowedLevels.includes(payload.staffLevel))) {
          router.replace(sanitizeRelativeRedirect(payload.dashboardPath, redirectUnauthorizedTo));
          return;
        }

        setStaffAccess(payload);
      } catch {
        router.replace(redirectUnauthorizedTo);
      } finally {
        setAccessLoading(false);
      }
    };

    loadAccess();
  }, [allowedLevels, loading, pathname, redirectUnauthorizedTo, router, session?.access_token, user]);

  return {
    loading: loading || accessLoading,
    user,
    session,
    staffAccess,
  };
}
