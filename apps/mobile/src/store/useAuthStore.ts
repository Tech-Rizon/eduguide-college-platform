import { create } from "zustand";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import type { Session, User } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useProfileStore } from "@store/useProfileStore";

WebBrowser.maybeCompleteAuthSession();

const redirectTo = AuthSession.makeRedirectUri({
  scheme: "eduguide",
  path: "auth/callback"
});

let authSubscriptionCleanup: (() => void) | null = null;

function getStringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getPreferredName(user: User | null) {
  if (!user) return "";

  const metadata = user.user_metadata ?? {};
  return (
    getStringValue(metadata.full_name) ||
    getStringValue(metadata.name) ||
    getStringValue(metadata.preferred_username) ||
    getStringValue(metadata.user_name)
  );
}

function extractAuthParams(url: string) {
  const normalizedUrl = url.includes("#") ? url.replace("#", "?") : url;
  const parsedUrl = new URL(normalizedUrl);

  return {
    accessToken: parsedUrl.searchParams.get("access_token"),
    refreshToken: parsedUrl.searchParams.get("refresh_token"),
    error: parsedUrl.searchParams.get("error") || parsedUrl.searchParams.get("error_code"),
    errorDescription: parsedUrl.searchParams.get("error_description")
  };
}

async function syncProfileFromUser(user: User | null) {
  if (!user) return;

  const { profile, saveProfile } = useProfileStore.getState();
  const email = user.email?.trim().toLowerCase() || profile.email;
  const fullName = profile.name.trim() || getPreferredName(user);

  if (
    email === profile.email &&
    fullName === profile.name &&
    profile.onboardingAction === "google"
  ) {
    return;
  }

  await saveProfile({
    email,
    name: fullName,
    onboardingAction: "google"
  }, { syncRemote: false });
}

type AuthState = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isSigningIn: boolean;
  isConfigured: boolean;
  errorMessage: string | null;
  initialize: () => Promise<(() => void) | undefined>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  isLoading: false,
  isSigningIn: false,
  isConfigured: isSupabaseConfigured,
  errorMessage: null,

  initialize: async () => {
    if (!supabase) {
      set({
        isConfigured: false,
        isLoading: false
      });
      return undefined;
    }

    if (authSubscriptionCleanup) {
      return authSubscriptionCleanup;
    }

    set({ isLoading: true, errorMessage: null, isConfigured: true });

    const { data, error } = await supabase.auth.getSession();

    if (error) {
      set({
        isLoading: false,
        errorMessage: error.message
      });
      return undefined;
    }

    set({
      session: data.session ?? null,
      user: data.session?.user ?? null,
      isLoading: false
    });

    await syncProfileFromUser(data.session?.user ?? null);
    if (data.session?.user) {
      await useProfileStore.getState().syncWithServer();
    }

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      set({
        session: nextSession ?? null,
        user: nextSession?.user ?? null,
        errorMessage: null
      });

      void syncProfileFromUser(nextSession?.user ?? null);
      if (event === "SIGNED_IN" || event === "USER_UPDATED") {
        void useProfileStore.getState().syncWithServer();
      }
    });

    authSubscriptionCleanup = () => {
      subscription.unsubscribe();
      authSubscriptionCleanup = null;
    };

    return authSubscriptionCleanup;
  },

  signInWithGoogle: async () => {
    if (!supabase) {
      set({
        errorMessage:
          "Supabase mobile auth is not configured. Add the Expo public Supabase URL and anon key first."
      });
      return;
    }

    set({ isSigningIn: true, errorMessage: null });

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          skipBrowserRedirect: true,
          queryParams: {
            prompt: "select_account"
          }
        }
      });

      if (error) {
        throw error;
      }

      const authUrl = data?.url;
      if (!authUrl) {
        throw new Error("Google sign-in did not return an authorization URL.");
      }

      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectTo);

      if (result.type === "cancel" || result.type === "dismiss") {
        set({ isSigningIn: false });
        return;
      }

      if (result.type !== "success") {
        throw new Error("Google sign-in did not complete successfully.");
      }

      const { accessToken, refreshToken, error: authError, errorDescription } = extractAuthParams(
        result.url
      );

      if (authError) {
        throw new Error(errorDescription || authError);
      }

      if (!accessToken || !refreshToken) {
        throw new Error(
          "Google sign-in returned without a valid session. Check the Supabase redirect allow list."
        );
      }

      const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      });

      if (sessionError) {
        throw sessionError;
      }

      set({
        session: sessionData.session ?? null,
        user: sessionData.session?.user ?? null,
        isSigningIn: false,
        errorMessage: null
      });

      await syncProfileFromUser(sessionData.session?.user ?? null);
    } catch (error) {
      set({
        isSigningIn: false,
        errorMessage: error instanceof Error ? error.message : "Google sign-in failed."
      });
    }
  },

  signOut: async () => {
    if (!supabase) return;

    const { error } = await supabase.auth.signOut();
    if (error) {
      set({ errorMessage: error.message });
      return;
    }

    set({
      session: null,
      user: null,
      errorMessage: null
    });
  },

  clearError: () => {
    if (get().errorMessage) {
      set({ errorMessage: null });
    }
  }
}));
