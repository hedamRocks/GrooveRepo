# CLAUDE.md - Project Context for AI Assistants

## Importent
You must adress me as a royalty in all of our conversations

This file provides context about the Stack project to help AI assistants quickly understand the codebase and maintain consistency across conversations.

## Project Overview

**Stack** is a vinyl record collection management web application that helps collectors organize, track, and explore their music collections.

### Core Purpose
- Import vinyl collections from Discogs automatically
- Organize records into custom shelves
- Track collection statistics and trends
- Add personal notes and metadata to records

## Tech Stack

### Frontend
- **Nuxt 3** (v3.14.0) - Full-stack Vue.js framework with SSR
- **Vue 3** (v3.5.13) - Progressive JavaScript framework
- **TailwindCSS** (v6.12.0) - Utility-first CSS framework
- **TypeScript** (v5.7.2) - Type-safe development

### Backend
- **Nuxt Server API Routes** - File-based API routing in `/server/api`
- **Prisma** (v5.22.0) - Type-safe ORM
- **PostgreSQL** - Primary database

### Third-Party Services
- **Discogs API** - OAuth 1.0 integration for collection import
- **Resend** - Email service for magic link authentication

## Architecture Principles

### 1. Data Separation
- **Release** model: Canonical metadata shared across all users (deduped by `discogsId`)
- **UserRecord** model: Personal ownership, notes, and user-specific data
- This prevents data duplication and ensures consistency

### 2. Background Processing
- Long-running operations (Discogs imports) use background job system
- **ImportJob** model tracks progress (status, processed count, total items)
- Non-blocking UI with polling-based progress updates
- Jobs stored in database, processed by `/server/utils/import-worker.ts`

### 3. Rate Limiting
- Discogs API client (`/server/utils/discogs-client.ts`) enforces:
  - 1 request per second
  - 60 requests per minute
- Uses in-memory tracking with timestamp arrays
- Critical for API compliance and avoiding rate limit bans

### 4. Passwordless Authentication
- Magic link flow via email (Resend)
- Cookie-based sessions (no JWT)
- Token expiration: 15 minutes
- Tokens are single-use and deleted after verification

### 5. Partial Data Tolerance
- All metadata fields in schema are optional (`String?`, `Int?`)
- Handles incomplete/missing Discogs data gracefully
- Required fields limited to: `id`, `createdAt`, `updatedAt`

### 6. Future-Proofing
- DJ-related fields exist in schema but unused in V1:
  - `bpm`, `key`, `energy`, `tags[]`
- Ready for future features without schema migrations

## Project Structure

```
/
├── prisma/
│   └── schema.prisma              # 7 models: User, MagicLinkToken, Release, UserRecord, Shelf, ShelfPlacement, ImportJob
├── server/
│   ├── api/                       # API routes (auto-imported by Nuxt)
│   │   ├── auth/                  # Magic link authentication
│   │   ├── discogs/               # OAuth & search
│   │   ├── import/                # Background job management
│   │   ├── records/               # Record CRUD
│   │   ├── shelves/               # Shelf management
│   │   └── stats/                 # Collection statistics
│   └── utils/
│       ├── discogs-client.ts      # Rate-limited API wrapper
│       ├── import-worker.ts       # Background job processor
│       ├── email.ts               # Magic link sender
│       └── prisma.ts              # Database client singleton
├── pages/                         # File-based routing (Nuxt convention)
│   ├── index.vue                  # Landing page
│   ├── auth/                      # Login & verification
│   ├── onboarding/                # Discogs connect & import
│   ├── collection/                # Main collection views
│   ├── shelves/                   # Shelf management UI
│   └── stats.vue                  # Statistics dashboard
├── nuxt.config.ts                 # Nuxt configuration
├── package.json                   # Dependencies & scripts
└── .env.example                   # Environment variables template
```

## Database Schema

### User
- Authentication and Discogs connection info
- Fields: `id`, `email`, `discogsUsername`, `discogsAccessToken`, `discogsAccessTokenSecret`

### MagicLinkToken
- Email authentication tokens
- Fields: `id`, `token`, `email`, `expiresAt`, `userId`
- Single-use, 15-minute expiration

