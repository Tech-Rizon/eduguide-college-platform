'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/hooks/useAuth'
import { GRADE_OPTIONS, calcCumulativeGPA, calcRequiredFinalScore, calcSemesterGPA } from '@/lib/gpaUtils'
import { ArrowLeft, GraduationCap, Plus, Trash2, TrendingUp } from 'lucide-react'

type GpaEntry = {
  id: string
  semester_id: string
  course_name: string
  credit_hours: number
  grade_letter: string
  grade_points: number
}

type GpaSemester = {
  id: string
  name: string
  sort_order: number
  created_at: string
  entries: GpaEntry[]
}

type ActiveTab = 'semester' | 'cumulative' | 'calculator'

const TARGET_GRADES = [
  { label: 'A (93%)', value: 93 },
  { label: 'A− (90%)', value: 90 },
  { label: 'B+ (87%)', value: 87 },
  { label: 'B (83%)', value: 83 },
  { label: 'B− (80%)', value: 80 },
  { label: 'C+ (77%)', value: 77 },
  { label: 'C (73%)', value: 73 },
]

function gpaColor(gpa: number): string {
  if (gpa >= 3.7) return 'text-emerald-600'
  if (gpa >= 3.0) return 'text-blue-600'
  if (gpa >= 2.0) return 'text-amber-600'
  return 'text-red-600'
}

