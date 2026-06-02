# DJ-analysis worker

The BPM / key / energy analysis can't run on Vercel — it shells out to `yt-dlp`
and `ffmpeg` and runs for minutes per job, neither of which serverless allows.
So it's split out:

```
App (Vercel)  →  POST /api/analysis/start writes a PENDING AnalysisJob to Neon
This worker    →  polls Neon, claims one job at a time, runs the pipeline,
                  writes BPM/key/energy back to the same DB → shows up live
```

The web app only **enqueues**. This worker does the work. It can run anywhere
that allows binaries + long-running processes — **your Mac** (free, when it's
on) or a **host** (24/7, see [`../docs/worker-deployment.md`](../docs/worker-deployment.md)).

## What it needs

- `DATABASE_URL` — the same Neon string the app uses (already in your `.env`).
- `YOUTUBE_API_KEY` — a YouTube Data API v3 key (the worker, not the app, needs this now).
- `ffmpeg` + `yt-dlp` — bundled in the Docker image; for the non-Docker path, install them yourself.
- Optional `YOUTUBE_COOKIES_PATH` — a `cookies.txt` for age-gated / bot-checked videos.

## Run it with Docker (recommended)

Reads `DATABASE_URL` + `YOUTUBE_API_KEY` from your `.env`.

```bash
docker compose up -d --build   # build image (ffmpeg + yt-dlp) and start
docker compose logs -f         # watch it claim and process jobs
docker compose down            # stop
```

To enable cookies, export `youtube-cookies.txt` from your browser into the repo
root and uncomment the `volumes` + `environment` blocks in `docker-compose.yml`.

## Run it without Docker (local dev)

```bash
brew install ffmpeg yt-dlp     # the binaries it shells out to
npm run worker                 # tsx worker/index.ts — loads .env automatically
```

## How to trigger analysis

With the worker running, click **Analyze all tracks** on a record or setlist
(in local dev *or* the live site). The button just creates a pending job; the
worker picks it up within a few seconds and the progress bar fills in.

## Behaviour & limits

- Processes **one job at a time**, one track every ~15s (rate-limited).
- On start it **requeues any job left `in_progress`** by a previous crash/restart.
- **YouTube API quota:** a search costs 100 of the default 10,000 units/day —
  so roughly **100 tracks/day**. Beyond that, resolves fail until the quota
  resets (midnight Pacific). The log says so explicitly when it happens.
- Safe to run more than one worker (jobs are claimed with `FOR UPDATE SKIP LOCKED`).
- **Keep yt-dlp fresh** — YouTube breaks old versions periodically (`yt-dlp -U`,
  or rebuild the Docker image to pull the latest).
