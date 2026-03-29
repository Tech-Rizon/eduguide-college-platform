import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import type { CollegeSummary, StudentProfile } from "@types";
import {
  applyRemoteMatchProfile,
  fetchRemoteMatchProfile,
  saveRemoteMatchProfile
} from "@services/matchProfileApi";
import { createId } from "@utils/ids";

const PROFILE_KEY = "@eduguide/mobile/profile";

const defaultProfile: StudentProfile = {
  id: createId("profile"),
  name: "",
  email: "",
  onboardingAction: "register",
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

type SaveProfileOptions = {
  syncRemote?: boolean;
};

type ProfileState = {
  profile: StudentProfile;
  isLoading: boolean;
  isSyncing: boolean;
  isOnboarded: boolean;
  syncError: string | null;
  loadProfile: () => Promise<void>;
  syncWithServer: () => Promise<void>;
  saveProfile: (updates: Partial<StudentProfile>, options?: SaveProfileOptions) => Promise<void>;
  updateField: <K extends keyof StudentProfile>(key: K, value: StudentProfile[K]) => Promise<void>;
  toggleSavedCollege: (college: CollegeSummary) => Promise<void>;
  markApplied: (collegeId: string) => Promise<void>;
  resetProfile: () => Promise<void>;
};

async function persistProfile(profile: StudentProfile) {
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  profile: defaultProfile,
  isLoading: false,
  isSyncing: false,
  isOnboarded: false,
  syncError: null,

  loadProfile: async () => {
    set({ isLoading: true });
    try {
      const raw = await AsyncStorage.getItem(PROFILE_KEY);
      if (!raw) {
        set({
          profile: defaultProfile,
          isLoading: false,
          isOnboarded: false,
          syncError: null
        });
        return;
      }

      const parsed = JSON.parse(raw) as StudentProfile;
      set({
        profile: { ...defaultProfile, ...parsed },
        isLoading: false,
        isOnboarded: Boolean(parsed.onboardingComplete),
        syncError: null
      });
    } catch {
      set({
        profile: defaultProfile,
        isLoading: false,
        isOnboarded: false,
        syncError: null
      });
    }
  },

  syncWithServer: async () => {
    set({ isSyncing: true, syncError: null });

    try {
      const current = get().profile;
      const remoteProfile = await fetchRemoteMatchProfile();
      const merged = applyRemoteMatchProfile(current, remoteProfile);

      set({
        profile: merged,
        isOnboarded: Boolean(merged.onboardingComplete)
      });
      await persistProfile(merged);

      const savedRemoteProfile = await saveRemoteMatchProfile(merged);
      const canonical = applyRemoteMatchProfile(merged, savedRemoteProfile);

      set({
        profile: canonical,
        isOnboarded: Boolean(canonical.onboardingComplete),
        isSyncing: false,
        syncError: null
      });
      await persistProfile(canonical);
    } catch (error) {
      set({
        isSyncing: false,
        syncError: error instanceof Error ? error.message : "Failed to sync profile."
      });
    }
  },

  saveProfile: async (updates, options) => {
    const next = { ...get().profile, ...updates };
    set({
      profile: next,
      isOnboarded: Boolean(next.onboardingComplete),
      syncError: null
    });
    await persistProfile(next);

    if (options?.syncRemote === false) {
      return;
    }

    try {
      const savedRemoteProfile = await saveRemoteMatchProfile(next);
      if (!savedRemoteProfile) return;

      const canonical = applyRemoteMatchProfile(next, savedRemoteProfile);
      set({
        profile: canonical,
        isOnboarded: Boolean(canonical.onboardingComplete),
        syncError: null
      });
      await persistProfile(canonical);
    } catch (error) {
      set({
        syncError: error instanceof Error ? error.message : "Failed to sync profile."
      });
    }
  },

  updateField: async (key, value) => {
    await get().saveProfile({ [key]: value } as Partial<StudentProfile>);
  },

  toggleSavedCollege: async (college) => {
    const current = get().profile;
    const savedCollegeIds = current.savedCollegeIds.includes(college.id)
      ? current.savedCollegeIds.filter((id) => id !== college.id)
      : [...current.savedCollegeIds, college.id];

    await get().saveProfile({ savedCollegeIds }, { syncRemote: false });
  },

  markApplied: async (collegeId) => {
    const current = get().profile;
    if (current.appliedCollegeIds.includes(collegeId)) return;

    await get().saveProfile(
      {
        appliedCollegeIds: [...current.appliedCollegeIds, collegeId]
      },
      { syncRemote: false }
    );
  },

  resetProfile: async () => {
    await AsyncStorage.removeItem(PROFILE_KEY);
    set({
      profile: defaultProfile,
      isOnboarded: false,
      isSyncing: false,
      syncError: null
    });
  }
}));
