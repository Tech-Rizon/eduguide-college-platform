# EduGuide Mobile

Expo-based mobile client scaffold for EduGuide.

## Status

- integrated into the repo as an isolated workspace
- wired to the existing EduGuide web APIs where available
- uses mock scholarship data until the scholarship backend exists
- keeps the current Next.js build isolated by excluding `apps/mobile` from the root TypeScript config

## Environment

Create `apps/mobile/.env` with:

```bash
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000
EXPO_PUBLIC_USE_MOCK=false
```

## Install

```bash
cd apps/mobile
npm install
npm run start
```

## Current Surfaces

- onboarding
- home dashboard
- college search and detail
- advisor chat against `/api/ai-chat`
- scholarship list
- profile and saved colleges
- deadline reminders
