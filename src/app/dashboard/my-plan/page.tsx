"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  GraduationCap,
  ArrowLeft,
  Search,
  Plus,
  Trash2,
  CheckSquare,
  Square,
  ClipboardList,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import { collegeDatabase, type CollegeEntry } from "@/lib/collegeDatabase";

interface ShortlistItem {
  id: string;
  college_id: string;
  college_name: string;
  status: string;
  deadline: string | null;
  notes: string | null;
  added_at: string;
  updated_at: string;
}

interface ChecklistItem {
  id: string;
  college_id: string;
  task: string;
  completed: boolean;
  created_at: string;
}

interface MyPlanData {
  shortlist: ShortlistItem[];
  checklist: ChecklistItem[];
}

const APPLICATION_STATUSES = [
  { value: "planning",   label: "Planning",   color: "bg-gray-100 text-gray-700" },
  { value: "applying",   label: "Applying",   color: "bg-blue-100 text-blue-700" },
  { value: "submitted",  label: "Submitted",  color: "bg-purple-100 text-purple-700" },
  { value: "accepted",   label: "Accepted",   color: "bg-green-100 text-green-700" },
  { value: "rejected",   label: "Rejected",   color: "bg-red-100 text-red-700" },
  { value: "waitlisted", label: "Waitlisted", color: "bg-yellow-100 text-yellow-700" },
  { value: "enrolled",   label: "Enrolled",   color: "bg-teal-100 text-teal-700" },
];

function getStatusColor(status: string): string {
  return APPLICATION_STATUSES.find((s) => s.value === status)?.color ?? "bg-gray-100 text-gray-700";
}

function getStatusLabel(status: string): string {
  return APPLICATION_STATUSES.find((s) => s.value === status)?.label ?? status;
}

