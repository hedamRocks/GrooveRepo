# Setup Checklist - Vercel + Neon Deployment

Follow this checklist to verify your setup is correct.

## ✅ Step 1: Neon Database Setup

- [ ] **Create Neon Project**
  1. Go to https://console.neon.tech
  2. Click "Create a project"
  3. Name it "stack" or similar
  4. Select a region (choose closest to you)
  5. Click "Create project"

- [ ] **Get Connection String**
  1. In your Neon dashboard, click on your project
  2. Click "Dashboard" in the left sidebar
  3. Find the "Connection string" section
  4. Click to reveal the connection string
  5. It should look like: `postgresql://user:password@ep-xxx-xxx.region.aws.neon.tech/neondb?sslmode=require`

- [ ] **Update Local .env File**
  ```bash
  # Add this to your .env file (replace with your actual connection string)
  DATABASE_URL="postgresql://user:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require"
  ```

- [ ] **Test Connection Locally**
  ```bash
  # Generate Prisma client
  npx prisma generate

  # Test the connection
  node test-db-connection.js
  ```

- [ ] **Run Database Migrations**
  ```bash
  # This creates all your tables in Neon
  npx prisma migrate deploy
  ```

## ✅ Step 2: Vercel Setup

- [ ] **Login to Vercel CLI**
  ```bash
  vercel login
  ```
  - This will open a browser to authenticate
  - Confirm the login in your browser

- [ ] **Deploy Your App**
  ```bash
  vercel
  ```
  - Answer the prompts:
    - Set up and deploy? **Yes**
    - Which scope? **Select your account**
    - Link to existing project? **No**
    - What's your project's name? **stack** (or whatever you prefer)
    - In which directory is your code? **./** (default)
    - Want to modify settings? **No**

- [ ] **Note Your Vercel URL**
  - After deployment, Vercel will give you a URL like:
  - `https://stack-abc123.vercel.app`
  - **Write this down!** You'll need it next.

## ✅ Step 3: Add Environment Variables to Vercel

You need to add all your environment variables to Vercel. You can do this two ways:

### Option A: Via Vercel Dashboard (Easier)

1. Go to https://vercel.com/dashboard
2. Click on your "stack" project
3. Click "Settings" tab
4. Click "Environment Variables" in the left sidebar
5. Add each variable one by one:

**Required Variables:**

| Name | Value | Notes |
|------|-------|-------|
| `DATABASE_URL` | Your Neon connection string | From Step 1 |
| `DISCOGS_CONSUMER_KEY` | Your Discogs key | From your .env |
| `DISCOGS_CONSUMER_SECRET` | Your Discogs secret | From your .env |
| `DISCOGS_CALLBACK_URL` | `https://YOUR-VERCEL-URL.vercel.app/api/auth/discogs/callback` | **Update with your Vercel URL!** |
| `SESSION_SECRET` | Random string (32+ chars) | From your .env |
| `EMAIL_FROM` | Your email | From your .env |
| `RESEND_API_KEY` | Your Resend key | From your .env |
| `YOUTUBE_API_KEY` | Your YouTube key | From your .env |
| `BASE_URL` | `https://YOUR-VERCEL-URL.vercel.app` | **Update with your Vercel URL!** |

**Important:** For Production, Development, and Preview - add to all three!

### Option B: Via Vercel CLI

```bash
# Add each variable
vercel env add DATABASE_URL production
# Paste your Neon connection string when prompted

vercel env add BASE_URL production
# Enter your Vercel URL

# ... repeat for all variables
```

## ✅ Step 4: Update Discogs Settings

Since your callback URL changed, you need to update Discogs:

1. Go to https://www.discogs.com/settings/developers
2. Click on your application
3. Update "Callback URL" to: `https://YOUR-VERCEL-URL.vercel.app/api/auth/discogs/callback`
4. Save changes

## ✅ Step 5: Redeploy with Environment Variables

```bash
vercel --prod
```

This will deploy your app to production with all the environment variables.

## ✅ Step 6: Verify Deployment

- [ ] **Open Your Vercel URL**
  - Go to `https://YOUR-VERCEL-URL.vercel.app`
  - You should see your app!

- [ ] **Test Login**
  - Try to log in with magic link
  - Check your email

- [ ] **Test Discogs Connection**
  - After logging in, try connecting to Discogs
  - Should redirect correctly

- [ ] **Test Database**
  - Try adding a record
  - Check if it saves

## ✅ Step 7: Install as PWA on iPhone

- [ ] **Add App Icons**
  1. Create/generate icons (see `public/ICONS_README.md`)
  2. Place in `public/` folder:
     - `pwa-192x192.png`
     - `pwa-512x512.png`
     - `apple-touch-icon.png`
  3. Redeploy: `vercel --prod`

- [ ] **Install on iPhone**
  1. Open Safari on iPhone
  2. Go to your Vercel URL
  3. Tap Share button (square with arrow)
  4. Tap "Add to Home Screen"
  5. Tap "Add"

## 🎉 Success Criteria

You'll know everything is working when:

- ✅ Your Vercel URL loads the app
- ✅ You can log in with magic link
- ✅ You can connect to Discogs
- ✅ You can add/view records
- ✅ Data syncs between phone and desktop
- ✅ App installs on iPhone home screen

## 🐛 Common Issues

### "Database connection failed"
- Check that `DATABASE_URL` is set in Vercel environment variables
- Verify the connection string includes `?sslmode=require`
- Make sure you ran `npx prisma migrate deploy`

### "Discogs OAuth fails"
- Verify `DISCOGS_CALLBACK_URL` in Vercel matches Discogs settings
- Check that callback URL uses HTTPS (not HTTP)
- Confirm `DISCOGS_CONSUMER_KEY` and `DISCOGS_CONSUMER_SECRET` are correct

### "App won't install on iPhone"
- Make sure you're using HTTPS (Vercel provides this automatically)
- Check that icon files exist in `public/` folder
- Try force-refresh the page (pull down in Safari)

### "Data doesn't sync"
- Both devices must use the same Vercel URL
- Make sure you're logged in with the same account
- Check browser console for errors

## 📊 Monitoring

- **Vercel Dashboard**: https://vercel.com/dashboard
  - View deployments
  - Check logs
  - Monitor usage

- **Neon Dashboard**: https://console.neon.tech
  - View database stats
  - Monitor queries
  - Check storage usage

## 💰 Pricing

Both are **free** for your use case:
- Vercel: Free tier includes 100GB bandwidth/month
- Neon: Free tier includes 0.5GB storage, 1 project

---

**Need help?** Check the full [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for detailed instructions.
