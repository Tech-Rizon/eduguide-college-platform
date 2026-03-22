import React from "react";
import { Text } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type {
  CollegesStackParamList,
  MainTabParamList,
  OnboardingStackParamList,
  RootStackParamList
} from "@types";
import { colors, fontWeight } from "@theme";
import { useProfileStore } from "@store/useProfileStore";
import WelcomeScreen from "@screens/onboarding/WelcomeScreen";
import ProfileSetupScreen from "@screens/onboarding/ProfileSetupScreen";
import PreferencesScreen from "@screens/onboarding/PreferencesScreen";
import HomeScreen from "@screens/home/HomeScreen";
import CollegeSearchScreen from "@screens/colleges/CollegeSearchScreen";
import CollegeDetailScreen from "@screens/colleges/CollegeDetailScreen";
import AdvisorChatScreen from "@screens/advisor/AdvisorChatScreen";
import ScholarshipsScreen from "@screens/scholarships/ScholarshipsScreen";
import ProfileScreen from "@screens/profile/ProfileScreen";

const RootStack = createNativeStackNavigator<RootStackParamList>();
const OnboardingStack = createNativeStackNavigator<OnboardingStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();
const CollegesStack = createNativeStackNavigator<CollegesStackParamList>();

function OnboardingNavigator() {
  return (
    <OnboardingStack.Navigator screenOptions={{ headerShown: false }}>
      <OnboardingStack.Screen name="Welcome" component={WelcomeScreen} />
      <OnboardingStack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
      <OnboardingStack.Screen name="Preferences" component={PreferencesScreen} />
    </OnboardingStack.Navigator>
  );
}

function CollegesNavigator() {
  return (
    <CollegesStack.Navigator
      screenOptions={{
        headerShown: false
      }}
    >
      <CollegesStack.Screen name="CollegeSearch" component={CollegeSearchScreen} />
      <CollegesStack.Screen name="CollegeDetail" component={CollegeDetailScreen} />
    </CollegesStack.Navigator>
  );
}

function MainTabs() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 58 + insets.bottom,
          paddingTop: 8
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarIcon: ({ focused, color }) => (
          <Ionicons
            color={color}
            size={22}
            name={
              route.name === "HomeTab"
                ? focused
                  ? "home"
                  : "home-outline"
                : route.name === "CollegesTab"
                  ? focused
                    ? "school"
                    : "school-outline"
                  : route.name === "AdvisorTab"
                    ? focused
                      ? "chatbubble-ellipses"
                      : "chatbubble-ellipses-outline"
                    : route.name === "ScholarshipsTab"
                      ? focused
                        ? "ribbon"
                        : "ribbon-outline"
                      : focused
                        ? "person"
                        : "person-outline"
            }
          />
        ),
        tabBarLabel: ({ focused, color }) => (
          <Text
            style={{
              color,
              fontSize: 10,
              fontWeight: focused ? fontWeight.semibold : fontWeight.regular
            }}
          >
            {route.name === "HomeTab"
              ? "Home"
              : route.name === "CollegesTab"
                ? "Colleges"
                : route.name === "AdvisorTab"
                  ? "Advisor"
                  : route.name === "ScholarshipsTab"
                    ? "Aid"
                    : "Profile"}
          </Text>
        )
      })}
    >
      <Tab.Screen name="HomeTab" component={HomeScreen} />
      <Tab.Screen name="CollegesTab" component={CollegesNavigator} />
      <Tab.Screen name="AdvisorTab" component={AdvisorChatScreen} />
      <Tab.Screen name="ScholarshipsTab" component={ScholarshipsScreen} />
      <Tab.Screen name="ProfileTab" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const isOnboarded = useProfileStore((state) => state.isOnboarded);

  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      {isOnboarded ? (
        <RootStack.Screen name="Main" component={MainTabs} />
      ) : (
        <RootStack.Screen name="Onboarding" component={OnboardingNavigator} />
      )}
    </RootStack.Navigator>
  );
}
