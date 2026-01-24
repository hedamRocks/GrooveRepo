# Deployment Guide: Stack App

This guide will help you deploy your vinyl collection app to Vercel with a Neon PostgreSQL database.

## Prerequisites

- GitHub account
- Vercel account (sign up at https://vercel.com)
- Neon account (sign up at https://neon.tech)

## Step 1: Set up Neon Database

1. Go to https://console.neon.tech
2. Click "Create a project"
3. Name it "stack" or "vinyl-collection"
4. Copy the connection string (it looks like: `postgresql://user:password@host/database?sslmode=require`)
5. Keep this tab open - you'll need this connection string

## Step 2: Prepare your code for deployment

Your code is already configured for deployment! But you need to:

1. Make sure all your environment variables are in `.env`
2. Push your code to GitHub (if you haven't already)

## Step 3: Deploy to Vercel

### Option A: Using Vercel CLI (Recommended - Fastest)

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy (run from your project root)
vercel

# Follow the prompts:
# - Link to existing project? No
# - What's your project's name? stack
# - In which directory is your code located? ./
# - Want to override the settings? No
```

### Option B: Using Vercel Dashboard

1. Go to https://vercel.com/new
2. Import your Git repository
3. Select your repository
4. Vercel will auto-detect it's a Nuxt app
5. Click "Deploy"

## Step 4: Add Environment Variables to Vercel

After your first deployment, add these environment variables:

1. Go to your project in Vercel dashboard
2. Go to Settings → Environment Variables
3. Add these variables (use your actual values from `.env`):

```
DATABASE_URL=postgresql://user:password@host/database?sslmode=require
DISCOGS_CONSUMER_KEY=your_key_here
DISCOGS_CONSUMER_SECRET=your_secret_here
DISCOGS_CALLBACK_URL=https://your-app.vercel.app/api/auth/discogs/callback
SESSION_SECRET=your_session_secret_here
EMAIL_FROM=your_email@example.com
RESEND_API_KEY=your_resend_key_here
YOUTUBE_API_KEY=your_youtube_key_here
BASE_URL=https://your-app.vercel.app
```

**Important**: Update `DISCOGS_CALLBACK_URL` and `BASE_URL` with your actual Vercel URL!

## Step 5: Run Database Migrations

After deploying, you need to set up your database:

```bash
# Set your Neon database URL
export DATABASE_URL="your_neon_connection_string_here"

# Run migrations
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate
```

Or use Vercel CLI:

```bash
# Set the environment variable in Vercel
vercel env add DATABASE_URL

# Then redeploy
vercel --prod
```

## Step 6: Update Discogs Settings

1. Go to https://www.discogs.com/settings/developers
2. Update your callback URL to: `https://your-app.vercel.app/api/auth/discogs/callback`

## Step 7: Create App Icons

Before using as a PWA, create your app icons:

1. Create a 512x512 PNG icon for your app
2. Use https://realfavicongenerator.net/ to generate all sizes
3. Download and place in `public/` folder:
   - `pwa-192x192.png`
   - `pwa-512x512.png`
   - `apple-touch-icon.png`

## Step 8: Test Your Deployment

1. Open your Vercel URL in a browser
2. Try logging in
3. Test adding a record
4. On your iPhone, open the URL in Safari
5. Tap Share → Add to Home Screen

## Troubleshooting

### Database Connection Issues
- Make sure `DATABASE_URL` is set correctly in Vercel
- Check that the connection string includes `?sslmode=require`
- Verify your Neon project is active

### Migration Errors
- Run migrations locally first: `npx prisma migrate dev`
- Then deploy: `npx prisma migrate deploy`

### Build Errors
- Check Vercel build logs
- Make sure all dependencies are in `package.json`
- Verify your Node version matches (16.x or higher)

### PWA Not Installing
- Make sure you're using HTTPS (Vercel provides this automatically)
- Check that all icon files exist in `public/`
- Verify manifest is being generated (check browser DevTools → Application → Manifest)

## Cost

- Vercel: Free for hobby projects
- Neon: Free tier includes 0.5 GB storage, 1 database
- Total: **$0/month** 🎉

## Updates

To update your app after making changes:

```bash
# Commit your changes
git add .
git commit -m "Your changes"
git push

# Vercel will automatically deploy!
```

Or use CLI:

```bash
vercel --prod
```

## Support

If you run into issues:
- Vercel docs: https://vercel.com/docs
- Neon docs: https://neon.tech/docs
- Nuxt docs: https://nuxt.com/docs
