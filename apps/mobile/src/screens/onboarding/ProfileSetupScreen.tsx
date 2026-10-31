import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ScreenShell } from "@components/ScreenShell";
import { SectionCard } from "@components/SectionCard";
import type { OnboardingStackParamList, StudentType } from "@types";
import { colors, commonStyles, fontSize, fontWeight, radius, spacing } from "@theme";
import { useProfileStore } from "@store/useProfileStore";

type Props = NativeStackScreenProps<OnboardingStackParamList, "ProfileSetup">;

function normalizeMajorLabel(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export default function ProfileSetupScreen({ navigation }: Props) {
  const profile = useProfileStore((state) => state.profile);
  const saveProfile = useProfileStore((state) => state.saveProfile);

  const [studentType, setStudentType] = useState<StudentType>(profile.studentType);
  const [gpa, setGpa] = useState(String(profile.gpa));
  const [intendedMajorLabel, setIntendedMajorLabel] = useState(profile.intendedMajorLabel);
  const [stateResidence, setStateResidence] = useState(profile.stateResidence);

  async function handleNext() {
    const normalizedMajor = normalizeMajorLabel(intendedMajorLabel);
    await saveProfile({
      studentType,
      gpa: Number.parseFloat(gpa) || profile.gpa,
      intendedMajorLabel: normalizedMajor,
      intendedMajor: normalizedMajor.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      stateResidence: stateResidence.trim().toUpperCase()
    });
    navigation.navigate("Preferences");
  }

  return (
    <ScreenShell scroll contentContainerStyle={styles.content}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.header}>
          <Text style={styles.step}>Step 2 of 3</Text>
          <Text style={styles.title}>Add your academic basics.</Text>
          <Text style={styles.subtitle}>
            We already saved your account details. Now set the profile fields that drive matching.
          </Text>
        </View>

        <SectionCard
          title="Matching essentials"
          subtitle="These are the core fields the match engine needs immediately."
        >
          {!!profile.email && (
            <View style={styles.savedIdentity}>
              <Text style={styles.savedIdentityLabel}>Account email</Text>
              <Text style={styles.savedIdentityValue}>{profile.email}</Text>
            </View>
          )}

          <View style={styles.field}>
            <Text style={styles.label}>Student type</Text>
            <View style={styles.row}>
              {(["freshman", "transfer"] as StudentType[]).map((value) => {
                const selected = studentType === value;
                return (
                  <TouchableOpacity
                    key={value}
                    style={[styles.chip, selected && styles.chipSelected]}
                    onPress={() => setStudentType(value)}
                    activeOpacity={0.9}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                      {value}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>GPA</Text>
            <TextInput
              value={gpa}
              onChangeText={setGpa}
              keyboardType="decimal-pad"
              placeholder="3.6"
              placeholderTextColor={colors.textTertiary}
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Intended major or program</Text>
            <TextInput
              value={intendedMajorLabel}
              onChangeText={setIntendedMajorLabel}
              placeholder="Computer Science"
              placeholderTextColor={colors.textTertiary}
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>State of residence</Text>
            <TextInput
              value={stateResidence}
              onChangeText={setStateResidence}
              placeholder="CA"
              autoCapitalize="characters"
              maxLength={2}
              placeholderTextColor={colors.textTertiary}
              style={styles.input}
            />
          </View>
        </SectionCard>

        <TouchableOpacity style={styles.primaryButton} activeOpacity={0.9} onPress={handleNext}>
          <Text style={styles.primaryButtonText}>Continue to preferences</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
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
  step: {
    color: colors.sky,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    textTransform: "uppercase",
    letterSpacing: 0.8
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
  savedIdentity: {
    gap: spacing.xs,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.accentSoft,
    padding: spacing.base
  },
  savedIdentityLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    textTransform: "uppercase",
    letterSpacing: 0.6
  },
  savedIdentityValue: {
    color: colors.textPrimary,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold
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
  row: {
    flexDirection: "row",
    gap: spacing.sm
  },
  chip: {
    flex: 1,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    alignItems: "center"
  },
  chipSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent
  },
  chipText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    textTransform: "capitalize"
  },
  chipTextSelected: {
    color: colors.textInverse,
    fontWeight: fontWeight.bold
  },
  primaryButton: {
    marginTop: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.accent,
    paddingVertical: spacing.base,
    alignItems: "center"
  },
  primaryButtonText: {
    color: colors.textInverse,
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold
  }
});
