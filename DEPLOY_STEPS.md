# Step-by-Step Production Deployment Guide

## Overview
This document provides exact, copy-paste-ready commands for deploying to production.

---

## PREREQUISITE: Have These Values Ready

Before starting, gather these values in a text file:

```
Stripe:
  STRIPE_SECRET_KEY = sk_live_[your key]
  VITE_STRIPE_PUBLISHABLE_KEY = pk_live_[your key]
  STRIPE_WEBHOOK_SECRET = whsec_[your key]

X-UI:
  XUI_BASE_URL = http://xui.yourdomain.com:54321
  XUI_USERNAME = admin
  XUI_PASSWORD = [your password]

VPN Server:
  VPN_SERVER_HOST = vpn.yourdomain.com
  VPN_SERVER_PORT = 443
  VPN_SECURITY = reality
  VPN_SNI = example.com

Supabase:
  SUPABASE_URL = https://xxxxx.supabase.co
  VITE_SUPABASE_ANON_KEY = eyJ...
  SUPABASE_SERVICE_ROLE_KEY = eyJ...
```

---

## STEP 1: Verify Local Build Works (5 minutes)

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Build API functions
npm run build:api

# Build frontend
npm run build

# Should complete without errors
```

**Expected output:** `✓ built in Xs` and no errors

---

## STEP 2: Commit Code to Git (2 minutes)

```bash
# Check what's changed
git status

# Add all changes
git add .

# Commit
git commit -m "Production deployment - Payment to VLESS workflow"

# Push to main branch
git push origin main
```

**Expected:** GitHub shows latest commit

---

## STEP 3: Create Vercel Project (5 minutes)

1. Go to https://vercel.com/dashboard
2. Click "Add New" → "Project"
3. Click "Import Git Repository"
4. Select your GitHub repository
5. Click "Import"

**On Import Settings page:**
- Framework Preset: **Vite**
- Build Command: **npm run vercel-build**
- Output Directory: **dist**
- Click "Deploy"

**Wait for:** Initial deployment to complete (will fail without env vars, that's OK)

---

## STEP 4: Add Environment Variables on Vercel (5 minutes)

1. After deploy, click "Settings" tab
2. Click "Environment Variables" on left menu
3. For each variable below, click "Add" and enter:

```
Name: STRIPE_SECRET_KEY
Value: sk_live_[your actual key]
[Check] Production
[Click] Save

Name: VITE_STRIPE_PUBLISHABLE_KEY
Value: pk_live_[your actual key]
[Check] Production
[Click] Save

Name: STRIPE_WEBHOOK_SECRET
Value: whsec_[your actual key]
[Check] Production
[Click] Save

Name: XUI_BASE_URL
Value: http://xui.yourdomain.com:54321
[Check] Production
[Click] Save

Name: XUI_USERNAME
Value: admin
[Check] Production
[Click] Save

Name: XUI_PASSWORD
Value: [your password]
[Check] Production
[Click] Save

Name: VPN_SERVER_HOST
Value: vpn.yourdomain.com
[Check] Production
[Click] Save

Name: VPN_SERVER_PORT
Value: 443
[Check] Production
[Click] Save

Name: VPN_SECURITY
Value: reality
[Check] Production
[Click] Save

Name: VPN_SNI
Value: example.com
[Check] Production
[Click] Save

Name: SUPABASE_URL
Value: https://xxxxx.supabase.co
[Check] Production
[Click] Save

Name: VITE_SUPABASE_URL
Value: https://xxxxx.supabase.co
[Check] Production
[Click] Save

Name: VITE_SUPABASE_ANON_KEY
Value: eyJ...
[Check] Production
[Click] Save

Name: SUPABASE_SERVICE_ROLE_KEY
Value: eyJ...
[Check] Production
[Click] Save
```

**After all variables added:**
- Click "Deployments" tab
- Find the initial failed deployment
- Click the three dots → "Redeploy"
- Confirm redeploy

**Wait for:** Deployment to complete (should be successful now)

---

## STEP 5: Get Your Vercel Domain

After successful deployment:

1. Click "Deployments" tab
2. Click the successful deployment
3. Copy the domain (looks like: `projectname-abc123.vercel.app`)

**Save this for Step 6**

---

## STEP 6: Configure Stripe Webhook (5 minutes)

1. Go to https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"

**Endpoint configuration:**
```
Endpoint URL: https://YOUR_VERCEL_DOMAIN.vercel.app/api/payment/notify/stripe
(Replace YOUR_VERCEL_DOMAIN with the one from Step 5)

Events to send: Select "checkout.session.completed"

