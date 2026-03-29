import React, { useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { CollegeCard } from "@components/CollegeCard";
import { ScreenShell } from "@components/ScreenShell";
import { SectionCard } from "@components/SectionCard";
import { useCollegeStore } from "@store/useCollegeStore";
import { useDeadlineStore } from "@store/useDeadlineStore";
import { useProfileStore } from "@store/useProfileStore";
import { colors, fontFamily, fontSize, fontWeight, radius, spacing } from "@theme";

const actionCards = [
  {
    label: "Find colleges",
    icon: "school-outline",
    tab: "CollegesTab"
  },
  {
    label: "Ask advisor",
    icon: "chatbubble-ellipses-outline",
    tab: "AdvisorTab"
  },
  {
    label: "Scholarships",
    icon: "ribbon-outline",
    tab: "ScholarshipsTab"
  }
] as const;

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const profile = useProfileStore((state) => state.profile);
  const recommended = useCollegeStore((state) => state.recommended);
  const isLoading = useCollegeStore((state) => state.isLoading);
  const loadRecommended = useCollegeStore((state) => state.loadRecommended);
  const setSelectedCollege = useCollegeStore((state) => state.setSelectedCollege);
  const getUpcoming = useDeadlineStore((state) => state.getUpcoming);
  const upcomingDeadlines = getUpcoming(45);

  useEffect(() => {
    if (profile.onboardingComplete) {
      void loadRecommended(profile);
    }
  }, [loadRecommended, profile]);

  return (
    <ScreenShell scroll contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.kicker}>Today</Text>
        <Text style={styles.title}>
          {profile.name ? `${profile.name}, here is your next move.` : "Here is your next move."}
        </Text>
        <Text style={styles.subtitle}>
          Your profile is already loaded with {profile.studentType}, GPA {profile.gpa.toFixed(1)}
          {profile.intendedMajorLabel ? `, ${profile.intendedMajorLabel}` : ""}, and a working
          budget of ${profile.budgetMax.toLocaleString()}.
        </Text>
      </View>

      <View style={styles.actionGrid}>
        {actionCards.map((action) => (
          <TouchableOpacity
            key={action.label}
            style={styles.actionCard}
            activeOpacity={0.9}
            onPress={() => navigation.navigate(action.tab)}
          >
            <Ionicons name={action.icon as never} size={20} color={colors.accent} />
            <Text style={styles.actionLabel}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <SectionCard
        title="Recommended matches"
        subtitle="These come from the same matching layer used by the web app."
      >
        {isLoading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={colors.accent} />
            <Text style={styles.loadingText}>Refreshing your shortlist...</Text>
          </View>
        ) : recommended.length ? (
          <View style={styles.list}>
            {recommended.slice(0, 3).map((college) => (
              <CollegeCard
                key={college.id}
                college={college}
                onPress={() => {
                  setSelectedCollege(college);
                  navigation.navigate("CollegesTab", {
                    screen: "CollegeDetail",
                    params: { collegeId: college.id, college }
                  });
                }}
              />
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>
            Complete your intended major and preferences to get stronger recommendations.
          </Text>
        )}
      </SectionCard>

      <SectionCard title="Upcoming deadlines" subtitle="The next 45 days of tracked work.">
        {upcomingDeadlines.length ? (
          <View style={styles.list}>
            {upcomingDeadlines.slice(0, 4).map((deadline) => (
              <View key={deadline.id} style={styles.deadlineRow}>
                <View style={styles.deadlineBadge}>
                  <Ionicons name="calendar-outline" size={16} color={colors.sky} />
                </View>
                <View style={styles.deadlineCopy}>
                  <Text style={styles.deadlineTitle}>
                    {deadline.collegeName} - {deadline.type}
                  </Text>
                  <Text style={styles.deadlineMeta}>{deadline.date}</Text>
                  {deadline.note ? <Text style={styles.deadlineNote}>{deadline.note}</Text> : null}
                </View>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>
            No deadlines are tracked yet. Add one from a college detail screen or through advisor
            chat.
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
  hero: {
    gap: spacing.sm
  },
  kicker: {
    color: colors.sky,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    textTransform: "uppercase",
    letterSpacing: 0.8
  },
  title: {
    color: colors.textPrimary,
    fontSize: fontSize["2xl"],
    fontWeight: fontWeight.bold,
    fontFamily: fontFamily.display
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: fontSize.base,
    lineHeight: 24
  },
  actionGrid: {
    flexDirection: "row",
    gap: spacing.md
  },
  actionCard: {
    flex: 1,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: spacing.base,
    gap: spacing.sm
  },
  actionLabel: {
    color: colors.textPrimary,
    fontSize: fontSize.sm,
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
  list: {
    gap: spacing.md
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 22
  },
  deadlineRow: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "flex-start"
  },
  deadlineBadge: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.tealSoft,
    borderWidth: 1,
    borderColor: colors.teal
  },
  deadlineCopy: {
    flex: 1,
    gap: spacing.xs
  },
  deadlineTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold
  },
  deadlineMeta: {
    color: colors.sky,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium
  },
  deadlineNote: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 20
  }
});
