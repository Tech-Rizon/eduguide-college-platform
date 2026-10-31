import { create } from "zustand";
import type { CollegeSearchParams, CollegeSummary, StudentProfile } from "@types";
import { getRecommendedColleges, searchColleges } from "@services/collegeApi";

type CollegeState = {
  recommended: CollegeSummary[];
  results: CollegeSummary[];
  selectedCollege: CollegeSummary | null;
  compareList: CollegeSummary[];
  isLoading: boolean;
  error: string | null;
  lastQuery: CollegeSearchParams;
  loadRecommended: (profile: StudentProfile) => Promise<void>;
  search: (params: CollegeSearchParams, profile?: StudentProfile | null) => Promise<void>;
  setSelectedCollege: (college: CollegeSummary | null) => void;
  addToCompare: (college: CollegeSummary) => void;
  removeFromCompare: (collegeId: string) => void;
  clearCompare: () => void;
};

export const useCollegeStore = create<CollegeState>((set, get) => ({
  recommended: [],
  results: [],
  selectedCollege: null,
  compareList: [],
  isLoading: false,
  error: null,
  lastQuery: {},

  loadRecommended: async (profile) => {
    set({ isLoading: true, error: null });
    try {
      const recommended = await getRecommendedColleges(profile);
      set({ recommended, isLoading: false });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to load recommendations."
      });
    }
  },

  search: async (params, profile) => {
    set({ isLoading: true, error: null, lastQuery: params });
    try {
      const results = await searchColleges(params, profile);
      set({ results, isLoading: false });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to search colleges."
      });
    }
  },

  setSelectedCollege: (college) => set({ selectedCollege: college }),

  addToCompare: (college) => {
    const compareList = get().compareList;
    if (compareList.some((item) => item.id === college.id) || compareList.length >= 3) return;
    set({ compareList: [...compareList, college] });
  },

  removeFromCompare: (collegeId) =>
    set((state) => ({
      compareList: state.compareList.filter((college) => college.id !== collegeId)
    })),

  clearCompare: () => set({ compareList: [] })
}));
