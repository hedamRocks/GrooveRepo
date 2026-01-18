# Vinyl Collection App

A collector-first vinyl record collection web app with Discogs integration.

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

You'll need:
- PostgreSQL database URL
- Discogs API credentials (get from https://www.discogs.com/settings/developers)
- Resend API key for magic link emails (or swap for another email provider)
- Random session secret

### 3. Set up database

```bash
# Push schema to database (for development)
npm run db:push

# Or create a migration (for production)
npm run db:migrate
```

### 4. Run development server

```bash
npm run dev
```

Visit http://localhost:3000

## Architecture

### Database Schema

- **User** - Auth and Discogs connection
- **Release** - Canonical record metadata (shared across users)
- **UserRecord** - Personal ownership + notes
- **Shelf** - Simple grouping/organization
- **ImportJob** - Background job tracking

### Discogs Import Flow

1. User connects Discogs via OAuth
2. Import job created and queued
3. Background worker fetches collection (rate-limited, 1 req/sec)
4. Creates Release records (deduped by discogsId)
5. Creates UserRecord linking user to releases
6. UI polls job status for progress updates

### Key Design Decisions

- **Partial data tolerance** - All metadata fields are optional
- **Shared canonical data** - Multiple users can reference same Release
- **Rate limiting** - Safe 60 req/min Discogs API compliance
- **Background jobs** - Non-blocking imports with progress tracking
- **Future-proof schema** - DJ fields exist but unused in V1

## Project Structure

```
prisma/
  schema.prisma          # Database schema

server/
  api/
    auth/                # Magic link authentication
    discogs/             # OAuth + search
    import/              # Job management
  utils/
    discogs-client.ts    # Rate-limited API wrapper
    import-worker.ts     # Background import processor
    prisma.ts            # Database client
    email.ts             # Magic link emails

pages/                   # Nuxt pages (to be built)
components/              # Vue components (to be built)
```

## Next Steps

1. Build UI pages (auth, onboarding, collection grid)
2. Implement collection browsing + search
3. Add record detail page with notes
4. Build manual add flow
5. Create shelves management
6. Add stats page

## Scripts

```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build
npm run db:push      # Push schema to DB (dev)
npm run db:migrate   # Create migration (prod)
npm run db:studio    # Open Prisma Studio
```
