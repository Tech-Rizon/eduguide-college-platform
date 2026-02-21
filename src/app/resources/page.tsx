"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CalendarDays, Download, GraduationCap, LifeBuoy, MessageSquareHeart } from "lucide-react";

type Playbook = {
  id: string;
  title: string;
  audience: string;
  summary: string;
  steps: string[];
  actionHref: string;
  actionLabel: string;
  advisorPrompt: string;
};

const PLAYBOOKS: Playbook[] = [
  {
    id: "financial-aid",
    title: "FAFSA + Scholarship Checklist",
    audience: "Scholarship seekers",
    summary: "Get aid paperwork done early and track every deadline.",
    steps: [
      "Create your FAFSA account and gather required identity/tax docs.",
      "Build a scholarship tracker with due dates and essay requirements.",
      "Submit aid documents before college priority deadlines.",
    ],
    actionHref: "/help",
    actionLabel: "Open Financial Aid Help",
    advisorPrompt: "I need support reviewing my FAFSA and scholarship checklist.",
  },
  {
    id: "essays",
    title: "Application + Essay Rubric",
    audience: "Application builders",
    summary: "Structure strong essays and finalize submissions on time.",
    steps: [
      "Draft a core personal statement and map variants per school.",
      "Run the rubric pass: clarity, impact, authenticity, and fit.",
      "Schedule final advisor review before submission windows close.",
    ],
    actionHref: "/tutoring",
    actionLabel: "Open Essay Support",
    advisorPrompt: "I need an advisor to review my application essay strategy.",
  },
  {
    id: "transfer",
    title: "Transfer Readiness Checklist",
    audience: "Transfer students",
    summary: "Verify credits, prerequisite completion, and transfer policy fit.",
    steps: [
      "Map completed classes to destination program prerequisites.",
      "Confirm credit transfer policy and minimum GPA requirements.",
      "Prepare transcripts, recommendation letters, and deadline calendar.",
    ],
    actionHref: "/colleges",
    actionLabel: "Compare Transfer-Friendly Colleges",
    advisorPrompt: "I need help validating my transfer plan and credit mapping.",
  },
  {
    id: "admissions-calendar",
    title: "Admissions Calendar",
    audience: "All applicants",
    summary: "Build a clear timeline from shortlist to acceptance decision.",
    steps: [
      "Set target schools and category deadlines (early, regular, transfer).",
      "Back-plan essays, test windows, recommendations, and fee waivers.",
      "Set weekly status checks for each application milestone.",
    ],
    actionHref: "/dashboard",
    actionLabel: "Track Next Steps in Dashboard",
    advisorPrompt: "Please help me build an admissions calendar for my shortlist.",
  },
  {
    id: "interview-prep",
    title: "Interview Prep Guide",
    audience: "Interview candidates",
    summary: "Prepare concise stories and confident responses for admissions interviews.",
    steps: [
      "Draft responses for motivation, fit, goals, and resilience prompts.",
      "Practice 20-minute mock interview blocks and improve delivery.",
      "Create a follow-up plan and questions for admissions officers.",
    ],
    actionHref: "/tutoring-support",
    actionLabel: "Book Interview Coaching",
    advisorPrompt: "I need live interview prep and mock session guidance.",
  },
];

const AUDIENCE_TRACKS = [
  { id: "first-gen", label: "First-Gen Students", note: "Start with aid + admissions timeline." },
  { id: "international", label: "International Students", note: "Focus on visa, transcript evaluation, and deadlines." },
  { id: "community-college", label: "Community College Track", note: "Use transfer and cost-first planning." },
];

function openLiveAdvisor(message: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("eduguide:open-support", {
      detail: {
        live: true,
        message,
      },
    })
  );
}

function downloadChecklist(playbook: Playbook) {
  if (typeof window === "undefined") return;

  const body = [
    `${playbook.title}`,
    "",
    `Audience: ${playbook.audience}`,
    `Summary: ${playbook.summary}`,
    "",
    "Checklist:",
    ...playbook.steps.map((step, index) => `${index + 1}. ${step}`),
    "",
    "Need help? Use EduGuide live support to escalate to an advisor.",
  ].join("\n");

  const blob = new Blob([body], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${playbook.id}-checklist.txt`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export default function ResourcesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-blue-50">
      <nav className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <GraduationCap className="h-8 w-8 text-cyan-700" />
          <span className="text-2xl font-bold text-slate-900">EduGuide</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Home
            </Button>
          </Link>
          <Link href="/register">
            <Button>Start Free Student Plan</Button>
          </Link>
        </div>
      </nav>

      <section className="max-w-7xl mx-auto px-6 pb-8">
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900">
            Student Resource Hub
          </h1>
          <p className="text-lg text-slate-600 mt-3 max-w-3xl mx-auto">
            Use in-app playbooks, download checklists, and escalate to live advisors when you need direct support.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
            <Link href="/dashboard">
              <Button size="lg">Open My Dashboard</Button>
            </Link>
            <Button
              size="lg"
              variant="outline"
              onClick={() =>
                openLiveAdvisor("I need help choosing the right student playbook and next action.")
              }
            >
              <MessageSquareHeart className="h-4 w-4 mr-2" />
              Talk to Live Advisor
            </Button>
          </div>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Audience Tracks</CardTitle>
            <CardDescription>Choose your path and use the matching playbooks below.</CardDescription>
          </CardHeader>
          <CardContent className="grid md:grid-cols-3 gap-3">
            {AUDIENCE_TRACKS.map((track) => (
              <div key={track.id} id={track.id} className="rounded-lg border p-3 bg-white">
                <Badge variant="secondary">{track.label}</Badge>
                <p className="text-sm text-slate-600 mt-2">{track.note}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-2 gap-5">
          {PLAYBOOKS.map((playbook) => (
            <Card key={playbook.id} id={playbook.id} className="border-slate-200">
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2">
                  <span>{playbook.title}</span>
                  <Badge>{playbook.audience}</Badge>
                </CardTitle>
                <CardDescription>{playbook.summary}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ol className="space-y-2 text-sm text-slate-700 list-decimal list-inside">
                  {playbook.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
                <div className="flex flex-wrap gap-2">
                  <Link href={playbook.actionHref}>
                    <Button size="sm">
                      <LifeBuoy className="h-3.5 w-3.5 mr-1" />
                      {playbook.actionLabel}
                    </Button>
                  </Link>
                  <Button size="sm" variant="outline" onClick={() => downloadChecklist(playbook)}>
                    <Download className="h-3.5 w-3.5 mr-1" />
                    Download Checklist
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openLiveAdvisor(playbook.advisorPrompt)}>
                    <MessageSquareHeart className="h-3.5 w-3.5 mr-1" />
                    Ask Advisor
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 pb-16">
        <Card className="bg-slate-900 text-white border-0">
          <CardContent className="py-8 text-center">
            <h2 className="text-2xl font-bold">Need Immediate Support?</h2>
            <p className="text-slate-300 mt-2">
              Escalate now and get your request queued with a live advisor.
            </p>
            <Button
              className="mt-5 bg-cyan-600 hover:bg-cyan-500"
              onClick={() =>
                openLiveAdvisor(
                  "Urgent: I need immediate support from a live advisor and ticket assignment."
                )
              }
            >
              <CalendarDays className="h-4 w-4 mr-2" />
              Urgent? Escalate to Support Team Now
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
