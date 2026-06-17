# Ravna Gora — Pokret Ravne Gore

Website for the Pokret Ravne Gore organization. Built with Next.js App Router, Sanity CMS, Supabase, and Cloudflare R2.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.2.6 (App Router), React 19 |
| Styling | Tailwind CSS v4 (CSS-native config, no `tailwind.config.*`) |
| Language | TypeScript |
| CMS | Sanity v5 (embedded Studio at `/studio`) |
| Database | Supabase (newspaper issue metadata) |
| File storage | Cloudflare R2 via a Cloudflare Worker (PDF files) |
| i18n | next-intl (English, Serbian Cyrillic, Serbian Latin) |
| PDF rendering | pdfjs-dist |
| Deployment | Vercel |

---

## Prerequisites

- Node.js 20+
- A Sanity project (project ID + dataset)
- A Supabase project
- A Cloudflare Worker that proxies R2-stored PDFs

---

## Environment Variables

Create a `.env.local` file in the project root:

```env
# Sanity
NEXT_PUBLIC_SANITY_PROJECT_ID=your_project_id
NEXT_PUBLIC_SANITY_DATASET=production

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Cloudflare Worker (serves PDFs from R2)
NEXT_PUBLIC_WORKER_URL=https://your-worker.workers.dev
```

---

## Getting Started

```bash
npm install
npm run dev       # http://localhost:3000
npm run build     # production build
npm run lint      # ESLint v9
```

---

## Project Structure

```
app/
  [locale]/          # All user-facing routes, scoped by locale
    page.tsx         # Home
    about/           # About page
    events/          # Events listing + detail
    history/         # History article detail
    newspaper/       # In-browser PDF viewer (standalone, no nav)
    newspaper-catalog/  # Archive browser (decade filter + issue grid)
    membership/      # Membership info
    login/           # Auth
    admin/           # Admin UI for managing newspaper issues
  api/
    newspaper/[slug]/  # Redirects to Sanity/R2 PDF URL
  components/
    layout/          # Navbar, Footer
    ui/              # Reusable UI primitives
    content/         # ContentBlocks, block renderers
  globals.css        # All design tokens (@theme, @utility, breakpoints)
  layout.tsx         # Root layout

i18n/
  routing.ts         # Locale config (en, sr-cyrl, sr-latn)
  request.ts         # next-intl server config

messages/
  en.json            # English strings
  sr-cyrl.json       # Serbian Cyrillic strings
  sr-latn.json       # Serbian Latin strings

sanity/
  schemaTypes/       # CMS schema definitions
  lib/client.ts      # Sanity client (CDN-cached)

lib/
  supabase.ts        # Supabase client
  supabase-admin.ts  # Supabase admin client (server-side)
  types.ts           # Shared TypeScript types

scripts/
  to-avif.mjs        # Converts images to AVIF at multiple widths
  pdf-organise.mjs   # Utility for organizing PDF files
```

---

## Pages

| Route | Description |
|---|---|
| `/` | Landing page — hero, latest newspaper card, about section, history grid, chapters, membership CTA |
| `/about` | About the organization |
| `/events` | Grid of upcoming/past events (fetched from Sanity) |
| `/events/[slug]` | Event detail with rich content blocks |
| `/history/[slug]` | History article detail |
| `/newspaper-catalog` | Archive browser — decade filter + issues grid (data from Supabase) |
| `/newspaper/[slug]` | Full-screen PDF viewer — no Navbar/Footer, client component |
| `/membership` | Membership information |
| `/studio/[[...tool]]` | Embedded Sanity Studio |
| `/api/newspaper/[slug]` | API route — resolves slug → PDF URL (Sanity → R2 → dev fallback) |

Every page except `/newspaper/[slug]` and `/studio` wraps content in `<Navbar /> … <Footer />`.

---

## Content Management

Open the embedded Sanity Studio at `http://localhost:3000/studio` (or the production URL) to manage content.

### Schema types

| Type | Purpose |
|---|---|
| `homePage` | Singleton — drives the landing page (title, subtitle, chapters, latest issue pointer) |
| `currentNewspaper` | Singleton — holds the current issue PDF asset |
| `newspaperIssue` | Archive entry — issue number, date, slug, PDF asset, cover image |
| `event` | Event listing — title, slug, subtitle, cover image URL, card preview, rich content |
| `historyPage` | History article — title, slug, subtitle, cover image URL, rich content |

### Content blocks

`event` and `historyPage` documents share a `content` array rendered by `ContentBlocks`. Supported block types:

| `_type` | Component |
|---|---|
| `sectionTitle` | `SectionHeading` |
| `paragraph` | `ParagraphView` |
| `quote` | `QuoteView` |
| `pictureBig` | `PictureBigView` |
| `pictureTwoPictures` | `TwoPicturesView` |

To add a new block type: add it to the schema, the union type in `ContentBlocks.tsx`, the `renderBlock` switch, and a new component in `app/components/ui/`.

Pages that read from Sanity use `export const revalidate = 60` (ISR, 60-second TTL).

---

## Newspaper Archive

The archive has two layers:

1. **Metadata** — stored in Supabase (`issues` table, typed in `lib/types.ts`). Each row has `issue_number`, `issue_date`, `slug`, `cover_image_url`, `pdf_object_key`, etc.
2. **PDF files** — stored in Cloudflare R2, served via a Cloudflare Worker at `NEXT_PUBLIC_WORKER_URL`.

The `/api/newspaper/[slug]` route resolves a slug to a PDF in this order:
1. `newspaperIssue` asset in Sanity
2. `currentNewspaper` singleton in Sanity
3. Local dev fallback (hardcoded path — will be removed once CMS is populated)

---

## Internationalization

Three locales are supported: English (`en`), Serbian Cyrillic (`sr-cyrl`), Serbian Latin (`sr-latn`).

The default locale is `en`. All routes are prefixed with the locale (e.g. `/en/events`, `/sr-cyrl/events`). The next-intl middleware handles locale detection and routing (see `proxy.ts`).

Translation strings live in `messages/*.json`. The Navbar language toggle cycles through locales via a cookie (`lang`).

---

## Design System

All design tokens are **CSS custom properties** in `app/globals.css` — no `tailwind.config.*` file.

**Typography** — use `@utility` composite classes, not raw Tailwind text utilities:

| Class | Role |
|---|---|
| `type-display` | Page titles (Cormorant Garamond 600) |
| `type-h1` – `type-h4` | Headings |
| `type-large` | Prominent labels/dates (Inter 400) |
| `type-body` | Body copy |
| `type-ui-medium` | UI elements (Inter 500) |
| `type-caption`, `type-label`, `type-micro` | Small text |

**Spacing** — use `var(--space-N)` CSS variables (e.g. `gap-[var(--space-4)]`).

**Colors**: `offwhite-1` (#faf4eb), `blue-2` (#153c8c), `blue-1` (#000a1e), `gray-1/2/3`.

**Breakpoints**: phone (default) → `md` (768px) → `xl` (1280px). Use `md:` and `xl:` variants; `lg:` is unused.

---

## Utility Scripts

```bash
npm run to-avif       # Convert images to AVIF at responsive widths
npm run pdf-organise  # Organise and rename PDF files for upload
```

---

## Deployment

The project is deployed to Vercel. Push to `main` triggers a production deployment. Environment variables must be set in the Vercel project settings (matching the `.env.local` keys above).
