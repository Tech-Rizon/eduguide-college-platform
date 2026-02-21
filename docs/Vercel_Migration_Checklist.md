# Vercel Deployment Checklist - EduGuide

## Overview

This checklist covers production deployment for this Next.js (App Router) project on Vercel.

## Before you start

1. Create a Vercel account and connect your GitHub repo.
2. Ensure branch protection and required CI checks are configured as needed.

## Environment variables (Vercel Project -> Settings -> Environment Variables)

- NEXT_PUBLIC_SUPABASE_URL (existing)
- NEXT_PUBLIC_SUPABASE_ANON_KEY (existing)
- SUPABASE_SERVICE_ROLE_KEY (server-only, used by webhooks and server writes)
- STRIPE_SECRET_KEY (server-only)
- STRIPE_WEBHOOK_SECRET (server-only, Stripe webhook signing secret)
- NEXT_PUBLIC_STRIPE_PRICE_BASIC (published Stripe Price ID)
- NEXT_PUBLIC_STRIPE_PRICE_PREMIUM (published Stripe Price ID)
- NEXT_PUBLIC_STRIPE_PRICE_ELITE (published Stripe Price ID)
- NEXT_PUBLIC_SITE_URL (optional, e.g. https://your-vercel-domain)

## Files and routing

- API routes under `src/app/api/*` deploy as serverless functions automatically.
- Configure Stripe to send events to `https://<your-vercel-domain>/api/stripe-webhook`.

## Dependencies

- Ensure `stripe` is in `package.json` dependencies (server-side usage in `src/app/api/*`).
- Run `npm install` before local builds.

## Build and dev

- Local dev: `npm run dev`
- Local verification build: `npm run build` then `npm start`
- Vercel automatically runs `npm run build` during deployments.

## Legacy config cleanup

- Remove unused deployment config files from other hosts.
- Remove legacy deployment environment variable names that are no longer used.

## Optional Vercel config

- `vercel.json` is optional and can define redirects, rewrites, or functions config.
- Example:
  ```json
  {
    "rewrites": [ { "source": "/foo", "destination": "/api/foo" } ]
  }
  ```

## Testing checklist

1. Add environment variables in the Vercel dashboard (or use `.env.local` for local builds).
2. Run locally:
   ```bash
   npm install
   npm run build
   npm start
   ```
3. Test checkout flow with published Stripe Price IDs and webhook configured.
4. Confirm webhook writes appear in Supabase `payments` table.

## Notes and pitfalls

- Keep service role keys secure (server-only values).
- Ensure webhook URL and `STRIPE_WEBHOOK_SECRET` are configured in Stripe.
- Test dynamic routes and serverless functions after deployment.

## Rollback

- Use Vercel deployment history to promote a previously stable build if needed.

## Contact

- If needed, create a `vercel.json` draft and run a local production build to verify behavior.
