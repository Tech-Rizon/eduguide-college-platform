#!/usr/bin/env bash
# sync-env-to-vercel.sh
# Pushes critical env vars from .env.local to Vercel Production.
# Run: bash scripts/sync-env-to-vercel.sh
# Requires: npx vercel link  (run once first to connect this project)

set -euo pipefail

ENV_FILE=".env.local"

if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: $ENV_FILE not found. Run from project root."
  exit 1
fi

# Variables to sync to Vercel Production
VARS=(
  "STRIPE_SECRET_KEY"
  "STRIPE_WEBHOOK_SECRET"
  "STRIPE_REFERRAL_COUPON_ID"
  "NEXT_PUBLIC_STRIPE_PRICE_BASIC"
  "NEXT_PUBLIC_STRIPE_PRICE_PREMIUM"
  "NEXT_PUBLIC_STRIPE_PRICE_ELITE"
  "REFERRAL_CODES"
  "REFERRAL_REWARD_PERCENT"
  "REFERRAL_REWARD_MONTHS"
  "SUPABASE_URL"
  "SUPABASE_SERVICE_ROLE_KEY"
  "NEXT_PUBLIC_SUPABASE_URL"
  "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  "OPENAI_API_KEY"
  "OPENAI_CHAT_MODEL"
  "NEXT_PUBLIC_SITE_URL"
  "SENDGRID_API_KEY"
  "CONTACT_TO_EMAIL"
  "CRON_SECRET"
  "CHECKOUT_RECOVERY_DELAY_MINUTES"
  "CHECKOUT_RECOVERY_BATCH_SIZE"
)

echo "=== Syncing env vars to Vercel Production ==="
echo ""

for VAR in "${VARS[@]}"; do
  # Extract the value from .env.local (strip surrounding quotes)
  VALUE=$(grep -E "^${VAR}=" "$ENV_FILE" | head -1 | sed 's/^[^=]*=//' | sed 's/^"//' | sed 's/"$//')

  if [ -z "$VALUE" ]; then
    echo "SKIP  $VAR  (not in $ENV_FILE)"
    continue
  fi

  echo "PUSH  $VAR"
  echo "$VALUE" | npx vercel env add "$VAR" production --force 2>/dev/null || \
    echo "      (already exists — use Vercel UI to update manually if needed)"
done

echo ""
echo "=== Done. Trigger a redeploy: git commit --allow-empty -m 'chore: trigger redeploy' && git push ==="
