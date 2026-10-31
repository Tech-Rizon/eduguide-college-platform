import React from "react";
import { StyleSheet, Text, View, type ViewStyle } from "react-native";
import { colors, commonStyles, fontSize, fontWeight, radius, spacing } from "@theme";

export function SectionCard({
  title,
  subtitle,
  children,
  style
}: {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.card, style]}>
      {(title || subtitle) && (
        <View style={styles.header}>
          {title ? <Text style={styles.title}>{title}</Text> : null}
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...commonStyles.card,
    padding: spacing.lg,
    gap: spacing.md,
    borderRadius: radius.xl
  },
  header: {
    gap: spacing.xs
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary
  }
});
