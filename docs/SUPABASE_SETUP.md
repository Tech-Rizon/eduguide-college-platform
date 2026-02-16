# Supabase Configuration Guide

## Database Setup

This project uses Supabase for authentication and database management. Follow these steps to configure your Supabase instance.

### Prerequisites

- Supabase account ([create one here](https://supabase.com))
- Access to Supabase dashboard for your project

### Step 1: Create a Supabase Project

1. Go to [Supabase Console](https://app.supabase.com)
2. Click "New Project"
3. Enter your project details:
   - **Name**: Your project name (e.g., "eduguide-college-platform")
   - **Database Password**: Create a strong password
   - **Region**: Select the region closest to your users
4. Click "Create new project" and wait for initialization (5-10 minutes)

### Step 2: Get Your Credentials

After your project is created:

1. Go to **Settings** → **API**
2. Copy these values to your `.env.local` file:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role secret** → `SUPABASE_SERVICE_ROLE_KEY` (keep this secret!)

### Step 3: Apply Database Migrations

There are two migration files to apply:

#### Migration 1: Payments Table
File: `db/migrations/20260104_create_payments_table.sql`

1. In Supabase, go to **SQL Editor**
2. Click **New Query**
3. Copy the entire contents of `db/migrations/20260104_create_payments_table.sql`
4. Paste into the SQL editor
5. Click **Run**

#### Migration 2: User Profiles & Tutoring Tables
File: `db/migrations/20260105_create_user_and_tutoring_tables.sql`

1. In Supabase, go to **SQL Editor**
2. Click **New Query**
3. Copy the entire contents of `db/migrations/20260105_create_user_and_tutoring_tables.sql`
4. Paste into the SQL editor
5. Click **Run**

### Step 4: Verify Tables Were Created

1. Go to **Table Editor** in Supabase dashboard
2. You should see these tables:
   - `payments`
   - `user_profiles`
   - `user_settings`
   - `tutoring_requests`

### Step 5: Configure Authentication

1. Go to **Authentication** → **Providers**
2. Enable your desired auth methods:
   - **Email/Password** (recommended for development)
   - **Google OAuth** (optional)
   - **GitHub OAuth** (optional)

For Email/Password:
- Go to **Settings** → **Auth**
- Configure email templates if desired
- Note the JWT secret for webhook verification

### Step 6: Configure Environment Variables

Create or update `.env.local` in your project root:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PRICE_BASIC=price_...
NEXT_PUBLIC_STRIPE_PRICE_PREMIUM=price_...
NEXT_PUBLIC_STRIPE_PRICE_ELITE=price_...

# Site Config
NEXT_PUBLIC_SITE_URL=http://localhost:3000  # For development

# Email (Optional - SendGrid)
SENDGRID_API_KEY=sg-...
```

### Step 7: Enable Extensions (if needed)

If your migrations reference pgcrypto or other extensions:

1. Go to **SQL Editor**
2. Run: `CREATE EXTENSION IF NOT EXISTS "pgcrypto";`

### Step 8: Test the Connection

Run the development server:

```bash
npm run dev
```

Visit http://localhost:3000 and test:
- Register a new account
- Log in
- Access protected pages (/dashboard, /profile, etc.)

## Table Schemas

### payments
Stores Stripe payment records.
- `id` - Primary key
- `session_id` - Stripe checkout session ID (unique)
- `customer_email` - Customer email
- `user_id` - Reference to authenticated user (optional)
- `amount` - Payment amount in cents
- `currency` - Currency code (e.g., 'usd')
- `payment_status` - Status from Stripe
- `price_id` - Stripe Price ID
- `plan` - Plan name (Basic, Premium, Elite)
- `payment_intent_id` - Stripe payment intent ID
- `receipt_url` - URL to receipt
- `metadata` - Additional JSON data
- `raw_event` - Full Stripe event payload
- `processed` - Whether payment was processed
- `created_at`, `updated_at` - Timestamps

### user_profiles
Stores user profile information.
- `id` - User ID (matches auth.users)
- `email` - User email
- `full_name` - Full name
- `avatar_url` - Profile picture URL
- `phone` - Phone number
- `location` - User location
- `bio` - User bio/description
- `created_at`, `updated_at` - Timestamps

### user_settings
Stores user preferences and settings.
- `user_id` - User ID (matches auth.users)
- `notifications_enabled` - Enable/disable all notifications
- `email_notifications` - Enable/disable email alerts
- `marketing_emails` - Opt-in to marketing
- `theme` - UI theme (light/dark)
- `language` - Preferred language
- `created_at`, `updated_at` - Timestamps

### tutoring_requests
Stores tutoring session requests.
- `id` - Request ID
- `user_id` - Student requesting tutoring
- `category` - Category (e.g., "College Prep", "Course Work")
- `subject` - Subject (e.g., "Math", "English")
- `description` - Request details
- `priority` - Priority level (low/medium/high)
- `status` - Status (new/assigned/in_progress/completed)
- `assigned_tutor_id` - Tutor assigned to request (optional)
- `scheduled_date` - Scheduled date/time (optional)
- `created_at`, `updated_at` - Timestamps

## Security Features

### Row Level Security (RLS)

All tables have RLS enabled with the following policies:

- **user_profiles**: Everyone can view, users can only edit their own
- **user_settings**: Users can only view/edit their own settings
- **tutoring_requests**: Users see their own, tutors see assigned requests
- **payments**: Only visible via admin queries or triggers

### Data Protection

- Service role key should never be exposed in client code
- Always use the service role key server-side only
- Anon key should be public (safe to expose)
- Webhook secrets must be stored securely

## Troubleshooting

### Migrations Won't Run
- Check SQL syntax in the editor
- Ensure you're using the correct Supabase project
- Check for FK constraint errors (tables may need to be created in order)

### RLS Denying Access
- Check if user is authenticated
- Verify RLS policies match your use case
- Use Supabase logging to debug

### Stripe Webhook Not Working
- Ensure `STRIPE_WEBHOOK_SECRET` is set correctly
- Check webhook URL in Stripe dashboard points to `/api/stripe-webhook`
- Verify domain is accessible from internet (localhost won't work)

## Production Deployment

When deploying to Vercel:

1. Set all environment variables in hosting platform settings
2. Use the same Supabase project or create a production project
3. Run migrations in production Supabase instance
4. Configure Stripe webhooks to point to production domain
5. Use production Stripe keys (not test keys)
6. Enable email verification and password reset emails
7. Configure custom domain in Supabase settings

## Additional Resources

- [Supabase Docs](https://supabase.com/docs)
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
