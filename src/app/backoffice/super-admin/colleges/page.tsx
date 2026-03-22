"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { BackofficeShell } from "@/components/backoffice/BackofficeShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useStaffAccess } from "@/hooks/useStaffAccess";
import { COLLEGE_TYPES, US_STATE_CODES } from "@/lib/collegeCatalog";

type CollegeCatalogSummary = {
  totalActiveColleges: number;
  latestUpdatedAt: string | null;
  latestScrapedAt: string | null;
};

type ImportResult = {
  ok?: boolean;
  error?: string;
  importedCount?: number;
  preparedCount?: number;
  results?: Array<Record<string, unknown>>;
};

type CollegeFormState = {
  name: string;
  website: string;
  state: string;
  city: string;
  type: string;
  description: string;
};

const INITIAL_FORM: CollegeFormState = {
  name: "",
  website: "",
  state: "CA",
  city: "",
  type: "Public University",
  description: "",
};

function formatTimestamp(value: string | null): string {
  if (!value) return "Not available";

  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function describeResult(item: Record<string, unknown>): string {
  const status = typeof item.status === "string" ? item.status : "unknown";
  const kind = typeof item.kind === "string" ? item.kind : "college";
  const name = typeof item.name === "string" ? item.name : kind;
  const count = typeof item.count === "number" ? `${item.count} colleges` : null;
  const error = typeof item.error === "string" ? item.error : null;
  const firecrawl =
    typeof item.usedFirecrawl === "boolean"
      ? item.usedFirecrawl
        ? "Firecrawl enabled"
        : "Firecrawl skipped"
      : null;

  return [status.toUpperCase(), name, count, firecrawl, error].filter(Boolean).join(" - ");
}

export default function SuperAdminCollegeCatalogPage() {
  const { loading, session } = useStaffAccess({
    allowedLevels: ["super_admin"],
  });

  const [summary, setSummary] = useState<CollegeCatalogSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<CollegeFormState>(INITIAL_FORM);
  const [lastResult, setLastResult] = useState<ImportResult | null>(null);

  const authHeaders = useMemo(
    () => ({
      Authorization: `Bearer ${session?.access_token}`,
      "Content-Type": "application/json",
    }),
    [session?.access_token]
  );

  const loadSummary = useCallback(async () => {
    if (!session?.access_token) return;

    setLoadingSummary(true);
    try {
      const response = await fetch("/api/admin/colleges/import", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const payload = (await response.json().catch(() => ({}))) as
        | CollegeCatalogSummary
        | { error?: string };

      if (!response.ok) {
        throw new Error("error" in payload ? payload.error ?? "Failed to load catalog summary." : "Failed to load catalog summary.");
      }

      setSummary(payload as CollegeCatalogSummary);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load catalog summary.");
    } finally {
      setLoadingSummary(false);
    }
  }, [session?.access_token]);

  useEffect(() => {
    if (!loading) {
      loadSummary();
    }
  }, [loadSummary, loading]);

  const runImport = useCallback(
    async (body: Record<string, unknown>, successMessage: string) => {
      if (!session?.access_token) return;

      setSubmitting(true);
      setLastResult(null);

      try {
        const response = await fetch("/api/admin/colleges/import", {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify(body),
        });
        const payload = (await response.json().catch(() => ({}))) as ImportResult;
        setLastResult(payload);

        if (!response.ok) {
          throw new Error(payload.error ?? "College catalog import failed.");
        }

        toast.success(successMessage);
        await loadSummary();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "College catalog import failed.");
      } finally {
        setSubmitting(false);
      }
    },
    [authHeaders, loadSummary, session?.access_token]
  );

  const handleSeedStatic = useCallback(async () => {
    await runImport({ seedStatic: true }, "Static catalog seeded.");
  }, [runImport]);

  const handleImportCollege = useCallback(
    async (useFirecrawl: boolean) => {
      const name = form.name.trim();
      const website = form.website.trim();
      if (!name) {
        toast.error("College name is required.");
        return;
      }

      if (useFirecrawl && !website) {
        toast.error("A website is required for Firecrawl enrichment.");
        return;
      }

      await runImport(
        {
          useFirecrawl,
          colleges: [
            {
              name,
              website: website || undefined,
              state: form.state,
              city: form.city.trim(),
              type: form.type,
              description: form.description.trim() || undefined,
            },
          ],
        },
        useFirecrawl ? "College imported with Firecrawl enrichment." : "College imported."
      );
    },
    [form, runImport]
  );

  if (loading) {
    return (
      <BackofficeShell
        title="College Catalog"
        subtitle="Super-admin-only catalog controls."
        levelLabel="SUPER ADMIN"
        staffLevel="super_admin"
      >
        <div className="flex min-h-60 items-center justify-center text-slate-300">
          Loading catalog controls...
        </div>
      </BackofficeShell>
    );
  }

  return (
    <BackofficeShell
      title="College Catalog"
      subtitle="Seed, import, and refresh the colleges catalog from a super-admin-only workspace."
      levelLabel="SUPER ADMIN"
      staffLevel="super_admin"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-400">
          This page is locked to the <span className="font-medium text-slate-200">super_admin</span> role.
        </p>
        <Link href="/backoffice/super-admin" className="text-sm text-emerald-300 hover:text-emerald-200">
          Back to control center
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-slate-800 bg-slate-900">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400">Active colleges</CardDescription>
            <CardTitle className="text-3xl text-slate-100">
              {loadingSummary ? "..." : summary?.totalActiveColleges ?? 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-slate-800 bg-slate-900">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400">Latest catalog update</CardDescription>
            <CardTitle className="text-base text-slate-100">
              {loadingSummary ? "Loading..." : formatTimestamp(summary?.latestUpdatedAt ?? null)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-slate-800 bg-slate-900">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400">Latest Firecrawl scrape</CardDescription>
            <CardTitle className="text-base text-slate-100">
              {loadingSummary ? "Loading..." : formatTimestamp(summary?.latestScrapedAt ?? null)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr,1.1fr]">
        <Card className="border-slate-800 bg-slate-900">
          <CardHeader>
            <CardTitle>Seed Current Static Catalog</CardTitle>
            <CardDescription className="text-slate-400">
              Imports the colleges already defined in the repository into the database-backed catalog.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-400">
              Run this once after the migration if you want the current in-repo list available in Supabase immediately.
            </p>
            <Button onClick={handleSeedStatic} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-500">
              {submitting ? "Working..." : "Seed Static Catalog"}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900">
          <CardHeader>
            <CardTitle>Add or Refresh One College</CardTitle>
            <CardDescription className="text-slate-400">
              Import a college manually or enrich it from the official site with Firecrawl.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="college-name" className="text-sm text-slate-300">
                  College name
                </label>
                <Input
                  id="college-name"
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  className="border-slate-700 bg-slate-800 text-slate-100"
                  placeholder="Arizona State University"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="college-website" className="text-sm text-slate-300">
                  Website
                </label>
                <Input
                  id="college-website"
                  value={form.website}
                  onChange={(event) => setForm((current) => ({ ...current, website: event.target.value }))}
                  className="border-slate-700 bg-slate-800 text-slate-100"
                  placeholder="https://www.example.edu"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="college-city" className="text-sm text-slate-300">
                  City
                </label>
                <Input
                  id="college-city"
                  value={form.city}
                  onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))}
                  className="border-slate-700 bg-slate-800 text-slate-100"
                  placeholder="Tempe"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-slate-300">State</label>
                <Select
                  value={form.state}
                  onValueChange={(value) => setForm((current) => ({ ...current, state: value }))}
                >
                  <SelectTrigger className="border-slate-700 bg-slate-800 text-slate-100">
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    {US_STATE_CODES.map((stateCode) => (
                      <SelectItem key={stateCode} value={stateCode}>
                        {stateCode}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm text-slate-300">College type</label>
                <Select
                  value={form.type}
                  onValueChange={(value) => setForm((current) => ({ ...current, type: value }))}
                >
                  <SelectTrigger className="border-slate-700 bg-slate-800 text-slate-100">
                    <SelectValue placeholder="Select college type" />
                  </SelectTrigger>
                  <SelectContent>
                    {COLLEGE_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label htmlFor="college-description" className="text-sm text-slate-300">
                  Description
                </label>
                <Textarea
                  id="college-description"
                  value={form.description}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, description: event.target.value }))
                  }
                  className="min-h-28 border-slate-700 bg-slate-800 text-slate-100"
                  placeholder="Optional manual summary if you are not enriching from the website."
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant="outline"
                className="border-slate-700 bg-transparent text-slate-100 hover:bg-slate-800"
                onClick={() => handleImportCollege(false)}
                disabled={submitting}
              >
                {submitting ? "Working..." : "Import Without Firecrawl"}
              </Button>
              <Button
                type="button"
                className="bg-blue-600 hover:bg-blue-500"
                onClick={() => handleImportCollege(true)}
                disabled={submitting}
              >
                {submitting ? "Working..." : "Import + Enrich From Website"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-800 bg-slate-900">
        <CardHeader>
          <CardTitle>Latest Import Result</CardTitle>
          <CardDescription className="text-slate-400">
            Review the last catalog action run from this page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!lastResult && <p className="text-sm text-slate-400">No catalog action has been run from this session yet.</p>}
          {lastResult && (
            <>
              <div className="flex flex-wrap gap-6 text-sm">
                <span className="text-slate-300">
                  Status:{" "}
                  <span className={lastResult.ok ? "text-emerald-300" : "text-red-300"}>
                    {lastResult.ok ? "Success" : "Failed"}
                  </span>
                </span>
                {"importedCount" in lastResult && typeof lastResult.importedCount === "number" && (
                  <span className="text-slate-300">Imported: {lastResult.importedCount}</span>
                )}
                {"preparedCount" in lastResult && typeof lastResult.preparedCount === "number" && (
                  <span className="text-slate-300">Prepared: {lastResult.preparedCount}</span>
                )}
              </div>
              {lastResult.error && <p className="text-sm text-red-300">{lastResult.error}</p>}
              {lastResult.results && lastResult.results.length > 0 && (
                <div className="space-y-2">
                  {lastResult.results.map((item, index) => (
                    <div
                      key={`${String(item.name ?? item.kind ?? "result")}-${index}`}
                      className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-300"
                    >
                      {describeResult(item)}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </BackofficeShell>
  );
}