Click "Add endpoint"
```

3. On the new endpoint page, click "Reveal" under "Signing secret"
4. Copy the signing secret (starts with `whsec_`)
5. Go back to Vercel → Settings → Environment Variables
6. Update `STRIPE_WEBHOOK_SECRET` with this new value
7. Go to Deployments tab → Redeploy

---

## STEP 7: Run Supabase Migrations (5 minutes)

**Using Supabase Dashboard:**

1. Go to https://supabase.com/dashboard
2. Select your project
3. Click "SQL Editor"
4. Click "New Query"
5. Copy-paste the contents of each file in order:

```
1. supabase/migrations/create_tables.sql
2. supabase/migrations/extend_vpn_urls_vless_support.sql
3. supabase/migrations/create_products_table.sql
4. supabase/migrations/create_admin_users_table.sql
5. supabase/migrations/add_activated_at_tracking.sql
6. supabase/migrations/fix_policies.sql
```

For each:
- Paste content
- Click "Execute"
- Wait for success

**OR using CLI:**
```bash
supabase db push
```

---

## STEP 8: Test the Complete Flow (15 minutes)

### Test 1: App Loads
```
1. Visit: https://YOUR_VERCEL_DOMAIN.vercel.app
2. Should see your app homepage
3. No errors in browser console
```

### Test 2: Payment Flow
```
1. Navigate to VPN purchase page
2. Click "Buy 7-day VPN"
3. Stripe checkout should open
4. Use test card:
   Number: 4242 4242 4242 4242
   Expiry: 04/26
   CVC: 424
   ZIP: 42424
5. Click "Pay"
6. Should redirect to success page
```

### Test 3: Database Entry
```
1. Go to Supabase dashboard
2. Click "Table Editor"
3. Select "vpn_urls" table
4. Should see new entry with:
   - vless_url (not NULL)
   - user_id (your user ID)
   - status: "active"
   - expires_at (today + 7 days)
```

### Test 4: Email
```
1. Check your email (or spam folder)
2. Should have email from your app
3. Email contains VLESS URL
4. Email shows expiration date
```

### Test 5: Retrieve URL
```
1. Login to your app
2. Go to "My VPN" page
3. Should see your VLESS URL
4. Click "Copy URL"
5. Paste somewhere to verify it's there
```

### Test 6: VPN Connection
```
1. Copy the VLESS URL
2. Open V2Ray or Clash app
3. Import the URL
4. Connect
5. Should work (internet through VPN)
```

---

## STEP 9: Monitor Production (Ongoing)

### Check Logs
```bash
# View live logs
vercel logs production

# Or visit: Vercel Dashboard → Deployments → Functions → Logs
```

### Check Payments
```
Go to https://dashboard.stripe.com → Payments
Should see your test payment listed
```

### Check Database
```
Supabase Dashboard → Table Editor
Monitor growth of:
- purchases table
- vpn_urls table
- access_tokens table
```

---

## STEP 10: Go Live! 🚀

Your production system is now:
- ✅ Accepting payments
- ✅ Creating VPN clients
- ✅ Generating VLESS URLs
- ✅ Sending credentials
- ✅ Allowing user retrieval

---

## If Something Goes Wrong

### Payment not processing?
```
Check: Vercel → Deployments → Functions → /api/payment/checkout
Look for error messages starting with [PAYMENT]
```

### XUI connection fails?
```
1. Verify XUI_BASE_URL is correct
2. Test: curl http://xui.yourdomain.com:54321
3. Check credentials: XUI_USERNAME, XUI_PASSWORD
```

### VLESS URL not created?
```
Check database: SELECT * FROM vpn_urls ORDER BY created_at DESC
Check function logs for errors
Verify XUI server is running and accessible
```

### Email not sending?
```
Check email service is configured
Verify email template exists
Check function logs for errors
```

### Database connection fails?
```
Verify SUPABASE_URL is correct
Check SUPABASE_SERVICE_ROLE_KEY has full permissions
Ensure migrations ran successfully
```

---

## Quick Commands for Common Tasks

```bash
# Redeploy from latest code
git push origin main

# Manual Vercel redeploy
vercel --prod

# View live logs
vercel logs production --follow

# Check environment variables
vercel env ls

# Clear cache and rebuild
rm -rf .vercel node_modules
npm install
vercel --prod
```

---

## Estimated Timeline

| Step | Time |
|------|------|
| Step 1: Verify Build | 5 min |
| Step 2: Commit to Git | 2 min |
| Step 3: Create Vercel Project | 5 min |
| Step 4: Add Env Variables | 5 min |
| Step 5: Get Domain | 1 min |
| Step 6: Stripe Webhook | 5 min |
| Step 7: Supabase Migrations | 5 min |
| Step 8: Test Complete Flow | 15 min |
| **TOTAL** | **43 minutes** |

---

## Success Indicators

✅ You're done when:
1. App loads at your Vercel domain
2. Payment button works
3. Stripe test payment succeeds
4. VLESS URL created in database
5. Email received with credentials
6. VPN connection works

**You're now live in production! 🎉**

