import { collegeDatabase, type CollegeEntry } from "./collegeDatabase";

export interface UserProfile {
  gpa?: number;
  location?: string;
  state?: string;
  preferredStates?: string[];
  intendedMajor?: string;
  budget?: "low" | "medium" | "high";
  schoolType?: string[];
  satScore?: number;
  actScore?: number;
  isFirstGen?: boolean;
  isTransferStudent?: boolean;
  demographics?: string[];
  interests?: string[];
  careerGoals?: string;
}

export interface AIResponse {
  content: string;
  colleges?: CollegeEntry[];
  profileUpdates?: Partial<UserProfile>;
  followUpQuestions?: string[];
}

const TRADING_SYSTEM_KEYWORDS = [
  "fx",
  "forex",
  "xauusd",
  "mt5",
  "oanda",
  "broker",
  "take profit",
  "stop loss",
  "order block",
  "liquidity sweep",
  "choch",
  "backtest",
  "paper trading",
  "risk orchestrator",
  "position sizing",
  "trailing stop",
  "kill switch",
  "flatten positions",
  "trade execution",
];

function escapeRegexLiteral(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isOutOfScopeTradingRequest(message: string): boolean {
  const lower = message.toLowerCase();
  return TRADING_SYSTEM_KEYWORDS.some((keyword) => {
    if (keyword.includes(" ")) return lower.includes(keyword);
    const pattern = new RegExp(`\\b${escapeRegexLiteral(keyword)}\\b`, "i");
    return pattern.test(lower);
  });
}

// State abbreviation mapping
const stateMap: Record<string, string> = {
  "alabama": "AL", "alaska": "AK", "arizona": "AZ", "arkansas": "AR",
  "california": "CA", "colorado": "CO", "connecticut": "CT", "delaware": "DE",
  "florida": "FL", "georgia": "GA", "hawaii": "HI", "idaho": "ID",
  "illinois": "IL", "indiana": "IN", "iowa": "IA", "kansas": "KS",
  "kentucky": "KY", "louisiana": "LA", "maine": "ME", "maryland": "MD",
  "massachusetts": "MA", "michigan": "MI", "minnesota": "MN", "mississippi": "MS",
  "missouri": "MO", "montana": "MT", "nebraska": "NE", "nevada": "NV",
  "new hampshire": "NH", "new jersey": "NJ", "new mexico": "NM", "new york": "NY",
  "north carolina": "NC", "north dakota": "ND", "ohio": "OH", "oklahoma": "OK",
  "oregon": "OR", "pennsylvania": "PA", "rhode island": "RI", "south carolina": "SC",
  "south dakota": "SD", "tennessee": "TN", "texas": "TX", "utah": "UT",
  "vermont": "VT", "virginia": "VA", "washington": "WA", "west virginia": "WV",
  "wisconsin": "WI", "wyoming": "WY", "dc": "DC", "washington dc": "DC",
};

const stateAbbrevMap: Record<string, string> = {
  "al": "AL", "ak": "AK", "az": "AZ", "ar": "AR", "ca": "CA",
  "co": "CO", "ct": "CT", "de": "DE", "fl": "FL", "ga": "GA",
  "hi": "HI", "id": "ID", "il": "IL", "in": "IN", "ia": "IA",
  "ks": "KS", "ky": "KY", "la": "LA", "me": "ME", "md": "MD",
  "ma": "MA", "mi": "MI", "mn": "MN", "ms": "MS", "mo": "MO",
  "mt": "MT", "ne": "NE", "nv": "NV", "nh": "NH", "nj": "NJ",
  "nm": "NM", "ny": "NY", "nc": "NC", "nd": "ND", "oh": "OH",
  "ok": "OK", "or": "OR", "pa": "PA", "ri": "RI", "sc": "SC",
  "sd": "SD", "tn": "TN", "tx": "TX", "ut": "UT", "vt": "VT",
  "va": "VA", "wa": "WA", "wv": "WV", "wi": "WI", "wy": "WY",
};

// Major keyword mapping
const majorKeywords: Record<string, string[]> = {
  "Computer Science": ["computer science", "cs", "programming", "coding", "software", "tech", "computer", "ai", "artificial intelligence", "data science", "cybersecurity", "information technology", "it"],
  "Engineering": ["engineering", "mechanical", "electrical", "civil", "aerospace", "biomedical"],
  "Business": ["business", "management", "marketing", "finance", "accounting", "mba", "entrepreneurship", "economics"],
  "Biology": ["biology", "pre-med", "premed", "medical", "biomedical", "life science", "health", "pre med"],
  "Nursing": ["nursing", "nurse", "rn", "healthcare", "health care"],
  "Psychology": ["psychology", "mental health", "counseling", "behavioral"],
  "Education": ["education", "teaching", "teacher", "pedagogy"],
  "Criminal Justice": ["criminal justice", "law enforcement", "criminology", "police", "forensic"],
  "Liberal Arts": ["liberal arts", "humanities", "general studies", "undecided"],
  "Film & Television": ["film", "cinema", "movie", "television", "media", "production"],
  "Political Science": ["political science", "politics", "government", "public policy", "international relations"],
  "Mathematics": ["math", "mathematics", "statistics", "actuarial"],
};

function extractGPA(message: string): number | undefined {
  // Match patterns like "3.5 gpa", "gpa of 3.5", "gpa is 3.5", "my gpa 3.5", "3.5"
  const patterns = [
    /(?:my\s+)?gpa\s*(?:is|of|:)?\s*(\d\.\d+)/i,
    /(\d\.\d+)\s*gpa/i,
    /grade\s*point\s*average\s*(?:is|of|:)?\s*(\d\.\d+)/i,
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match) {
      const gpa = Number.parseFloat(match[1]);
      if (gpa >= 0 && gpa <= 4.5) return gpa;
    }
  }
  return undefined;
}