function formatDeadline(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function MyPlanPage() {
  const [shortlist, setShortlist] = useState<ShortlistItem[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"list" | "tracker">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CollegeEntry[]>([]);
  const [trackerFilter, setTrackerFilter] = useState("all");
  const [addingCollegeId, setAddingCollegeId] = useState<string | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const router = useRouter();
  const { session, loading: authLoading } = useAuth();

  const fetchPlan = useCallback(async (token: string) => {
    const res = await fetch("/api/my-plan", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = (await res.json()) as MyPlanData;
      setShortlist(data.shortlist ?? []);
      setChecklist(data.checklist ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!session) {
      router.push("/login");
      return;
    }
    fetchPlan(session.access_token);
  }, [authLoading, session, router, fetchPlan]);

  // Client-side college search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const q = searchQuery.trim().toLowerCase();
    const results = collegeDatabase
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.location.toLowerCase().includes(q) ||
          c.state.toLowerCase().includes(q) ||
          c.city.toLowerCase().includes(q),
      )
      .filter((c) => !shortlist.some((s) => s.college_id === c.id))
      .slice(0, 8);
    setSearchResults(results);
  }, [searchQuery, shortlist]);

  // Close search dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchResults([]);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const addCollege = async (college: CollegeEntry) => {
    if (!session?.access_token || addingCollegeId) return;
    setAddingCollegeId(college.id);
    setSearchResults([]);
    setSearchQuery("");

    try {
      const res = await fetch("/api/my-plan/colleges", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ collegeId: college.id, collegeName: college.name }),
      });
      if (res.ok) {
        toast.success(`${college.name} added to your plan`);
        await fetchPlan(session.access_token);
      } else if (res.status === 409) {
        toast.error("Already in your plan");
      } else {
        toast.error("Could not add college");
      }
    } catch {
      toast.error("Could not add college");
    } finally {
      setAddingCollegeId(null);
    }
  };

  const updateStatus = async (shortlistId: string, status: string) => {
    if (!session?.access_token) return;
    setShortlist((prev) => prev.map((s) => (s.id === shortlistId ? { ...s, status } : s)));

    const res = await fetch(`/api/my-plan/colleges/${shortlistId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) toast.error("Could not update status");
  };

  const saveNotes = async (shortlistId: string, notes: string) => {
    if (!session?.access_token) return;
    await fetch(`/api/my-plan/colleges/${shortlistId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ notes: notes || null }),
    });
  };

  const saveDeadline = async (shortlistId: string, deadline: string) => {
    if (!session?.access_token) return;
    setShortlist((prev) =>
      prev.map((s) => (s.id === shortlistId ? { ...s, deadline: deadline || null } : s)),
    );
    await fetch(`/api/my-plan/colleges/${shortlistId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ deadline: deadline || null }),
    });
  };

  const removeCollege = async (shortlistId: string, collegeName: string) => {
    if (!session?.access_token) return;
    if (!confirm(`Remove ${collegeName} from your plan?`)) return;

    setShortlist((prev) => prev.filter((s) => s.id !== shortlistId));

    const res = await fetch(`/api/my-plan/colleges/${shortlistId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!res.ok) {
      toast.error("Could not remove college");
      await fetchPlan(session.access_token);
    }
  };

  const toggleChecklist = async (itemId: string, completed: boolean) => {
    if (!session?.access_token) return;
    setChecklist((prev) => prev.map((c) => (c.id === itemId ? { ...c, completed } : c)));

    const res = await fetch(`/api/my-plan/checklist/${itemId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ completed }),
    });
    if (!res.ok) {
      toast.error("Could not update checklist");
      setChecklist((prev) => prev.map((c) => (c.id === itemId ? { ...c, completed: !completed } : c)));
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-50 via-white to-purple-50">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading your college plan…</p>
        </div>
      </div>
    );
  }

  const filteredTracker =
    trackerFilter === "all" ? shortlist : shortlist.filter((s) => s.status === trackerFilter);

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-purple-50">
      {/* Navigation */}
      <nav className="flex items-center justify-between p-6 max-w-5xl mx-auto">
        <Link href="/dashboard" className="flex items-center space-x-2">
          <GraduationCap className="h-7 w-7 text-blue-600" />
          <span className="text-xl font-bold text-gray-900">EduGuide</span>
        </Link>
        <Button asChild variant="ghost" size="sm">
          <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
      </nav>

      <main className="max-w-5xl mx-auto px-6 pb-16">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <ClipboardList className="h-8 w-8 text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-900">My College Plan</h1>
          </div>
          <p className="text-gray-600 text-lg">
            Track your college shortlist, application status, and checklist tasks all in one place.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            {shortlist.length} college{shortlist.length !== 1 ? "s" : ""} saved
          </p>
        </motion.div>

        {/* College Search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="mb-6"
          ref={searchRef}
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search colleges to add to your plan…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white border-gray-200"
            />
            {searchResults.length > 0 && (
              <div className="absolute z-10 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                {searchResults.map((college) => (
                  <button
                    key={college.id}
                    type="button"
                    className="w-full text-left px-4 py-3 hover:bg-blue-50 flex items-center justify-between group transition-colors"
                    onClick={() => addCollege(college)}
                    disabled={addingCollegeId === college.id}
                  >
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{college.name}</p>
                      <p className="text-xs text-gray-500">
                        {college.location} · {college.type} · {college.acceptanceRate} acceptance
                      </p>
                    </div>
                    <Plus className="h-4 w-4 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-3" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
          <button
            type="button"
            onClick={() => setActiveTab("list")}
            className={`px-5 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === "list"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            College List ({shortlist.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("tracker")}
            className={`px-5 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === "tracker"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Application Tracker
          </button>
        </div>

        {/* College List Tab */}
        {activeTab === "list" && (
          <div className="space-y-6">
            {shortlist.length === 0 ? (
              <Card className="border-dashed border-2 border-gray-200">
                <CardContent className="py-16 text-center">
                  <ClipboardList className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium">No colleges in your plan yet</p>
                  <p className="text-gray-400 text-sm mt-1">
                    Search above or chat with the AI and click &quot;Add to Plan&quot; on any college card.
                  </p>
                </CardContent>
              </Card>
            ) : (
              shortlist.map((item) => {
                const collegeChecklist = checklist.filter(
                  (c) => c.college_id === item.college_id,
                );
                const completedCount = collegeChecklist.filter((c) => c.completed).length;

                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Card className="bg-white shadow-sm">
                      <CardContent className="p-5">
                        {/* Header row */}
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 text-lg">
                              {item.college_name}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                              <span
                                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(item.status)}`}
                              >
                                {getStatusLabel(item.status)}
                              </span>
                              {collegeChecklist.length > 0 && (
                                <span className="text-xs text-gray-500">
                                  {completedCount}/{collegeChecklist.length} tasks done
                                </span>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-400 hover:text-red-600 hover:bg-red-50 shrink-0 ml-2"
                            onClick={() => removeCollege(item.id, item.college_name)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* Status select + deadline */}
                        <div className="grid grid-cols-2 gap-3 mb-4">
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">
                              Application Status
                            </label>
                            <Select
                              value={item.status}
                              onValueChange={(v) => updateStatus(item.id, v)}
                            >
                              <SelectTrigger className="h-9 text-sm bg-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {APPLICATION_STATUSES.map((s) => (
                                  <SelectItem key={s.value} value={s.value}>
                                    {s.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">
                              Application Deadline
                            </label>
                            <Input
                              type="date"
                              className="h-9 text-sm bg-white"
                              defaultValue={item.deadline ?? ""}
                              onBlur={(e) => saveDeadline(item.id, e.target.value)}
                            />
                          </div>
                        </div>

                        {/* Notes */}
                        <div className="mb-4">
                          <label className="text-xs text-gray-500 mb-1 block">Notes</label>
                          <Textarea
                            className="text-sm bg-white resize-none"
                            rows={2}
                            placeholder="Add notes…"
                            defaultValue={item.notes ?? ""}
                            onBlur={(e) => saveNotes(item.id, e.target.value)}
                          />
                        </div>

                        {/* Checklist */}
                        {collegeChecklist.length > 0 && (
                          <div>
                            <p className="text-xs text-gray-500 mb-2 font-medium">
                              Application Checklist
                            </p>
                            <div className="space-y-1.5">
                              {collegeChecklist.map((task) => (
                                <button
                                  key={task.id}
                                  type="button"
                                  className="flex items-center gap-2.5 w-full text-left group"
                                  onClick={() => toggleChecklist(task.id, !task.completed)}
                                >
                                  {task.completed ? (
                                    <CheckSquare className="h-4 w-4 text-blue-600 shrink-0" />
                                  ) : (
                                    <Square className="h-4 w-4 text-gray-400 group-hover:text-gray-600 shrink-0" />
                                  )}
                                  <span
                                    className={`text-sm ${
                                      task.completed
                                        ? "line-through text-gray-400"
                                        : "text-gray-700"
                                    }`}
                                  >
                                    {task.task}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })
            )}
          </div>
        )}

        {/* Application Tracker Tab */}
        {activeTab === "tracker" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-3 mb-4">
              <Select value={trackerFilter} onValueChange={setTrackerFilter}>
                <SelectTrigger className="w-44 bg-white">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {APPLICATION_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-sm text-gray-500">
                {filteredTracker.length} school{filteredTracker.length !== 1 ? "s" : ""}
              </span>
            </div>

            {filteredTracker.length === 0 ? (
              <Card className="border-dashed border-2 border-gray-200">
                <CardContent className="py-12 text-center">
                  <p className="text-gray-400">No colleges match this filter.</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-white shadow-sm">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left">
                          <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                            School
                          </th>
                          <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Status
                          </th>
                          <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Deadline
                          </th>
                          <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Notes
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {filteredTracker.map((item) => (
                          <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                              {item.college_name}
                            </td>
                            <td className="px-4 py-3">
                              <Select
                                value={item.status}
                                onValueChange={(v) => updateStatus(item.id, v)}
                              >
                                <SelectTrigger className="h-8 w-36 text-xs bg-white">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {APPLICATION_STATUSES.map((s) => (
                                    <SelectItem key={s.value} value={s.value}>
                                      {s.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                              {item.deadline ? (
                                formatDeadline(item.deadline)
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-gray-600 max-w-48 truncate">
                              {item.notes ? (
                                item.notes
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}
      </main>
    </div>
  );
}
