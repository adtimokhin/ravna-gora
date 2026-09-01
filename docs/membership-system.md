# Membership & donations system

Reference for the Stripe-backed membership, donation, and billing-info
system built across `feature/stripe-preview`. Covers the Supabase schema,
every API route, the webhook, and the frontend pages/components that use
them.

## Architecture in one paragraph

Stripe is the source of truth for billing state (subscriptions, payment
methods, customer records). Supabase mirrors the parts of that state the app
needs to query quickly (`memberships`, `donations`, `mailing_addresses`).
Every mutating API route writes to **both** in the same request — Stripe
first, then Supabase — so the UI can update immediately without waiting on a
webhook. The Stripe webhook (`app/api/stripe/webhook/route.ts`) independently
re-applies the same Supabase updates from Stripe's own confirmed event data,
acting as a reconciliation safety net rather than the primary write path —
see the "Direct writes vs. the webhook" section below.

A user can have **more than one row** in `memberships` or `donations` over
time (a cancelled membership followed by a new signup, multiple donations,
etc.). Every route that reads "the" membership for a user actually reads
their *most recent* row (`order by created_at desc limit 1`), not a unique
row per user — this is why all three tables use a generated primary key
(`membership_id` / `donation_id`) instead of keying on `user_id`.

## Supabase schema

Defined in `supabase/schema/memberships.sql` (idempotent — safe to re-run
against an existing database; it migrates an older `user_id`-as-primary-key
shape forward automatically). Not applied automatically — there's no
migration tooling wired up, so this file has to be run by hand in the
Supabase SQL editor after any change to it.

### `memberships`

One row per subscription lifecycle (not per user — see above).