function extractState(message: string): string | undefined {
  const lower = message.toLowerCase();

  // Check full state names
  for (const [name, abbrev] of Object.entries(stateMap)) {
    if (lower.includes(name)) return abbrev;
  }

  // Check abbreviations (surrounded by word boundaries)
  for (const [abbr, full] of Object.entries(stateAbbrevMap)) {
    const regex = new RegExp(`\\b${abbr}\\b`, "i");
    if (regex.test(lower)) return full;
  }

  // Check city names
  const cityToState: Record<string, string> = {
    "los angeles": "CA", "san francisco": "CA", "san diego": "CA", "sacramento": "CA",
    "houston": "TX", "dallas": "TX", "austin": "TX", "san antonio": "TX",
    "new york": "NY", "nyc": "NY", "manhattan": "NY", "brooklyn": "NY",
    "miami": "FL", "orlando": "FL", "tampa": "FL", "jacksonville": "FL",
    "chicago": "IL", "atlanta": "GA", "seattle": "WA", "portland": "OR",
    "boston": "MA", "philadelphia": "PA", "phoenix": "AZ", "denver": "CO",
    "detroit": "MI", "ann arbor": "MI", "columbus": "OH", "nashville": "TN",
    "minneapolis": "MN", "boulder": "CO", "madison": "WI",
  };

  for (const [city, state] of Object.entries(cityToState)) {
    if (lower.includes(city)) return state;
  }

  return undefined;
}

function extractMajor(message: string): string | undefined {
  const lower = message.toLowerCase();

  for (const [major, keywords] of Object.entries(majorKeywords)) {
    for (const keyword of keywords) {
      if (lower.includes(keyword)) return major;
    }
  }
  return undefined;
}

