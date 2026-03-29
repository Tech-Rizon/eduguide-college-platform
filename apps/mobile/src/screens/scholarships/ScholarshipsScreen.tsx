import React, { useEffect, useState } from "react";
import { Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { ScreenShell } from "@components/ScreenShell";
import { SectionCard } from "@components/SectionCard";
import type { Scholarship } from "@types";
import { getMatchedScholarships } from "@services/scholarshipApi";
import { useProfileStore } from "@store/useProfileStore";
import { colors, fontSize, fontWeight, radius, spacing } from "@theme";

export default function ScholarshipsScreen() {
  const profile = useProfileStore((state) => state.profile);
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      setIsLoading(true);
      const data = await getMatchedScholarships(profile);
      if (active) {
        setScholarships(data);
        setIsLoading(false);
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [profile]);

  return (
    <ScreenShell scroll contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Scholarship matches</Text>
        <Text style={styles.subtitle}>
          These are filtered against your current profile:{" "}
          {profile.intendedMajorLabel || "major not set"}, GPA {profile.gpa.toFixed(1)},{" "}
          {profile.stateResidence || "state not set"}.
        </Text>
      </View>

      <SectionCard
        title="How this ranks aid"
        subtitle="The strongest matches clear GPA and major filters first, then amount and timing matter."
      >
        <Text style={styles.helperText}>
          Keep this list moving. Deadlines disappear faster than application pages.
        </Text>
      </SectionCard>

      <SectionCard title="Opportunities">
        {isLoading ? (
          <Text style={styles.helperText}>Loading scholarship matches...</Text>
        ) : scholarships.length ? (
          <View style={styles.list}>
            {scholarships.map((scholarship) => (
              <View key={scholarship.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardTitleBlock}>
                    <Text style={styles.cardTitle}>{scholarship.name}</Text>
                    <Text style={styles.cardMeta}>{scholarship.provider}</Text>
                  </View>
                  {typeof scholarship.matchScore === "number" ? (
                    <View style={styles.scoreBadge}>
                      <Text style={styles.scoreText}>{scholarship.matchScore}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.amount}>
                  ${scholarship.amount.toLocaleString()}
                  {scholarship.amountIsRecurring ? " yearly" : " one-time"}
                </Text>
                <Text style={styles.cardBody}>{scholarship.description}</Text>
                <Text style={styles.cardMeta}>Deadline: {scholarship.deadline}</Text>
                <TouchableOpacity
                  style={styles.button}
                  activeOpacity={0.9}
                  onPress={() => void Linking.openURL(scholarship.url)}
                >
                  <Text style={styles.buttonText}>Open application</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.helperText}>
            No scholarship matches are available with the current profile. Update your major, GPA,
            or state to widen the search.
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
  helperText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 22
  },
  list: {
    gap: spacing.md
  },
  card: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    gap: spacing.sm
  },
  cardHeader: {
    flexDirection: "row",
    gap: spacing.md
  },
  cardTitleBlock: {
    flex: 1,
    gap: spacing.xs
  },
  cardTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold
  },
  cardMeta: {
    color: colors.textSecondary,
    fontSize: fontSize.sm
  },
  scoreBadge: {
    minWidth: 42,
    height: 42,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.tealSoft,
    borderWidth: 1,
    borderColor: colors.teal
  },
  scoreText: {
    color: colors.teal,
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold
  },
  amount: {
    color: colors.accent,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold
  },
  cardBody: {
    color: colors.textPrimary,
    fontSize: fontSize.sm,
    lineHeight: 22
  },
  button: {
    alignSelf: "flex-start",
    borderRadius: radius.full,
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm
  },
  buttonText: {
    color: colors.textInverse,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold
  }
});
