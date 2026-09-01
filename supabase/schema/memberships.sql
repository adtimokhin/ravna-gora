-- Run this once in the Supabase SQL editor (Project → SQL Editor) before
-- Stripe checkout can persist anything. Not applied automatically — there's
-- no migration tooling wired up for this project yet.
--
-- Both tables are written only by the Stripe webhook (app/api/stripe/webhook/route.ts)
-- via the service-role client (lib/supabase-admin.ts), so the RLS policies
-- below only grant regular users read access to their own rows.

create table if not exists public.memberships (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text not null,
  stripe_subscription_id text,
  plan text not null check (plan in ('supporting', 'full')),
  edition text check (edition in ('digital', 'print', 'both')),
  status text not null default 'incomplete',
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Safe to re-run against an already-existing table from before this column
-- was added.
alter table public.memberships add column if not exists cancel_at_period_end boolean not null default false;

alter table public.memberships enable row level security;

create policy "Users can view their own membership"
  on public.memberships for select
  using (auth.uid() = user_id);

-- Supabase doesn't always auto-grant these on new tables — without them,
-- Postgres denies access before RLS is even evaluated, and the service-role
-- client (used by the checkout API and webhook) fails silently unless its
-- caller checks the returned `.error` field.
grant select, insert, update, delete on public.memberships to service_role;
grant select on public.memberships to authenticated;

create table if not exists public.donations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  stripe_payment_intent_id text not null unique,
  amount_cents integer not null,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

alter table public.donations enable row level security;

create policy "Users can view their own donations"
  on public.donations for select
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.donations to service_role;
grant select on public.donations to authenticated;