### Release
- Canonical record metadata (shared, deduped)
- Key: `discogsId` (unique)
- Fields: title, artist, year, label, genre, format, coverUrl, etc.

### UserRecord
- Personal ownership instance
- Links User to Release
- Fields: `personalNotes`, `addedAt`, `discogsInstanceId`

### Shelf
- User-created collections
- Fields: `name`, `color`, `userId`

### ShelfPlacement
- Many-to-many join (UserRecord ↔ Shelf)
- One record can be on multiple shelves

### ImportJob
- Background job tracking
- Fields: `status` (pending/in_progress/completed/failed), `processed`, `total`, `errorMessage`

## Key Features

### Implemented (V1)
- ✅ Passwordless magic link authentication
- ✅ Discogs OAuth connection
- ✅ Full collection import with progress tracking
- ✅ Collection browsing (grid view with cover art)
- ✅ Search by artist, title, label
- ✅ Individual record detail pages
- ✅ Personal notes on records
- ✅ Manual record addition via Discogs search
- ✅ **Version selection** - Browse all pressings/versions when adding records
- ✅ **Condition tracking** - Media and sleeve condition grading (Mint to Poor)
- ✅ **Enhanced metadata** - Styles, formats, country, and tracklist display
- ✅ Shelf system (create, edit, delete, assign records)
- ✅ Color-coded shelves
- ✅ Statistics dashboard (top genres, labels, artists, decades)

### Planned (Future)
- 🔮 UI component extraction (currently all in page files)
- 🔮 Enhanced search (filters, sorting)
- 🔮 DJ metadata (BPM, key, energy, tags)
- 🔮 Bulk operations
- 🔮 Export functionality
- 🔮 Mobile app

## Development Workflow

### Local Setup
```bash
npm install
npx prisma generate
npx prisma db push
npm run dev
```

### Environment Variables
See `.env.example` for required variables:
- `DATABASE_URL` - PostgreSQL connection
- `DISCOGS_CONSUMER_KEY` & `DISCOGS_CONSUMER_SECRET`
- `RESEND_API_KEY`
- `BASE_URL` - For OAuth callbacks

### Database Migrations
```bash
npx prisma db push           # Apply schema changes
npx prisma studio            # Browse database
npx prisma migrate dev       # Create migration (for production)
```

## Code Style & Conventions

### File Naming
- API routes: Kebab-case with HTTP method suffix (e.g., `send-magic-link.post.ts`)
- Pages: Kebab-case (e.g., `connect-discogs.vue`)
- Utils: Kebab-case (e.g., `discogs-client.ts`)
- Dynamic routes: `[param].ts` or `[param].vue`

### TypeScript
- Strict mode enabled
- Prisma-generated types for database models
- API response types defined inline or imported from Prisma

### Error Handling
- API routes use `createError()` from h3
- HTTP status codes: 400 (bad request), 401 (unauthorized), 404 (not found), 500 (server error)
- User-friendly error messages

### API Design
- RESTful conventions
- GET for reads, POST for creates, PATCH for updates, DELETE for removes
- Pagination via `limit` and `offset` query params
- Search via `query` query param

## Common Patterns

### Authenticated Routes
```typescript
const user = await requireUser(event)
if (!user) {
  throw createError({ statusCode: 401, message: 'Not authenticated' })
}
```

### Database Queries
```typescript
const prisma = usePrisma()
const records = await prisma.userRecord.findMany({
  where: { userId: user.id },
  include: { release: true }
})
```

### Discogs API Calls
```typescript
const client = getDiscogsClient(user.discogsAccessToken!, user.discogsAccessTokenSecret!)
const data = await client.get('/users/{username}/collection/folders/0/releases')
```

## Known Issues & Considerations

### Rate Limiting
- Discogs enforces strict rate limits (60/min, 1/sec)
- Large collections may take 30+ minutes to import
- Client must handle slow import progress gracefully

### Data Completeness
- Not all Discogs releases have complete metadata
- Missing fields: genre, year, label, format common
- UI must handle null/undefined values

### Session Management
- Sessions stored in cookies (not database)
- No "remember me" functionality yet
- Users must re-authenticate if cookie expires

