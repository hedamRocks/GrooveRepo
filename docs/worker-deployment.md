# Deploying the analysis worker (24/7)

The [`worker`](../worker/README.md) runs fine on your Mac, but only while it's
on. To analyze from the live site at any time, run the **same Docker image** on
an always-on host. This is a reference for doing that later — pick one.

All of them run the repo's `Dockerfile` (already includes `ffmpeg` + `yt-dlp`)
and need the same three env vars:

| Variable | Value |
|---|---|
| `DATABASE_URL` | your Neon connection string (same as the app) |
| `YOUTUBE_API_KEY` | YouTube Data API v3 key |
| `YOUTUBE_COOKIES_PATH` | *(optional)* path to a `cookies.txt` inside the container |

The worker has **no inbound HTTP** — it only makes outbound calls (Neon,
YouTube). So no port, no health check, no public URL. It just needs to stay
running and not scale to zero.

---

## Option A — Railway (easiest)

1. **railway.app** → New Project → *Deploy from GitHub repo* → pick this repo.
2. Railway detects the `Dockerfile` and builds it. (It's a worker with no port —
   that's fine; ignore any "no exposed port" notice.)
3. **Variables** tab → add `DATABASE_URL`, `YOUTUBE_API_KEY` (+ optional cookies).
4. Deploy. Watch **Deploy Logs** for `[Worker] Analysis worker started`.

Cost: usage-based, ~$5/mo for a small always-on container. Redeploy to pull a
fresh `yt-dlp`.

---

## Option B — Fly.io

1. `fly launch --no-deploy` (no Postgres, no public services). It writes a `fly.toml`.
2. Edit `fly.toml` so it stays on and exposes nothing:
   ```toml
   app = "groove-worker"
   [build]
     dockerfile = "Dockerfile"
   [[vm]]
     size = "shared-cpu-1x"
     memory = "512mb"
   # No [http_service] / [[services]] — this is a worker, not a web app.
   ```
   In the Machines settings keep `auto_stop_machines = false` / `min_machines_running = 1`
   so it doesn't suspend.
3. `fly secrets set DATABASE_URL="postgresql://…" YOUTUBE_API_KEY="…"`
4. `fly deploy` → `fly logs` to watch it.

Cost: ~$2–5/mo for a 512 MB shared-cpu machine. `fly deploy` again to refresh yt-dlp.

---

## Option C — Hetzner / any VPS (cheapest always-on)

A €4/mo box (Hetzner CAX11, Ubuntu 24.04) running the image via Docker:

```bash
# one-time
apt update && apt install -y docker.io docker-compose-plugin git
git clone <your repo> /opt/groove && cd /opt/groove
printf 'DATABASE_URL=postgresql://…\nYOUTUBE_API_KEY=…\n' > .env

# run it (restart: unless-stopped keeps it alive across reboots/crashes)
docker compose up -d --build
docker compose logs -f
```

Harden the box: non-root user, SSH key-only, firewall allowing **only port 22**
(the worker needs no inbound ports). To update yt-dlp: `docker compose build --no-cache && docker compose up -d`.

---

## Cookies (optional, any host)

yt-dlp increasingly needs a browser `cookies.txt` for age-gated / bot-checked
videos. Export it from your browser, then:

- **VPS:** drop the file next to the repo and uncomment the cookies `volumes` +
  `environment` lines in `docker-compose.yml`.
- **Railway/Fly:** store the file's contents as a secret and write it to disk at
  startup (e.g. base64 the file into a secret, decode it in a small entrypoint,
  set `YOUTUBE_COOKIES_PATH` to where you wrote it).

## Notes

- **One worker is plenty** for a single user. Multiple are safe too — jobs are
  claimed with `FOR UPDATE SKIP LOCKED`.
- **YouTube quota** (~100 tracks/day) applies wherever it runs.
- **yt-dlp upkeep** is the only recurring chore — redeploy/rebuild every few
  weeks so it stays ahead of YouTube changes.
