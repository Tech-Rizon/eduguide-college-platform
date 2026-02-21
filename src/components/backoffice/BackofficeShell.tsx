"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldCheck, ArrowLeft } from "lucide-react";

export function BackofficeShell({
  title,
  subtitle,
  levelLabel,
  children,
}: {
  title: string;
  subtitle: string;
  levelLabel: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                Private Backoffice
              </Badge>
              <Badge className="bg-slate-800 text-slate-200 border-slate-700">
                {levelLabel}
              </Badge>
            </div>
            <h1 className="text-3xl font-bold">{title}</h1>
            <p className="text-slate-300 mt-1">{subtitle}</p>
          </div>
          <Link href="/dashboard">
            <Button variant="outline" className="border-slate-600 bg-transparent text-slate-100 hover:bg-slate-800">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Student View
            </Button>
          </Link>
        </div>

        {children}
      </div>
    </div>
  );
}