export default function GpaPage() {
  const { session, loading: authLoading } = useAuth()
  const router = useRouter()

  const [semesters, setSemesters] = useState<GpaSemester[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<ActiveTab>('semester')

  // New semester form
  const [newSemesterName, setNewSemesterName] = useState('')
  const [addingSemester, setAddingSemester] = useState(false)

  // New entry form per semester
  const [newEntry, setNewEntry] = useState<Record<string, { name: string; credits: string; grade: string }>>({})

  // Grade calculator state
  const [calcCurrentGrade, setCalcCurrentGrade] = useState('')
  const [calcFinalWeight, setCalcFinalWeight] = useState('')
  const [calcTargetGrade, setCalcTargetGrade] = useState('83')

  const authHeaders = useMemo(
    () => ({
      Authorization: `Bearer ${session?.access_token ?? ''}`,
      'Content-Type': 'application/json',
    }),
    [session?.access_token],
  )

  const fetchSemesters = useCallback(
    async (token: string) => {
      setLoading(true)
      try {
        const res = await fetch('/api/gpa/semesters', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) { toast.error('Failed to load GPA data'); return }
        const data = await res.json() as { semesters: GpaSemester[] }
        setSemesters(data.semesters ?? [])
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  useEffect(() => {
    if (authLoading) return
    if (!session) { router.push('/login'); return }
    fetchSemesters(session.access_token)
  }, [authLoading, session, router, fetchSemesters])

  // ── Semester CRUD ──────────────────────────────────────────────────────────

  const addSemester = async () => {
    const name = newSemesterName.trim()
    if (!name) return
    setAddingSemester(true)
    try {
      const res = await fetch('/api/gpa/semesters', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ name }),
      })
      const data = await res.json() as { semester?: GpaSemester; error?: string }
      if (!res.ok) { toast.error(data.error ?? 'Could not add semester'); return }
      setSemesters((prev) => [...prev, data.semester!])
      setNewSemesterName('')
    } finally {
      setAddingSemester(false)
    }
  }

  const deleteSemester = async (id: string) => {
    const prev = semesters
    setSemesters((s) => s.filter((x) => x.id !== id))
    const res = await fetch(`/api/gpa/semesters/${id}`, {
      method: 'DELETE',
      headers: authHeaders,
    })
    if (!res.ok) { toast.error('Could not delete semester'); setSemesters(prev) }
  }

  // ── Entry CRUD ─────────────────────────────────────────────────────────────

  const addEntry = async (semesterId: string) => {
    const form = newEntry[semesterId] ?? { name: '', credits: '', grade: '' }
    const name = form.name.trim()
    const credits = parseFloat(form.credits)
    const grade = form.grade

    if (!name) { toast.error('Enter a course name'); return }
    if (!credits || credits <= 0) { toast.error('Enter valid credit hours'); return }
    if (!grade) { toast.error('Select a grade'); return }

    const res = await fetch('/api/gpa/entries', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ semester_id: semesterId, course_name: name, credit_hours: credits, grade_letter: grade }),
    })
    const data = await res.json() as { entry?: GpaEntry; error?: string }
    if (!res.ok) { toast.error(data.error ?? 'Could not add course'); return }

    setSemesters((prev) =>
      prev.map((s) =>
        s.id === semesterId ? { ...s, entries: [...s.entries, data.entry!] } : s,
      ),
    )
    setNewEntry((prev) => ({ ...prev, [semesterId]: { name: '', credits: '', grade: '' } }))
  }

  const deleteEntry = async (semesterId: string, entryId: string) => {
    const prevSemesters = semesters
    setSemesters((prev) =>
      prev.map((s) =>
        s.id === semesterId ? { ...s, entries: s.entries.filter((e) => e.id !== entryId) } : s,
      ),
    )
    const res = await fetch(`/api/gpa/entries/${entryId}`, {
      method: 'DELETE',
      headers: authHeaders,
    })
    if (!res.ok) { toast.error('Could not delete course'); setSemesters(prevSemesters) }
  }

  // ── Grade calculator ───────────────────────────────────────────────────────

  const requiredScore = useMemo(() => {
    const cur = parseFloat(calcCurrentGrade)
    const weight = parseFloat(calcFinalWeight)
    const target = parseFloat(calcTargetGrade)
    if (isNaN(cur) || isNaN(weight) || isNaN(target)) return null
    return calcRequiredFinalScore(cur, weight, target)
  }, [calcCurrentGrade, calcFinalWeight, calcTargetGrade])

  const scoreGrid = useMemo(() => {
    const cur = parseFloat(calcCurrentGrade)
    const weight = parseFloat(calcFinalWeight)
    if (isNaN(cur) || isNaN(weight)) return null
    return TARGET_GRADES.map((t) => ({
      label: t.label,
      required: calcRequiredFinalScore(cur, weight, t.value),
    }))
  }, [calcCurrentGrade, calcFinalWeight])

  // ── Cumulative stats ───────────────────────────────────────────────────────

  const cumulativeGpa = useMemo(() => calcCumulativeGPA(semesters), [semesters])
  const totalCredits = useMemo(
    () => semesters.flatMap((s) => s.entries).reduce((sum, e) => sum + Number(e.credit_hours), 0),
    [semesters],
  )

  const hasFetchedRef = useRef(false)
  useEffect(() => { hasFetchedRef.current = true }, [])

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading GPA data…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-700">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <TrendingUp className="h-6 w-6 text-blue-600" />
                GPA Calculator
              </h1>
              <p className="text-sm text-gray-500">Track grades, calculate GPA, and plan your finals</p>
            </div>
          </div>
          {semesters.length > 0 && (
            <div className="text-right">
              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Cumulative GPA</p>
              <p className={`text-3xl font-bold ${gpaColor(cumulativeGpa)}`}>
                {cumulativeGpa.toFixed(2)}
              </p>
            </div>
          )}
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
          {([
            { key: 'semester', label: 'Semester GPA' },
            { key: 'cumulative', label: 'Cumulative GPA' },
            { key: 'calculator', label: 'Grade Calculator' },
          ] as { key: ActiveTab; label: string }[]).map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-150 ${
                activeTab === t.key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Tab 1: Semester GPA ── */}
        {activeTab === 'semester' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {/* Add semester form */}
            <div className="flex gap-2">
              <Input
                placeholder="e.g. Fall 2025"
                value={newSemesterName}
                onChange={(e) => setNewSemesterName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') addSemester() }}
                className="max-w-xs"
              />
              <Button onClick={addSemester} disabled={addingSemester || !newSemesterName.trim()}>
                <Plus className="h-4 w-4 mr-1" />
                Add Semester
              </Button>
            </div>

            {semesters.length === 0 && (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <GraduationCap className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Add a semester to get started</p>
                  <p className="text-sm text-gray-400 mt-1">e.g. "Fall 2025" or "Spring 2026"</p>
                </CardContent>
              </Card>
            )}

            {semesters.map((sem) => {
              const semGpa = calcSemesterGPA(sem.entries)
              const semCredits = sem.entries.reduce((s, e) => s + Number(e.credit_hours), 0)
              const form = newEntry[sem.id] ?? { name: '', credits: '', grade: '' }

              return (
                <Card key={sem.id} className="transition-all duration-150 hover:shadow-md">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-semibold">{sem.name}</CardTitle>
                      <div className="flex items-center gap-3">
                        {sem.entries.length > 0 && (
                          <div className="text-right">
                            <span className={`text-xl font-bold ${gpaColor(semGpa)}`}>{semGpa.toFixed(2)}</span>
                            <span className="text-xs text-gray-400 ml-1">/ {semCredits} cr</span>
                          </div>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-gray-400 hover:text-red-500 transition-colors"
                          onClick={() => deleteSemester(sem.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {/* Existing entries */}
                    {sem.entries.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between gap-2 py-1.5 px-2 rounded-md hover:bg-gray-50 group"
                      >
                        <span className="text-sm text-gray-800 flex-1 truncate">{entry.course_name}</span>
                        <span className="text-xs text-gray-400">{entry.credit_hours} cr</span>
                        <Badge variant="outline" className="text-xs font-medium w-10 justify-center">
                          {entry.grade_letter}
                        </Badge>
                        <span className="text-xs text-gray-400 w-6 text-right">{Number(entry.grade_points).toFixed(1)}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                          onClick={() => deleteEntry(sem.id, entry.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}

                    {/* Add course row */}
                    <div className="flex gap-2 pt-1">
                      <Input
                        placeholder="Course name"
                        value={form.name}
                        onChange={(e) =>
                          setNewEntry((prev) => ({ ...prev, [sem.id]: { ...form, name: e.target.value } }))
                        }
                        onKeyDown={(e) => { if (e.key === 'Enter') addEntry(sem.id) }}
                        className="text-sm h-8"
                      />
                      <Input
                        type="number"
                        placeholder="Credits"
                        step="0.5"
                        min="0.5"
                        max="20"
                        value={form.credits}
                        onChange={(e) =>
                          setNewEntry((prev) => ({ ...prev, [sem.id]: { ...form, credits: e.target.value } }))
                        }
                        className="text-sm h-8 w-20"
                      />
                      <Select
                        value={form.grade}
                        onValueChange={(val) =>
                          setNewEntry((prev) => ({ ...prev, [sem.id]: { ...form, grade: val } }))
                        }
                      >
                        <SelectTrigger className="h-8 w-20 text-sm">
                          <SelectValue placeholder="Grade" />
                        </SelectTrigger>
                        <SelectContent>
                          {GRADE_OPTIONS.map((g) => (
                            <SelectItem key={g} value={g}>{g}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        className="h-8 px-3"
                        onClick={() => addEntry(sem.id)}
                        disabled={!form.name.trim() || !form.credits || !form.grade}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </motion.div>
        )}

        {/* ── Tab 2: Cumulative GPA ── */}
        {activeTab === 'cumulative' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {semesters.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <p className="text-gray-400">Add semesters in the Semester GPA tab to see your cumulative GPA.</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Big stat */}
                <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100">
                  <CardContent className="py-8 text-center">
                    <p className="text-sm text-blue-600 font-medium uppercase tracking-wide mb-1">Cumulative GPA</p>
                    <p className={`text-6xl font-bold ${gpaColor(cumulativeGpa)}`}>
                      {cumulativeGpa.toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-500 mt-2">{totalCredits} total credit hours · {semesters.length} semester{semesters.length !== 1 ? 's' : ''}</p>
                  </CardContent>
                </Card>

                {/* Per-semester breakdown */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Semester Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent className="divide-y">
                    {semesters.map((sem) => {
                      const gpa = calcSemesterGPA(sem.entries)
                      const credits = sem.entries.reduce((s, e) => s + Number(e.credit_hours), 0)
                      return (
                        <div key={sem.id} className="flex items-center justify-between py-3">
                          <div>
                            <p className="font-medium text-gray-800">{sem.name}</p>
                            <p className="text-xs text-gray-400">{sem.entries.length} course{sem.entries.length !== 1 ? 's' : ''} · {credits} credits</p>
                          </div>
                          <div className="text-right">
                            <span className={`text-lg font-bold ${gpaColor(gpa)}`}>
                              {sem.entries.length > 0 ? gpa.toFixed(2) : '—'}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </CardContent>
                </Card>
              </>
            )}
          </motion.div>
        )}

        {/* ── Tab 3: Grade Calculator ── */}
        {activeTab === 'calculator' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            <Card>
              <CardHeader>
                <CardTitle>What do I need on my final?</CardTitle>
                <CardDescription>Enter your current grade and final exam weight to find out.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Current Grade (%)</label>
                    <Input
                      type="number"
                      placeholder="e.g. 78"
                      min="0"
                      max="100"
                      value={calcCurrentGrade}
                      onChange={(e) => setCalcCurrentGrade(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Final Exam Weight (%)</label>
                    <Input
                      type="number"
                      placeholder="e.g. 30"
                      min="1"
                      max="99"
                      value={calcFinalWeight}
                      onChange={(e) => setCalcFinalWeight(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Target Grade (%)</label>
                    <Input
                      type="number"
                      placeholder="e.g. 83"
                      min="0"
                      max="100"
                      value={calcTargetGrade}
                      onChange={(e) => setCalcTargetGrade(e.target.value)}
                    />
                  </div>
                </div>

                {requiredScore !== null && (
                  <div className={`rounded-lg p-4 text-center ${
                    requiredScore > 100
                      ? 'bg-red-50 border border-red-100'
                      : requiredScore < 0
                        ? 'bg-emerald-50 border border-emerald-100'
                        : 'bg-blue-50 border border-blue-100'
                  }`}>
                    <p className="text-sm text-gray-500 mb-1">Required score on final exam</p>
                    <p className={`text-4xl font-bold ${
                      requiredScore > 100 ? 'text-red-600' : requiredScore < 0 ? 'text-emerald-600' : 'text-blue-700'
                    }`}>
                      {requiredScore > 100
                        ? 'Not achievable'
                        : requiredScore <= 0
                          ? 'Already there! 🎉'
                          : `${requiredScore}%`}
                    </p>
                    {requiredScore > 100 && (
                      <p className="text-xs text-red-500 mt-1">Lower your target grade or check your inputs.</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Score grid */}
            {scoreGrid && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Score needed for each grade</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {scoreGrid.map(({ label, required }) => (
                      <div
                        key={label}
                        className={`rounded-lg p-3 text-center border ${
                          required === null || required > 100
                            ? 'bg-gray-50 border-gray-100 opacity-50'
                            : required <= 0
                              ? 'bg-emerald-50 border-emerald-100'
                              : 'bg-white border-gray-100'
                        }`}
                      >
                        <p className="text-xs text-gray-500 mb-0.5">{label}</p>
                        <p className="font-bold text-gray-800 text-sm">
                          {required === null || required > 100
                            ? '—'
                            : required <= 0
                              ? 'Done ✓'
                              : `${required}%`}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}
      </div>
    </div>
  )
}
