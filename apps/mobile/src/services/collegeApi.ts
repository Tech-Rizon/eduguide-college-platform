import type { CollegeSearchParams, CollegeSummary, StudentProfile } from "@types";

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "http://localhost:3000";
const USE_MOCK = process.env.EXPO_PUBLIC_USE_MOCK !== "false";

const MOCK_COLLEGES: CollegeSummary[] = [
  {
    id: "ucla",
    name: "University of California, Los Angeles",
    city: "Los Angeles",
    state: "CA",
    website: "https://www.ucla.edu",
    description: "Large public research university with strong STEM, business, and pre-med options.",
    type: "public",
    tuitionInState: 14950,
    tuitionOutOfState: 47052,
    averageNetPrice: 18816,
    ranking: 15,
    programName: "Computer Science",
    fitBucket: "strong_fit",
    fitScore: 89,
    whyFit: ["Strong academic fit", "California in-state option", "High graduation outcomes"],
    blockers: []
  },
  {
    id: "ucsd",
    name: "University of California, San Diego",
    city: "La Jolla",
    state: "CA",
    website: "https://ucsd.edu",
    description: "Research-heavy campus with standout biology, engineering, and data programs.",
    type: "public",
    tuitionInState: 14648,
    tuitionOutOfState: 46822,
    averageNetPrice: 19402,
    ranking: 28,
    programName: "Biology",
    fitBucket: "likely_fit",
    fitScore: 82,
    whyFit: ["Good research environment", "Affordable for CA residents"],
    blockers: []
  },
  {
    id: "usc",
    name: "University of Southern California",
    city: "Los Angeles",
    state: "CA",
    website: "https://www.usc.edu",
    description: "Private university with strong alumni network and high-cost but strong aid profile.",
    type: "private",
    tuitionInState: 71254,
    tuitionOutOfState: 71254,
    averageNetPrice: 39759,
    ranking: 27,
    programName: "Business Administration",
    fitBucket: "possible_fit",
    fitScore: 72,
    whyFit: ["Strong career network", "Popular business programs"],
    blockers: ["Cost may need scholarship or aid review"]
  }
];

function mapCatalogItem(item: any): CollegeSummary {
  return {
    id: item.id,
    name: item.name,
    city: item.city,
    state: item.state,
    website: item.website,
    description: item.description,
    type: item.type?.replace(" ", "_") ?? "public",
    tuitionInState: item.tuitionInState,
    tuitionOutOfState: item.tuitionOutState,
    averageNetPrice: item.netPrice,
    ranking: item.ranking ?? null
  };
}

function mapMatchResult(result: any): CollegeSummary {
  return {
    id: result.college.id,
    name: result.college.name,
    city: result.college.city,
    state: result.college.state,
    website: result.college.website,
    description: result.college.description,
    type: result.college.type?.replace(" ", "_") ?? "public",
    tuitionInState: result.college.tuitionInState,
    tuitionOutOfState: result.college.tuitionOutState,
    averageNetPrice: result.college.netPrice,
    ranking: result.college.ranking ?? null,
    programName: result.program.programName,
    admissionsUrl: result.program.admissionsUrl,
    applicationDeadline: result.program.applicationDeadline,
    fitBucket: result.fitBucket,
    fitScore: result.fitScore,
    whyFit: result.whyFit ?? [],
    blockers: result.blockers ?? []
  };
}

export async function getRecommendedColleges(profile: StudentProfile): Promise<CollegeSummary[]> {
  if (USE_MOCK) {
    return MOCK_COLLEGES.slice(0, 3);
  }

  const response = await fetch(`${API_BASE_URL}/api/colleges/match`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      limit: 6,
      profileOverrides: {
        studentType: profile.studentType,
        residencyState: profile.stateResidence,
        targetStates: profile.preferredStates,
        intendedProgram: profile.intendedMajorLabel,
        gpa: profile.gpa,
        budgetLevel: profile.budgetMax <= 20000 ? "low" : profile.budgetMax <= 45000 ? "medium" : "high",
        maxAnnualTuition: profile.budgetMax
      }
    })
  });

  if (!response.ok) {
    throw new Error("Failed to load recommended colleges.");
  }

  const payload = await response.json();
  return (payload.results ?? []).map(mapMatchResult);
}

export async function searchColleges(
  params: CollegeSearchParams,
  profile?: StudentProfile | null
): Promise<CollegeSummary[]> {
  if (USE_MOCK) {
    const query = params.query?.trim().toLowerCase() ?? "";
    return MOCK_COLLEGES.filter((college) => {
      if (params.state && college.state !== params.state) return false;
      if (!query) return true;
      return (
        college.name.toLowerCase().includes(query) ||
        college.city.toLowerCase().includes(query) ||
        (college.programName ?? "").toLowerCase().includes(query)
      );
    });
  }

  if (profile || params.useMatchEndpoint) {
    const response = await fetch(`${API_BASE_URL}/api/colleges/match`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        query: params.query ?? "",
        limit: params.limit ?? 12,
        profileOverrides: profile
          ? {
              studentType: profile.studentType,
              residencyState: profile.stateResidence,
              targetStates: profile.preferredStates,
              intendedProgram: profile.intendedMajorLabel,
              gpa: profile.gpa,
              maxAnnualTuition: profile.budgetMax
            }
          : undefined
      })
    });

    if (!response.ok) {
      throw new Error("Failed to search colleges.");
    }

    const payload = await response.json();
    return (payload.results ?? []).map(mapMatchResult);
  }

  const searchParams = new URLSearchParams();
  if (params.query) searchParams.set("query", params.query);
  if (params.state) searchParams.set("state", params.state);
  if (params.limit) searchParams.set("limit", String(params.limit));

  const response = await fetch(`${API_BASE_URL}/api/colleges?${searchParams.toString()}`);
  if (!response.ok) {
    throw new Error("Failed to search college catalog.");
  }

  const payload = await response.json();
  return (payload.colleges ?? []).map(mapCatalogItem);
}
