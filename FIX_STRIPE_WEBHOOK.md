# Fix Stripe Webhook - Step by Step

## Problem
Payment succeeds but webhook never called → No VPN client created → No logs appearing

## Solution: Configure Stripe Webhook Properly

### Step 1: Get Your Vercel Domain

1. Go to https://vercel.com/dashboard
2. Find your project
3. Copy the domain (looks like: `project-name-abc123.vercel.app`)
4. Note it down

**Your Vercel domain:** `https://YOUR_DOMAIN_HERE.vercel.app`

---

### Step 2: Go to Stripe Webhooks Dashboard

1. Open https://dashboard.stripe.com/webhooks
2. Look at the list of endpoints

**Is there already an endpoint?**

#### If YES - Go to Step 3
#### If NO - Go to Step 4

---

### Step 3: If Endpoint Already Exists

1. Click on the endpoint
2. Verify the URL is correct:
   - Should be: `https://YOUR_VERCEL_DOMAIN.vercel.app/api/payment/notify/stripe`
   - Replace YOUR_VERCEL_DOMAIN with your actual domain

**If URL is WRONG:**
1. Click "Edit"
2. Update URL to correct one
3. Click "Save"

**If URL is CORRECT:**
1. Scroll down to "Signing secret"
2. Click "Reveal"
3. Copy the secret (starts with `whsec_`)
4. Go to Step 5

---

### Step 4: If Endpoint Doesn't Exist - Create It

1. Click "Add endpoint"
2. In "Endpoint URL" field enter:
   ```
   https://YOUR_VERCEL_DOMAIN.vercel.app/api/payment/notify/stripe
   ```
   (Replace YOUR_VERCEL_DOMAIN with your actual domain from Step 1)

3. Under "Events to send" select: `checkout.session.completed`
4. Click "Add endpoint"
5. You should see success message
6. Copy the signing secret that appears (starts with `whsec_`)
7. Go to Step 5

---

### Step 5: Update STRIPE_WEBHOOK_SECRET on Vercel

1. Go to https://vercel.com/dashboard
2. Click on your project
3. Click "Settings" tab
4. Click "Environment Variables" on left menu
5. Look for `STRIPE_WEBHOOK_SECRET`

**If it exists:**
1. Click the three dots next to it
2. Click "Edit"
3. Delete the old value
4. Paste the new signing secret from Step 3 or 4
5. Click "Save"

**If it doesn't exist:**
1. Click "Add New"
2. Name: `STRIPE_WEBHOOK_SECRET`
3. Value: The signing secret from Step 3 or 4
4. Select "Production" environment
5. Click "Save"

---

### Step 6: Trigger Redeployment

1. In Vercel, go to "Deployments" tab
2. Find the latest deployment
3. Click the three dots
4. Click "Redeploy"
5. Wait for deployment to complete

OR just push to GitHub:
```bash
git add .
git commit -m "Update Stripe webhook configuration"
git push origin main
```

---

### Step 7: Test the Webhook

1. Go to https://dashboard.stripe.com/webhooks
2. Click on your endpoint
3. Scroll down to "Testing" section
4. Click "Send a test event"
5. Event type: `checkout.session.completed`
6. Click "Send test event"

**You should see:**
- ✅ Event sent
- ✅ Event received (check mark appears)
- ✅ Response: 200 OK

If you see ✅ for all three, webhook is working!

---

### Step 8: Make Real Test Payment

1. Go to your app: `https://YOUR_VERCEL_DOMAIN.vercel.app`
2. Click "Buy VPN"
3. Use test card: `4242 4242 4242 4242`
   - Expiry: `04/26`
   - CVC: `424`
   - ZIP: `42424`
4. Click "Pay"

**Now check logs:**
```bash
vercel logs production --follow
```

**You should now see [VPN] messages!**

---

## Verification Checklist

After completing all steps, verify:

- [ ] Vercel domain copied correctly
- [ ] Stripe webhook endpoint URL is correct
- [ ] Events set to "checkout.session.completed"
- [ ] Signing secret copied from Stripe
- [ ] STRIPE_WEBHOOK_SECRET updated on Vercel
- [ ] Redeployment triggered
- [ ] Test event sent successfully (3 checkmarks)
- [ ] Real test payment made
- [ ] [VPN] logs now appearing

---

## If Still Not Working

### Check Stripe Events

1. Go to https://dashboard.stripe.com/webhooks
2. Click your endpoint
3. Scroll to "Events"
4. Do you see events listed?

**If YES but failed:**
- Click on failed event
- Check "Response" for error
- Share error message

**If NO events:**
- Webhook URL not reachable by Stripe
- Check URL format is exactly correct
- Make sure domain is public (not localhost)

### Check Vercel Logs

```bash
vercel logs production --follow
```

Then make a test payment. You should see entries. If not:
- Webhook not being called
- Check Step 1-7 again

### Stripe Dashboard Test

1. In Stripe webhooks, click "Testing"
2. Send test event
3. Does it show as received?

If YES → Real payments should work too  
If NO → URL might be wrong or unreachable

---

## Common Issues

### Issue: "Invalid URL format"
- Make sure URL starts with `https://`
- No typos in domain
- Correct format: `https://YOUR_DOMAIN.vercel.app/api/payment/notify/stripe`

### Issue: "Webhook failed 3 times"
- Check Vercel function has no errors
- Check STRIPE_WEBHOOK_SECRET matches
- Check function is deployed

### Issue: "Test event succeeded but real payments don't"
- May need to use live Stripe keys
- Make sure you're using live cards for live mode
- Check payment status in Stripe dashboard

---

## Next Steps After Webhook Works

Once webhook is properly configured and [VPN] logs appear:

1. Check for errors in [VPN] logs
2. If X-UI connection fails, debug that separately
3. If inbound missing, create inbound in X-UI
4. Re-test until VLESS URL is created

---

**Status: Follow these steps exactly and webhook will start working!**

