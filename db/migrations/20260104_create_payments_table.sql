-- Migration: create payments table and supporting objects
-- Run this on your Supabase/Postgres database (e.g., psql or Supabase SQL editor)

-- Drop table if it exists (for clean re-runs)
DROP TABLE IF EXISTS public.payments CASCADE;

-- Ensure uuid generator is available
create extension if not exists pgcrypto;

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  session_id text not null unique,
  customer_email text,
  user_id uuid,
  amount integer,
  currency text,
  payment_status text,
  price_id text,
  payment_intent_id text,
  receipt_url text,
  plan text,
  metadata jsonb,
  raw_event jsonb,
  processed boolean default false
);

-- Helpful indexes
create index if not exists payments_customer_email_idx on public.payments (customer_email);
create index if not exists payments_created_at_idx on public.payments (created_at desc);
create index if not exists payments_price_id_idx on public.payments (price_id);
create index if not exists payments_user_id_idx on public.payments (user_id);

-- Idempotent insert example for webhook handling
-- Use this on server-side when inserting to avoid duplicates if Stripe retries
-- INSERT INTO public.payments (session_id, customer_email, amount, currency, payment_status, price_id, plan, payment_intent_id, receipt_url, metadata, raw_event, processed)
-- VALUES ('sess_...', 'user@example.com', 2500, 'usd', 'paid', 'price_...', 'Basic Support', 'pi_...', 'https://...', '{"foo":"bar"}'::jsonb, '{}'::jsonb, true)
-- ON CONFLICT (session_id) DO UPDATE SET
--   payment_status = EXCLUDED.payment_status,
--   receipt_url = COALESCE(EXCLUDED.receipt_url, public.payments.receipt_url),
--   updated_at = now(),
--   processed = public.payments.processed OR EXCLUDED.processed;

-- Lock it down (recommended)
alter table public.payments enable row level security;

-- Allow only service role to write (deny anonymous/authenticated access)
drop policy if exists "No direct access for anon/auth" on public.payments;
create policy "No direct access for anon/auth"
  on public.payments
  for all
  to anon, authenticated
  using (false)
  with check (false);

-- Optional: grant select to a read-only role or specific service accounts if needed
-- grant select on public.payments to your_readonly_role;

-- Trigger to keep updated_at current on row updates (optional)
create or replace function public.trigger_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists payments_set_updated_at on public.payments;
create trigger payments_set_updated_at
  before update on public.payments
  for each row
  execute function public.trigger_set_updated_at();
