-- Run this once in the Supabase SQL editor (Project → SQL Editor) before
-- Stripe checkout can persist anything. Not applied automatically — there's
-- no migration tooling wired up for this project yet. Safe to re-run.
--
-- Both tables are written only by the Stripe webhook (app/api/stripe/webhook/route.ts)
-- via the service-role client (lib/supabase-admin.ts), so the RLS policies
-- below only grant regular users read access to their own rows.
--
-- A user can have more than one row over time in either table (a canceled
-- membership followed by a new signup, multiple donations, etc.), so each
-- table has its own generated primary key rather than keying on user_id.

create table if not exists public.memberships (
  membership_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
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

create table if not exists public.donations (
  donation_id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  stripe_payment_intent_id text not null unique,
  amount_cents integer not null,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

-- One per membership that needs physical delivery (Supporting Print/Both —
-- see app/api/membership/billing-info/route.ts). Field names mirror Stripe's
-- own Address shape (line1/line2/city/state/postal_code/country) since the
-- same values are also sent to Stripe as the customer's `shipping` address.
create table if not exists public.mailing_addresses (
  mailing_address_id uuid primary key default gen_random_uuid(),
  membership_id uuid not null unique references public.memberships(membership_id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  recipient_name text not null,
  line1 text not null,
  line2 text,
  city text not null,
  state text not null,
  postal_code text not null,
  country text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists mailing_addresses_user_id_idx on public.mailing_addresses (user_id);

-- ── Migration for an already-existing installation ──────────────────────
-- (a fresh `create table` above already has the final shape; these bring an
-- existing one — created before membership_id/donation_id existed — up to
-- date, without touching any data.)

alter table public.memberships add column if not exists cancel_at_period_end boolean not null default false;

alter table public.memberships add column if not exists membership_id uuid not null default gen_random_uuid();

-- Look up the actual current primary key column (rather than assuming the
-- constraint's default auto-generated name) and only swap it if it's still
-- on user_id — a fresh table from the create above is already correct.
do $$
declare
  pk_name text;
  pk_column text;
begin
  select tc.constraint_name, kcu.column_name into pk_name, pk_column
  from information_schema.table_constraints tc
  join information_schema.key_column_usage kcu
    on tc.constraint_name = kcu.constraint_name and tc.table_schema = kcu.table_schema
  where tc.table_schema = 'public'
    and tc.table_name = 'memberships'
    and tc.constraint_type = 'PRIMARY KEY'
  limit 1;

  if pk_column = 'user_id' then
    execute format('alter table public.memberships drop constraint %I', pk_name);
    alter table public.memberships add primary key (membership_id);
  end if;
end $$;

create index if not exists memberships_user_id_idx on public.memberships (user_id);
create index if not exists memberships_stripe_subscription_id_idx on public.memberships (stripe_subscription_id);

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'donations' and column_name = 'id'
  ) then
    alter table public.donations rename column id to donation_id;
  end if;
end $$;

-- ── RLS + grants (idempotent either way) ─────────────────────────────────

alter table public.memberships enable row level security;

drop policy if exists "Users can view their own membership" on public.memberships;
create policy "Users can view their own membership"
  on public.memberships for select
  using (auth.uid() = user_id);

-- Supabase doesn't always auto-grant these on new tables — without them,
-- Postgres denies access before RLS is even evaluated, and the service-role
-- client (used by the checkout API and webhook) fails silently unless its
-- caller checks the returned `.error` field.
grant select, insert, update, delete on public.memberships to service_role;
grant select on public.memberships to authenticated;

alter table public.donations enable row level security;

drop policy if exists "Users can view their own donations" on public.donations;
create policy "Users can view their own donations"
  on public.donations for select
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.donations to service_role;
grant select on public.donations to authenticated;

alter table public.mailing_addresses enable row level security;

drop policy if exists "Users can view their own mailing address" on public.mailing_addresses;
create policy "Users can view their own mailing address"
  on public.mailing_addresses for select
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.mailing_addresses to service_role;
grant select on public.mailing_addresses to authenticated;

-- ── profiles cleanup ──────────────────────────────────────────────────────
-- membership_status / membership_expires_at predate the memberships table
-- above and are no longer read anywhere in the app — the memberships table
-- is the sole source of truth for membership state now.

alter table public.profiles drop column if exists membership_status;
alter table public.profiles drop column if exists membership_expires_at;