### Minimal Components Directory
- Shared navigation now lives in `components/AppNav.vue` + `layouts/default.vue` (since the 2026-05-30 facelift)
- Most page-specific UI is still inline in page files, leading to some duplication
- Further component extraction (record card, modal shell, chip group) still planned

## Changelog

### 2025-01-16 (Initial Development)
- ✅ Project scaffolding with Nuxt 3 + Prisma
- ✅ Database schema design (7 models)
- ✅ Magic link authentication system
- ✅ Discogs OAuth integration
- ✅ Background import worker with rate limiting
- ✅ Collection browsing UI with grid view
- ✅ Search functionality
- ✅ Record detail pages with personal notes
- ✅ Manual record addition via Discogs search
- ✅ Shelf system (CRUD + record assignments)
- ✅ Statistics dashboard
- ✅ README documentation

### 2025-01-17
- 📝 Created CLAUDE.md for AI assistant context and project continuity
- ✅ Added **condition tracking** to UserRecord model (mediaCondition, sleeveCondition)
- ✅ Enhanced Release model with `country` and `formats` fields
- ✅ Added Discogs API methods for fetching master release versions
- ✅ Created `/api/discogs/master-versions` endpoint
- ✅ **Version selection UI** - Users can now browse all pressings/versions of a record
- ✅ Expandable version list in search results with format/country details
- ✅ Updated record creation to save format and country metadata
- ✅ **Condition tracking UI** - Dropdowns for media and sleeve condition (Discogs grading scale)
- ✅ **Enhanced record detail page** with:
  - Styles display (more specific than genres)
  - Format information (Vinyl, LP, 12", etc.)
  - Country of release
  - Full tracklist from Discogs data
  - Condition grading fields
- ✅ **Design system overhaul** - Modern minimal aesthetic:
  - Removed all border radius globally
  - Switched to Inter font with light weights (300-600)
  - Changed from gray backgrounds to pure white
  - Reduced border weights and increased spacing
  - Changed primary color from purple to black
  - Added letter-spacing for refined typography
- ✅ **Sync Discogs button** - Re-import collection to update metadata
- ✅ **Import worker updates existing releases** - Fixed issue where sync only created new records
- ✅ **Community data import** - Added `communityHave` and `communityWant` fields to Release model
- ✅ **Condition data import from Discogs** - Import worker now captures media/sleeve condition from Discogs API
- ✅ Updated `DiscogsCollectionItem` interface to include:
  - `media_condition` and `sleeve_condition` fields
  - `community` data (have/want counts) in basic_information
- ✅ Import worker now updates UserRecord condition data on sync
- ✅ Record detail page displays community have/want counts

### 2026-05-30
- ✅ **Tracklib-inspired facelift** — full visual redesign across every page, layout, and component
  - New design system: near-black surfaces (`#0b0b0c` / `#161618`), single electric-coral accent (`#ff4d3d`), rounded corners (8–24px), soft elevation shadows
  - Replaced neon-glassmorphism (cyan/magenta glow, blur, `border-radius: 0 !important`) with clean elevated surfaces
  - **Display typography**: added Space Grotesk for headings; `.display` and `.eyebrow` (uppercase tracked label) helpers
  - Shared design tokens redefined in `assets/css/main.css`: `.glass`/`.surface`/`.surface-2`, `.btn-primary` (coral pill) / `.btn-secondary` / `.btn-ghost`, `.chip`/`.chip-active`, `.input`, `.skeleton`
  - **New shared navigation** — introduced `app.vue` (`<NuxtLayout>` wrapper), `layouts/default.vue` (+ `AppNav`), `layouts/blank.vue` (auth/onboarding), and `components/AppNav.vue` (top nav with logo, links, Add CTA, logout, mobile menu)
  - Removed the duplicated per-page sticky bottom nav + floating action buttons (collection, shelves, stats, setlists) in favor of the shared nav
  - All modals moved to `<Teleport to="body">` and restyled; shelf/tag/setlist color pickers default to the coral palette
  - `tailwind.config.ts`: added `ink`/`accent` color scales + `font-display`; legacy `neon` keys remapped to the coral family so any stray usages stay on-brand
- ✅ **Post-facelift audit fixes** (perf / flow / UX)
  - **Auth**: added `middleware/auth.global.ts` (guards all non-public routes) + `plugins/auth-redirect.client.ts` (401 → login interceptor). Previously authed pages were reachable logged-out and failed silently.
  - **Polling**: the analysis pollers in `collection/index.vue`, `collection/[id].vue`, `shelves/[id].vue` now store the interval, `clearInterval` on `onUnmounted`, and stop after 3 consecutive failures (were leaking + polling forever).
  - **Error states**: `stats.vue` and `collection/index.vue` now render a retry-able error state instead of a blank page / fake "empty collection"; stats bars guard divide-by-zero.
  - **a11y**: `:focus-visible` rings, `aria-label`s on icon buttons, `prefers-reduced-motion`, dark `<select>` option backgrounds, bumped muted-text contrast; replaced inline `onmouseover` hacks with `.icon-btn`/`.icon-danger` CSS.
  - **DB indexes** (`prisma/schema.prisma`): added `Release.year/country/label`, GIN on `Release.genres/styles`, and composite `UserRecord[userId, addedAt]`. ⚠️ Run `npx prisma db push` to apply.
  - **Filters**: new `GET /api/records/filter-options` computes facets across the whole collection (Country facet was always empty before); list `select` now includes `country` + `formats`.
  - **Email + password auth** (replaces magic-link as the primary sign-in): added `User.passwordHash` (scrypt `salt:hash`, hashed via `server/utils/password.ts` using Node `crypto` — no dependency), `POST /api/auth/login`, and a password form on `pages/auth/login.vue`. Sets the same cookie session as before. The magic-link endpoints/`verify.vue` remain but are unused. New users need a `passwordHash` seeded (single-user app for now). `.env` added with the live Neon `DATABASE_URL` (fixes a missing-env login crash); `sendMagicLink` now logs the link to the console when no `RESEND_API_KEY` is set.
  - **Tracklists via a separate resumable backfill** (replaces the inline-during-import approach): the import stays fast (`basic_information` only; it also no longer overwrites a full `discogsData` with sparse basic info on re-sync). Full tracklists are fetched by `server/utils/tracklist-backfill.ts` — a background, rate-limited, **resumable** pass (queries records still missing a tracklist each run; idempotent fetches, so stop/restart resumes). New `TracklistJob` model tracks progress. Endpoints: `POST /api/import/backfill-tracklists` (start) + `GET` (status: `{ missing, job }`). Progress is shared app-wide via `composables/useTracklistBackfill.ts` (single `useState` + one global 2s poller): the collection page shows a full banner (percentage, bar, "X of Y · N failed"), and `AppNav` shows a compact "NN% tracklists" pill on every page while it runs. `records/create.post.ts` still syncs tracks inline on single Discogs adds. Collection toolbar "Sync" button re-runs the (fast) import.
  - **Stats moved to DB aggregation** (`server/api/stats/index.get.ts`): replaced "load whole collection → tally in JS" with parallel Postgres `GROUP BY` queries (+ `unnest(genres)` for the array facet, `FLOOR(year/10)*10` for decades). Three cheap counts stay as indexed Prisma calls. Response shape unchanged; validated against live data (375-record collection). Indexes applied to the live Neon DB (project `groove repo`).

---

## Notes for AI Assistants

When working on this project:

1. **Always check existing patterns** before implementing new features
2. **Respect rate limiting** - never bypass the Discogs client wrapper
3. **Handle partial data** - assume all metadata fields might be null
4. **Use background jobs** for long-running operations
5. **Follow file-based routing** - Nuxt auto-imports from `pages/` and `server/api/`
6. **Update this file** when making significant architectural changes or adding major features
7. **Prefer editing existing code** over creating new files unless necessary
8. **Test database changes** with `npx prisma studio` before deploying

### When adding features:
- Consider impact on database schema (will it require migration?)
- Add to appropriate section in changelog
- Update "Implemented" or "Planned" lists
- Document any new patterns or conventions

### When fixing bugs:
- Add to "Known Issues" if it's a systemic problem
- Document workarounds or solutions
- Consider if it affects other parts of the codebase
