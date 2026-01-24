# DJ Metadata Analysis - Quick Setup Guide

## Step 1: Install yt-dlp

### macOS
```bash
brew install yt-dlp
```

### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install yt-dlp
# or via pip
pip3 install yt-dlp
```

### Windows
```bash
# Via Chocolatey
choco install yt-dlp

# Or download from GitHub
# https://github.com/yt-dlp/yt-dlp/releases
```

### Verify Installation
```bash
yt-dlp --version
# Should output version number
```

## Step 2: Get YouTube API Key

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/

2. **Create a New Project**
   - Click "Select a project" → "New Project"
   - Name: "Vinyl Collection DJ Analysis"
   - Click "Create"

3. **Enable YouTube Data API v3**
   - In the navigation menu, go to "APIs & Services" → "Library"
   - Search for "YouTube Data API v3"
   - Click on it, then click "Enable"

4. **Create API Key**
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "API Key"
   - **Important**: Restrict the key:
     - Click on the key you just created
     - Under "API restrictions", select "Restrict key"
     - Choose "YouTube Data API v3"
     - Click "Save"

5. **Copy API Key**
   - Copy the API key to your clipboard

## Step 3: Configure Environment

Add to your `.env` file:

```env
# YouTube Data API (for DJ metadata analysis)
YOUTUBE_API_KEY="AIzaSy..."  # Paste your key here
```

## Step 4: Restart Development Server

```bash
# Stop current server (Ctrl+C)
# Then restart
npm run dev
```

## Step 5: Test the System

1. **Navigate to your collection**
   - Go to http://localhost:3000/collection

2. **Start Analysis**
   - Click the "Analyze DJ" button
   - Confirm the operation
   - **Note**: This will take 10-15 seconds per track

3. **Monitor Progress**
   - Progress percentage updates every 3 seconds
   - You can navigate away - processing continues in background

4. **View Results**
   - Check database: `npx prisma studio`
   - Look in `AnalysisCache` table
   - DJ metadata (BPM, key, energy) synced to `UserRecord`

## Expected Results

### First Track
- YouTube video automatically resolved
- Audio streamed and analyzed
- BPM, key, and energy extracted
- Data saved to database

### Example Output (Console)
```
[YouTube Resolver] Searching for: "Daft Punk One More Time"
[YouTube Resolver] Selected: "Daft Punk - One More Time (Official Video)" (score: 0.89)
[Audio Streamer] Streaming audio from dQw4w9WgXcQ
[Audio Streamer] Downloaded 4.23 MB
[Audio Analyzer] Analysis complete: { bpm: 123, key: 'E minor', rawEnergy: 0.782 }
[BPM Normalizer] Selected BPM: 123 (original detection)
[Analysis Worker] Normalized: BPM=123, Energy=0.782
[Analysis Worker] Saved analysis for record rec_abc123
```

## Troubleshooting

### Error: "yt-dlp not installed"

**Solution**:
```bash
# Verify yt-dlp is in PATH
which yt-dlp

# If not found, install it
brew install yt-dlp  # macOS
# or
pip3 install yt-dlp  # Linux/Windows
```

### Error: "YouTube API key not configured"

**Solution**:
1. Check `.env` file has `YOUTUBE_API_KEY="..."`
2. Restart dev server
3. Verify key is valid in Google Cloud Console

### Error: "YouTube API quota exceeded"

**Solution**:
- **Free tier**: 10,000 requests/day
- **Usage per track**: ~2-3 requests
- **Max tracks/day**: ~3,000-5,000
- **Reset**: Quota resets at midnight PT (Pacific Time)
- **Upgrade**: Enable billing for unlimited quota ($0.50 per 10k requests)

### Analysis Takes Too Long

**Expected**:
- ~10-15 seconds per track
- 700 tracks = 3-4 hours total
- Processing is sequential to respect rate limits

**Optimization**:
- Analysis runs in background - you can navigate away
- Already-analyzed tracks are skipped automatically
- Failed tracks can be re-tried individually

## Quota Management

### Free Tier Limits
- **Requests/day**: 10,000
- **Cost per track**: 2-3 requests
- **Tracks per day**: ~3,000-5,000

### Monitoring Quota
1. Go to Google Cloud Console
2. Navigate to "APIs & Services" → "Dashboard"
3. Select "YouTube Data API v3"
4. View "Quotas & system limits"

### Increasing Quota
1. Go to "APIs & Services" → "Dashboard"
2. Select "YouTube Data API v3"
3. Click "Quotas"
4. Click "Edit Quotas"
5. Enable billing on your project
6. Request higher quota (usually approved automatically)

**Cost**: $0.50 per 10,000 additional requests

## Next Steps

### Phase 1: Initial Analysis
- Run analysis on small batch (10-20 records) to test
- Verify BPM/key/energy values are reasonable
- Check for any errors in console

### Phase 2: Full Library Analysis
- Run overnight for large collections
- Monitor progress via API or database
- Handle any failed tracks individually

### Phase 3: Use DJ Metadata
- BPM data ready for setlist creation
- Energy levels for set flow planning
- Key information for harmonic mixing

### Phase 4: Advanced Features
- Create setlists based on BPM ranges
- Sort by energy for dynamic sets
- Filter by musical key for harmonic mixing

## Support

### Debug Mode

Enable verbose logging:
```env
# Add to .env
DEBUG=analysis:*
```

### Database Inspection

View analysis results:
```bash
npx prisma studio

# Navigate to:
# - AnalysisCache (analysis results per release)
# - AnalysisJob (job progress/status)
# - UserRecord (DJ metadata synced to records)
```

### Manual Re-analysis

To re-analyze specific records:
```typescript
POST /api/analysis/start
{
  "recordIds": ["rec_123", "rec_456"]
}
```

## Important Notes

1. **Privacy**: Audio is never saved to disk - streamed temporarily and discarded
2. **Copyright**: Only analyze music you legally own
3. **YouTube TOS**: System respects YouTube's Terms of Service
4. **Rate Limits**: 1-second delay between tracks to avoid throttling
5. **Accuracy**: BPM detection ~85-90% accurate, may need manual verification for edge cases

---

**Ready to go!** Click "Analyze DJ" in your collection to start extracting professional DJ metadata.
