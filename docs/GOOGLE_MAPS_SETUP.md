# Google Maps API Setup Guide

## Why We Need It

Google Maps APIs provide:
- **Places API**: Verify trail coordinates and locations ($17/1000 requests)
- **Elevation API**: Generate elevation profiles ($5/1000 requests)

**Estimated Cost**: $12-25 for 500 trails

## Setup Steps

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Name: "HikeSim Trail Collection"
4. Click "Create"

### 2. Enable Required APIs

1. In the search bar, type "Places API"
2. Click "Places API" → "Enable"
3. Repeat for "Elevation API"
4. Repeat for "Geocoding API" (optional, for verification)

### 3. Create API Key

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "API Key"
3. Copy your API key (looks like: `AIzaSyD...`)

### 4. Restrict API Key (Important for Security)

1. Click on your API key name
2. Under "API restrictions":
   - Select "Restrict key"
   - Check: Places API, Elevation API, Geocoding API
3. Under "Application restrictions":
   - Select "IP addresses"
   - Add your server IP (or use "None" for testing)
4. Click "Save"

### 5. Add to `.env` File

```bash
# Add to your .env file
GOOGLE_MAPS_API_KEY=AIzaSyD...your_key_here
```

### 6. Enable Billing

⚠️ **Google Maps APIs require billing enabled** (even for free tier)

1. Go to "Billing" in Google Cloud Console
2. Click "Link a billing account" or "Create billing account"
3. Add credit card (required, but won't charge unless you exceed $200/month free credit)

**Free Tier**:
- $200/month free credit (covers ~8,000 trail requests)
- Places API: $17 per 1,000 requests
- Elevation API: $5 per 1,000 requests

## Cost Calculation

For 500 trails:
- Places API lookups: 500 × $0.017 = $8.50
- Elevation profiles (50 points each): 500 × $0.005 = $2.50
- **Total: ~$11** (well within $200 free tier)

## Alternative: Use OpenTopography (FREE)

If you want to avoid Google Maps costs:

1. **For elevation only**: Use OpenTopography API (no key required)
2. **Skip Google Places**: Rely on NPS data + web scraping for coordinates

Trade-off: Lower accuracy, but $0 cost.

## Testing Your Setup

Run this test:

```bash
npx tsx scripts/test-google-maps.ts
```

This will verify your API key works.

## Security Best Practices

1. **Never commit API keys to Git**
2. **Restrict key to specific APIs**
3. **Set usage quotas** (e.g., max 1,000 requests/day)
4. **Monitor usage** in Google Cloud Console

## Need Help?

- Google Maps Platform: https://developers.google.com/maps
- Pricing Calculator: https://mapsplatform.google.com/pricing/