| Column | Type | Meaning |
|---|---|---|
| `membership_id` | `uuid`, PK | Generated identifier for this row. |
| `user_id` | `uuid`, FK → `auth.users` | Owner. Indexed, `on delete cascade` (deleting the Supabase user deletes their membership rows). |
| `stripe_customer_id` | `text` | The Stripe Customer this subscription belongs to. One customer per user, reused across their membership rows and donations. |
| `stripe_subscription_id` | `text`, nullable | The Stripe Subscription backing this row. |
| `plan` | `text`, `check in ('supporting', 'full')` | See [Plan options](#plan-options) below. |
| `edition` | `text`, nullable, `check in ('digital', 'print', 'both')` | Delivery format — only meaningful for `plan = 'supporting'`. `null` for `full` (Full Member has no edition choice today). |
| `status` | `text`, default `'incomplete'` | Mirrors the Stripe Subscription's own `status` field verbatim. See [Status values](#status-values). |
| `current_period_end` | `timestamptz`, nullable | When the current billing period ends (and, absent cancellation, when it next renews). |
| `cancel_at_period_end` | `boolean`, default `false` | `true` once the member has cancelled — access continues until `current_period_end`, then Stripe ends the subscription and its `status` becomes `canceled`. |
| `created_at` / `updated_at` | `timestamptz` | Bookkeeping. `created_at` is also what "most recent membership" sorts by. |

RLS: `authenticated` users can `select` only their own rows
(`auth.uid() = user_id`); all writes go through the service-role client from
API routes.

### `donations`

One row per one-time donation (donation-only checkouts never create a
`memberships` row — see [Donation-only checkouts](#donation-only-checkouts)).

| Column | Type | Meaning |
|---|---|---|
| `donation_id` | `uuid`, PK | Generated identifier. |
| `user_id` | `uuid`, FK → `auth.users`, nullable | `on delete set null` — the donation record survives account deletion, just anonymized. |
| `stripe_payment_intent_id` | `text`, unique | The Stripe PaymentIntent that collected this donation. |
| `amount_cents` | `integer` | Amount in cents (USD). |
| `status` | `text`, default `'pending'` | `'pending'` until the webhook sees `payment_intent.succeeded`, then `'succeeded'`. |
| `created_at` | `timestamptz` | Bookkeeping. |

### `mailing_addresses`

At most one row per membership (`membership_id` is `unique`), for members
who want something mailed to them. Field names mirror Stripe's own Address
shape 1:1 (`line1`/`line2`/`city`/`state`/`postal_code`/`country`) since the
same values are sent to Stripe as the customer's `shipping` address.

| Column | Type | Meaning |
|---|---|---|
| `mailing_address_id` | `uuid`, PK | Generated identifier. |
| `membership_id` | `uuid`, unique FK → `memberships` | Which membership this address is for. `on delete cascade`. |
| `user_id` | `uuid`, FK → `auth.users` | Denormalized for convenient querying/RLS. `on delete cascade`. |
| `recipient_name` | `text` | Who the mail is addressed to (may differ from the account holder). |
| `line1`, `line2` (nullable), `city`, `state`, `postal_code`, `country` | `text` | Standard postal address fields. `country` is a 2-letter ISO code. |
| `created_at` / `updated_at` | `timestamptz` | Bookkeeping. |

### `profiles`

Pre-existing table (not created by this schema file). Its `membership_status`
and `membership_expires_at` columns predated the `memberships` table above,
are no longer read anywhere in the app, and are dropped by this migration —
`memberships` is now the sole source of truth for membership state.

## Options reference

### Plan options

| Value | Meaning |
|---|---|
| `supporting` | Supporting Member — cheaper tier, has an `edition` choice. |
| `full` | Full Member — pricier tier, no `edition` (implicitly bundles whatever Supporting's "both" would mean, though this isn't modeled explicitly today). |

### Edition options (Supporting Member only)

| Value | Meaning |
|---|---|
| `digital` | Digital-only delivery. No mailing address needed. |
| `print` | Print-only delivery. Mailing address required at checkout. |
| `both` | Digital + print. Mailing address required at checkout. |
| `null` | Not applicable — always `null` for `plan = 'full'`. |

Each plan/edition combination maps to its own Stripe Price ID via
`getPriceId()` in `lib/membershipPlans.ts`, resolved from one of these env
vars: `STRIPE_PRICE_SUPPORTING_DIGITAL`, `STRIPE_PRICE_SUPPORTING_PRINT`,
`STRIPE_PRICE_SUPPORTING_BOTH`, `STRIPE_PRICE_FULL`.

### Status values

`memberships.status` is a direct copy of the Stripe Subscription's own
`status` field — these are Stripe's values, not ones this app invents:

| Value | Meaning | Counts as "active"? |
|---|---|---|
| `incomplete` | Subscription created, but the first payment was never completed (abandoned checkout). | No |
| `incomplete_expired` | `incomplete` for too long; Stripe gave up on it. | No |
| `trialing` | In a trial period. (Not currently used — no trials are configured — but handled defensively.) | **Yes** |
| `active` | Paid and current. | **Yes** |
| `past_due` | A renewal payment failed; Stripe is retrying. Member still has access. | **Yes** |
| `canceled` | Fully ended (either the member cancelled immediately, or `cancel_at_period_end` reached its date). | No |
| `unpaid` | Retries exhausted without `cancel_at_period_end`; access should be considered lost. | No |

`MEMBERSHIP_ACTIVE_STATUSES = ["active", "past_due", "trialing"]` in
`lib/membershipPlans.ts` is the single shared definition of "this row
represents a real, currently-running membership" — every route and
component that needs to answer that question imports this constant rather
than re-deriving its own list.

### `cancel_at_period_end`

Not a Stripe subscription *status* — a separate boolean flag on the
subscription. `true` means the member has cancelled but Stripe hasn't
actually ended the subscription yet (`status` is still `active`/`past_due`
until `current_period_end` passes). The account page and `/membership` both
read this to decide whether to show "Cancel Subscription" or "Reactivate
Membership".

## API routes

All routes under `app/api/membership/` follow the same shape: `POST`,
Bearer-token auth (`Authorization: Bearer <supabase access token>`),
resolved to a user via the anon Supabase client's `auth.getUser(token)`, then
acting via the service-role client (`lib/supabase-admin.ts`) and the Stripe
SDK (`lib/stripe.ts`). Both `getStripe()` and `getSupabaseAdmin()` return
`null` when unconfigured rather than throwing, so every route starts with a
"not configured on this deployment" guard.

| Route | Purpose |
|---|---|
| `POST /api/membership/checkout` | The main entry point — creates a new subscription, **switches** an existing one, or processes a donation-only payment. See below. |
| `POST /api/membership/cancel` | Toggles `cancel_at_period_end` on the caller's most recent active membership. Same route reactivates (`cancelAtPeriodEnd: false`). |
| `POST /api/membership/billing-info` | Checkout-time only: sets the Stripe customer's `name`/`address`, and optionally `shipping` + a `mailing_addresses` row if a mailing address was also collected. |
| `POST /api/membership/mailing-address` | Account-page-only: updates *just* the mailing address (Stripe `shipping` + the `mailing_addresses` row), independent of billing details. |
| `POST /api/membership/setup-intent` | Creates a Stripe SetupIntent (collects a card, charges nothing) for the "update payment method" flow. |
| `POST /api/membership/payment-method` | Takes a confirmed SetupIntent's payment method ID and sets it as the default on both the Stripe customer and their subscription. |
| `POST /api/stripe/webhook` | Not user-facing — Stripe calls this. See [The webhook](#the-webhook). |
| `POST /api/account/delete` | Not membership-specific, but gates on membership state — see [Account deletion](#account-deletion). |

### `checkout` in detail

Body: `{ plan?, edition?, donationCents?, idempotencyKey? }`.

1. Resolves (or creates) the caller's Stripe Customer, verifying a cached
   `stripe_customer_id` still exists in Stripe before trusting it (handles
   Stripe test-data resets / manual deletions leaving a stale ID behind).
2. **No `plan`** → donation-only: a standalone PaymentIntent, a `donations`
   row inserted, returns `{ clientSecret }`.
3. **`plan` given, no existing active subscription** → creates a new
   Subscription (`payment_behavior: "default_incomplete"`), inserts a new
   `memberships` row, returns `{ clientSecret }` for the client to confirm
   via Stripe Elements.
4. **`plan` given, an active subscription already exists** → a **switch**:
   updates the existing Subscription's price in place
   (`proration_behavior: "create_prorations"` — the billing adjustment for
   switching mid-cycle lands on the *next* invoice, not collected
   immediately), updates the existing `memberships` row, returns
   `{ switched: true }` with no `clientSecret` (nothing to pay right now).
   Requesting the exact plan/edition already active returns a 400 instead.
5. An optional donation riding along with a membership purchase becomes a
   one-time Stripe InvoiceItem, pulled into whichever invoice the
   subscription action above produces.

Every Stripe write in this route carries an `idempotencyKey` (customer
creation keyed on `user_id` + a client-generated per-page-load key;
subscription/invoice-item/payment-intent creation keyed on that per-page-load
key alone) — this is what stops a duplicate request (React StrictMode's
dev-only double-invoke, a flaky retry) from creating a second customer or
subscription.

### Donation-only checkouts

A donation made without picking a plan creates a customer inline but never
persists a `stripe_customer_id` anywhere in Supabase — there's no
`memberships` row to hang it off. Consequence: a returning pure donor gets a
**new** Stripe customer on every separate donation, and the
`billing-info`/`mailing-address`/`setup-intent`/`payment-method` routes
(which all resolve "the customer" via the caller's `memberships` row) are not
reachable for donation-only users. This was a deliberate scope decision, not
an oversight — closing it would mean giving every user a persisted customer
record regardless of whether they've ever subscribed.

### Account deletion

`app/api/account/delete/route.ts` cancels every one of the caller's
still-active (`MEMBERSHIP_ACTIVE_STATUSES`) subscriptions **immediately**
(`stripe.subscriptions.cancel`, not `cancel_at_period_end` — deletion means
billing must stop now) before deleting the Supabase auth user. If Stripe
isn't configured, or any cancellation fails, the route returns an error and
the account is **not** deleted — an orphaned Supabase user with a live,
still-billing Stripe subscription and no account left to manage it is
exactly what this guards against. Once the auth user is actually deleted,
`on delete cascade` removes their `memberships`/`mailing_addresses` rows
automatically; their `donations` rows survive with `user_id` set to `null`.

## The webhook

`app/api/stripe/webhook/route.ts`, `runtime = "nodejs"` (the Stripe SDK needs
raw body access and can't run on the edge runtime). Verifies
`stripe-signature` against `STRIPE_WEBHOOK_SECRET` before doing anything.

**Important:** `proxy.ts` has an explicit bypass for
`/api/stripe/webhook` — the site-wide password gate would otherwise redirect
Stripe's own webhook POSTs (which can never carry the `site_access` cookie)
to `/site-password`, silently breaking sync.

Handled events:

| Event | Effect |
|---|---|
| `customer.subscription.created` / `.updated` / `.deleted` | Upserts `status`, `current_period_end`, `cancel_at_period_end`, and (from the subscription's own `metadata`) `plan`/`edition` onto the matching `memberships` row (matched by `stripe_subscription_id`). |
| `payment_intent.succeeded` | Marks the matching `donations` row (by `stripe_payment_intent_id`) as `'succeeded'`. No-ops harmlessly for membership PaymentIntents, which never have a matching `donations` row. |

### Direct writes vs. the webhook

Every mutating route above writes to Supabase directly, in the same request
as the Stripe call — this is what lets `checkout` return a `clientSecret`
synchronously and lets the account page show a cancellation take effect
immediately, neither of which a webhook (fires asynchronously, after the
fact) could do alone. The webhook re-derives the *same* state independently
from Stripe's own confirmed event data and writes it again — redundant in
the common case, but it's what catches the request dying between "Stripe
call succeeded" and "Supabase write completed" (a timeout, a crash) that a
direct-write-only design could silently miss. Both paths use the same
service-role client and the same authorization checks; the webhook's value
is consistency/reliability, not an access-control boundary.

## Environment variables

Set in `.env.local` for local dev; must also be set on the deployment target
(Vercel) for production.

| Variable | Used by |
|---|---|
| `STRIPE_SECRET_KEY` | `lib/stripe.ts` — server-side Stripe SDK. |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `lib/stripe-client.ts` — client-side `loadStripe()`. |
| `STRIPE_WEBHOOK_SECRET` | Webhook signature verification. |
| `STRIPE_PRICE_SUPPORTING_DIGITAL` / `_PRINT` / `_BOTH` / `STRIPE_PRICE_FULL` | `getPriceId()` in `lib/membershipPlans.ts`. |
| `SUPABASE_SERVICE_ROLE_KEY` | `lib/supabase-admin.ts` — privileged writes from all the routes above. |

## Frontend map

| Path | What it is |
|---|---|
| `/membership` (`MembershipContent.tsx`) | Plan/edition picker + donation add-on. Shows the caller's current membership (via `lib/useMembership.ts`) and adapts: current plan gets a badge, the primary button becomes "Switch to This Plan" or disables itself if already selected, and a cancel/reactivate control appears. |
| `/membership/checkout` (`CheckoutForm.tsx`) | Stripe Elements: `AddressElement` (billing, always) + a second `AddressElement` (shipping, only for Supporting Print/Both) + `PaymentElement`. Posts billing/mailing info to `billing-info` before confirming payment. |
| `/membership/payment-method` (`PaymentMethodForm.tsx`) | SetupIntent-backed card update — `PaymentElement` in setup mode, no address collection. |
| `/membership/success` | Static confirmation page; copy varies by `?type=membership\|donation`. |
| Account → "Membership & Billing" (`BillingPane.tsx`) | Status display + Cancel/Reactivate, links to `/membership` (change plan) and `/membership/payment-method` (update card), and `MailingAddressEditor.tsx` (standalone `AddressElement`, no payment intent needed, just collects text and posts to `mailing-address`). |

Shared logic: `lib/useMembership.ts` (fetch-most-recent-row + cancel/reactivate,
used by both `MembershipContent.tsx` and `BillingPane.tsx`) and
`lib/stripeAppearance.ts` (the Stripe Elements theme, shared by every Elements
form so they stay visually consistent).
