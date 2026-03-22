import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import type { CollegeSummary, StudentProfile } from "@types";
import { createId } from "@utils/ids";

const PROFILE_KEY = "@eduguide/mobile/profile";

const defaultProfile: StudentProfile = {
  id: createId("profile"),
  name: "",
  email: "",
  studentType: "freshman",
  gpa: 3.4,
  intendedMajor: "",
  intendedMajorLabel: "",
  budgetMax: 35000,
  stateResidence: "",
  preferredStates: [],
  collegeSize: [],
  collegeType: [],
  campusEnvironment: [],
  savedCollegeIds: [],
  appliedCollegeIds: [],
  onboardingComplete: false,
  createdAt: new Date().toISOString()
};

type ProfileState = {
  profile: StudentProfile;
  isLoading: boolean;
  isOnboarded: boolean;
  loadProfile: () => Promise<void>;
  saveProfile: (updates: Partial<StudentProfile>) => Promise<void>;
  updateField: <K extends keyof StudentProfile>(key: K, value: StudentProfile[K]) => Promise<void>;
  toggleSavedCollege: (college: CollegeSummary) => Promise<void>;
  markApplied: (collegeId: string) => Promise<void>;
  resetProfile: () => Promise<void>;
};

export const useProfileStore = create<ProfileState>((set, get) => ({
  profile: defaultProfile,
  isLoading: false,
  isOnboarded: false,

  loadProfile: async () => {
    set({ isLoading: true });
    try {
      const raw = await AsyncStorage.getItem(PROFILE_KEY);
      if (!raw) {
        set({ profile: defaultProfile, isLoading: false, isOnboarded: false });
        return;
      }

      const parsed = JSON.parse(raw) as StudentProfile;
      set({
        profile: { ...defaultProfile, ...parsed },
        isLoading: false,
        isOnboarded: Boolean(parsed.onboardingComplete)
      });
    } catch {
      set({ profile: defaultProfile, isLoading: false, isOnboarded: false });
    }
  },

  saveProfile: async (updates) => {
    const next = { ...get().profile, ...updates };
    set({ profile: next, isOnboarded: Boolean(next.onboardingComplete) });
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(next));
  },

  updateField: async (key, value) => {
    const next = { ...get().profile, [key]: value };
    set({ profile: next });
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(next));
  },

  toggleSavedCollege: async (college) => {
    const current = get().profile;
    const savedCollegeIds = current.savedCollegeIds.includes(college.id)
      ? current.savedCollegeIds.filter((id) => id !== college.id)
      : [...current.savedCollegeIds, college.id];
    await get().saveProfile({ savedCollegeIds });
  },

  markApplied: async (collegeId) => {
    const current = get().profile;
    if (current.appliedCollegeIds.includes(collegeId)) return;
    await get().saveProfile({
      appliedCollegeIds: [...current.appliedCollegeIds, collegeId]
    });
  },

  resetProfile: async () => {
    await AsyncStorage.removeItem(PROFILE_KEY);
    set({ profile: defaultProfile, isOnboarded: false });
  }
}));
