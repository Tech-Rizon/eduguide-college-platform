import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { CollegeSummary } from "@types";
import { colors, fontSize, fontWeight, radius, shadow, spacing } from "@theme";

export function CollegeCard({
  college,
  onPress
}: {
  college: CollegeSummary;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.88} onPress={onPress}>
      <View style={styles.header}>
        <View style={styles.titleBlock}>
          <Text style={styles.name}>{college.name}</Text>
          <Text style={styles.meta}>
            {college.city}, {college.state}
            {college.programName ? ` • ${college.programName}` : ""}
          </Text>
        </View>
        {typeof college.fitScore === "number" ? (
          <View style={styles.scoreBadge}>
            <Text style={styles.scoreText}>{college.fitScore}</Text>
          </View>
        ) : null}
      </View>

      {college.description ? <Text style={styles.description}>{college.description}</Text> : null}

      <View style={styles.footer}>
        <View style={styles.chips}>
          {college.fitBucket ? (
            <View style={styles.chip}>
              <Text style={styles.chipText}>{college.fitBucket.replace("_", " ")}</Text>
            </View>
          ) : null}
          {typeof college.tuitionInState === "number" ? (
            <View style={styles.chip}>
              <Text style={styles.chipText}>In-state ${college.tuitionInState.toLocaleString()}</Text>
            </View>
          ) : null}
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadow.sm
  },
  header: {
    flexDirection: "row",
    gap: spacing.md
  },
  titleBlock: {
    flex: 1,
    gap: spacing.xs
  },
  name: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold
  },
  meta: {
    color: colors.textSecondary,
    fontSize: fontSize.sm
  },
  scoreBadge: {
    minWidth: 44,
    height: 44,
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
  description: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 20
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    flex: 1
  },
  chip: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.surface
  },
  chipText: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium
  }
});
