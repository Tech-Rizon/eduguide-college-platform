# EduGuide Mobile

Expo-based mobile client for EduGuide.

## Status

- integrated into the repo as an isolated workspace
- wired to the existing EduGuide web APIs where available
- uses mock scholarship data until the scholarship backend exists
- keeps the current Next.js build isolated by excluding `apps/mobile` from the root TypeScript config
- configured for Expo prebuild and EAS Android/iOS builds

## Environment

Create `apps/mobile/.env` with:

```bash
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000
EXPO_PUBLIC_USE_MOCK=false
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-public-anon-or-publishable-key
EAS_PROJECT_ID=replace-with-real-project-id
ANDROID_VERSION_CODE=1
IOS_BUILD_NUMBER=1
```

For Google sign-in, also configure Supabase Auth:

- enable the Google provider in your Supabase project
- add redirect URLs that cover Expo Go and native builds, for example:
  - `eduguide://auth/callback`
  - `exp://*/--/auth/callback`

## Install

```bash
cd apps/mobile
npm install
npm run start
```

## Build Commands

```bash
npm run prebuild
npm run build:android:apk
npm run build:android:prod
npm run build:ios
```

## Build Constraints

- local Android builds require a full Android SDK install and `ANDROID_HOME` or `ANDROID_SDK_ROOT`
- local iOS builds require macOS plus Xcode
- remote EAS builds require Expo login plus a real `EAS_PROJECT_ID`

## Current Surfaces

- onboarding
- home dashboard
- college search and detail
- advisor chat against `/api/ai-chat`
- scholarship list
- profile and saved colleges
- deadline reminders
