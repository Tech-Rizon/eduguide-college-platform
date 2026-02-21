"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Bot,
  CheckCircle2,
  Clock3,
  DollarSign,
  Globe,
  GraduationCap,
  Landmark,
  MessageSquareHeart,
  PhoneCall,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  Users,
} from "lucide-react";

type StudentPath = {
  title: string;
  description: string;
  actionLabel: string;
  href: string;
  icon: React.ReactNode;
};

const STUDENT_PATHS: StudentPath[] = [
  {
    title: "Find Colleges",
    description: "Build a realistic list with fit, cost, and admissions data.",
    actionLabel: "Start College Discovery",
    href: "/colleges",
    icon: <Search className="h-5 w-5 text-blue-600" />,
  },
  {
    title: "Pay for College",
    description: "Get FAFSA and scholarship playbooks with action deadlines.",
    actionLabel: "Open Aid Playbook",
    href: "/resources#financial-aid",
    icon: <DollarSign className="h-5 w-5 text-emerald-600" />,
  },
  {
    title: "Improve GPA",
    description: "Use tutoring plans and weekly milestones to close gaps.",
    actionLabel: "Book Academic Support",
    href: "/tutoring",
    icon: <Target className="h-5 w-5 text-violet-600" />,
  },
  {
    title: "Transfer Plan",
    description: "Track transfer-ready requirements and credits that count.",
    actionLabel: "Open Transfer Checklist",
    href: "/resources#transfer",
    icon: <Landmark className="h-5 w-5 text-amber-600" />,
  },
  {
    title: "Applications & Essays",
    description: "Get rubrics, timelines, and advisor feedback before submission.",
    actionLabel: "Review Essay Playbook",
    href: "/resources#essays",
    icon: <BookOpen className="h-5 w-5 text-rose-600" />,
  },
  {
    title: "Talk to an Advisor",
    description: "Escalate to a live support queue and get an assigned agent.",
    actionLabel: "Talk to Live Advisor",
    href: "#live-advisor",
    icon: <MessageSquareHeart className="h-5 w-5 text-cyan-600" />,
  },
];

const OUTCOME_METRICS = [
  { value: "10k+", label: "Students Helped" },
  { value: "95%", label: "Application Plan Completion" },
  { value: "$2.4M+", label: "Scholarship Opportunities Tracked" },
  { value: "< 15 min", label: "Live Support First Response SLA" },
];

const SUPPORT_PROMISES = [
  "Live agent response target under 15 minutes during support hours",
  "Every escalated request is queued and linked to a backoffice ticket",
  "Students see status flow: New -> Assigned -> In Progress -> Resolved",
  "Follow-up cadence: 24-hour check-in until resolution",
];

const AUDIENCE_SEGMENTS = [
  { title: "First-Gen Students", href: "/resources#first-gen", color: "bg-blue-100 text-blue-700" },
  { title: "International Students", href: "/resources#international", color: "bg-emerald-100 text-emerald-700" },
  { title: "Transfer Students", href: "/resources#transfer", color: "bg-violet-100 text-violet-700" },
  { title: "Community College Track", href: "/resources#community-college", color: "bg-amber-100 text-amber-700" },
  { title: "Scholarship Seekers", href: "/resources#financial-aid", color: "bg-rose-100 text-rose-700" },
];

const RESOURCE_PLAYBOOKS = [
  { title: "FAFSA Checklist", href: "/resources#financial-aid" },
  { title: "Essay Rubric", href: "/resources#essays" },
  { title: "Transfer Checklist", href: "/resources#transfer" },
  { title: "Admissions Calendar", href: "/resources#admissions-calendar" },
  { title: "Interview Prep", href: "/resources#interview-prep" },
];

