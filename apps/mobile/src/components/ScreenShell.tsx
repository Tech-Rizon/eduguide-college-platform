import React from "react";
import { ScrollView, StyleSheet, View, type ScrollViewProps, type ViewProps } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing } from "@theme";

type ScreenShellProps = {
  scroll?: boolean;
  children: React.ReactNode;
} & Pick<ScrollViewProps, "contentContainerStyle"> &
  Pick<ViewProps, "style">;

export function ScreenShell({
  children,
  scroll = false,
  contentContainerStyle,
  style
}: ScreenShellProps) {
  const inner = scroll ? (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.body, style]}>{children}</View>
  );

  return (
    <LinearGradient colors={[colors.bg, "#0C162A", "#08101F"]} style={styles.gradient}>
      <SafeAreaView style={styles.safe}>{inner}</SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1
  },
  safe: {
    flex: 1
  },
  body: {
    flex: 1,
    paddingHorizontal: spacing.xl
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing["3xl"]
  }
});
