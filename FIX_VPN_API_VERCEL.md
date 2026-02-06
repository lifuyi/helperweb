# Fix VPN URLs API - Vercel Environment Variable Setup

## Problem
The `/api/vpn/list` endpoint is returning 500 errors because the `SUPABASE_SERVICE_ROLE_KEY` environment variable is not set in Vercel.

## Solution: Add Environment Variable in Vercel

### Step 1: Go to Vercel Dashboard
1. Open https://vercel.com/lifuyis-projects/helperweb (or find your project)
2. Click on **Settings** tab
3. Click on **Environment Variables** in the left sidebar

### Step 2: Add the Missing Environment Variable
Add this environment variable:

**Variable Name:**
```
SUPABASE_SERVICE_ROLE_KEY
```

**Variable Value:** (from your `.env.local` file)
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkcHdzcnZlaml6dnZxd2J3c2FhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNzYyNjY0NywiZXhwIjoyMDUzMjAyNjQ3fQ.kSct-AgkWoTyZARle5wuEw_w5ClwjYGfhGDJQRCmF1U
```

**Environment:** Select **All** (Production, Preview, Development)

### Step 3: Redeploy
After adding the environment variable:
1. Go to the **Deployments** tab
2. Click the **...** menu on the latest deployment
3. Click **Redeploy**

OR just push a new commit and it will auto-deploy with the new environment variable.

## Alternative: Simpler Solution (Temporary)

If you don't want to deal with environment variables right now, we can use a different approach:

### Option A: Enable RLS Policies in Supabase
Instead of using the service role key, we can add Row Level Security policies to allow users to read their own VPN URLs.

1. Go to Supabase Dashboard: https://app.supabase.com/project/hdpwsrvejizvvqwbwsaa
2. Go to **SQL Editor**
3. Run this SQL:

```sql
-- Enable RLS on vpn_urls table
Error: Failed to run sql query: ERROR: 42703: column "user_id" does not exist

4. Then update `orderService.ts` to query Supabase directly instead of using the API

### Option B: Return VPN URLs in the Payment Callback
Instead of fetching VPN URLs separately, we can include them in the purchase response when the payment is completed.

## Current Status

✅ Error handling added - the 500 errors won't spam the console anymore
❌ VPN URLs still not displaying - need to add environment variable OR use Option A/B above

## Recommended Next Step

**Add the `SUPABASE_SERVICE_ROLE_KEY` to Vercel** - this is the cleanest solution and keeps the backend secure.
