# Database Configuration Summary

## What Was Added

### Database Migrations
Two SQL migration files have been created to set up your Supabase database:

#### `db/migrations/20260104_create_payments_table.sql`
Creates the `payments` table for storing Stripe transaction records with:
- Payment session tracking (session_id, payment_intent_id)
- Customer information (email, user_id)
- Payment details (amount, currency, status)
- Stripe metadata and receipt URL
- Row-level security (RLS) policies
- Automatic timestamp triggers

#### `db/migrations/20260105_create_user_and_tutoring_tables.sql`
Creates three tables:

**user_profiles** - Stores user account information
- Basic fields: email, full_name, phone, location, bio
- Profile picture: avatar_url
- Automatically synced with Supabase auth users

**user_settings** - Stores user preferences
- Notification settings (all notifications, email, marketing)
- UI preferences (theme, language)
- Per-user privacy controls

**tutoring_requests** - Stores tutoring session requests
- Request details: category, subject, description, priority
- Status tracking: new, assigned, in_progress, completed
- Tutor assignment with optional scheduled_date
- Automatic timestamps

### API Endpoints

Three new serverless API routes have been created for managing database records:

#### **GET/PUT `/api/user-profile?userId={id}`**
```typescript
// GET - Fetch user profile
GET /api/user-profile?userId=user-id
Response: { profile: { id, email, full_name, avatar_url, ... } }

// PUT - Update user profile (upsert)
PUT /api/user-profile
Body: { userId, email, full_name, avatar_url, phone, location, bio }
Response: { profile: { ... } }
```

#### **GET/PUT `/api/user-settings?userId={id}`**
```typescript
// GET - Fetch user settings (returns defaults if not found)
GET /api/user-settings?userId=user-id
Response: { settings: { user_id, notifications_enabled, theme, ... } }

// PUT - Update user settings (upsert)
PUT /api/user-settings
Body: { userId, notifications_enabled, email_notifications, theme, language, ... }
Response: { settings: { ... } }
```

#### **GET/POST `/api/tutoring-requests?userId={id}`**
```typescript
// GET - Fetch tutoring requests for a user
GET /api/tutoring-requests?userId=user-id
Response: { requests: [ { id, category, subject, status, ... } ] }

// POST - Create new tutoring request
POST /api/tutoring-requests
Body: { userId, category, subject, description, priority }
Response: { request: { id, ... }, status: 201 }
```

### Configuration Changes

- **`next.config.js`**: Removed `output: 'export'` to enable server-side functionality
  - This allows API routes, webhooks, and Supabase server-side operations
  - Project now requires Node.js runtime (not static export)
  - Deployment platforms: Vercel, Netlify, or any Node.js host

## Setup Instructions

### 1. Apply Database Migrations

Go to your Supabase dashboard and run these SQL files in the SQL Editor:

**Step 1:** Run `db/migrations/20260104_create_payments_table.sql`
```
1. Supabase Dashboard → SQL Editor → New Query
2. Copy entire file contents
3. Click Run
```

**Step 2:** Run `db/migrations/20260105_create_user_and_tutoring_tables.sql`
```
1. Supabase Dashboard → SQL Editor → New Query
2. Copy entire file contents
3. Click Run
```

### 2. Verify Tables Were Created

Go to **Table Editor** and confirm these tables exist:
- `payments` (from migration 1)
- `user_profiles` (from migration 2)
- `user_settings` (from migration 2)
- `tutoring_requests` (from migration 2)

### 3. Test API Endpoints Locally

Start the development server:
```bash
npm run dev
```

#### Test User Profile API
```bash
# Create profile
curl -X PUT http://localhost:3000/api/user-profile \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-id",
    "email": "user@example.com",
    "full_name": "John Doe",
    "location": "New York, NY"
  }'

# Fetch profile
curl "http://localhost:3000/api/user-profile?userId=test-user-id"
```

#### Test Tutoring Requests API
```bash
# Create request
curl -X POST http://localhost:3000/api/tutoring-requests \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-id",
    "category": "College Prep",
    "subject": "Math",
    "description": "Need help with calculus",
    "priority": "high"
  }'

# Fetch requests
curl "http://localhost:3000/api/tutoring-requests?userId=test-user-id"
```

#### Test Settings API
```bash
# Create/update settings
curl -X PUT http://localhost:3000/api/user-settings \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-id",
    "notifications_enabled": true,
    "theme": "dark"
  }'

# Fetch settings
curl "http://localhost:3000/api/user-settings?userId=test-user-id"
```

## Security

All tables have Row-Level Security (RLS) enabled with policies:

- **user_profiles**: Public read, users can edit their own
- **user_settings**: Users can only access their own settings
- **tutoring_requests**: Users see their own requests, tutors see assigned ones
- **payments**: Server-side only via `SUPABASE_SERVICE_ROLE_KEY`

## Deployment Notes

### For Vercel
1. Migrations run once manually in Supabase dashboard
2. Set environment variables in Vercel dashboard
3. Deploy - API routes work automatically

### For Netlify
1. Migrations run once manually in Supabase dashboard
2. Set environment variables in Netlify dashboard
3. Use Netlify Functions for serverless - your Next.js API routes will work
4. Configure build command: `npm run build` (already set)

### For Self-Hosted
1. Ensure Node.js 18+ is available
2. Run migrations in Supabase dashboard
3. Set environment variables on the server
4. Use a process manager (PM2, systemd, etc.)

## Environment Variables Required

Copy to `.env.local` (development) or hosting platform (production):

```env
# Supabase (required for database access)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxxx

# Stripe (for payments)
STRIPE_SECRET_KEY=sk_test_xxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxx
NEXT_PUBLIC_STRIPE_PRICE_BASIC=price_xxxx
NEXT_PUBLIC_STRIPE_PRICE_PREMIUM=price_xxxx
NEXT_PUBLIC_STRIPE_PRICE_ELITE=price_xxxx

# Site (for redirects and webhooks)
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## Database Schema Reference

See [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) for detailed schema documentation including:
- Field descriptions
- Relationships and constraints
- Index strategy
- RLS policies
- Troubleshooting guide

## Next Steps

1. ✅ Run both SQL migrations in Supabase
2. ✅ Set environment variables
3. ✅ Test API endpoints locally
4. ✅ Integrate APIs into React components (dashboard, profile page)
5. ✅ Set up authentication flow to auto-create user_profiles and user_settings
6. ✅ Deploy to Vercel or Netlify
7. ✅ Configure Stripe webhooks for payment processing

## Integration Example

To create a user profile when a user registers:

```typescript
// In your register handler or post-auth flow
const createUserProfile = async (userId, email, fullName) => {
  const response = await fetch('/api/user-profile', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      email,
      full_name: fullName
    })
  });
  return response.json();
};

// Auto-create settings
const createUserSettings = async (userId) => {
  await fetch('/api/user-settings', {
    method: 'PUT',
    body: JSON.stringify({
      userId,
      notifications_enabled: true,
      email_notifications: true,
      theme: 'light'
    })
  });
};
```

## Additional Features

All tables include:
- ✅ Automatic `created_at` timestamp
- ✅ Automatic `updated_at` with trigger
- ✅ Indexes for common queries
- ✅ Foreign key constraints
- ✅ Row-level security (RLS)
- ✅ Proper error handling in APIs
- ✅ Lazy-loaded Supabase client (safe for build-time)

Build is verified to pass with `npm run build` ✓
