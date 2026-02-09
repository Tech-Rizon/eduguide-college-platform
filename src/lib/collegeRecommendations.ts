export interface CollegeRecommendation {
  id: string;
  name: string;
  location: string;
  stateCode: string;
  city: string;
  type: "Public University" | "Private University" | "Community College";
  tuition: string;
  acceptanceRate: string;
  ranking: number;
  programs: string[];
  budgetLevel: "low" | "medium" | "high";
}

export interface ParsedStudentIntent {
  location?: {
    stateCode: string;
    stateName: string;
    city?: string;
  };
  preferredType?: "Community College" | "University";
  budgetLevel?: "low" | "medium" | "high";
  programInterest?: string;
}

const STATE_ALIASES: Record<string, { name: string; code: string }> = {
  california: { name: "California", code: "CA" },
  ca: { name: "California", code: "CA" },
  texas: { name: "Texas", code: "TX" },
  tx: { name: "Texas", code: "TX" },
  florida: { name: "Florida", code: "FL" },
  fl: { name: "Florida", code: "FL" },
  "new york": { name: "New York", code: "NY" },
  ny: { name: "New York", code: "NY" },
  illinois: { name: "Illinois", code: "IL" },
  il: { name: "Illinois", code: "IL" },
  washington: { name: "Washington", code: "WA" },
  wa: { name: "Washington", code: "WA" },
  arizona: { name: "Arizona", code: "AZ" },
  az: { name: "Arizona", code: "AZ" },
};

const CITY_TO_STATE: Record<string, { stateCode: string; stateName: string }> =
  {
    "los angeles": { stateCode: "CA", stateName: "California" },
    "san francisco": { stateCode: "CA", stateName: "California" },
    "san diego": { stateCode: "CA", stateName: "California" },
    austin: { stateCode: "TX", stateName: "Texas" },
    dallas: { stateCode: "TX", stateName: "Texas" },
    houston: { stateCode: "TX", stateName: "Texas" },
    miami: { stateCode: "FL", stateName: "Florida" },
    orlando: { stateCode: "FL", stateName: "Florida" },
    tampa: { stateCode: "FL", stateName: "Florida" },
    "new york city": { stateCode: "NY", stateName: "New York" },
    "new york": { stateCode: "NY", stateName: "New York" },
    chicago: { stateCode: "IL", stateName: "Illinois" },
    seattle: { stateCode: "WA", stateName: "Washington" },
    phoenix: { stateCode: "AZ", stateName: "Arizona" },
  };

export const COLLEGE_DATABASE: CollegeRecommendation[] = [
  {
    id: "ca-ucla",
    name: "University of California, Los Angeles",
    location: "Los Angeles, CA",
    stateCode: "CA",
    city: "Los Angeles",
    type: "Public University",
    tuition: "$13,804 (in-state), $43,022 (out-of-state)",
    acceptanceRate: "9%",
    ranking: 1,
    programs: ["computer science", "engineering", "biology", "business"],
    budgetLevel: "medium",
  },
  {
    id: "ca-smc",
    name: "Santa Monica College",
    location: "Santa Monica, CA",
    stateCode: "CA",
    city: "Santa Monica",
    type: "Community College",
    tuition: "$1,380 (in-state), $10,206 (out-of-state)",
    acceptanceRate: "Open enrollment",
    ranking: 2,
    programs: ["transfer studies", "computer science", "nursing", "business"],
    budgetLevel: "low",
  },
  {
    id: "tx-utaustin",
    name: "The University of Texas at Austin",
    location: "Austin, TX",
    stateCode: "TX",
    city: "Austin",
    type: "Public University",
    tuition: "$11,678 (in-state), $42,778 (out-of-state)",
    acceptanceRate: "29%",
    ranking: 3,
    programs: ["computer science", "engineering", "business", "education"],
    budgetLevel: "medium",
  },
  {
    id: "tx-acc",
    name: "Austin Community College",
    location: "Austin, TX",
    stateCode: "TX",
    city: "Austin",
    type: "Community College",
    tuition: "$2,790 (in-district), $8,850 (out-of-district)",
    acceptanceRate: "Open enrollment",
    ranking: 4,
    programs: ["cybersecurity", "nursing", "transfer studies", "engineering"],
    budgetLevel: "low",
  },
  {
    id: "fl-uf",
    name: "University of Florida",
    location: "Gainesville, FL",
    stateCode: "FL",
    city: "Gainesville",
    type: "Public University",
    tuition: "$6,381 (in-state), $28,659 (out-of-state)",
    acceptanceRate: "23%",
    ranking: 5,
    programs: ["computer science", "journalism", "biology", "business"],
    budgetLevel: "low",
  },
  {
    id: "ny-cuny",
    name: "CUNY Hunter College",
    location: "New York, NY",
    stateCode: "NY",
    city: "New York",
    type: "Public University",
    tuition: "$7,380 (in-state), $15,330 (out-of-state)",
    acceptanceRate: "46%",
    ranking: 6,
    programs: ["psychology", "nursing", "computer science", "education"],
    budgetLevel: "low",
  },
  {
    id: "wa-uw",
    name: "University of Washington",
    location: "Seattle, WA",
    stateCode: "WA",
    city: "Seattle",
    type: "Public University",
    tuition: "$12,973 (in-state), $43,209 (out-of-state)",
    acceptanceRate: "48%",
    ranking: 7,
    programs: ["computer science", "public health", "engineering", "business"],
    budgetLevel: "medium",
  },
  {
    id: "il-ccc",
    name: "City Colleges of Chicago",
    location: "Chicago, IL",
    stateCode: "IL",
    city: "Chicago",
    type: "Community College",
    tuition: "$5,060 (in-district), $11,960 (out-of-district)",
    acceptanceRate: "Open enrollment",
    ranking: 8,
    programs: [
      "transfer studies",
      "nursing",
      "business",
      "information technology",
    ],
    budgetLevel: "low",
  },
];

