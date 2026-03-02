"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldCheck, ArrowLeft, LayoutDashboard, Home } from "lucide-react";

export type BackofficeStaffLevel = "tutor" | "support" | "manager" | "super_admin";

function getBackofficeNav(staffLevel: BackofficeStaffLevel) {
  const items = [{ href: "/backoffice", label: "Home", icon: Home }];

  if (staffLevel === "support") {
    items.push({ href: "/backoffice/support", label: "Support", icon: LayoutDashboard });
  }

  if (staffLevel === "tutor") {
    items.push({ href: "/backoffice/tutor", label: "Tutor", icon: LayoutDashboard });
  }

  if (staffLevel === "manager") {
    items.push({ href: "/backoffice/manager", label: "Manager", icon: LayoutDashboard });
  }

  if (staffLevel === "super_admin") {
    items.push(
      { href: "/backoffice/super-admin", label: "Super Admin", icon: LayoutDashboard },
      { href: "/backoffice/manager", label: "Manager Queue", icon: LayoutDashboard },
      { href: "/backoffice/super-admin/referrals", label: "Referrals", icon: LayoutDashboard },
      { href: "/backoffice/super-admin/colleges", label: "College Catalog", icon: LayoutDashboard }
    );
  }

  return items;
}

export function BackofficeShell({
  title,
  subtitle,
  levelLabel,
  staffLevel,
  children,
}: {
  title: string;
  subtitle: string;
  levelLabel: string;
  staffLevel: BackofficeStaffLevel;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const navItems = getBackofficeNav(staffLevel);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
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
          <div className="flex flex-wrap gap-2">
            <Link href="/backoffice">
              <Button variant="outline" className="border-slate-600 bg-transparent text-slate-100 hover:bg-slate-800 hover:text-slate-100 transition-colors duration-150">
                <Home className="mr-2 h-4 w-4" />
                Backoffice Home
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="outline" className="border-slate-600 bg-transparent text-slate-100 hover:bg-slate-800 hover:text-slate-100 transition-colors duration-150">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Student View
              </Button>
            </Link>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 rounded-xl border border-slate-800 bg-slate-900/80 p-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== "/backoffice" && pathname?.startsWith(`${item.href}/`));

            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant="outline"
                  className={
                    isActive
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/15 hover:text-emerald-100 transition-colors duration-150"
                      : "border-slate-700 bg-transparent text-slate-200 hover:bg-slate-800 hover:text-slate-100 transition-colors duration-150"
                  }
                >
                  <Icon className="mr-2 h-4 w-4" />
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </div>

        {children}
      </div>
    </div>
  );
}
