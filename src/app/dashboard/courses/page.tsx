"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  GraduationCap,
  ArrowLeft,
  Plus,
  BookOpen,
  Trash2,
  Pencil,
  ChevronRight,
  FileText,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";

interface Course {
  id: string;
  name: string;
  code: string | null;
  professor: string | null;
  semester: string | null;
  color: string;
  document_count: number;
  created_at: string;
}

const PRESET_COLORS = [
  "#3b82f6", "#8b5cf6", "#10b981", "#f59e0b",
  "#ef4444", "#ec4899", "#06b6d4", "#6366f1",
];

const COLOR_LABELS: Record<string, string> = {
  "#3b82f6": "Blue",
  "#8b5cf6": "Purple",
  "#10b981": "Green",
  "#f59e0b": "Amber",
  "#ef4444": "Red",
  "#ec4899": "Pink",
  "#06b6d4": "Cyan",
  "#6366f1": "Indigo",
};

interface CourseFormState {
  name: string;
  code: string;
  professor: string;
  semester: string;
  color: string;
}

const EMPTY_FORM: CourseFormState = {
  name: "",
  code: "",
  professor: "",
  semester: "",
  color: "#3b82f6",
};

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [form, setForm] = useState<CourseFormState>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);

  const router = useRouter();
  const { session, loading: authLoading } = useAuth();

  const fetchCourses = useCallback(async (token: string) => {
    const res = await fetch("/api/courses", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = (await res.json()) as { courses: Course[] };
      setCourses(data.courses ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!session) {
      router.push("/login");
      return;
    }
    fetchCourses(session.access_token);
  }, [authLoading, session, router, fetchCourses]);

  const openCreate = () => {
    setEditingCourse(null);
    setForm(EMPTY_FORM);
    setIsModalOpen(true);
  };

  const openEdit = (course: Course) => {
    setEditingCourse(course);
    setForm({
      name: course.name,
      code: course.code ?? "",
      professor: course.professor ?? "",
      semester: course.semester ?? "",
      color: course.color,
    });
    setIsModalOpen(true);
  };

  const saveCourse = async () => {
    if (!session?.access_token || !form.name.trim()) return;
    setIsSaving(true);
    try {
      const url = editingCourse ? `/api/courses/${editingCourse.id}` : "/api/courses";
      const method = editingCourse ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          name: form.name.trim(),
          code: form.code.trim() || null,
          professor: form.professor.trim() || null,
          semester: form.semester.trim() || null,
          color: form.color,
        }),
      });
      if (!res.ok) {
        toast.error("Could not save course");
        return;
      }
      toast.success(editingCourse ? "Course updated" : "Course created");
      setIsModalOpen(false);
      await fetchCourses(session.access_token);
    } catch {
      toast.error("Could not save course");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteCourse = async (course: Course) => {
    if (!session?.access_token) return;
    if (!confirm(`Delete "${course.name}"? This will remove all documents and study data.`)) return;

    setCourses((prev) => prev.filter((c) => c.id !== course.id));
    const res = await fetch(`/api/courses/${course.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!res.ok) {
      toast.error("Could not delete course");
      await fetchCourses(session.access_token);
    } else {
      toast.success("Course deleted");
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-purple-50 via-white to-blue-50">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading your courses…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-purple-50 via-white to-blue-50">
      {/* Navigation */}
      <nav className="flex items-center justify-between p-6 max-w-5xl mx-auto">
        <Link href="/dashboard" className="flex items-center space-x-2">
          <GraduationCap className="h-7 w-7 text-purple-600" />
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
          className="flex items-start justify-between mb-8"
        >
          <div>
            <div className="flex items-center gap-3 mb-2">
              <BookOpen className="h-8 w-8 text-purple-600" />
              <h1 className="text-4xl font-bold text-gray-900">My Courses</h1>
            </div>
            <p className="text-gray-600 text-lg">
              Upload lecture notes, slides, and readings. Chat with the AI using your actual course material.
            </p>
            <p className="text-sm text-gray-500 mt-2">
              {courses.length} course{courses.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Button onClick={openCreate} className="shrink-0 bg-purple-600 hover:bg-purple-700">
            <Plus className="mr-2 h-4 w-4" />
            New Course
          </Button>
        </motion.div>

        {/* Course grid */}
        {courses.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-dashed border-2 border-gray-200">
              <CardContent className="py-20 text-center">
                <BookOpen className="h-14 w-14 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 font-medium text-lg">No courses yet</p>
                <p className="text-gray-400 text-sm mt-1 mb-6">
                  Add your first course to start uploading materials and studying with AI.
                </p>
                <Button onClick={openCreate} className="bg-purple-600 hover:bg-purple-700">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Your First Course
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {courses.map((course, i) => (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="bg-white shadow-sm hover:shadow-md transition-shadow group">
                  <CardContent className="p-5">
                    {/* Color bar */}
                    <div
                      className="w-full h-1.5 rounded-full mb-4"
                      style={{ backgroundColor: course.color }}
                    />

                    {/* Course info */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">{course.name}</h3>
                        {course.code && (
                          <span className="text-xs font-medium text-gray-500 bg-gray-100 rounded px-1.5 py-0.5 mt-1 inline-block">
                            {course.code}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => openEdit(course)}
                          className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                          title="Edit course"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteCourse(course)}
                          className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                          title="Delete course"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Metadata */}
                    <div className="space-y-0.5 text-xs text-gray-500 mb-4">
                      {course.professor && <p>{course.professor}</p>}
                      {course.semester && <p>{course.semester}</p>}
                    </div>

                    {/* Document count */}
                    <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-4">
                      <FileText className="h-3.5 w-3.5" />
                      {course.document_count} document{course.document_count !== 1 ? "s" : ""}
                    </div>

                    <Link href={`/dashboard/courses/${course.id}`}>
                      <Button
                        className="w-full text-sm"
                        style={{ backgroundColor: course.color, borderColor: course.color }}
                      >
                        Open Course
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}
      </main>

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCourse ? "Edit Course" : "New Course"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="course-name">Course Name *</Label>
              <Input
                id="course-name"
                placeholder="e.g. Introduction to Biology"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="mt-1"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="course-code">Course Code</Label>
                <Input
                  id="course-code"
                  placeholder="e.g. BIO 101"
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="course-semester">Semester</Label>
                <Input
                  id="course-semester"
                  placeholder="e.g. Spring 2026"
                  value={form.semester}
                  onChange={(e) => setForm((f) => ({ ...f, semester: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="course-professor">Professor</Label>
              <Input
                id="course-professor"
                placeholder="e.g. Dr. Smith"
                value={form.professor}
                onChange={(e) => setForm((f) => ({ ...f, professor: e.target.value }))}
                className="mt-1"
              />
            </div>

            <div>
              <Label>Color</Label>
              <div className="flex gap-2 mt-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`w-7 h-7 rounded-full transition-transform ${
                      form.color === color ? "scale-125 ring-2 ring-offset-2 ring-gray-400" : "hover:scale-110"
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setForm((f) => ({ ...f, color }))}
                    title={COLOR_LABELS[color]}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              onClick={saveCourse}
              disabled={isSaving || !form.name.trim()}
              style={{ backgroundColor: form.color }}
            >
              {isSaving ? "Saving…" : editingCourse ? "Save Changes" : "Create Course"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
