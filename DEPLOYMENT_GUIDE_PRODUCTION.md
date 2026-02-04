# Production Deployment Guide

## Overview
This guide walks through deploying the payment-to-VLESS VPN system to production on Vercel.

## Prerequisites Checklist

### 1. Stripe Setup
- [ ] Create Stripe account at https://stripe.com
- [ ] Get Live API keys from Dashboard → API keys
- [ ] Set up webhook endpoint
- [ ] Save: STRIPE_SECRET_KEY, VITE_STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET

### 2. X-UI Server
- [ ] Deploy X-UI panel (Docker recommended)
- [ ] Get accessible URL (e.g., http://xui.yourdomain.com:54321)
- [ ] Create admin account
- [ ] Create inbound (protocol) for VPN clients
- [ ] Save: XUI_BASE_URL, XUI_USERNAME, XUI_PASSWORD

### 3. VPN Server
- [ ] Have a server with VLESS protocol support (Xray/V2Ray)
- [ ] Configure with REALITY security
- [ ] Get server address
- [ ] Save: VPN_SERVER_HOST, VPN_SERVER_PORT, VPN_SECURITY, VPN_SNI

### 4. Supabase
- [ ] Create project at https://supabase.com
- [ ] Run migrations (see below)
- [ ] Save: SUPABASE_URL, VITE_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

### 5. Email Service
- [ ] Configure email sending (built-in or external service)
- [ ] Test email sending

### 6. Vercel
- [ ] GitHub account connected to Vercel
- [ ] Repository pushed to GitHub

---

## Step 1: Prepare Environment Variables

### Get all values:

**Stripe** (from https://dashboard.stripe.com/apikeys):
```
STRIPE_SECRET_KEY=sk_live_xxxxx
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

**X-UI Server**:
```
XUI_BASE_URL=http://xui.yourdomain.com:54321
XUI_USERNAME=admin
XUI_PASSWORD=your_secure_password
```

**VPN Server**:
```
VPN_SERVER_HOST=vpn.yourdomain.com
VPN_SERVER_PORT=443
VPN_SECURITY=reality
VPN_SNI=example.com
```

**Supabase** (from https://supabase.com/dashboard):
```
SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxxxxxxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxxxxxxxx
```

---

## Step 2: Setup Supabase Database

1. Go to https://supabase.com and create a project

2. Run migrations in Supabase SQL editor:

```sql
-- Run each migration file in order:
-- 1. supabase/migrations/create_tables.sql
-- 2. supabase/migrations/extend_vpn_urls_vless_support.sql
-- 3. supabase/migrations/create_products_table.sql
-- 4. supabase/migrations/create_admin_users_table.sql
-- 5. supabase/migrations/add_activated_at_tracking.sql
-- 6. supabase/migrations/fix_policies.sql
```

Or use CLI:
```bash
supabase db push
```

---

## Step 3: Setup Stripe Webhook

1. Go to https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. Endpoint URL: `https://YOUR_VERCEL_DOMAIN.vercel.app/api/payment/notify/stripe`
4. Events to send:
   - `checkout.session.completed`
5. Copy "Signing secret" → STRIPE_WEBHOOK_SECRET

---

## Step 4: Deploy to Vercel

### Option A: Using Vercel Dashboard

1. Push code to GitHub:
```bash
git add .
git commit -m "Production deployment"
git push origin main
```

2. Go to https://vercel.com/new
3. Import your GitHub repository
4. Project name: `chinaconnect` (or your project name)
5. Framework: `Vite`
6. Build command: `npm run vercel-build`
7. Output directory: `dist`
8. Click "Environment Variables" and add all variables from Step 1

9. Click "Deploy"

### Option B: Using Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Set environment variables
vercel env add STRIPE_SECRET_KEY
vercel env add VITE_STRIPE_PUBLISHABLE_KEY
vercel env add STRIPE_WEBHOOK_SECRET
# ... add all other variables

# Deploy
vercel --prod
```

---

## Step 5: Configure Stripe Webhook for Production

After Vercel deployment:

1. Get your Vercel domain (e.g., `chinaconnect.vercel.app`)
2. Update Stripe webhook endpoint:
   - URL: `https://chinaconnect.vercel.app/api/payment/notify/stripe`
   - Copy new signing secret
   - Update `STRIPE_WEBHOOK_SECRET` in Vercel

---

## Step 6: Verify Deployment

### Check Function Logs
1. Go to Vercel dashboard → Your project
2. Click "Deployments" → Latest deployment
3. Click "Functions" tab
4. Check `/api/payment/checkout` logs

### Test Payment Flow
1. Visit your production URL
2. Click "Buy VPN"
3. Use Stripe test card (even in live mode, use 4242 4242 4242 4242)
4. Check logs for `[PAYMENT]` messages
5. Verify database entry in Supabase

### Check Email
- Verify VLESS URL email sent to user

---

## Step 7: Monitor & Troubleshoot

### Check Vercel Function Logs
```bash
vercel logs production
```

### Monitor Database
- Supabase dashboard → SQL editor
- Query: `SELECT * FROM purchases ORDER BY created_at DESC LIMIT 10;`

### Check Stripe Webhooks
- https://dashboard.stripe.com/webhooks → Click endpoint
- View recent events
- Check for any failures

---

## Common Issues & Solutions

### Issue: "STRIPE_SECRET_KEY not configured"
**Solution:** Check Environment Variables in Vercel dashboard
- Project Settings → Environment Variables
- Ensure key is visible for Production

### Issue: "XUI connection failed"
**Solution:** 
- Verify XUI_BASE_URL is publicly accessible
- Check XUI credentials (XUI_USERNAME, XUI_PASSWORD)
- Ensure XUI server is running

### Issue: "Supabase connection failed"
**Solution:**
- Verify SUPABASE_URL and service key
- Check Supabase project is running
- Run migrations if not done

### Issue: "Email not sending"
**Solution:**
- Check email service configuration
- Verify email template exists
- Check function logs for errors

### Issue: Payment processes but no VLESS URL created
**Solution:**
- Check XUI is accessible
- Verify XUI inbounds are configured
- Check Vercel function logs for errors
- Ensure VPN_SERVER_HOST is accessible

---

## Rollback Plan

If something goes wrong:

1. **Immediate:** Disable Stripe webhook to prevent failed payments
2. **Revert code:** `git revert HEAD` and push
3. **Vercel auto-deploys** from GitHub
4. **Check logs** to see what failed
5. **Re-enable webhook** once fixed

---

## Security Checklist

- [ ] All environment variables set in Vercel (not in code)
- [ ] Stripe webhook secret configured
- [ ] Supabase policies enforced
- [ ] Database backups enabled
- [ ] Error logs reviewed for sensitive data
- [ ] Rate limiting configured (optional)
- [ ] CORS properly configured

---

## Production Monitoring

### Recommended: Setup Monitoring
- Vercel Analytics dashboard
- Stripe webhook monitoring
- Database query monitoring
- Email delivery tracking

### Daily Checks
- Any failed payments?
- XUI connections working?
- Email delivery successful?
- Database growing appropriately?

---

## Success Indicators

✅ Deployment successful if:
1. App loads at your Vercel domain
2. Payment button works
3. Stripe payment processes
4. VLESS URL created in database
5. Email sent with credentials
6. User can retrieve URL
7. VPN connection works

---

## Support

If issues occur:
1. Check Vercel function logs
2. Check Supabase dashboard
3. Check Stripe dashboard
4. Review error messages
5. Check XUI server status
6. Verify all environment variables

---

## Next Steps

After successful deployment:
1. Monitor first payments
2. Test VPN connections
3. Verify email delivery
4. Setup automated backups
5. Configure monitoring alerts
6. Plan regular database maintenance

