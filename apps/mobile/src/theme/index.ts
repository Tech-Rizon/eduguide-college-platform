import { Platform } from "react-native";

export const colors = {
  bg: "#08101F",
  surface: "#0F1A2E",
  card: "#14233D",
  cardAlt: "#192B49",
  border: "#233659",
  borderLight: "#2E4876",
  accent: "#F3A64C",
  accentSoft: "rgba(243,166,76,0.13)",
  teal: "#3AD0B0",
  tealSoft: "rgba(58,208,176,0.12)",
  sky: "#57B8FF",
  success: "#3BD18B",
  warning: "#F4C95D",
  error: "#F47D7D",
  textPrimary: "#EEF3FF",
  textSecondary: "#A4B4D3",
  textTertiary: "#6D7F9E",
  textInverse: "#08101F",
  overlay: "rgba(8,16,31,0.74)"
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  "2xl": 32,
  "3xl": 40,
  "4xl": 56
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999
} as const;

export const fontFamily = {
  display: Platform.select({ ios: "Georgia", android: "serif" }),
  body: Platform.select({ ios: "System", android: "sans-serif" }),
  mono: Platform.select({ ios: "Menlo", android: "monospace" })
} as const;

export const fontSize = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 17,
  lg: 20,
  xl: 24,
  "2xl": 30,
  "3xl": 38
} as const;

export const fontWeight = {
  regular: "400" as const,
  medium: "500" as const,
  semibold: "600" as const,
  bold: "700" as const
};

export const shadow = {
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 6,
    elevation: 2
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 6
  },
  accent: {
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 8
  }
} as const;

export const commonStyles = {
  screen: {
    flex: 1,
    backgroundColor: colors.bg
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    color: colors.textPrimary,
    fontSize: fontSize.base
  },
  buttonPrimary: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.base,
    alignItems: "center" as const,
    justifyContent: "center" as const
  },
  buttonPrimaryText: {
    color: colors.textInverse,
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold
  }
} as const;
