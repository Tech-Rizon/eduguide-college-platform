import type { Scholarship, ScholarshipSearchParams, StudentProfile } from "@types";

const MOCK_SCHOLARSHIPS: Scholarship[] = [
  {
    id: "jack-kent-cooke",
    name: "Jack Kent Cooke Scholarship",
    provider: "Jack Kent Cooke Foundation",
    amount: 55000,
    amountIsRecurring: true,
    deadline: "2026-11-15",
    description: "Major scholarship for high-achieving students with financial need.",
    url: "https://www.jkcf.org",
    minGpa: 3.5,
    matchScore: 92
  },
  {
    id: "coca-cola-scholars",
    name: "Coca-Cola Scholars Program",
    provider: "Coca-Cola Scholars Foundation",
    amount: 20000,
    amountIsRecurring: false,
    deadline: "2026-10-31",
    description: "Leadership-focused merit scholarship for graduating seniors.",
    url: "https://www.coca-colascholarsfoundation.org",
    minGpa: 3,
    matchScore: 84
  },
  {
    id: "swe-scholarship",
    name: "Society of Women Engineers Scholarship",
    provider: "SWE",
    amount: 5000,
    amountIsRecurring: false,
    deadline: "2026-02-15",
    description: "Scholarship support for women pursuing engineering and technology degrees.",
    url: "https://scholarships.swe.org",
    minGpa: 3,
    majors: ["engineering", "computer science", "mathematics"],
    matchScore: 78
  }
];

export async function getMatchedScholarships(
  profile: StudentProfile,
  params: ScholarshipSearchParams = {}
): Promise<Scholarship[]> {
  const major = (params.major ?? profile.intendedMajorLabel).toLowerCase();
  const gpa = params.gpa ?? profile.gpa;
  const state = params.state ?? profile.stateResidence;

  return MOCK_SCHOLARSHIPS.filter((scholarship) => {
    if (typeof scholarship.minGpa === "number" && gpa < scholarship.minGpa) return false;
    if (scholarship.majors?.length) {
      return scholarship.majors.some((value) => major.includes(value.toLowerCase()));
    }
    if (scholarship.states?.length) {
      return scholarship.states.includes(state);
    }
    return true;
  }).sort((left, right) => (right.matchScore ?? 0) - (left.matchScore ?? 0));
}
