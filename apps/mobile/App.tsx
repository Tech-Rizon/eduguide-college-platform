import React, { useEffect } from "react";
import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AppNavigator from "./src/navigation/AppNavigator";
import { setupNotifications } from "./src/services/notifications";
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
  const loadProfile = useProfileStore((state) => state.loadProfile);
  const loadDeadlines = useDeadlineStore((state) => state.load);

  useEffect(() => {
    void loadProfile();
    void loadDeadlines();
    void setupNotifications();
  }, [loadDeadlines, loadProfile]);

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
