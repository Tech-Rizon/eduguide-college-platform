"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  GraduationCap,
  ArrowLeft,
  Upload,
  FileText,
  Trash2,
  Send,
  Bot,
  BookOpen,
  Loader2,
  ChevronDown,
  ChevronUp,
  Clipboard,
  Zap,
  Brain,
  PenLine,
  CheckSquare,
  FileEdit,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";

interface Course {
  id: string;
  name: string;
  code: string | null;
  professor: string | null;
  semester: string | null;
  color: string;
}

interface CourseDocument {
  id: string;
  name: string;
  file_name: string | null;
  doc_type: "upload" | "paste";
  char_count: number | null;
  chunk_count: number | null;
  status: "processing" | "ready" | "failed";
  error_message: string | null;
  created_at: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "ai";
  content: string;
  sources?: Array<{ documentName: string; preview: string; similarity: number }>;
  sourcesOpen?: boolean;
}

type ActiveTab = "materials" | "chat" | "notes" | "workspace";
type NoteMode = "notes" | "flashcards" | "exam";

const STATUS_COLORS: Record<string, string> = {
  processing: "bg-yellow-100 text-yellow-800",
  ready: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
};

export default function CourseDetailPage() {
  const params = useParams();
  const courseId = params.id as string;
  const router = useRouter();
  const { session, loading: authLoading } = useAuth();

  const [course, setCourse] = useState<Course | null>(null);
  const [documents, setDocuments] = useState<CourseDocument[]>([]);
  const [loadingPage, setLoadingPage] = useState(true);

  const [activeTab, setActiveTab] = useState<ActiveTab>("materials");

  // Materials tab
  const [isUploading, setIsUploading] = useState(false);
  const [pasteName, setPasteName] = useState("");
  const [pasteContent, setPasteContent] = useState("");
  const [isPasting, setIsPasting] = useState(false);
  const [showPasteForm, setShowPasteForm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Chat tab
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Notes tab
  const [noteTopic, setNoteTopic] = useState("");
  const [noteDocumentId, setNoteDocumentId] = useState<string>("");
  const [noteMode, setNoteMode] = useState<NoteMode>("notes");
  const [noteOutput, setNoteOutput] = useState("");
  const [isNoteLoading, setIsNoteLoading] = useState(false);

  // Workspace tab
  const [assignmentDesc, setAssignmentDesc] = useState("");
  const [rubric, setRubric] = useState("");
  const [draft, setDraft] = useState("");
  const [workspaceOutput, setWorkspaceOutput] = useState("");
  const [isWorkspaceLoading, setIsWorkspaceLoading] = useState(false);

  const fetchCourse = useCallback(
    async (token: string) => {
      const res = await fetch(`/api/courses/${courseId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = (await res.json()) as { course: Course };
        setCourse(data.course);
      } else if (res.status === 404) {
        router.push("/dashboard/courses");
      }
    },
    [courseId, router],
  );

  const fetchDocuments = useCallback(
    async (token: string) => {
      const res = await fetch(`/api/courses/${courseId}/documents`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = (await res.json()) as { documents: CourseDocument[] };
        setDocuments(data.documents ?? []);
      }
    },
    [courseId],
  );

  useEffect(() => {
    if (authLoading) return;
    if (!session) {
      router.push("/login");
      return;
    }
    Promise.all([fetchCourse(session.access_token), fetchDocuments(session.access_token)]).finally(
      () => setLoadingPage(false),
    );
  }, [authLoading, session, router, fetchCourse, fetchDocuments]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // PDF Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !session?.access_token) return;
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Only PDF files are supported");
      return;
    }
    setIsUploading(true);
    try {
      const urlRes = await fetch(`/api/courses/${courseId}/documents/upload-url`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ fileName: file.name, contentType: "application/pdf" }),
      });
      if (!urlRes.ok) {
        toast.error("Could not get upload URL");
        return;
      }
      const { uploadUrl, documentId } = (await urlRes.json()) as {
        uploadUrl: string;
        documentId: string;
      };

      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/pdf" },
        body: file,
      });
      if (!uploadRes.ok) {
        toast.error("Upload failed");
        return;
      }

      toast("Processing PDF…", { icon: "⚙️" });
      const processRes = await fetch(
        `/api/courses/${courseId}/documents/${documentId}/process`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${session.access_token}` },
        },
      );
      if (!processRes.ok) {
        toast.error("PDF processing failed");
      } else {
        toast.success("PDF uploaded and indexed!");
      }
      await fetchDocuments(session.access_token);
    } catch {
      toast.error("Upload failed");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Paste text
  const handlePaste = async () => {
    if (!session?.access_token || !pasteName.trim() || !pasteContent.trim()) return;
    setIsPasting(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/documents/paste`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ name: pasteName.trim(), content: pasteContent.trim() }),
      });
      if (!res.ok) {
        toast.error("Could not save text");
        return;
      }
      toast.success("Text saved and indexed!");
      setPasteName("");
      setPasteContent("");
      setShowPasteForm(false);
      await fetchDocuments(session.access_token);
    } catch {
      toast.error("Could not save text");
    } finally {
      setIsPasting(false);
    }
  };

  // Delete document
  const deleteDocument = async (doc: CourseDocument) => {
    if (!session?.access_token) return;
    if (!confirm(`Remove "${doc.name}"? This will delete its indexed content.`)) return;
    setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
    const res = await fetch(`/api/courses/${courseId}/documents/${doc.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!res.ok) {
      toast.error("Could not delete document");
      await fetchDocuments(session.access_token);
    } else {
      toast.success("Document removed");
    }
  };

  // Chat
  const sendChatMessage = async () => {
    if (!session?.access_token || !chatInput.trim() || isChatLoading) return;
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: chatInput.trim(),
    };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setIsChatLoading(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ message: userMsg.content }),
      });
      if (!res.ok) {
        setChatMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: "ai",
            content: "Sorry, something went wrong. Please try again.",
          },
        ]);
        return;
      }
      const data = (await res.json()) as {
        content: string;
        sources?: Array<{ documentName: string; preview: string; similarity: number }>;
      };
      setChatMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "ai",
          content: data.content,
          sources: data.sources ?? [],
          sourcesOpen: false,
        },
      ]);
    } catch {
      setChatMessages((prev) => [
        ...prev,
        { id: Date.now().toString(), role: "ai", content: "Sorry, something went wrong." },
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const toggleSources = (id: string) => {
    setChatMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, sourcesOpen: !m.sourcesOpen } : m)),
    );
  };

  // Study tools
  const generateNotes = async () => {
    if (!session?.access_token) return;
    setIsNoteLoading(true);
    setNoteOutput("");
    try {
      const res = await fetch(`/api/courses/${courseId}/tools`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          tool: noteMode,
          topic: noteTopic.trim() || undefined,
          documentId: noteDocumentId || undefined,
        }),
      });
      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        toast.error(err.error ?? "Could not generate");
        return;
      }
      const data = (await res.json()) as { content: string };
      setNoteOutput(data.content);
    } catch {
      toast.error("Could not generate");
    } finally {
      setIsNoteLoading(false);
    }
  };

  // Workspace
  const generateWorkspaceFeedback = async () => {
    if (!session?.access_token || !assignmentDesc.trim()) return;
    setIsWorkspaceLoading(true);
    setWorkspaceOutput("");
    try {
      const res = await fetch(`/api/courses/${courseId}/tools`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          tool: "workspace",
          assignmentDesc: assignmentDesc.trim(),
          rubric: rubric.trim() || undefined,
          draft: draft.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        toast.error(err.error ?? "Could not generate feedback");
        return;
      }
      const data = (await res.json()) as { content: string };
      setWorkspaceOutput(data.content);
    } catch {
      toast.error("Could not generate feedback");
    } finally {
      setIsWorkspaceLoading(false);
    }
  };

  if (authLoading || loadingPage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-purple-50 via-white to-blue-50">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading course…</p>
        </div>
      </div>
    );
  }

  if (!course) return null;

  const readyDocuments = documents.filter((d) => d.status === "ready");

  const tabs: { key: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { key: "materials", label: "Materials", icon: <FileText className="h-4 w-4" /> },
    { key: "chat", label: "Chat", icon: <Bot className="h-4 w-4" /> },
    { key: "notes", label: "Study Tools", icon: <Brain className="h-4 w-4" /> },
    { key: "workspace", label: "Workspace", icon: <PenLine className="h-4 w-4" /> },
  ];

  const PROSE =
    "prose prose-sm max-w-none [&>h2]:text-lg [&>h2]:font-semibold [&>h2]:mb-3 [&>h3]:font-semibold [&>h3]:mb-2 [&>p]:mb-3 [&>p:last-child]:mb-0 [&>ul]:pl-5 [&>ul>li]:list-disc [&>ul>li]:mb-1 [&>ol]:pl-5 [&>ol>li]:list-decimal [&>ol>li]:mb-1 [&>strong]:font-semibold [&>hr]:my-4 [&>hr]:border-gray-200";

  return (
    <div className="min-h-screen bg-linear-to-br from-purple-50 via-white to-blue-50">
      {/* Nav */}
      <nav className="flex items-center justify-between p-6 max-w-5xl mx-auto">
        <Link href="/dashboard" className="flex items-center space-x-2">
          <GraduationCap className="h-7 w-7 text-purple-600" />
          <span className="text-xl font-bold text-gray-900">EduGuide</span>
        </Link>
        <Button asChild variant="ghost" size="sm">
          <Link href="/dashboard/courses">
            <ArrowLeft className="mr-2 h-4 w-4" />
            My Courses
          </Link>
        </Button>
      </nav>

      <main className="max-w-5xl mx-auto px-6 pb-16">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-6"
        >
          <div className="flex items-center gap-3 mb-1">
            <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: course.color }} />
            <h1 className="text-3xl font-bold text-gray-900">{course.name}</h1>
            {course.code && (
              <span className="text-sm font-medium text-gray-500 bg-gray-100 rounded px-2 py-0.5">
                {course.code}
              </span>
            )}
          </div>
          {(course.professor || course.semester) && (
            <p className="text-gray-500 text-sm ml-7">
              {[course.professor, course.semester].filter(Boolean).join(" · ")}
            </p>
          )}
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit flex-wrap">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── MATERIALS ── */}
        {activeTab === "materials" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* PDF Upload */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
                    <Upload className="h-4 w-4 text-purple-600" />
                    Upload PDF
                  </h3>
                  <p className="text-xs text-gray-500 mb-4">
                    Lecture notes, slides, textbook chapters
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  <Button
                    className="w-full"
                    style={{ backgroundColor: course.color, borderColor: course.color }}
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Uploading…
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Choose PDF
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Text Paste */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
                    <Clipboard className="h-4 w-4 text-purple-600" />
                    Paste Text
                  </h3>
                  <p className="text-xs text-gray-500 mb-4">
                    Copy &amp; paste notes, articles, or transcripts
                  </p>
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => setShowPasteForm((v) => !v)}
                  >
                    {showPasteForm ? "Cancel" : "Paste Content"}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Paste Form */}
            {showPasteForm && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
                <Card>
                  <CardContent className="p-6 space-y-4">
                    <div>
                      <Label htmlFor="paste-name">Document Name</Label>
                      <Input
                        id="paste-name"
                        placeholder="e.g. Week 3 Lecture Notes"
                        value={pasteName}
                        onChange={(e) => setPasteName(e.target.value)}
                        className="mt-1"
                        autoFocus
                      />
                    </div>
                    <div>
                      <Label htmlFor="paste-content">Content</Label>
                      <Textarea
                        id="paste-content"
                        placeholder="Paste your notes or text here…"
                        value={pasteContent}
                        onChange={(e) => setPasteContent(e.target.value)}
                        className="mt-1 min-h-[200px]"
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        {pasteContent.length.toLocaleString()} characters
                      </p>
                    </div>
                    <Button
                      onClick={handlePaste}
                      disabled={isPasting || !pasteName.trim() || !pasteContent.trim()}
                      style={{ backgroundColor: course.color }}
                    >
                      {isPasting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving…
                        </>
                      ) : (
                        "Save & Index"
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Document List */}
            <div>
              <h3 className="font-semibold text-gray-700 mb-3">
                {documents.length} document{documents.length !== 1 ? "s" : ""}
              </h3>
              {documents.length === 0 ? (
                <Card className="border-dashed border-2 border-gray-200">
                  <CardContent className="py-12 text-center">
                    <FileText className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">
                      No documents yet. Upload a PDF or paste text above.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <Card key={doc.id} className="bg-white">
                      <CardContent className="p-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <FileText className="h-5 w-5 text-gray-400 shrink-0" />
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate">{doc.name}</p>
                            <p className="text-xs text-gray-400">
                              {doc.doc_type === "upload" ? "PDF" : "Pasted text"}
                              {doc.chunk_count != null ? ` · ${doc.chunk_count} chunks` : ""}
                              {doc.char_count != null
                                ? ` · ${doc.char_count.toLocaleString()} chars`
                                : ""}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[doc.status]}`}
                          >
                            {doc.status}
                          </span>
                          <button
                            type="button"
                            onClick={() => deleteDocument(doc)}
                            className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                            title="Remove document"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ── CHAT ── */}
        {activeTab === "chat" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Card className="flex flex-col h-[600px]">
              <CardContent className="flex flex-col h-full p-0 overflow-hidden">
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
                  {chatMessages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <Bot className="h-10 w-10 text-gray-300 mb-3" />
                      <p className="text-gray-500 font-medium">Ask anything about your course</p>
                      <p className="text-sm text-gray-400 mt-1">
                        The AI uses your uploaded materials to answer accurately.
                      </p>
                    </div>
                  )}
                  {chatMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div className={`max-w-[85%] ${msg.role === "user" ? "" : "w-full"}`}>
                        <div
                          className={`rounded-lg px-4 py-3 text-sm ${
                            msg.role === "user"
                              ? "bg-purple-600 text-white"
                              : "bg-gray-100 text-gray-900"
                          }`}
                        >
                          {msg.role === "ai" ? (
                            <div className={PROSE}>
                              <ReactMarkdown>{msg.content}</ReactMarkdown>
                            </div>
                          ) : (
                            msg.content
                          )}
                        </div>
                        {/* Sources accordion */}
                        {msg.role === "ai" && msg.sources && msg.sources.length > 0 && (
                          <div className="mt-1">
                            <button
                              type="button"
                              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
                              onClick={() => toggleSources(msg.id)}
                            >
                              {msg.sourcesOpen ? (
                                <ChevronUp className="h-3 w-3" />
                              ) : (
                                <ChevronDown className="h-3 w-3" />
                              )}
                              {msg.sources.length} source
                              {msg.sources.length !== 1 ? "s" : ""}
                            </button>
                            {msg.sourcesOpen && (
                              <div className="mt-1 space-y-1">
                                {msg.sources.map((src, i) => (
                                  <div
                                    key={i}
                                    className="text-xs bg-white border border-gray-200 rounded p-2"
                                  >
                                    <span className="font-medium text-gray-700">
                                      {src.documentName}
                                    </span>
                                    <p className="text-gray-400 mt-0.5 line-clamp-2">
                                      {src.preview}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {isChatLoading && (
                    <div className="flex justify-start">
                      <div className="bg-gray-100 rounded-lg px-4 py-3">
                        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Chat input */}
                <div className="border-t p-4 flex gap-2 shrink-0">
                  <Input
                    placeholder={
                      readyDocuments.length === 0
                        ? "Upload materials first…"
                        : "Ask about your course…"
                    }
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendChatMessage();
                      }
                    }}
                    disabled={isChatLoading || readyDocuments.length === 0}
                    className="flex-1"
                  />
                  <Button
                    onClick={sendChatMessage}
                    disabled={isChatLoading || !chatInput.trim() || readyDocuments.length === 0}
                    style={{ backgroundColor: course.color }}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ── STUDY TOOLS ── */}
        {activeTab === "notes" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
            <Card>
              <CardContent className="p-6 space-y-4">
                <h3 className="font-semibold text-gray-900">Configure</h3>

                {/* Mode */}
                <div>
                  <Label className="mb-2 block">Mode</Label>
                  <div className="flex gap-2 flex-wrap">
                    {(
                      [
                        { key: "notes", label: "Key Concepts", icon: <BookOpen className="h-4 w-4" /> },
                        { key: "flashcards", label: "Flashcards", icon: <Zap className="h-4 w-4" /> },
                        { key: "exam", label: "Exam Prep", icon: <CheckSquare className="h-4 w-4" /> },
                      ] as { key: NoteMode; label: string; icon: React.ReactNode }[]
                    ).map((m) => (
                      <button
                        key={m.key}
                        type="button"
                        onClick={() => setNoteMode(m.key)}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                          noteMode === m.key
                            ? "border-transparent text-white"
                            : "border-gray-200 text-gray-600 hover:border-gray-300"
                        }`}
                        style={noteMode === m.key ? { backgroundColor: course.color } : undefined}
                      >
                        {m.icon}
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Topic */}
                <div>
                  <Label htmlFor="note-topic">Topic (optional)</Label>
                  <Input
                    id="note-topic"
                    placeholder="e.g. Mitosis, The French Revolution, Supply & Demand…"
                    value={noteTopic}
                    onChange={(e) => setNoteTopic(e.target.value)}
                    className="mt-1"
                  />
                </div>

                {/* Limit to document */}
                {readyDocuments.length > 0 && (
                  <div>
                    <Label htmlFor="note-doc">Limit to document (optional)</Label>
                    <select
                      id="note-doc"
                      value={noteDocumentId}
                      onChange={(e) => setNoteDocumentId(e.target.value)}
                      className="mt-1 w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="">All documents</option>
                      {readyDocuments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <Button
                  onClick={generateNotes}
                  disabled={isNoteLoading || readyDocuments.length === 0}
                  style={{ backgroundColor: course.color }}
                  className="w-full sm:w-auto"
                >
                  {isNoteLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating…
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate
                    </>
                  )}
                </Button>
                {readyDocuments.length === 0 && (
                  <p className="text-xs text-gray-400">
                    Upload materials in the Materials tab first.
                  </p>
                )}
              </CardContent>
            </Card>

            {noteOutput && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Card>
                  <CardContent className="p-6">
                    <div className={PROSE}>
                      <ReactMarkdown>{noteOutput}</ReactMarkdown>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* ── WORKSPACE ── */}
        {activeTab === "workspace" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
            <Card>
              <CardContent className="p-6 space-y-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <FileEdit className="h-5 w-5 text-purple-600" />
                  Assignment Workspace
                </h3>
                <p className="text-sm text-gray-500">
                  Describe your assignment and optionally paste a draft. The AI will give structured
                  feedback grounded in your course materials.
                </p>

                <div>
                  <Label htmlFor="assignment-desc">Assignment Description *</Label>
                  <Textarea
                    id="assignment-desc"
                    placeholder="e.g. Write a 1000-word essay on the causes of World War I, including economic and political factors…"
                    value={assignmentDesc}
                    onChange={(e) => setAssignmentDesc(e.target.value)}
                    className="mt-1 min-h-[100px]"
                  />
                </div>

                <div>
                  <Label htmlFor="rubric">Rubric / Marking Criteria (optional)</Label>
                  <Textarea
                    id="rubric"
                    placeholder="e.g. 30% Thesis clarity, 40% Evidence use, 30% Structure…"
                    value={rubric}
                    onChange={(e) => setRubric(e.target.value)}
                    className="mt-1 min-h-[80px]"
                  />
                </div>

                <div>
                  <Label htmlFor="draft">Your Draft So Far (optional)</Label>
                  <Textarea
                    id="draft"
                    placeholder="Paste your current draft here for feedback…"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    className="mt-1 min-h-[160px]"
                  />
                </div>

                <Button
                  onClick={generateWorkspaceFeedback}
                  disabled={
                    isWorkspaceLoading || !assignmentDesc.trim() || readyDocuments.length === 0
                  }
                  style={{ backgroundColor: course.color }}
                  className="w-full sm:w-auto"
                >
                  {isWorkspaceLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing…
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Get AI Feedback
                    </>
                  )}
                </Button>
                {readyDocuments.length === 0 && (
                  <p className="text-xs text-gray-400">
                    Upload course materials first so the AI can ground its feedback.
                  </p>
                )}
              </CardContent>
            </Card>

            {workspaceOutput && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Card>
                  <CardContent className="p-6">
                    <div className={PROSE}>
                      <ReactMarkdown>{workspaceOutput}</ReactMarkdown>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </motion.div>
        )}
      </main>
    </div>
  );
}