export function parseStudentIntent(message: string): ParsedStudentIntent {
  const normalized = message.toLowerCase();
  const intent: ParsedStudentIntent = {};

  for (const [alias, state] of Object.entries(STATE_ALIASES)) {
    if (normalized.includes(alias)) {
      intent.location = { stateCode: state.code, stateName: state.name };
      break;
    }
  }

  if (!intent.location) {
    for (const [city, state] of Object.entries(CITY_TO_STATE)) {
      if (normalized.includes(city)) {
        intent.location = {
          stateCode: state.stateCode,
          stateName: state.stateName,
          city,
        };
        break;
      }
    }
  }

  if (normalized.includes("community college")) {
    intent.preferredType = "Community College";
  } else if (
    normalized.includes("university") ||
    normalized.includes("college")
  ) {
    intent.preferredType = "University";
  }

  if (
    normalized.includes("affordable") ||
    normalized.includes("cheap") ||
    normalized.includes("budget") ||
    normalized.includes("low cost")
  ) {
    intent.budgetLevel = "low";
  } else if (normalized.includes("mid") || normalized.includes("moderate")) {
    intent.budgetLevel = "medium";
  } else if (normalized.includes("top") || normalized.includes("elite")) {
    intent.budgetLevel = "high";
  }

  const knownPrograms = [
    "computer science",
    "engineering",
    "nursing",
    "business",
    "biology",
    "psychology",
    "education",
  ];

  intent.programInterest = knownPrograms.find((program) =>
    normalized.includes(program),
  );

  return intent;
}

export function findMatchingColleges(
  intent: ParsedStudentIntent,
): CollegeRecommendation[] {
  let results = [...COLLEGE_DATABASE];

  if (intent.location) {
    results = results.filter(
      (college) => college.stateCode === intent.location?.stateCode,
    );
  }

  if (intent.preferredType === "Community College") {
    results = results.filter((college) => college.type === "Community College");
  }

  if (intent.preferredType === "University") {
    results = results.filter((college) => college.type !== "Community College");
  }

  if (intent.budgetLevel) {
    results = results.filter(
      (college) =>
        college.budgetLevel === intent.budgetLevel ||
        intent.budgetLevel === "high",
    );
  }

  if (intent.programInterest) {
    results = results.filter((college) =>
      college.programs.some((program) =>
        program.includes(intent.programInterest || ""),
      ),
    );
  }

  if (results.length === 0) {
    return COLLEGE_DATABASE.slice(0, 3);
  }

  return results.slice(0, 3);
}

export function hasLocation(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    Object.keys(STATE_ALIASES).some((alias) => normalized.includes(alias)) ||
    Object.keys(CITY_TO_STATE).some((city) => normalized.includes(city))
  );
}
