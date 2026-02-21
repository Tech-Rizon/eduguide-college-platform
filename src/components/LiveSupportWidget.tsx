"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import {
  Headphones,
  X,
  Send,
  User,
  MinusCircle,
  Compass,
  LifeBuoy,
  CreditCard,
  GraduationCap,
  MessageSquareHeart,
  TriangleAlert,
} from "lucide-react";

type Sender = "user" | "agent";
type WidgetMode = "playbook" | "live";

type SupportMessage = {
  id: string;
  content: string;
  sender: Sender;
  timestamp: Date;
};

type LiveTicket = {
  id: string;
  status: string;
  priority: string;
  assigned_team: string | null;
  assigned_to_user_id: string | null;
  created_at: string;
  updated_at: string;
};

type PlaybookAction = {
  id: string;
  title: string;
  summary: string;
  prompt: string;
  response: string;
  ctaLabel?: string;
  ctaHref?: string;
};

type OpenSupportDetail = {
  live?: boolean;
  message?: string;
  urgent?: boolean;
};

const PLAYBOOK_ACTIONS: PlaybookAction[] = [
  {
    id: "college-plan",
    title: "College Match Plan",
    summary: "Build a short list in 3 steps",
    prompt: "I need help finding colleges that fit me.",
    response:
      "Playbook:\n1. Tell us GPA, intended major, and preferred state.\n2. Use /colleges for filters and /demo for guided AI matching.\n3. Save 5 target schools and compare tuition, transfer options, and deadlines.",
    ctaLabel: "Open College Finder",
    ctaHref: "/colleges",
  },
  {
    id: "account-recovery",
    title: "Account Recovery",
    summary: "Login and profile troubleshooting",
    prompt: "I need help with login or account access.",
    response:
      "Playbook:\n1. Reset access at /forgot-password.\n2. Sign in and verify profile data at /profile.\n3. If MFA is required, complete verification in the MFA setup flow before backoffice actions.",
    ctaLabel: "Reset Password",
    ctaHref: "/forgot-password",
  },
  {
    id: "tutoring-guidance",
    title: "Tutoring Guidance",
    summary: "Pick the right tutoring plan",
    prompt: "Help me choose a tutoring plan.",
    response:
      "Playbook:\n1. Define your goal: coursework, application essays, or transfer strategy.\n2. Compare Basic, Premium, and Elite outcomes on /tutoring.\n3. Book your first session and keep weekly milestones.",
    ctaLabel: "View Tutoring Plans",
    ctaHref: "/tutoring",
  },
  {
    id: "financial-aid",
    title: "Financial Aid",
    summary: "Scholarship and FAFSA checklist",
    prompt: "I need financial aid and scholarship help.",
    response:
      "Playbook:\n1. Start FAFSA early and gather tax/identity documents.\n2. Build a scholarship tracker with due dates.\n3. Ask schools about grants, work-study, and transfer aid eligibility.",
    ctaLabel: "Open Help Center",
    ctaHref: "/help",
  },
];

const PLAYBOOK_WELCOME =
  "Support Playbook is ready. Choose a guided path below, or ask your question in plain language. If needed, you can escalate to a live agent and continue in a backoffice-linked conversation.";

function createMessage(content: string, sender: Sender): SupportMessage {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    content,
    sender,
    timestamp: new Date(),
  };
}

function matchPlaybookAction(text: string): PlaybookAction | null {
  const lower = text.toLowerCase();

  if (/\b(college|school|major|transfer|gpa|admission)\b/.test(lower)) {
    return PLAYBOOK_ACTIONS.find((entry) => entry.id === "college-plan") ?? null;
  }
  if (/\b(login|password|account|profile|mfa|sign in)\b/.test(lower)) {
    return PLAYBOOK_ACTIONS.find((entry) => entry.id === "account-recovery") ?? null;
  }
  if (/\b(tutor|tutoring|plan|session|essay)\b/.test(lower)) {
    return PLAYBOOK_ACTIONS.find((entry) => entry.id === "tutoring-guidance") ?? null;
  }
  if (/\b(fafsa|aid|scholarship|grant|tuition|financial)\b/.test(lower)) {
    return PLAYBOOK_ACTIONS.find((entry) => entry.id === "financial-aid") ?? null;
  }

  return null;
}

function wantsLiveAgent(text: string): boolean {
  return /\b(agent|human|person|representative|live chat|real support|talk to someone)\b/i.test(text);
}

