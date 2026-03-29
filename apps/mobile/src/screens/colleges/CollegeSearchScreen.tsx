import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { CollegeCard } from "@components/CollegeCard";
import { ScreenShell } from "@components/ScreenShell";
import { SectionCard } from "@components/SectionCard";
import { useCollegeStore } from "@store/useCollegeStore";
import { useProfileStore } from "@store/useProfileStore";
import { colors, commonStyles, fontSize, fontWeight, radius, spacing } from "@theme";

export default function CollegeSearchScreen() {
  const navigation = useNavigation<any>();
  const profile = useProfileStore((state) => state.profile);
  const results = useCollegeStore((state) => state.results);
  const error = useCollegeStore((state) => state.error);
  const isLoading = useCollegeStore((state) => state.isLoading);
  const search = useCollegeStore((state) => state.search);
  const compareList = useCollegeStore((state) => state.compareList);
  const setSelectedCollege = useCollegeStore((state) => state.setSelectedCollege);

  const [query, setQuery] = useState(profile.intendedMajorLabel);
  const [stateFilter, setStateFilter] = useState(profile.stateResidence);
  const [useMatchMode, setUseMatchMode] = useState(true);

  useEffect(() => {
    void search(
      {
        query: profile.intendedMajorLabel || "",
        state: profile.stateResidence || undefined,
        limit: 12,
        useMatchEndpoint: true
      },
      profile
    );
  }, [profile, search]);

  async function runSearch() {
    await search(
      {
        query: query.trim(),
        state: stateFilter.trim().toUpperCase() || undefined,
        limit: 12,
        useMatchEndpoint: useMatchMode
      },
      useMatchMode ? profile : null
    );
  }

  return (
    <ScreenShell scroll contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>College search</Text>
        <Text style={styles.subtitle}>
          Switch between profile-based matching and broader catalog browsing.
        </Text>
      </View>

      <SectionCard title="Find schools">
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search by school, city, or program"
          placeholderTextColor={colors.textTertiary}
          style={styles.input}
        />
        <TextInput
          value={stateFilter}
          onChangeText={setStateFilter}
          placeholder="State filter, for example CA"
          autoCapitalize="characters"
          maxLength={2}
          placeholderTextColor={colors.textTertiary}
          style={styles.input}
        />
        <View style={styles.modeRow}>
          <TouchableOpacity
            style={[styles.modeChip, useMatchMode && styles.modeChipSelected]}
            onPress={() => setUseMatchMode(true)}
            activeOpacity={0.9}
          >
            <Text style={[styles.modeChipText, useMatchMode && styles.modeChipTextSelected]}>
              Match me
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeChip, !useMatchMode && styles.modeChipSelected]}
            onPress={() => setUseMatchMode(false)}
            activeOpacity={0.9}
          >
            <Text style={[styles.modeChipText, !useMatchMode && styles.modeChipTextSelected]}>
              Browse catalog
            </Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.primaryButton} activeOpacity={0.9} onPress={runSearch}>
          <Text style={styles.primaryButtonText}>Run search</Text>
        </TouchableOpacity>
      </SectionCard>

      {compareList.length ? (
        <SectionCard
          title={`Compare queue (${compareList.length}/3)`}
          subtitle="Add or remove schools from the detail screen."
        >
          <View style={styles.compareRow}>
            {compareList.map((college) => (
              <View key={college.id} style={styles.compareChip}>
                <Text style={styles.compareChipText}>{college.name}</Text>
              </View>
            ))}
          </View>
        </SectionCard>
      ) : null}

      <SectionCard
        title="Results"
        subtitle={
          useMatchMode
            ? "Ranked with your profile and match logic."
            : "Pulled from the catalog endpoint."
        }
      >
        {isLoading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={colors.accent} />
            <Text style={styles.loadingText}>Searching schools...</Text>
          </View>
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : results.length ? (
          <View style={styles.resultsList}>
            {results.map((college) => (
              <CollegeCard
                key={college.id}
                college={college}
                onPress={() => {
                  setSelectedCollege(college);
                  navigation.navigate("CollegeDetail", {
                    collegeId: college.id,
                    college
                  });
                }}
              />
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>
            No schools matched this search yet. Adjust the query or filters.
          </Text>
        )}
      </SectionCard>
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
  input: {
    ...commonStyles.input
  },
  modeRow: {
    flexDirection: "row",
    gap: spacing.sm
  },
  modeChip: {
    flex: 1,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    alignItems: "center"
  },
  modeChipSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent
  },
  modeChipText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium
  },
  modeChipTextSelected: {
    color: colors.textInverse,
    fontWeight: fontWeight.bold
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
  compareRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  compareChip: {
    borderRadius: radius.full,
    backgroundColor: colors.tealSoft,
    borderWidth: 1,
    borderColor: colors.teal,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  compareChipText: {
    color: colors.textPrimary,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm
  },
  errorText: {
    color: colors.error,
    fontSize: fontSize.sm,
    lineHeight: 20
  },
  resultsList: {
    gap: spacing.md
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 22
  }
});
