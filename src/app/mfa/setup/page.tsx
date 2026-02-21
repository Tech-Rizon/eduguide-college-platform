"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { AlertCircle, ArrowLeft, KeyRound, Shield, Smartphone } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabaseClient";
import { sanitizeRelativeRedirect } from "@/lib/redirects";

type RolePayload = {
  role: "student" | "staff";
  staffLevel: "tutor" | "support" | "manager" | "super_admin" | null;
  mfaRequired: boolean;
  isStaffView: boolean;
  dashboardPath: string;
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Unable to complete MFA setup.";
}

function extractTotpSecret(uri: string | null): string | null {
  if (!uri) return null;
  try {
    const parsed = new URL(uri);
    const secret = parsed.searchParams.get("secret");
    return secret && secret.trim() ? secret : null;
  } catch {
    return null;
  }
}

export default function MfaSetupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedRedirectRaw = searchParams.get("redirect");
  const { user, session, loading } = useAuth();

  const [busy, setBusy] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dashboardPath, setDashboardPath] = useState("/staff/dashboard");
  const [factorId, setFactorId] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [totpUri, setTotpUri] = useState<string | null>(null);
  const [totpSecret, setTotpSecret] = useState<string | null>(null);
  const [enrolledNewFactor, setEnrolledNewFactor] = useState(false);
  const [code, setCode] = useState("");

  const fetchRolePayload = useCallback(async (accessToken: string): Promise<RolePayload> => {
    const response = await fetch("/api/user-role", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error("Unable to resolve user access.");
    }

    return (await response.json()) as RolePayload;
  }, []);

  const startChallenge = useCallback(async (targetFactorId: string) => {
    const { data, error } = await supabase.auth.mfa.challenge({
      factorId: targetFactorId,
    });

    if (error) throw error;

    const nextChallengeId = data?.id;
    if (!nextChallengeId) {
      throw new Error("MFA challenge could not be created.");
    }

    setChallengeId(nextChallengeId);
  }, []);

  const initializeFlow = useCallback(async (accessToken: string) => {
    setBusy(true);
    setErrorMessage(null);

    try {
      const rolePayload = await fetchRolePayload(accessToken);
      const staffDashboard = sanitizeRelativeRedirect(rolePayload.dashboardPath, "/staff/dashboard");
      setDashboardPath(staffDashboard);

      const isPrivilegedStaff =
        rolePayload.isStaffView &&
        (rolePayload.staffLevel === "manager" || rolePayload.staffLevel === "super_admin");

      if (!isPrivilegedStaff) {
        router.replace(staffDashboard);
        return;
      }

      if (!rolePayload.mfaRequired) {
        router.replace(sanitizeRelativeRedirect(requestedRedirectRaw, staffDashboard));
        return;
      }

      const { data: factorData, error: factorError } = await supabase.auth.mfa.listFactors();
      if (factorError) throw factorError;

      const verifiedFactor =
        factorData?.totp?.find((factor: any) => factor?.status === "verified") ??
        factorData?.all?.find((factor: any) => factor?.factor_type === "totp" && factor?.status === "verified");

      if (verifiedFactor?.id) {
        setEnrolledNewFactor(false);
        setFactorId(verifiedFactor.id);
        setTotpUri(null);
        setTotpSecret(null);
        await startChallenge(verifiedFactor.id);
        return;
      }

      const { data: enrollmentData, error: enrollmentError } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "EduGuide Backoffice",
      });
      if (enrollmentError) throw enrollmentError;

      if (!enrollmentData?.id) {
        throw new Error("MFA enrollment did not return a factor.");
      }

      const enrolledUri = enrollmentData?.totp?.uri ?? null;
      setEnrolledNewFactor(true);
      setFactorId(enrollmentData.id);
      setTotpUri(enrolledUri);
      setTotpSecret(extractTotpSecret(enrolledUri));
      await startChallenge(enrollmentData.id);
    } finally {
      setBusy(false);
    }
  }, [fetchRolePayload, requestedRedirectRaw, router, startChallenge]);

  useEffect(() => {
    if (loading) return;

    if (!user || !session?.access_token) {
      router.replace("/login?mfa=required");
      return;
    }

    void initializeFlow(session.access_token).catch((error: unknown) => {
      setBusy(false);
      setErrorMessage(getErrorMessage(error));
    });
  }, [initializeFlow, loading, router, session?.access_token, user]);

  const refreshChallenge = async () => {
    if (!factorId) {
      setErrorMessage("MFA factor not found. Reload this page and try again.");
      return;
    }

    setBusy(true);
    setErrorMessage(null);

    try {
      await startChallenge(factorId);
      toast.success("MFA challenge refreshed.");
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const verifyCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!factorId || !challengeId) {
      setErrorMessage("MFA challenge not ready. Refresh challenge and try again.");
      return;
    }

    const oneTimeCode = code.trim();
    if (!/^\d{6}$/.test(oneTimeCode)) {
      setErrorMessage("Enter the 6-digit code from your authenticator app.");
      return;
    }

    setVerifying(true);
    setErrorMessage(null);

    try {
      const { error } = await supabase.auth.mfa.verify({
        factorId,
        challengeId,
        code: oneTimeCode,
      });

      if (error) throw error;

      const {
        data: { session: latestSession },
      } = await supabase.auth.getSession();
      const nextToken = latestSession?.access_token;
      if (!nextToken) {
        throw new Error("Session refresh failed after MFA verification.");
      }

      const rolePayload = await fetchRolePayload(nextToken);
      if (rolePayload.mfaRequired) {
        throw new Error("MFA is still required for this session. Try a fresh challenge.");
      }

      toast.success("MFA verified.");
      const nextPath = sanitizeRelativeRedirect(
        requestedRedirectRaw,
        sanitizeRelativeRedirect(rolePayload.dashboardPath, dashboardPath)
      );
      router.replace(nextPath);
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-slate-100">
      <nav className="flex items-center justify-between p-6 max-w-5xl mx-auto">
        <Link href="/login">
          <Button variant="outline" className="border-slate-700 bg-transparent hover:bg-slate-800">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Login
          </Button>
        </Link>
      </nav>

      <div className="max-w-xl mx-auto px-6 pb-14">
        <Card className="bg-slate-900 border-slate-700">
          <CardHeader className="space-y-3">
            <div className="flex items-center gap-2 text-emerald-300">
              <Shield className="h-5 w-5" />
              <span className="text-sm font-medium tracking-wide uppercase">Manager / Super Admin Gate</span>
            </div>
            <CardTitle className="text-2xl text-slate-100">Complete MFA Verification</CardTitle>
            <CardDescription className="text-slate-300">
              Backoffice access requires an active MFA session (AAL2) on every login.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            {errorMessage && (
              <div className="p-3 rounded-lg border border-red-500/40 bg-red-500/10 flex items-start gap-2">
                <AlertCircle className="h-5 w-5 mt-0.5 text-red-300 shrink-0" />
                <p className="text-sm text-red-100">{errorMessage}</p>
              </div>
            )}

            {busy ? (
              <div className="rounded-lg border border-slate-700 bg-slate-800 p-4 text-sm text-slate-300">
                Preparing secure MFA challenge...
              </div>
            ) : (
              <>
                {enrolledNewFactor && (
                  <div className="rounded-lg border border-amber-400/40 bg-amber-500/10 p-4 space-y-3">
                    <div className="flex items-center gap-2 text-amber-200">
                      <Smartphone className="h-4 w-4" />
                      <p className="text-sm font-medium">Add this account in your authenticator app</p>
                    </div>
                    {totpSecret && (
                      <div className="text-xs text-amber-100">
                        <p className="mb-1 font-medium">Setup Key</p>
                        <p className="break-all font-mono bg-slate-950/40 rounded p-2">{totpSecret}</p>
                      </div>
                    )}
                    {totpUri && (
                      <div className="text-xs text-amber-100">
                        <p className="mb-1 font-medium">Manual OTP URI</p>
                        <p className="break-all font-mono bg-slate-950/40 rounded p-2">{totpUri}</p>
                      </div>
                    )}
                  </div>
                )}

                <form onSubmit={verifyCode} className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="mfa-code" className="text-sm font-medium text-slate-200 flex items-center gap-2">
                      <KeyRound className="h-4 w-4" />
                      Authenticator code
                    </label>
                    <Input
                      id="mfa-code"
                      value={code}
                      onChange={(event) => setCode(event.target.value)}
                      placeholder="123456"
                      inputMode="numeric"
                      maxLength={6}
                      autoComplete="one-time-code"
                      className="bg-slate-800 border-slate-700 text-slate-100"
                      disabled={verifying}
                    />
                    <p className="text-xs text-slate-400">
                      Enter the current 6-digit code from your authenticator app.
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <Button type="submit" disabled={verifying} className="bg-emerald-600 hover:bg-emerald-500">
                      {verifying ? "Verifying..." : "Verify and Continue"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="border-slate-700 bg-transparent hover:bg-slate-800"
                      onClick={refreshChallenge}
                      disabled={busy || verifying}
                    >
                      Refresh Challenge
                    </Button>
                  </div>
                </form>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