export default function LiveSupportWidget() {
  const { user, session, loading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [mode, setMode] = useState<WidgetMode>("playbook");
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncingThread, setIsSyncingThread] = useState(false);
  const [ticket, setTicket] = useState<LiveTicket | null>(null);
  const [isStaffAccount, setIsStaffAccount] = useState<boolean | null>(null);
  const [unread, setUnread] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);
  const lastLiveMessageCountRef = useRef(0);

  const authHeaders = useMemo(
    () => ({
      Authorization: `Bearer ${session?.access_token}`,
      "Content-Type": "application/json",
    }),
    [session?.access_token]
  );

  const appendMessage = useCallback((content: string, sender: Sender) => {
    setMessages((prev) => [...prev, createMessage(content, sender)]);
  }, []);

  useEffect(() => {
    if (!session?.access_token) {
      setIsStaffAccount(null);
      return;
    }

    let cancelled = false;
    const loadRole = async () => {
      try {
        const response = await fetch("/api/user-role", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });
        if (!response.ok || cancelled) return;
        const payload = await response.json();
        if (!cancelled) {
          setIsStaffAccount(Boolean(payload?.isStaffView));
        }
      } catch {
        // Leave as unknown and continue with runtime checks.
      }
    };

    void loadRole();
    return () => {
      cancelled = true;
    };
  }, [session?.access_token]);

  useEffect(() => {
    if (!isOpen) return;
    if (initializedRef.current) return;

    initializedRef.current = true;
    setMessages([createMessage(PLAYBOOK_WELCOME, "agent")]);
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const syncLiveThread = useCallback(
    async (ticketId: string, quiet = false) => {
      if (!session?.access_token) return;

      if (!quiet) {
        setIsSyncingThread(true);
      }

      try {
        const response = await fetch(`/api/backoffice/tickets/messages?ticketId=${encodeURIComponent(ticketId)}`, {
          headers: authHeaders,
        });
        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(payload?.error ?? "Failed to load live conversation.");
        }

        const mapped: SupportMessage[] = (payload?.messages ?? []).map((message: any) => ({
          id: message.id,
          content: message.body,
          sender: message.author_user_id === user?.id ? "user" : "agent",
          timestamp: message.created_at ? new Date(message.created_at) : new Date(),
        }));

        const nextMessages =
          mapped.length > 0
            ? mapped
            : [createMessage("Live chat is connected. A support agent will reply shortly.", "agent")];

        if (isMinimized || !isOpen) {
          const previousCount = lastLiveMessageCountRef.current;
          if (nextMessages.length > previousCount) {
            const newIncoming = nextMessages
              .slice(previousCount)
              .filter((message) => message.sender === "agent").length;
            if (newIncoming > 0) {
              setUnread((prev) => prev + newIncoming);
            }
          }
        }

        lastLiveMessageCountRef.current = nextMessages.length;
        setMessages(nextMessages);
      } catch (error) {
        if (!quiet) {
          const message = error instanceof Error ? error.message : "Failed to sync live conversation.";
          toast.error(message);
        }
      } finally {
        if (!quiet) {
          setIsSyncingThread(false);
        }
      }
    },
    [authHeaders, isMinimized, isOpen, session?.access_token, user?.id]
  );

  const startLiveChat = useCallback(
    async (
      initialMessage?: string,
      options?: {
        switchMode?: boolean;
        silent?: boolean;
      }
    ) => {
      if (loading) return;
      const shouldSwitchMode = options?.switchMode ?? true;
      const silent = options?.silent ?? false;

      if (!user || !session?.access_token) {
        if (!silent) {
          appendMessage(
            "Live agent chat requires sign-in so we can link your messages to a secure backoffice conversation. Sign in first, then tap 'Talk to Live Agent' again. You can also use /contact.",
            "agent"
          );
        }
        return;
      }

      if (isStaffAccount === true) {
        if (!silent) {
          appendMessage(
            "This live widget is for student requests. Staff should respond from backoffice dashboards.",
            "agent"
          );
        }
        return;
      }

      if (!silent) {
        setIsConnecting(true);
      }
      try {
        const response = await fetch("/api/live-support/session", {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({
            initialMessage: initialMessage?.trim() || undefined,
          }),
        });
        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(payload?.error ?? "Failed to connect live support.");
        }

        const liveTicket = payload?.ticket as LiveTicket | null;
        if (!liveTicket?.id) {
          throw new Error("Live support session did not return a ticket.");
        }

        setTicket(liveTicket);

        if (shouldSwitchMode) {
          setMode("live");
          setUnread(0);
          lastLiveMessageCountRef.current = 0;
          setMessages([
            createMessage(
              payload?.created
                ? "Live chat started. Your message thread is now connected to backoffice support."
                : "Resumed your active live support conversation.",
              "agent"
            ),
          ]);
          await syncLiveThread(liveTicket.id);
        } else if (payload?.created && !silent) {
          appendMessage(
            "Your request is now queued in support and linked to a backoffice ticket. Tap 'Talk to Live Agent' to open the live conversation.",
            "agent"
          );
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to start live chat.";
        if (!silent) {
          const likelyPermissionMessage = message.toLowerCase().includes("student accounts only")
            ? "Live chat from this widget is limited to student accounts."
            : message;
          toast.error(likelyPermissionMessage);
          appendMessage(`I couldn't connect to a live agent right now. ${likelyPermissionMessage}`, "agent");
        }
      } finally {
        if (!silent) {
          setIsConnecting(false);
        }
      }
    },
    [appendMessage, authHeaders, isStaffAccount, loading, session?.access_token, syncLiveThread, user]
  );

  useEffect(() => {
    const onOpenSupport = (event: Event) => {
      const customEvent = event as CustomEvent<OpenSupportDetail>;
      const detail = customEvent.detail ?? {};

      setIsOpen(true);
      setIsMinimized(false);
      setUnread(0);

      const normalizedMessage = typeof detail.message === "string" ? detail.message.trim() : "";
      const liveRequested = detail.live !== false;
      const urgentSuffix = detail.urgent ? "\n\nPriority: urgent escalation requested from support CTA." : "";
      const initialMessage = normalizedMessage ? `${normalizedMessage}${urgentSuffix}` : undefined;

      if (liveRequested) {
        void startLiveChat(initialMessage);
      } else if (normalizedMessage) {
        setInput(normalizedMessage);
      }
    };

    window.addEventListener("eduguide:open-support", onOpenSupport as EventListener);
    return () => {
      window.removeEventListener("eduguide:open-support", onOpenSupport as EventListener);
    };
  }, [startLiveChat]);

  useEffect(() => {
    if (!isOpen || loading || !session?.access_token || mode === "live") return;

    let cancelled = false;

    const resumeIfNeeded = async () => {
      try {
        const response = await fetch("/api/live-support/session", {
          headers: authHeaders,
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) return;
        if (cancelled) return;

        const existingTicket = payload?.ticket as LiveTicket | null;
        if (!existingTicket?.id) return;

        setMode("live");
        setTicket(existingTicket);
        setMessages([
          createMessage("Found an active support conversation. Reconnecting now.", "agent"),
        ]);
        lastLiveMessageCountRef.current = 0;
        await syncLiveThread(existingTicket.id);
      } catch {
        // Silent fallback - playbook mode remains available.
      }
    };

    void resumeIfNeeded();

    return () => {
      cancelled = true;
    };
  }, [authHeaders, isOpen, loading, mode, session?.access_token, syncLiveThread]);

  useEffect(() => {
    if (!isOpen || isMinimized || mode !== "live" || !ticket?.id || !session?.access_token) return;

    const interval = window.setInterval(() => {
      void syncLiveThread(ticket.id, true);
    }, 7000);

    return () => window.clearInterval(interval);
  }, [isMinimized, isOpen, mode, session?.access_token, syncLiveThread, ticket?.id]);

  const handlePlaybookAction = (action: PlaybookAction) => {
    appendMessage(action.prompt, "user");
    setIsTyping(true);

    window.setTimeout(() => {
      appendMessage(action.response, "agent");
      setIsTyping(false);
    }, 500);
  };

  const sendMessage = async () => {
    const value = input.trim();
    if (!value) return;

    if (mode === "live") {
      setInput("");

      if (!ticket?.id) {
        await startLiveChat(value);
        return;
      }

      appendMessage(value, "user");

      try {
        const response = await fetch("/api/backoffice/tickets/messages", {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({
            ticketId: ticket.id,
            body: value,
            visibility: "public",
          }),
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(payload?.error ?? "Failed to send live message.");
        }

        await syncLiveThread(ticket.id, true);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to send live message.";
        toast.error(message);
      }

      return;
    }

    appendMessage(value, "user");
    setInput("");

    if (user && session?.access_token && isStaffAccount === false) {
      // Queue every student question to support while keeping playbook guidance available.
      void startLiveChat(value, { switchMode: false, silent: true });
    }

    setIsTyping(true);

    if (wantsLiveAgent(value)) {
      window.setTimeout(async () => {
        setIsTyping(false);
        await startLiveChat(value);
      }, 450);
      return;
    }

    const match = matchPlaybookAction(value);
    window.setTimeout(() => {
      if (match) {
        appendMessage(match.response, "agent");
      } else {
        appendMessage(
          "I can help with college matching, tutoring, account recovery, or financial aid. Use the playbook shortcuts below, or ask for a live agent to open a backoffice-linked chat.",
          "agent"
        );
      }
      setIsTyping(false);
    }, 500);
  };

  const toggleOpen = () => {
    setIsOpen((prev) => {
      const next = !prev;
      if (next) setUnread(0);
      return next;
    });
    setIsMinimized(false);
  };

  const resetToPlaybook = () => {
    setMode("playbook");
    setTicket(null);
    setMessages([createMessage(PLAYBOOK_WELCOME, "agent")]);
    lastLiveMessageCountRef.current = 0;
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {isOpen && !isMinimized && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.92 }}
            className="mb-4"
          >
            <Card className="w-80 sm:w-[26rem] shadow-2xl border-cyan-700/40 bg-slate-950 text-slate-100">
              <CardHeader className="bg-gradient-to-r from-cyan-700 to-blue-700 rounded-t-lg py-3 px-4">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Headphones className="h-4 w-4" />
                    Support Desk
                    <Badge variant="secondary" className="bg-emerald-500 text-emerald-950 text-xs">
                      {mode === "live" ? "Live" : "Playbook"}
                    </Badge>
                  </CardTitle>
                  <div className="flex gap-1">
                    <button onClick={() => setIsMinimized(true)} className="p-1 hover:bg-white/15 rounded">
                      <MinusCircle className="h-4 w-4" />
                    </button>
                    <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/15 rounded">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {mode === "live" && ticket?.id && (
                  <p className="text-[11px] text-cyan-100/90 mt-1">
                    Linked ticket: {ticket.id.slice(0, 8)}... | Status: {ticket.status}
                  </p>
                )}
              </CardHeader>

              <CardContent className="p-0">
                {mode === "playbook" && (
                  <div className="border-b border-slate-800 p-3 space-y-2 bg-slate-900/80">
                    <p className="text-[11px] uppercase tracking-wide text-slate-400">Guided Playbooks</p>
                    <div className="grid grid-cols-2 gap-2">
                      {PLAYBOOK_ACTIONS.map((action) => (
                        <button
                          key={action.id}
                          type="button"
                          onClick={() => handlePlaybookAction(action)}
                          className="text-left rounded-md border border-slate-700 bg-slate-900 px-2 py-2 hover:border-cyan-500/50 transition-colors"
                        >
                          <p className="text-xs font-medium text-slate-100">{action.title}</p>
                          <p className="text-[11px] text-slate-400 mt-1">{action.summary}</p>
                        </button>
                      ))}
                    </div>
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          className="h-8 text-xs bg-emerald-600 hover:bg-emerald-500"
                          disabled={isConnecting || isStaffAccount === true}
                          onClick={() => void startLiveChat()}
                        >
                          <MessageSquareHeart className="h-3 w-3 mr-1" />
                          Talk to Live Agent
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs border-rose-400 text-rose-200 hover:bg-rose-500/20"
                          disabled={isConnecting || isStaffAccount === true}
                          onClick={() =>
                            void startLiveChat(
                              "Urgent: I need immediate help and queue escalation from the live support team."
                            )
                          }
                        >
                          <TriangleAlert className="h-3 w-3 mr-1" />
                          Urgent Escalation
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        {isStaffAccount === true && (
                          <Link href="/backoffice" className="text-[11px] text-cyan-300 hover:underline self-center">
                            Open Backoffice
                          </Link>
                        )}
                        {!user && (
                          <Link href="/login" className="text-[11px] text-cyan-300 hover:underline self-center">
                            Sign in for live chat
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {mode === "live" && (
                  <div className="border-b border-slate-800 p-3 flex items-center justify-between bg-slate-900/80">
                    <p className="text-[11px] text-slate-300">
                      Messages are synced with backoffice agents in real time.
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-[11px] border-slate-700 bg-transparent hover:bg-slate-800"
                      onClick={resetToPlaybook}
                    >
                      Back to Playbook
                    </Button>
                  </div>
                )}

                <div className="h-80 overflow-y-auto p-3 space-y-3 bg-slate-950">
                  {messages.map((message) => (
                    <div key={message.id} className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`flex gap-2 max-w-[88%] ${message.sender === "user" ? "flex-row-reverse" : ""}`}>
                        <div
                          className={`h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                            message.sender === "user" ? "bg-blue-600/25" : "bg-emerald-600/25"
                          }`}
                        >
                          {message.sender === "user" ? (
                            <User className="h-3 w-3 text-blue-300" />
                          ) : (
                            <Headphones className="h-3 w-3 text-emerald-300" />
                          )}
                        </div>
                        <div
                          className={`rounded-lg px-3 py-2 text-xs leading-relaxed ${
                            message.sender === "user" ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-100"
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{message.content}</p>
                          <p className={`text-[10px] mt-1 ${message.sender === "user" ? "text-blue-100/80" : "text-slate-400"}`}>
                            {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}

                  {isTyping && (
                    <div className="flex gap-2">
                      <div className="h-6 w-6 rounded-full bg-emerald-600/25 flex items-center justify-center flex-shrink-0">
                        <Headphones className="h-3 w-3 text-emerald-300" />
                      </div>
                      <div className="bg-slate-800 rounded-lg px-3 py-2">
                        <div className="flex gap-1">
                          <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" />
                          <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                          <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                        </div>
                      </div>
                    </div>
                  )}

                  {(isConnecting || isSyncingThread) && (
                    <div className="text-[11px] text-slate-400 text-center">
                      {isConnecting ? "Connecting to live support..." : "Syncing conversation..."}
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {mode === "playbook" && (
                  <div className="border-t border-slate-800 px-3 py-2 flex items-center gap-2 text-[11px] text-slate-400">
                    <Compass className="h-3.5 w-3.5 text-cyan-400" />
                    <span>Playbook gives guided paths. Live chat opens a backoffice conversation.</span>
                  </div>
                )}

                {mode === "playbook" && (
                  <div className="px-3 pb-2 flex gap-2 text-[11px]">
                    <Link href="/colleges" className="inline-flex items-center gap-1 text-cyan-300 hover:underline">
                      <GraduationCap className="h-3 w-3" />
                      Colleges
                    </Link>
                    <Link href="/tutoring" className="inline-flex items-center gap-1 text-cyan-300 hover:underline">
                      <LifeBuoy className="h-3 w-3" />
                      Tutoring
                    </Link>
                    <Link href="/help" className="inline-flex items-center gap-1 text-cyan-300 hover:underline">
                      <CreditCard className="h-3 w-3" />
                      Help
                    </Link>
                  </div>
                )}

                <div className="border-t border-slate-800 p-3 bg-slate-950">
                  <div className="flex gap-2">
                    <Input
                      value={input}
                      onChange={(event) => setInput(event.target.value)}
                      placeholder={mode === "live" ? "Message your support agent..." : "Ask for a playbook or type your question..."}
                      className="text-xs h-8 bg-slate-900 border-slate-700 text-slate-100"
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          void sendMessage();
                        }
                      }}
                      disabled={isConnecting}
                    />
                    <Button size="sm" className="h-8 px-3 bg-cyan-600 hover:bg-cyan-500" onClick={() => void sendMessage()} disabled={!input.trim() || isConnecting}>
                      <Send className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 text-center">
                    {mode === "live"
                      ? "Live chat is linked to your backoffice support ticket."
                      : "Escalate anytime to a live agent."}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={toggleOpen}
        className="relative h-14 w-14 rounded-full bg-cyan-600 text-white shadow-lg flex items-center justify-center hover:bg-cyan-500 transition-colors"
      >
        {isOpen ? <X className="h-6 w-6" /> : <Headphones className="h-6 w-6" />}
        {unread > 0 && !isOpen && (
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-rose-500 text-white text-xs flex items-center justify-center">
            {unread}
          </span>
        )}
      </motion.button>
    </div>
  );
}
