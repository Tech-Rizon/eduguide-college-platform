import React, { useEffect } from "react";
import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AppNavigator from "./src/navigation/AppNavigator";
import { setupNotifications } from "./src/services/notifications";
import { useAuthStore } from "./src/store/useAuthStore";
import { useDeadlineStore } from "./src/store/useDeadlineStore";
import { useProfileStore } from "./src/store/useProfileStore";
import { colors } from "./src/theme";

const mobileTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.bg,
    card: colors.surface,
    border: colors.border,
    primary: colors.accent,
    text: colors.textPrimary,
    notification: colors.accent
  }
};

export default function App() {
  const initializeAuth = useAuthStore((state) => state.initialize);
  const loadProfile = useProfileStore((state) => state.loadProfile);
  const loadDeadlines = useDeadlineStore((state) => state.load);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    let active = true;

    void (async () => {
      await loadProfile();
      await loadDeadlines();
      void setupNotifications();

      const unsubscribe = await initializeAuth();
      if (active) {
        cleanup = unsubscribe;
      } else {
        unsubscribe?.();
      }
    })();

    return () => {
      active = false;
      cleanup?.();
    };
  }, [initializeAuth, loadDeadlines, loadProfile]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer theme={mobileTheme}>
          <StatusBar style="light" />
          <AppNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
