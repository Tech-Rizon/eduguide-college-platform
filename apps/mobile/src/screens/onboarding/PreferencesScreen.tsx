import React, { useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import Slider from "@react-native-community/slider";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ScreenShell } from "@components/ScreenShell";
import { SectionCard } from "@components/SectionCard";
import type {
  CampusEnvironment,
  CollegeSize,
  CollegeType,
  OnboardingStackParamList
} from "@types";
import { colors, commonStyles, fontSize, fontWeight, radius, spacing } from "@theme";
import { useProfileStore } from "@store/useProfileStore";

type Props = NativeStackScreenProps<OnboardingStackParamList, "Preferences">;

const sizeOptions: CollegeSize[] = ["small", "medium", "large"];
const typeOptions: CollegeType[] = [
  "public",
  "private",
  "research",
  "liberal_arts",
  "community",
  "hbcu"
];
const environmentOptions: CampusEnvironment[] = ["urban", "suburban", "rural"];

function toggleValue<T extends string>(current: T[], value: T) {
  return current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
}

export default function PreferencesScreen({ navigation }: Props) {
  const profile = useProfileStore((state) => state.profile);
  const saveProfile = useProfileStore((state) => state.saveProfile);

  const [budgetMax, setBudgetMax] = useState(profile.budgetMax);
  const [preferredStatesText, setPreferredStatesText] = useState(profile.preferredStates.join(", "));
  const [collegeSize, setCollegeSize] = useState<CollegeSize[]>(profile.collegeSize);
  const [collegeType, setCollegeType] = useState<CollegeType[]>(profile.collegeType);
  const [campusEnvironment, setCampusEnvironment] = useState<CampusEnvironment[]>(
    profile.campusEnvironment
  );

  async function handleFinish() {
    const preferredStates = preferredStatesText
      .split(",")
      .map((value) => value.trim().toUpperCase())
      .filter(Boolean);

    await saveProfile({
      budgetMax,
      preferredStates,
      collegeSize,
      collegeType,
      campusEnvironment,
      onboardingComplete: true
    });
  }

  return (
    <ScreenShell scroll contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.step}>Step 3 of 3</Text>
        <Text style={styles.title}>Tune what a good-fit college looks like.</Text>
        <Text style={styles.subtitle}>
          These preferences help ranking. They should shape the list, not block it.
        </Text>
      </View>

      <SectionCard
        title="Budget"
        subtitle="This is your working ceiling for annual tuition or net cost."
      >
        <Text style={styles.budgetValue}>${budgetMax.toLocaleString()}</Text>
        <Slider
          minimumValue={10000}
          maximumValue={90000}
          step={2500}
          value={budgetMax}
          minimumTrackTintColor={colors.accent}
          maximumTrackTintColor={colors.border}
          thumbTintColor={colors.accent}
          onValueChange={(value) => setBudgetMax(Math.round(value))}
        />
      </SectionCard>

      <SectionCard
        title="Preferred states"
        subtitle="Use comma-separated state codes if you want to stay open to more than one region."
      >
        <TextInput
          value={preferredStatesText}
          onChangeText={setPreferredStatesText}
          placeholder="CA, WA, OR"
          autoCapitalize="characters"
          placeholderTextColor={colors.textTertiary}
          style={styles.input}
        />
      </SectionCard>

      <SectionCard title="Campus size">
        <View style={styles.optionGrid}>
          {sizeOptions.map((value) => {
            const selected = collegeSize.includes(value);
            return (
              <TouchableOpacity
                key={value}
                style={[styles.optionChip, selected && styles.optionChipSelected]}
                onPress={() => setCollegeSize(toggleValue(collegeSize, value))}
                activeOpacity={0.9}
              >
                <Text style={[styles.optionChipText, selected && styles.optionChipTextSelected]}>
                  {value}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </SectionCard>

      <SectionCard title="College type">
        <View style={styles.optionGrid}>
          {typeOptions.map((value) => {
            const selected = collegeType.includes(value);
            return (
              <TouchableOpacity
                key={value}
                style={[styles.optionChip, selected && styles.optionChipSelected]}
                onPress={() => setCollegeType(toggleValue(collegeType, value))}
                activeOpacity={0.9}
              >
                <Text style={[styles.optionChipText, selected && styles.optionChipTextSelected]}>
                  {value.replace("_", " ")}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </SectionCard>

      <SectionCard title="Campus environment">
        <View style={styles.optionGrid}>
          {environmentOptions.map((value) => {
            const selected = campusEnvironment.includes(value);
            return (
              <TouchableOpacity
                key={value}
                style={[styles.optionChip, selected && styles.optionChipSelected]}
                onPress={() => setCampusEnvironment(toggleValue(campusEnvironment, value))}
                activeOpacity={0.9}
              >
                <Text style={[styles.optionChipText, selected && styles.optionChipTextSelected]}>
                  {value}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </SectionCard>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.secondaryButton}
          activeOpacity={0.9}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.secondaryButtonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.primaryButton} activeOpacity={0.9} onPress={handleFinish}>
          <Text style={styles.primaryButtonText}>Finish setup</Text>
        </TouchableOpacity>
      </View>
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
  budgetValue: {
    color: colors.textPrimary,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold
  },
  input: {
    ...commonStyles.input
  },
  optionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  optionChip: {
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md
  },
  optionChipSelected: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent
  },
  optionChipText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium
  },
  optionChipTextSelected: {
    color: colors.textPrimary,
    fontWeight: fontWeight.bold
  },
  actions: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.sm
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
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold
  },
  primaryButton: {
    flex: 1,
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
