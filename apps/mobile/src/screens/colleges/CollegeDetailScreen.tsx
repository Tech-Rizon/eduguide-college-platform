import React from "react";
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { ScreenShell } from "@components/ScreenShell";
import { SectionCard } from "@components/SectionCard";
import type { CollegeSummary } from "@types";
import { createId } from "@utils/ids";
import { useCollegeStore } from "@store/useCollegeStore";
import { useDeadlineStore } from "@store/useDeadlineStore";
import { useProfileStore } from "@store/useProfileStore";
import { colors, fontSize, fontWeight, radius, spacing } from "@theme";

type RouteParams = {
  collegeId: string;
  college?: CollegeSummary;
};

export default function CollegeDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const params = route.params as RouteParams | undefined;
  const results = useCollegeStore((state) => state.results);
  const recommended = useCollegeStore((state) => state.recommended);
  const selectedCollege = useCollegeStore((state) => state.selectedCollege);
  const compareList = useCollegeStore((state) => state.compareList);
  const addToCompare = useCollegeStore((state) => state.addToCompare);
  const removeFromCompare = useCollegeStore((state) => state.removeFromCompare);
  const profile = useProfileStore((state) => state.profile);
  const toggleSavedCollege = useProfileStore((state) => state.toggleSavedCollege);
  const markApplied = useProfileStore((state) => state.markApplied);
  const addDeadline = useDeadlineStore((state) => state.add);

  const college =
    params?.college ||
    selectedCollege ||
    results.find((item) => item.id === params?.collegeId) ||
    recommended.find((item) => item.id === params?.collegeId);

  if (!college) {
    return (
      <ScreenShell style={styles.centered}>
        <Text style={styles.emptyTitle}>College not found</Text>
        <Text style={styles.emptyCopy}>Go back to search and pick a school again.</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.goBack()}>
          <Text style={styles.primaryButtonText}>Back</Text>
        </TouchableOpacity>
      </ScreenShell>
    );
  }

  const currentCollege = college;
  const admissionsUrl = currentCollege.admissionsUrl ?? null;
  const isSaved = profile.savedCollegeIds.includes(currentCollege.id);
  const isApplied = profile.appliedCollegeIds.includes(currentCollege.id);
  const isCompared = compareList.some((item) => item.id === currentCollege.id);

  async function handleTrackDeadline() {
    if (!currentCollege.applicationDeadline) {
      Alert.alert("No deadline available", "This school does not have a structured deadline yet.");
      return;
    }

    const parsed = new Date(currentCollege.applicationDeadline);
    if (Number.isNaN(parsed.getTime())) {
      Alert.alert(
        "Deadline format unavailable",
        "The deadline needs manual review before it can be tracked automatically."
      );
      return;
    }

    await addDeadline({
      id: createId("deadline"),
      collegeId: currentCollege.id,
      collegeName: currentCollege.name,
      type: "RD",
      date: currentCollege.applicationDeadline,
      note: currentCollege.programName ? `Application path: ${currentCollege.programName}` : undefined,
      notifyDaysBefore: [21, 7, 1]
    });

    Alert.alert("Deadline added", "This college is now in your reminder queue.");
  }

  return (
    <ScreenShell style={styles.flex}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            activeOpacity={0.9}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={18} color={colors.textPrimary} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{currentCollege.name}</Text>
          <Text style={styles.subtitle}>
            {currentCollege.city}, {currentCollege.state}
            {currentCollege.programName ? ` - ${currentCollege.programName}` : ""}
          </Text>
        </View>

        <SectionCard title="Snapshot">
          <View style={styles.metricsRow}>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Fit</Text>
              <Text style={styles.metricValue}>
                {typeof currentCollege.fitScore === "number" ? currentCollege.fitScore : "--"}
              </Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Ranking</Text>
              <Text style={styles.metricValue}>{currentCollege.ranking ?? "--"}</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>In-state</Text>
              <Text style={styles.metricValue}>
                {typeof currentCollege.tuitionInState === "number"
                  ? `$${Math.round(currentCollege.tuitionInState / 1000)}k`
                  : "--"}
              </Text>
            </View>
          </View>
          {currentCollege.description ? (
            <Text style={styles.description}>{currentCollege.description}</Text>
          ) : null}
          <View style={styles.linkRow}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => void Linking.openURL(currentCollege.website)}
            >
              <Text style={styles.secondaryButtonText}>Official site</Text>
            </TouchableOpacity>
            {admissionsUrl ? (
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => void Linking.openURL(admissionsUrl)}
              >
                <Text style={styles.secondaryButtonText}>Admissions</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </SectionCard>

        {currentCollege.whyFit?.length ? (
          <SectionCard title="Why it fits">
            {currentCollege.whyFit.map((reason) => (
              <Text key={reason} style={styles.listItem}>
                - {reason}
              </Text>
            ))}
          </SectionCard>
        ) : null}

        {currentCollege.blockers?.length ? (
          <SectionCard
            title="Possible blockers"
            subtitle="These are not rejections. They are the next things to verify."
          >
            {currentCollege.blockers.map((reason) => (
              <Text key={reason} style={styles.listItem}>
                - {reason}
              </Text>
            ))}
          </SectionCard>
        ) : null}

        <SectionCard title="Actions">
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={[styles.primaryButton, isSaved && styles.savedButton]}
              activeOpacity={0.9}
              onPress={() => void toggleSavedCollege(currentCollege)}
            >
              <Text style={styles.primaryButtonText}>
                {isSaved ? "Remove from saves" : "Save college"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.primaryButton}
              activeOpacity={0.9}
              onPress={() => void handleTrackDeadline()}
            >
              <Text style={styles.primaryButtonText}>Track deadline</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryButton}
              activeOpacity={0.9}
              onPress={() =>
                isCompared
                  ? removeFromCompare(currentCollege.id)
                  : addToCompare(currentCollege)
              }
            >
              <Text style={styles.secondaryButtonText}>
                {isCompared ? "Remove from compare" : "Add to compare"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.secondaryButton, isApplied && styles.appliedButton]}
              activeOpacity={0.9}
              onPress={() => void markApplied(currentCollege.id)}
            >
              <Text style={[styles.secondaryButtonText, isApplied && styles.appliedButtonText]}>
                {isApplied ? "Application marked" : "Mark applied"}
              </Text>
            </TouchableOpacity>
          </View>
        </SectionCard>
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing["3xl"],
    gap: spacing.lg
  },
  header: {
    gap: spacing.sm
  },
  backButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs
  },
  backText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium
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
  metricsRow: {
    flexDirection: "row",
    gap: spacing.sm
  },
  metric: {
    flex: 1,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
    gap: spacing.xs
  },
  metricLabel: {
    color: colors.textTertiary,
    fontSize: fontSize.xs,
    textTransform: "uppercase",
    letterSpacing: 0.6
  },
  metricValue: {
    color: colors.textPrimary,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold
  },
  description: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 22
  },
  linkRow: {
    flexDirection: "row",
    gap: spacing.sm
  },
  listItem: {
    color: colors.textPrimary,
    fontSize: fontSize.sm,
    lineHeight: 22
  },
  actionsGrid: {
    gap: spacing.sm
  },
  primaryButton: {
    borderRadius: radius.lg,
    backgroundColor: colors.accent,
    paddingVertical: spacing.base,
    alignItems: "center"
  },
  savedButton: {
    backgroundColor: colors.teal
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
    alignItems: "center"
  },
  secondaryButtonText: {
    color: colors.textPrimary,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold
  },
  appliedButton: {
    backgroundColor: colors.tealSoft,
    borderColor: colors.teal
  },
  appliedButtonText: {
    color: colors.teal
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold
  },
  emptyCopy: {
    color: colors.textSecondary,
    fontSize: fontSize.base,
    lineHeight: 22,
    textAlign: "center",
    marginTop: spacing.sm,
    marginBottom: spacing.lg
  }
});
