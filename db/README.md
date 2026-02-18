# Supabase Database Coverage

This project now includes migrations for all application-critical tables used by student and staff/admin workflows:

## One-document option
- `db/supabase_all_in_one.sql`

This single SQL document combines all Supabase migrations in execution order.
Use it for full setup from scratch in one run.

## Core account + student support tables
- `user_profiles`
- `user_settings`
- `tutoring_requests`

Source: `db/migrations/20260105_create_user_and_tutoring_tables.sql`

## Billing table
- `payments`

Source: `db/migrations/20260104_create_payments_table.sql`

## Enterprise role + dashboard tables
- `user_roles`
  - `role`: `student` or `staff`
  - `staff_level` (when `role = staff`): `tutor`, `support`, `manager`, `super_admin`
- `student_dashboard_metrics`
- `staff_dashboard_metrics`
- `admin_audit_logs`
- `support_requests`
- `backoffice_tickets`
- `backoffice_ticket_events`

Sources:
- `db/migrations/20260106_create_roles_and_dashboard_tables.sql`
- `db/migrations/20260217_normalize_user_roles_and_staff_levels.sql`
- `db/migrations/20260218_backoffice_ticketing_and_auto_assignment.sql`

## Backend-only admin bootstrap
Use the internal API route to create/update the admin account via service role (no front-end link):

`POST /api/internal/bootstrap-admin`

Required environment variables:
- `ADMIN_BOOTSTRAP_TOKEN`
- `ADMIN_SEED_EMAIL`
- `ADMIN_SEED_PASSWORD`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Required header:
- `x-admin-bootstrap-token: <ADMIN_BOOTSTRAP_TOKEN>`