function openLiveAdvisor(message?: string, urgent = false) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("eduguide:open-support", {
      detail: {
        live: true,
        message: message ?? "I need support from a live advisor.",
        urgent,
      },
    })
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-blue-50 pb-24 md:pb-0">
      <nav className="flex items-center justify-between p-6 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center space-x-2"
        >
          <GraduationCap className="h-8 w-8 text-cyan-700" />
          <span className="text-2xl font-bold text-slate-900">EduGuide</span>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="hidden md:flex items-center space-x-3">
          <Link href="/colleges">
            <Button variant="ghost">Colleges</Button>
          </Link>
          <Link href="/resources">
            <Button variant="ghost">Resources</Button>
          </Link>
          <Link href="/tutoring">
            <Button variant="ghost">Tutoring</Button>
          </Link>
          <Link href="/register">
            <Button>Start Free Student Plan</Button>
          </Link>
          <Button variant="outline" onClick={() => openLiveAdvisor("I want to talk to a live advisor.")}>
            Talk to Live Advisor
          </Button>
        </motion.div>
      </nav>

      <section className="max-w-7xl mx-auto px-6 pt-12 pb-8">
        <div className="text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-6xl font-black tracking-tight text-slate-900 mb-6"
          >
            Student Support That
            <span className="block text-cyan-700">Gets You to Acceptance</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-slate-600 mb-8 max-w-3xl mx-auto"
          >
            Use guided playbooks, college-fit intelligence, and live advisor escalation to move from uncertainty to
            clear next steps, every week.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-3 justify-center"
          >
            <Link href="/register">
              <Button size="lg" className="text-lg px-8 py-6 bg-cyan-700 hover:bg-cyan-600">
                Start Free Student Plan
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Button
              size="lg"
              variant="outline"
              className="text-lg px-8 py-6 border-cyan-700 text-cyan-800 hover:bg-cyan-50"
              onClick={() => openLiveAdvisor("I need live support for my college journey.")}
            >
              Talk to Live Advisor
              <MessageSquareHeart className="ml-2 h-5 w-5" />
            </Button>
            <Link href="/demo">
              <Button size="lg" variant="outline" className="text-lg px-8 py-6">
                Take 2-minute College Fit Check
                <Bot className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          {OUTCOME_METRICS.map((metric) => (
            <Card key={metric.label} className="border-cyan-200/70">
              <CardContent className="pt-6 text-center">
                <p className="text-3xl font-black text-cyan-700">{metric.value}</p>
                <p className="text-sm text-slate-600 mt-1">{metric.label}</p>
              </CardContent>
            </Card>
          ))}
        </motion.div>
      </section>

      <section className="max-w-7xl mx-auto px-6 mt-16">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
          <h2 className="text-3xl font-bold text-slate-900">Student Success Paths</h2>
          <BadgeCheck className="h-6 w-6 text-emerald-600" />
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {STUDENT_PATHS.map((path) => (
            <Card key={path.title} className="border-l-4 border-l-cyan-700 hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  {path.icon}
                  <CardTitle>{path.title}</CardTitle>
                </div>
                <CardDescription>{path.description}</CardDescription>
              </CardHeader>
              <CardContent>
                {path.href === "#live-advisor" ? (
                  <Button
                    variant="outline"
                    className="w-full border-cyan-700 text-cyan-800 hover:bg-cyan-50"
                    onClick={() => openLiveAdvisor(`I need advisor help for: ${path.title}`)}
                  >
                    {path.actionLabel}
                  </Button>
                ) : (
                  <Link href={path.href}>
                    <Button variant="outline" className="w-full">
                      {path.actionLabel}
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 mt-16">
        <Card className="bg-gradient-to-r from-cyan-700 to-blue-700 text-white border-0">
          <CardContent className="py-10 text-center">
            <h3 className="text-2xl md:text-3xl font-bold">Need a Fast Direction Check?</h3>
            <p className="mt-2 opacity-95">Take the College Fit Check, then escalate to a live advisor when needed.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
              <Link href="/demo">
                <Button size="lg" variant="secondary">
                  Take 2-minute College Fit Check
                </Button>
              </Link>
              <Button
                size="lg"
                variant="outline"
                className="bg-transparent text-white border-white hover:bg-white hover:text-cyan-700"
                onClick={() => openLiveAdvisor("I need live advisor support after the fit check.")}
              >
                Talk to Live Advisor
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="max-w-7xl mx-auto px-6 mt-16">
        <h2 className="text-3xl font-bold text-slate-900 mb-6">Choose Your Student Track</h2>
        <div className="grid md:grid-cols-5 gap-3">
          {AUDIENCE_SEGMENTS.map((segment) => (
            <Link key={segment.title} href={segment.href}>
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6 text-center">
                  <p className={`text-xs font-semibold rounded-full px-2 py-1 inline-block ${segment.color}`}>
                    {segment.title}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 mt-16">
        <div className="grid lg:grid-cols-2 gap-8">
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                Support Operations Promise
              </CardTitle>
              <CardDescription>What happens when you ask for help.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {SUPPORT_PROMISES.map((promise) => (
                <div key={promise} className="flex items-start gap-2 text-sm text-slate-700">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                  <span>{promise}</span>
                </div>
              ))}
              <div className="pt-3">
                <Button
                  className="bg-cyan-700 hover:bg-cyan-600"
                  onClick={() => openLiveAdvisor("I need immediate help with my application plan.", true)}
                >
                  <Clock3 className="h-4 w-4 mr-2" />
                  Urgent? Escalate to Support Team Now
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-cyan-700" />
                Resource Hub + Playbooks
              </CardTitle>
              <CardDescription>Use in-app guides and downloadable checklists.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {RESOURCE_PLAYBOOKS.map((resource) => (
                <div key={resource.title} className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                  <p className="text-sm font-medium text-slate-800">{resource.title}</p>
                  <Link href={resource.href}>
                    <Button size="sm" variant="outline">
                      Open
                    </Button>
                  </Link>
                </div>
              ))}
              <Link href="/resources">
                <Button className="w-full bg-cyan-700 hover:bg-cyan-600">
                  Open Full Resource Hub
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 mt-16">
        <h2 className="text-3xl font-bold text-slate-900 text-center mb-8">What Students Say</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              name: "Maria G.",
              quote: "EduGuide turned my random list into a real transfer plan.",
            },
            {
              name: "James T.",
              quote: "The support queue actually gave me an assigned agent and clear next actions.",
            },
            {
              name: "David K.",
              quote: "I found scholarships I was missing and completed applications on time.",
            },
          ].map((testimonial) => (
            <Card key={testimonial.name}>
              <CardContent className="pt-6">
                <div className="flex gap-1 mb-3">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <Star key={rating} className="h-4 w-4 text-amber-500 fill-current" />
                  ))}
                </div>
                <p className="text-slate-600 italic mb-4">"{testimonial.quote}"</p>
                <p className="font-semibold text-slate-900">- {testimonial.name}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 mt-16 mb-20">
        <Card className="bg-gradient-to-r from-slate-900 to-cyan-900 text-white border-0">
          <CardContent className="py-12 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready for a Structured College Plan?</h2>
            <p className="text-lg opacity-90 max-w-2xl mx-auto">
              Start free, follow your student track, and escalate to live advisor support when you need human help.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
              <Link href="/register">
                <Button size="lg" variant="secondary">
                  Start Free Student Plan
                </Button>
              </Link>
              <Button
                size="lg"
                variant="outline"
                className="bg-transparent text-white border-white hover:bg-white hover:text-cyan-800"
                onClick={() => openLiveAdvisor("I want to talk with a live advisor before applying.")}
              >
                <PhoneCall className="h-4 w-4 mr-2" />
                Talk to Live Advisor
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      <footer className="bg-slate-900 text-slate-300">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <div className="flex items-center gap-2 mb-3">
            <GraduationCap className="h-5 w-5 text-cyan-400" />
            <span className="font-semibold text-white">EduGuide</span>
          </div>
          <p className="text-sm text-slate-400">
            Structured student support for college discovery, admissions, financial aid, and live advisor escalation.
          </p>
          <p className="text-xs text-slate-500 mt-4">© 2026 EduGuide. All rights reserved.</p>
        </div>
      </footer>

      <div className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur p-3 flex gap-2">
        <Link href="/register" className="flex-1">
          <Button className="w-full bg-cyan-700 hover:bg-cyan-600">Start Free Student Plan</Button>
        </Link>
        <Button variant="outline" className="flex-1 border-cyan-700 text-cyan-700" onClick={() => openLiveAdvisor()}>
          Talk to Live Advisor
        </Button>
      </div>
    </div>
  );
}
