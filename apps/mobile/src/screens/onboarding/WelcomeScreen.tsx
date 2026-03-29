import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { ScreenShell } from "@components/ScreenShell";
import type { OnboardingAction, OnboardingStackParamList } from "@types";
import { useAuthStore } from "@store/useAuthStore";
import { useProfileStore } from "@store/useProfileStore";
import {
  colors,
  commonStyles,
  fontFamily,
  fontSize,
  fontWeight,
  radius,
  spacing
} from "@theme";

type Props = NativeStackScreenProps<OnboardingStackParamList, "Welcome">;

const benefits = ["College matches", "Deadline reminders", "Advisor chat"];

export default function WelcomeScreen({ navigation }: Props) {
  const authError = useAuthStore((state) => state.errorMessage);
  const clearAuthError = useAuthStore((state) => state.clearError);
  const isAuthConfigured = useAuthStore((state) => state.isConfigured);
  const isSigningIn = useAuthStore((state) => state.isSigningIn);
  const signInWithGoogle = useAuthStore((state) => state.signInWithGoogle);
  const profile = useProfileStore((state) => state.profile);
  const saveProfile = useProfileStore((state) => state.saveProfile);
  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email);

  async function handleContinue(action: OnboardingAction) {
    await saveProfile({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      onboardingAction: action
    });
    navigation.navigate("ProfileSetup");
  }

  async function handleGoogleContinue() {
    await saveProfile({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      onboardingAction: "google"
    });

    clearAuthError();
    await signInWithGoogle();

    const nextAuthError = useAuthStore.getState().errorMessage;
    const hasSession = Boolean(useAuthStore.getState().session);

    if (nextAuthError) {
      Alert.alert("Google sign-in failed", nextAuthError);
      return;
    }

    if (!hasSession) {
      return;
    }

    navigation.navigate("ProfileSetup");
  }

  return (
    <ScreenShell scroll contentContainerStyle={styles.content}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.hero}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>EduGuide Mobile</Text>
          </View>
          <Text style={styles.title}>Start your account</Text>
          <Text style={styles.subtitle}>Choose how you want to begin. We save your setup as you go.</Text>
        </View>

        <View style={styles.benefitRow}>
          {benefits.map((benefit) => (
            <View key={benefit} style={styles.benefitChip}>
              <Text style={styles.benefitText}>{benefit}</Text>
            </View>
          ))}
        </View>

        <View style={styles.fieldGroup}>
          <View style={styles.field}>
            <Text style={styles.label}>Name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Ava Johnson"
              placeholderTextColor={colors.textTertiary}
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="ava@gmail.com"
              autoCapitalize="none"
              keyboardType="email-address"
              placeholderTextColor={colors.textTertiary}
              style={styles.input}
            />
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.primaryButton}
            activeOpacity={0.9}
            onPress={() => handleContinue("register")}
          >
            <Text style={styles.primaryButtonText}>Register</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            activeOpacity={0.9}
            onPress={() => void handleGoogleContinue()}
            disabled={isSigningIn}
          >
            <Ionicons name="logo-google" size={18} color={colors.textPrimary} />
            <Text style={styles.secondaryButtonText}>
              {isSigningIn ? "Connecting Gmail..." : "Register with Gmail"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tertiaryButton}
            activeOpacity={0.9}
            onPress={() => handleContinue("signin")}
          >
            <Text style={styles.tertiaryButtonText}>I already have an account</Text>
          </TouchableOpacity>

          {isAuthConfigured ? (
            <Text style={styles.helperText}>
              Gmail sign-in opens the real Supabase Google auth flow and keeps the details you
              already entered.
            </Text>
          ) : (
            <Text style={styles.helperText}>
              Gmail sign-in needs the mobile Supabase public URL and anon key configured first.
            </Text>
          )}

          {authError ? <Text style={styles.errorText}>{authError}</Text> : null}
        </View>
      </KeyboardAvoidingView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: spacing.xl,
    gap: spacing.lg
  },
  hero: {
    gap: spacing.base
  },
  badge: {
    alignSelf: "flex-start",
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.accentSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs
  },
  badgeText: {
    color: colors.accent,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    textTransform: "uppercase",
    letterSpacing: 0.8
  },
  title: {
    color: colors.textPrimary,
    fontSize: fontSize["3xl"],
    lineHeight: 40,
    fontWeight: fontWeight.bold,
    fontFamily: fontFamily.display
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: fontSize.base,
    lineHeight: 24
  },
  benefitRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  benefitChip: {
    borderRadius: radius.full,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  benefitText: {
    color: colors.textPrimary,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold
  },
  fieldGroup: {
    gap: spacing.md
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
  actions: {
    gap: spacing.md
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
  secondaryButton: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.surface,
    paddingVertical: spacing.base,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.sm
  },
  secondaryButtonText: {
    color: colors.textPrimary,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold
  },
  tertiaryButton: {
    alignItems: "center",
    paddingVertical: spacing.sm
  },
  tertiaryButtonText: {
    color: colors.sky,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold
  },
  helperText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 20,
    textAlign: "center"
  },
  errorText: {
    color: colors.error,
    fontSize: fontSize.sm,
    lineHeight: 20,
    textAlign: "center"
  }
});
