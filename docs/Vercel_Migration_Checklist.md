# Vercel Migration Checklist — EduGuide

## Overview

This checklist helps migrate from Netlify to Vercel for this Next.js (App Router) project.

## Before you start

1. Create a Vercel account and connect your GitHub repo.
2. Ensure branch protection / required CI rules as needed.

## Environment variables (set these in Vercel Project > Settings > Environment Variables)

- NEXT_PUBLIC_SUPABASE_URL — (existing)
- NEXT_PUBLIC_SUPABASE_ANON_KEY — (existing)
- SUPABASE_SERVICE_ROLE_KEY — (server-only) used by webhooks / server writes
- STRIPE_SECRET_KEY — server-only
- STRIPE_WEBHOOK_SECRET — server-only (Stripe webhook signing secret)
- NEXT_PUBLIC_STRIPE_PRICE_BASIC — published Stripe Price ID
- NEXT_PUBLIC_STRIPE_PRICE_PREMIUM — published Stripe Price ID
- NEXT_PUBLIC_STRIPE_PRICE_ELITE — published Stripe Price ID
- NEXT_PUBLIC_SITE_URL — optional, e.g. https://your-vercel-domain

## Files & routing

- API routes under `src/app/api/*` will be deployed as serverless functions automatically.
- Webhook: configure Stripe to send events to `https://<your-vercel-domain>/api/stripe-webhook`.

## Dependencies

- Ensure `stripe` is in `package.json` dependencies (server-side usage in `src/app/api/*`).
- Run `npm install` before building locally.

## Build & Dev

- Local dev: `npm run dev` (Next.js dev server).
- Local verification build: `npm run build` then `npm start` to smoke-test production build.
- Vercel automatically runs `npm run build` on deploy.

## Netlify-specific config to remove/ignore

- `netlify.toml` is no longer needed for Vercel — you can keep it for Netlify or remove it.
- Remove `NETLIFY_*` env var references if migrating fully.

## Optional Vercel config

- `vercel.json` (not required) can set redirects, rewrites, or functions config.
- Example (if you need headers/rewrites):
  ```json
  {
    "rewrites": [ { "source": "/foo", "destination": "/api/foo" } ]
  }
  ```

## Testing checklist

1. Add the environment variables in Vercel dashboard (or export locally into `.env.local` for local builds).
2. Run locally:
   ```bash
   npm install stripe
   npm run build
   npm start
   ```
3. Test checkout flow with published Stripe Price IDs and webhook configured.
4. Confirm webhook writes appear in Supabase `payments` table.

## Notes and pitfalls

- Keep service role keys secure (set only as Vercel "Secret" values, not public).
- Ensure webhook URL and `STRIPE_WEBHOOK_SECRET` are configured in Stripe dashboard.
- Vercel's edge/runtime differences: if you rely on Netlify plugin behavior, test dynamic routes and serverless functions.

## Rollback

- You can redeploy on Netlify if needed; keep `netlify.toml` and Netlify env vars until confident.

## Contact

- If you want, I can create a small `vercel.json` draft and run a local production build to verify.

