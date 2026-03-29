import React, { useState } from "react";
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { ScreenShell } from "@components/ScreenShell";
import { SectionCard } from "@components/SectionCard";
import { useAuthStore } from "@store/useAuthStore";
import { useProfileStore } from "@store/useProfileStore";
import { colors, commonStyles, fontSize, fontWeight, radius, spacing } from "@theme";

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const authError = useAuthStore((state) => state.errorMessage);
  const clearAuthError = useAuthStore((state) => state.clearError);
  const isAuthConfigured = useAuthStore((state) => state.isConfigured);
  const isSigningIn = useAuthStore((state) => state.isSigningIn);
  const session = useAuthStore((state) => state.session);
  const user = useAuthStore((state) => state.user);
  const signInWithGoogle = useAuthStore((state) => state.signInWithGoogle);
  const signOut = useAuthStore((state) => state.signOut);
  const profile = useProfileStore((state) => state.profile);
  const saveProfile = useProfileStore((state) => state.saveProfile);
  const resetProfile = useProfileStore((state) => state.resetProfile);

  const [name, setName] = useState(profile.name);
  const [stateResidence, setStateResidence] = useState(profile.stateResidence);
  const [major, setMajor] = useState(profile.intendedMajorLabel);
  const [gpa, setGpa] = useState(String(profile.gpa));
  const [budget, setBudget] = useState(String(profile.budgetMax));

  async function handleSave() {
    await saveProfile({
      name: name.trim(),
      stateResidence: stateResidence.trim().toUpperCase(),
      intendedMajorLabel: major.trim(),
      intendedMajor: major.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      gpa: Number.parseFloat(gpa) || profile.gpa,
      budgetMax: Number.parseInt(budget, 10) || profile.budgetMax
    });
  }

  function handleReset() {
    Alert.alert("Reset profile?", "This clears the local onboarding profile on this device.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Reset",
        style: "destructive",
        onPress: () => void resetProfile()
      }
    ]);
  }

  async function handleGoogleConnect() {
    clearAuthError();
    await signInWithGoogle();

    const nextAuthError = useAuthStore.getState().errorMessage;
    if (nextAuthError) {
      Alert.alert("Google sign-in failed", nextAuthError);
    }
  }

  async function handleSignOut() {
    await signOut();
    const nextAuthError = useAuthStore.getState().errorMessage;
    if (nextAuthError) {
      Alert.alert("Sign-out failed", nextAuthError);
    }
  }

  return (
    <ScreenShell scroll contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.subtitle}>
          This is the mobile copy of the profile used for matching, scholarships, and advisor chat.
        </Text>
      </View>

      <SectionCard title="Quick stats">
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{profile.savedCollegeIds.length}</Text>
            <Text style={styles.statLabel}>Saved</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{profile.appliedCollegeIds.length}</Text>
            <Text style={styles.statLabel}>Applied</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{profile.preferredStates.length}</Text>
            <Text style={styles.statLabel}>States</Text>
          </View>
        </View>
      </SectionCard>

      <SectionCard
        title="Account"
        subtitle="Connect Google once, then keep your onboarding details and saved schools tied to the same account."
      >
        <View style={styles.accountCard}>
          <Text style={styles.accountLabel}>Status</Text>
          <Text style={styles.accountValue}>{session ? "Connected" : "Not connected"}</Text>
          <Text style={styles.accountHint}>
            {user?.email || profile.email || "No email connected yet"}
          </Text>
        </View>

        <View style={styles.authActions}>
          {session ? (
            <TouchableOpacity
              style={styles.primaryButton}
              activeOpacity={0.9}
              onPress={() => void handleSignOut()}
            >
              <Text style={styles.primaryButtonText}>Sign out</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.primaryButton}
              activeOpacity={0.9}
              onPress={() => void handleGoogleConnect()}
              disabled={!isAuthConfigured || isSigningIn}
            >
              <Text style={styles.primaryButtonText}>
                {isSigningIn ? "Connecting Gmail..." : "Connect Gmail"}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {!isAuthConfigured ? (
          <Text style={styles.accountHint}>
            Mobile Supabase auth is not configured yet. Add the Expo public Supabase URL and anon
            key to enable Gmail sign-in.
          </Text>
        ) : null}

        {authError ? <Text style={styles.authError}>{authError}</Text> : null}
      </SectionCard>

      <SectionCard title="Core fields">
        <View style={styles.field}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            style={styles.input}
            placeholderTextColor={colors.textTertiary}
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>State</Text>
          <TextInput
            value={stateResidence}
            onChangeText={setStateResidence}
            style={styles.input}
            autoCapitalize="characters"
            maxLength={2}
            placeholderTextColor={colors.textTertiary}
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Intended major</Text>
          <TextInput
            value={major}
            onChangeText={setMajor}
            style={styles.input}
            placeholderTextColor={colors.textTertiary}
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>GPA</Text>
          <TextInput
            value={gpa}
            onChangeText={setGpa}
            keyboardType="decimal-pad"
            style={styles.input}
            placeholderTextColor={colors.textTertiary}
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Budget max</Text>
          <TextInput
            value={budget}
            onChangeText={setBudget}
            keyboardType="number-pad"
            style={styles.input}
            placeholderTextColor={colors.textTertiary}
          />
        </View>
        <TouchableOpacity
          style={styles.primaryButton}
          activeOpacity={0.9}
          onPress={() => void handleSave()}
        >
          <Text style={styles.primaryButtonText}>Save changes</Text>
        </TouchableOpacity>
      </SectionCard>

      <SectionCard title="Preferences">
        <Text style={styles.preferenceLine}>Student type: {profile.studentType}</Text>
        <Text style={styles.preferenceLine}>
          Preferred states: {profile.preferredStates.length ? profile.preferredStates.join(", ") : "Open"}
        </Text>
        <Text style={styles.preferenceLine}>
          College size: {profile.collegeSize.length ? profile.collegeSize.join(", ") : "Any"}
        </Text>
        <Text style={styles.preferenceLine}>
          Environment: {profile.campusEnvironment.length ? profile.campusEnvironment.join(", ") : "Any"}
        </Text>
      </SectionCard>

      <SectionCard title="Saved activity">
        <Text style={styles.preferenceLine}>
          Saved college IDs: {profile.savedCollegeIds.length ? profile.savedCollegeIds.join(", ") : "None yet"}
        </Text>
        <Text style={styles.preferenceLine}>
          Applied college IDs: {profile.appliedCollegeIds.length ? profile.appliedCollegeIds.join(", ") : "None yet"}
        </Text>
        <View style={styles.linkActions}>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate("CollegesTab")}>
            <Text style={styles.secondaryButtonText}>Browse colleges</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate("AdvisorTab")}>
            <Text style={styles.secondaryButtonText}>Ask advisor</Text>
          </TouchableOpacity>
        </View>
      </SectionCard>

      <TouchableOpacity style={styles.resetButton} activeOpacity={0.9} onPress={handleReset}>
        <Text style={styles.resetButtonText}>Reset mobile profile</Text>
      </TouchableOpacity>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: spacing.xl,
    gap: spacing.lg
  },
  header: {
    gap: spacing.sm
  },
  title: {
    color: colors.textPrimary,
    fontSize: fontSize["2xl"],
    fontWeight: fontWeight.bold
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: fontSize.base,
    lineHeight: 22
  },
  statsRow: {
    flexDirection: "row",
    gap: spacing.sm
  },
  statCard: {
    flex: 1,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
    gap: spacing.xs
  },
  statValue: {
    color: colors.textPrimary,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold
  },
  statLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.sm
  },
  accountCard: {
    gap: spacing.xs,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.accentSoft,
    padding: spacing.base
  },
  accountLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    textTransform: "uppercase",
    letterSpacing: 0.6
  },
  accountValue: {
    color: colors.textPrimary,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold
  },
  accountHint: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 20
  },
  authActions: {
    gap: spacing.sm
  },
  field: {
    gap: spacing.sm
  },
  label: {
    color: colors.textPrimary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold
  },
  input: {
    ...commonStyles.input
  },
  primaryButton: {
    borderRadius: radius.lg,
    backgroundColor: colors.accent,
    paddingVertical: spacing.base,
    alignItems: "center"
  },
  primaryButtonText: {
    color: colors.textInverse,
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold
  },
  preferenceLine: {
    color: colors.textPrimary,
    fontSize: fontSize.sm,
    lineHeight: 22
  },
  linkActions: {
    flexDirection: "row",
    gap: spacing.sm
  },
  secondaryButton: {
    flex: 1,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.surface,
    paddingVertical: spacing.base,
    alignItems: "center"
  },
  secondaryButtonText: {
    color: colors.textPrimary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold
  },
  resetButton: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.error,
    backgroundColor: "rgba(244,125,125,0.08)",
    paddingVertical: spacing.base,
    alignItems: "center"
  },
  resetButtonText: {
    color: colors.error,
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold
  },
  authError: {
    color: colors.error,
    fontSize: fontSize.sm,
    lineHeight: 20
  }
});