function extractBudget(message: string): "low" | "medium" | "high" | undefined {
  const lower = message.toLowerCase();

  if (lower.match(/\b(cheap|affordable|budget|low[\s-]?cost|free|community college|inexpensive|save money)\b/)) return "low";
  if (lower.match(/\b(moderate|mid[\s-]?range|reasonable|state school)\b/)) return "medium";
  if (lower.match(/\b(expensive|private|ivy|elite|money.*(not|no|isn't|isnt).*(issue|problem|concern)|unlimited budget)\b/)) return "high";

  return undefined;
}

function extractSchoolType(message: string): string[] | undefined {
  const lower = message.toLowerCase();
  const types: string[] = [];

  if (lower.match(/\b(community college|cc|2[\s-]?year|two[\s-]?year|associate)\b/)) types.push("Community College");
  if (lower.match(/\b(university|4[\s-]?year|four[\s-]?year|bachelor)\b/)) {
    if (lower.match(/\b(public|state)\b/)) types.push("Public University");
    if (lower.match(/\b(private)\b/)) types.push("Private University");
    if (types.length === 0) {
      types.push("Public University", "Private University");
    }
  }
  if (lower.match(/\b(technical|trade|vocational)\b/)) types.push("Technical College");

  return types.length > 0 ? types : undefined;
}

function extractSATScore(message: string): number | undefined {
  const match = message.match(/\b(sat|SAT)\s*(?:score|:)?\s*(?:is|of|was)?\s*(\d{3,4})\b/i);
  if (match) {
    const score = Number.parseInt(match[2]);
    if (score >= 400 && score <= 1600) return score;
  }
  return undefined;
}

function extractACTScore(message: string): number | undefined {
  const match = message.match(/\b(act|ACT)\s*(?:score|:)?\s*(?:is|of|was)?\s*(\d{1,2})\b/i);
  if (match) {
    const score = Number.parseInt(match[2]);
    if (score >= 1 && score <= 36) return score;
  }
  return undefined;
}

function extractDemographics(message: string): string[] | undefined {
  const lower = message.toLowerCase();
  const demographics: string[] = [];

  if (lower.match(/\b(first[\s-]?gen|first generation|first in.*(family|fam).*college)\b/)) demographics.push("first-generation");
  if (lower.match(/\b(veteran|military|vet|armed forces|gi bill)\b/)) demographics.push("military");
  if (lower.match(/\b(international|foreign|visa|f1|f-1)\b/)) demographics.push("international");
  if (lower.match(/\b(transfer|transferring|currently at|coming from)\b/)) demographics.push("transfer");
  if (lower.match(/\b(adult learner|returning student|non[\s-]?traditional|going back to school)\b/)) demographics.push("non-traditional");
  if (lower.match(/\b(low[\s-]?income|financial need|can't afford|economically disadvantaged)\b/)) demographics.push("low-income");
  if (lower.match(/\b(disabled|disability|accommodations|ada|learning disability)\b/)) demographics.push("disability");

  return demographics.length > 0 ? demographics : undefined;
}

function scoreCollege(college: CollegeEntry, profile: UserProfile): number {
  let score = 50; // Base score

  // GPA match (very important)
  if (profile.gpa !== undefined) {
    if (college.type === "Community College") {
      score += 15; // Community colleges accept all GPAs
    } else if (profile.gpa >= college.avgGPA) {
      score += 25; // Strong candidate
    } else if (profile.gpa >= college.minGPA) {
      score += 15; // Meets minimum
    } else if (profile.gpa >= college.minGPA - 0.3) {
      score += 5; // Slightly below but could work
    } else {
      score -= 20; // Below minimum
    }
  }

  // State preference
  if (profile.state && college.state === profile.state) {
    score += 20;
  }
  if (profile.preferredStates?.includes(college.state)) {
    score += 15;
  }

  // Major match
  if (profile.intendedMajor) {
    const majorLower = profile.intendedMajor.toLowerCase();
    if (college.majors.some(m => m.toLowerCase().includes(majorLower) || majorLower.includes(m.toLowerCase()))) {
      score += 20;
    }
  }

  // Budget match
  if (profile.budget) {
    const tuition = profile.state === college.state ? college.tuitionInState : college.tuitionOutState;
    if (profile.budget === "low" && tuition <= 5000) score += 20;
    else if (profile.budget === "low" && tuition <= 15000) score += 10;
    else if (profile.budget === "low" && tuition > 30000) score -= 15;
    else if (profile.budget === "medium" && tuition <= 25000) score += 15;
    else if (profile.budget === "medium" && tuition > 50000) score -= 10;
    else if (profile.budget === "high") score += 5;
  }

  // School type preference
  if (profile.schoolType?.length) {
    if (profile.schoolType.includes(college.type)) {
      score += 15;
    } else {
      score -= 10;
    }
  }

  // Demographics bonuses
  if (profile.demographics?.includes("first-generation") && college.financialAidPercent > 70) {
    score += 10;
  }
  if (profile.demographics?.includes("transfer") && college.tags.includes("transfer")) {
    score += 15;
  }
  if (profile.demographics?.includes("military") && college.tags.includes("military-friendly")) {
    score += 15;
  }
  if (profile.demographics?.includes("low-income") && college.type === "Community College") {
    score += 15;
  }
  if (profile.demographics?.includes("low-income") && college.financialAidPercent > 75) {
    score += 10;
  }

  // SAT/ACT match
  if (profile.satScore && college.satRange !== "N/A") {
    const [low, high] = college.satRange.split("-").map(Number);
    if (profile.satScore >= low && profile.satScore <= high) score += 10;
    else if (profile.satScore > high) score += 15;
    else if (profile.satScore < low - 100) score -= 10;
  }

  // Interests match
  if (profile.interests?.length) {
    for (const interest of profile.interests) {
      if (college.tags.includes(interest)) score += 5;
    }
  }

  return Math.max(0, Math.min(100, score));
}

function getRecommendations(profile: UserProfile, limit = 5): CollegeEntry[] {
  const scored = collegeDatabase.map(college => ({
    college,
    score: scoreCollege(college, profile)
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map(s => s.college);
}

function detectIntent(message: string): string {
  const lower = message.toLowerCase();

  if (lower.match(/\b(hello|hi|hey|good morning|good afternoon|good evening|howdy|what's up|sup)\b/)) return "greeting";
  if (lower.match(/\b(recommend|suggest|find|best|which|what.*college|help me (find|choose|pick|decide)|match|good for me)\b/)) return "recommendation";
  if (lower.match(/\b(gpa|grade point|grades?|transcript|academic)\b/)) return "gpa-discussion";
  if (lower.match(/\b(financial aid|fafsa|scholarship|grant|loan|money|cost|afford|tuition|pay for)\b/)) return "financial-aid";
  if (lower.match(/\b(admission|requirement|apply|application|deadline|acceptance|admit|get into|get in)\b/)) return "admissions";
  if (lower.match(/\b(community college|cc|transfer|2[\s-]?year|two[\s-]?year)\b/)) return "community-college";
  if (lower.match(/\b(compare|vs|versus|difference|better|between)\b/)) return "comparison";
  if (lower.match(/\b(major|study|program|degree|field|career)\b/)) return "major-selection";
  if (lower.match(/\b(online|distance|remote|virtual)\b/)) return "online-learning";
  if (lower.match(/\b(test|sat|act|exam|standardized|prep)\b/)) return "test-prep";
  if (lower.match(/\b(essay|personal statement|sop|statement of purpose)\b/)) return "essay-help";
  if (lower.match(/\b(thank|thanks|thx|appreciate)\b/)) return "thanks";

  return "general";
}

export function processMessage(
  userMessage: string,
  currentProfile: UserProfile,
  userName?: string
): AIResponse {
  if (isOutOfScopeTradingRequest(userMessage)) {
    return {
      content: "I can’t help with live or simulated trading system design, execution, or risk controls in this EduGuide assistant. I’m scoped to college guidance only (school matching, admissions, financial aid, and tutoring support). If you want, I can still help with education planning or college recommendations.",
      profileUpdates: {},
      followUpQuestions: [
        "What GPA should I use for your college matches?",
        "Which state or region are you targeting for school?",
        "What major or career path are you considering?",
      ],
    };
  }

  const intent = detectIntent(userMessage);
  const profileUpdates: Partial<UserProfile> = {};

  // Extract profile information from message
  const gpa = extractGPA(userMessage);
  if (gpa !== undefined) profileUpdates.gpa = gpa;

  const state = extractState(userMessage);
  if (state) {
    profileUpdates.state = state;
    profileUpdates.preferredStates = [...(currentProfile.preferredStates || []), state];
  }

  const major = extractMajor(userMessage);
  if (major) profileUpdates.intendedMajor = major;

  const budget = extractBudget(userMessage);
  if (budget) profileUpdates.budget = budget;

  const schoolType = extractSchoolType(userMessage);
  if (schoolType) profileUpdates.schoolType = schoolType;

  const satScore = extractSATScore(userMessage);
  if (satScore) profileUpdates.satScore = satScore;

  const actScore = extractACTScore(userMessage);
  if (actScore) profileUpdates.actScore = actScore;

  const demographics = extractDemographics(userMessage);
  if (demographics) profileUpdates.demographics = [...(currentProfile.demographics || []), ...demographics];

  // Merge profile for scoring
  const updatedProfile = { ...currentProfile, ...profileUpdates };
  const greeting = userName ? `${userName}` : "there";

  switch (intent) {
    case "greeting":
      return {
        content: `Hi ${greeting}! I'm your EduGuide AI college advisor. I'm here to help you find the perfect college or university based on your unique situation.\n\nTo give you the best recommendations, I'd love to know:\n\n**1. What's your current GPA?** (e.g., "My GPA is 3.2")\n**2. Where are you located or where would you like to study?**\n**3. What do you want to study?** (e.g., Computer Science, Nursing, Business)\n**4. What's your budget preference?** (affordable, moderate, or flexible)\n\nFeel free to share any or all of these details, and I'll match you with schools that fit!`,
        profileUpdates,
      };

    case "gpa-discussion": {
      if (gpa !== undefined) {
        const recs = getRecommendations(updatedProfile, 4);
        let response = `Great, I see your GPA is **${gpa}**. `;

        if (gpa >= 3.8) {
          response += "That's an excellent GPA! You're competitive for top-tier universities including Ivy League schools.";
        } else if (gpa >= 3.5) {
          response += "That's a strong GPA! You're competitive for many selective universities and have great options.";
        } else if (gpa >= 3.0) {
          response += "That's a solid GPA! You have many good options across state universities and some selective schools.";
        } else if (gpa >= 2.5) {
          response += "You have several paths available! Many state universities and community colleges would be a great fit.";
        } else {
          response += "Don't worry! Community colleges offer open enrollment and are an excellent starting point. Many students transfer to 4-year universities after improving their GPA.";
        }

        if (recs.length > 0) {
          response += `\n\nBased on your profile so far, here are some schools that could be a good fit:`;
        }

        response += "\n\nTell me more about what you'd like to study and where you'd like to be, and I'll refine these recommendations!";

        return { content: response, colleges: recs, profileUpdates };
      }

      return {
        content: `I'd love to help you find colleges that match your academic profile! What's your current GPA? Just tell me something like "My GPA is 3.2" and I'll find schools where you'd be competitive.\n\nIf you don't have a specific GPA, no worries - I can still help! Community colleges have open enrollment, and many universities have flexible admission standards.`,
        profileUpdates,
      };
    }

    case "recommendation": {
      const recs = getRecommendations(updatedProfile, 5);

      let response = "";
      const hasProfile = updatedProfile.gpa || updatedProfile.state || updatedProfile.intendedMajor;

      if (hasProfile) {
        response = `Based on your profile`;
        const details: string[] = [];
        if (updatedProfile.gpa) details.push(`GPA: ${updatedProfile.gpa}`);
        if (updatedProfile.state) details.push(`Location: ${updatedProfile.state}`);
        if (updatedProfile.intendedMajor) details.push(`Major: ${updatedProfile.intendedMajor}`);
        if (updatedProfile.budget) details.push(`Budget: ${updatedProfile.budget}`);
        response += ` (${details.join(", ")}), here are my top recommendations for you:`;
      } else {
        response = `I'd love to give you personalized recommendations! Here are some popular options to start. **To get better matches, tell me:**\n\n- Your GPA (e.g., "My GPA is 3.0")\n- Your preferred state/location\n- What you want to study\n- Your budget preference\n\nHere are some diverse options to explore:`;
      }

      return { content: response, colleges: recs, profileUpdates };
    }

    case "financial-aid": {
      const aidColleges = getRecommendations({ ...updatedProfile, budget: "low" }, 3);

      return {
        content: `Great question about financial aid! Here's a comprehensive overview:\n\n**Federal Aid (FAFSA is key!):**\n- **Pell Grants**: Up to $7,395/year (you don't repay this!)\n- **Federal Student Loans**: Subsidized & unsubsidized options\n- **Work-Study**: Part-time campus jobs\n\n**State Aid:**\n${updatedProfile.state ? `As a ${updatedProfile.state} resident, check your state's grant programs - many states offer significant tuition assistance for in-state students.` : "Your state likely has its own grant programs. Tell me which state you're in and I'll give you specifics!"}\n\n**Scholarships:**\n- **Merit-Based**: Based on GPA${updatedProfile.gpa ? ` (your ${updatedProfile.gpa} GPA qualifies you for many!)` : ""}\n- **Need-Based**: Based on family income\n- **Identity-Based**: First-generation, minority, women in STEM, etc.\n- **Field-Specific**: Many programs offer scholarships for in-demand fields\n\n**Pro Tips:**\n1. File FAFSA as early as October 1st\n2. Apply to schools with high financial aid percentages\n3. Community colleges are extremely affordable ($1,000-$5,000/year)\n4. Many private schools offer generous aid that makes them cheaper than public schools\n\nHere are some schools known for strong financial aid:`,
        colleges: aidColleges,
        profileUpdates,
      };
    }

    case "admissions": {
      let response = "Here's what you need to know about college admissions:\n\n";

      if (updatedProfile.gpa) {
        response += `**With your ${updatedProfile.gpa} GPA:**\n`;
        if (updatedProfile.gpa >= 3.8) {
          response += "- You're competitive for top-tier and Ivy League schools\n- Apply to a mix of reach, match, and safety schools\n- Focus on strong essays and extracurriculars to stand out\n\n";
        } else if (updatedProfile.gpa >= 3.0) {
          response += "- You're a strong candidate for many state universities\n- Consider schools where your GPA is at or above the average\n- Strong test scores and essays can boost your application\n\n";
        } else {
          response += "- Community colleges are an excellent starting point (open enrollment!)\n- Many state schools have holistic admissions looking beyond just GPA\n- Consider writing a compelling personal statement explaining your growth\n\n";
        }
      }

      response += `**General Application Checklist:**\n- High school transcript (official)\n- SAT/ACT scores (many schools are now test-optional)\n- Personal essay / Statement of Purpose\n- Letters of recommendation (2-3)\n- Extracurricular activities list\n- Application fee ($25-$90, fee waivers available)\n\n**Key Deadlines:**\n- Early Decision: November 1-15\n- Early Action: November 1-15\n- Regular Decision: January 1-15\n- Community Colleges: Rolling (apply anytime)\n\n**Community College Admission:**\n- Open enrollment (everyone accepted!)\n- Just need HS diploma or GED\n- Placement tests for math/English\n- Can start any semester`;

      const recs = getRecommendations(updatedProfile, 3);
      if (recs.length > 0) {
        response += "\n\nHere are some schools that match your profile:";
      }

      return { content: response, colleges: recs, profileUpdates };
    }

    case "community-college": {
      const ccProfile = { ...updatedProfile, schoolType: ["Community College" as const] };
      const ccRecs = getRecommendations(ccProfile, 4);

      return {
        content: `Community colleges are an incredible option! Here's why they're so valuable:\n\n**Advantages:**\n- **Affordable**: Typically $1,000-$5,000/year (vs. $15,000-$60,000 at universities)\n- **Open Enrollment**: No GPA or test score requirements\n- **Transfer Pathways**: Many have guaranteed transfer agreements with top universities\n- **Flexible**: Evening, weekend, and online classes available\n- **Smaller Classes**: More personal attention from instructors\n- **Career Programs**: Many offer certificates and associate degrees for immediate employment\n\n**Transfer Success Stories:**\n- Santa Monica College is the #1 transfer school to UCLA\n- Many UC and CSU students started at community colleges\n- Transfer students often perform as well or better than direct admits\n\n${updatedProfile.gpa && updatedProfile.gpa < 2.5 ? "**Given your GPA, starting at a community college is a strategic move!** You can raise your GPA, save money, and transfer to a great university. Many successful professionals took this path." : "**Even with a strong GPA, community colleges can save you thousands** while you figure out your path."}\n\nHere are some top community colleges${updatedProfile.state ? ` near ${updatedProfile.state}` : ""}:`,
        colleges: ccRecs,
        profileUpdates: { ...profileUpdates, schoolType: ["Community College"] },
      };
    }

    case "major-selection": {
      let response = "";

      if (major) {
        const majorRecs = getRecommendations(updatedProfile, 4);
        response = `**${major}** is a great field of study! `;

        const majorInfo: Record<string, string> = {
          "Computer Science": "CS is one of the most in-demand fields with median starting salaries of $75,000-$120,000. Look for schools with strong industry connections and internship programs.",
          "Engineering": "Engineering offers excellent career prospects. Top programs often have co-op opportunities and industry partnerships for hands-on experience.",
          "Business": "Business degrees are versatile. Look for schools with AACSB accreditation, strong internship placements, and alumni networks.",
          "Biology": "Perfect for pre-med or research careers. Look for schools with undergraduate research opportunities and strong lab facilities.",
          "Nursing": "Nursing has excellent job security and growth. Ensure the program is CCNE or ACEN accredited for licensure.",
          "Psychology": "Psychology opens doors to counseling, research, and many other careers. Consider schools with research opportunities if you plan to go to grad school.",
          "Criminal Justice": "Growing field with opportunities in law enforcement, courts, and corrections. Look for programs with internship placements.",
          "Liberal Arts": "A great choice if you're exploring your interests! Liberal arts develops critical thinking skills valued across all industries.",
        };

        response += majorInfo[major] || `This field has growing career opportunities. Let me find schools with strong ${major} programs.`;
        response += "\n\nHere are schools with strong programs in this field:";

        return { content: response, colleges: majorRecs, profileUpdates };
      }

      response = `Choosing a major is a big decision! Here are some things to consider:\n\n**Highest-Demand Fields (2024-2026):**\n1. Computer Science / Software Engineering\n2. Nursing / Healthcare\n3. Business / Finance\n4. Engineering (all types)\n5. Data Science / AI\n\n**Tips for Choosing:**\n- Think about what subjects excite you\n- Consider job market demand and salary potential\n- Talk to professionals in fields you're interested in\n- Remember: many people change majors, and that's okay!\n- Community colleges are great for exploring different subjects\n\n**Undecided? That's perfectly fine!**\nMany colleges let you enter undeclared and explore before choosing. Community colleges are especially great for this.\n\nWhat subjects interest you? Tell me and I'll find schools with strong programs!`;

      return { content: response, profileUpdates };
    }

    case "comparison": {
      const recs = getRecommendations(updatedProfile, 4);
      return {
        content: `Great idea to compare schools! Here are some key factors to consider:\n\n**Academic Factors:**\n- Program strength in your intended major\n- Class sizes and student-to-faculty ratio\n- Research opportunities\n- Graduation and job placement rates\n\n**Financial Factors:**\n- Tuition (in-state vs. out-of-state)\n- Financial aid and scholarship availability\n- Cost of living in the area\n- Return on investment (salary vs. debt)\n\n**Campus & Culture:**\n- Location (urban, suburban, rural)\n- Campus size and facilities\n- Student diversity and demographics\n- Extracurricular activities and social life\n\n**Practical Factors:**\n- Distance from home\n- Internship/job opportunities nearby\n- Transfer agreements (for community colleges)\n- Online/hybrid options\n\nHere are some schools you might want to compare based on your profile:`,
        colleges: recs,
        profileUpdates,
      };
    }

    case "test-prep": {
      return {
        content: `Here's what you need to know about standardized tests:\n\n**SAT vs ACT:**\n| Feature | SAT | ACT |\n|---------|-----|-----|\n| Sections | Reading, Writing, Math | English, Math, Reading, Science |\n| Score Range | 400-1600 | 1-36 |\n| Time | 3 hours | 2 hours 55 min |\n| Best For | Strong readers/writers | Fast test-takers, science lovers |\n\n**Test-Optional Schools:**\nMany schools are now test-optional! This means you can choose whether to submit scores. This is great news if:\n- Your GPA is strong but test scores don't reflect your ability\n- You haven't been able to prepare adequately\n- Test anxiety affects your performance\n\n**Free Prep Resources:**\n- Khan Academy (official SAT partner)\n- ACT Academy\n- Your local library\n\n**Community colleges don't require SAT/ACT!** They use placement tests instead.\n\n${updatedProfile.satScore ? `With your SAT score of ${updatedProfile.satScore}, ` : ""}${updatedProfile.actScore ? `With your ACT score of ${updatedProfile.actScore}, ` : ""}${updatedProfile.satScore || updatedProfile.actScore ? "let me find schools where you'd be competitive:" : "Would you like me to find test-optional schools?"}`,
        colleges: (updatedProfile.satScore || updatedProfile.actScore) ? getRecommendations(updatedProfile, 3) : undefined,
        profileUpdates,
      };
    }

    case "essay-help": {
      return {
        content: `The college essay is your chance to stand out! Here's my guide:\n\n**Common Essay Prompts:**\n1. Share your story - background, identity, interest, or talent\n2. Describe a challenge or setback and how you grew from it\n3. A topic that captivates you so much you lose track of time\n4. Describe a problem you'd like to solve\n5. A personal achievement or event that sparked growth\n\n**Essay Tips:**\n- **Be Authentic**: Write in your own voice, not what you think they want to hear\n- **Show, Don't Tell**: Use specific examples and stories\n- **Start Strong**: Hook the reader in the first sentence\n- **Be Specific**: Avoid cliches and generic statements\n- **Proofread**: Have someone else read it too\n- **Answer the Prompt**: Stay focused on what they're asking\n\n**Common Mistakes to Avoid:**\n- Don't repeat your resume/activities list\n- Don't write about something just because it sounds impressive\n- Don't use overly complex vocabulary unnaturally\n- Don't exceed the word limit\n\n**Need more help?** Our tutoring service includes essay review and writing assistance. Check out our [tutoring plans](/tutoring) for personalized essay coaching!`,
        profileUpdates,
      };
    }

    case "online-learning": {
      return {
        content: `Online learning has expanded dramatically! Here are your options:\n\n**Fully Online Programs:**\n- Arizona State University (ASU) - #1 in innovation, 300+ online programs\n- University of Florida - Top-ranked online bachelor's programs\n- Many community colleges offer fully online associate degrees\n\n**Benefits of Online Learning:**\n- Flexible schedule for working students\n- Study from anywhere\n- Often more affordable (no room & board)\n- Same degree as on-campus students\n\n**Things to Consider:**\n- Accreditation (make sure it's regionally accredited)\n- Self-discipline required\n- Less networking/social opportunities\n- Some programs need in-person components (labs, clinicals)\n\n**Hybrid Options:**\nMany schools now offer hybrid programs where you attend some classes online and some in person - the best of both worlds!\n\nWould you like me to find specific online programs in your area of interest?`,
        profileUpdates,
      };
    }

    case "thanks": {
      return {
        content: `You're welcome, ${greeting}! I'm here anytime you need help with your college search. Remember, finding the right school is a journey, and I'm with you every step of the way.\n\nFeel free to come back anytime to:\n- Get updated recommendations\n- Ask about specific schools\n- Get help with applications\n- Explore financial aid options\n\nGood luck on your educational journey!`,
        profileUpdates,
      };
    }

    default: {
      // General response with any detected profile updates
      const hasUpdates = Object.keys(profileUpdates).length > 0;
      const recs = hasUpdates ? getRecommendations(updatedProfile, 4) : getRecommendations(updatedProfile, 3);

      let response = "";

      if (hasUpdates) {
        const updateSummary: string[] = [];
        if (profileUpdates.gpa) updateSummary.push(`GPA: ${profileUpdates.gpa}`);
        if (profileUpdates.state) updateSummary.push(`Location: ${profileUpdates.state}`);
        if (profileUpdates.intendedMajor) updateSummary.push(`Major Interest: ${profileUpdates.intendedMajor}`);
        if (profileUpdates.budget) updateSummary.push(`Budget: ${profileUpdates.budget}`);
        if (profileUpdates.schoolType) updateSummary.push(`School Type: ${profileUpdates.schoolType.join(", ")}`);

        response = `Thanks for sharing! I've updated your profile with: **${updateSummary.join(" | ")}**\n\nBased on what I know about you, here are my recommendations:`;
      } else {
        response = `I'd be happy to help you explore your college options! To give you the most relevant recommendations, could you share:\n\n**About You:**\n- Your current GPA (e.g., "My GPA is 3.2")\n- Your location or preferred state\n- What you'd like to study\n\n**Preferences:**\n- Budget level (affordable, moderate, or flexible)\n- School type (community college, university)\n- Any special circumstances (first-generation, transfer, military, etc.)\n\nThe more you share, the better I can match you with the right schools! Here are some popular options to start:`;
      }

      return { content: response, colleges: recs, profileUpdates };
    }
  }
}

// Search colleges by filter criteria
export function searchColleges(filters: {
  state?: string;
  type?: string;
  maxTuition?: number;
  minGPA?: number;
  major?: string;
  query?: string;
}): CollegeEntry[] {
  let results = [...collegeDatabase];

  if (filters.state) {
    results = results.filter(c => c.state === filters.state);
  }

  if (filters.type) {
    results = results.filter(c => c.type === filters.type);
  }

  if (filters.maxTuition) {
    results = results.filter(c => c.tuitionInState <= filters.maxTuition!);
  }

  if (filters.minGPA !== undefined) {
    results = results.filter(c => c.minGPA <= filters.minGPA!);
  }

  if (filters.major) {
    const majorLower = filters.major.toLowerCase();
    results = results.filter(c =>
      c.majors.some(m => m.toLowerCase().includes(majorLower))
    );
  }

  if (filters.query) {
    const query = filters.query.toLowerCase();
    results = results.filter(c =>
      c.name.toLowerCase().includes(query) ||
      c.city.toLowerCase().includes(query) ||
      c.state.toLowerCase().includes(query) ||
      c.description.toLowerCase().includes(query) ||
      c.majors.some(m => m.toLowerCase().includes(query)) ||
      c.tags.some(t => t.toLowerCase().includes(query))
    );
  }

  return results;
}
