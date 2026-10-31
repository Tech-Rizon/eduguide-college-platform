import type { ExpoConfig } from "expo/config";

const version = "0.1.0";
const iosBuildNumber = process.env.IOS_BUILD_NUMBER || "1";
const androidVersionCode = Number(process.env.ANDROID_VERSION_CODE || "1");
const easProjectId =
  process.env.EAS_PROJECT_ID || "3bbb972b-be7e-448a-981c-12a8c8b0a6fc";
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const config: ExpoConfig = {
  name: "EduGuide",
  slug: "eduguide-mobile",
  scheme: "eduguide",
  version,
  orientation: "portrait",
  userInterfaceStyle: "dark",
  assetBundlePatterns: ["**/*"],
  ios: {
    supportsTablet: true,
    bundleIdentifier: "online.eduguide.mobile",
    buildNumber: iosBuildNumber,
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false
    }
  },
  android: {
    package: "online.eduguide.mobile",
    versionCode: androidVersionCode,
    adaptiveIcon: {
      backgroundColor: "#08101F"
    }
  },
  plugins: ["expo-notifications", "expo-web-browser"],
  extra: {
    supabaseUrl,
    supabaseAnonKey
  }
};

if (easProjectId) {
  config.extra = {
    ...config.extra,
    eas: {
      projectId: easProjectId
    }
  };
}

export default config;
