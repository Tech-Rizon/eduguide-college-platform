export const GRADE_SCALE: Record<string, number> = {
  'A+': 4.0, 'A': 4.0, 'A-': 3.7,
  'B+': 3.3, 'B': 3.0, 'B-': 2.7,
  'C+': 2.3, 'C': 2.0, 'C-': 1.7,
  'D+': 1.3, 'D': 1.0, 'D-': 0.7,
  'F': 0.0,
}

export const GRADE_OPTIONS = Object.keys(GRADE_SCALE)

export function resolveGradePoints(letter: string): number | null {
  const pts = GRADE_SCALE[letter.trim().toUpperCase()]
  return pts !== undefined ? pts : null
}

export function calcSemesterGPA(
  entries: Array<{ grade_points: number; credit_hours: number }>,
): number {
  const totalCredits = entries.reduce((s, e) => s + Number(e.credit_hours), 0)
  if (totalCredits === 0) return 0
  const totalPoints = entries.reduce(
    (s, e) => s + Number(e.grade_points) * Number(e.credit_hours),
    0,
  )
  return Math.round((totalPoints / totalCredits) * 100) / 100
}

export function calcCumulativeGPA(
  semesters: Array<{ entries: Array<{ grade_points: number; credit_hours: number }> }>,
): number {
  return calcSemesterGPA(semesters.flatMap((s) => s.entries))
}

export function calcRequiredFinalScore(
  currentGrade: number,
  finalWeight: number,
  targetGrade: number,
): number | null {
  if (finalWeight <= 0 || finalWeight >= 100) return null
  const priorWeight = 1 - finalWeight / 100
  const required = (targetGrade - currentGrade * priorWeight) / (finalWeight / 100)
  return Math.round(required * 10) / 10
}
