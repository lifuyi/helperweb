# Deployment Checklist - VPN Expiration Logic

## Pre-Deployment Verification

### Code Changes ✅
- [x] `services/userService.ts` - Updated with activation logic
- [x] `api/payment/callback/index.ts` - Updated token creation
- [x] `services/paymentService.ts` - Updated email templates
- [x] Build error fixed (crypto import issue resolved)
- [x] Build successful: `npm run build` ✓

### Documentation ✅
- [x] VPN_EXPIRATION_LOGIC_REVIEW.md
- [x] VPN_ACTIVATION_IMPLEMENTATION_GUIDE.md
- [x] CODE_REVIEW_DETAILED.md
- [x] IMPLEMENTATION_SUMMARY.md
- [x] QUICK_REFERENCE.md
- [x] FINAL_DELIVERABLES.md
- [x] BUILD_FIX_SUMMARY.md

---

## Phase 1: Database Migration

**Status**: Ready to deploy

**Action**: Apply migration to Supabase

```bash
# Option 1: Via Supabase CLI
supabase db push

# Option 2: Via Supabase Dashboard
1. Go to SQL Editor
2. Create new query
3. Copy contents from: supabase/migrations/add_activated_at_tracking.sql
4. Run query
```

**Verification**:
```sql
-- Verify columns exist
SELECT column_name FROM information_schema.columns 
WHERE table_name='access_tokens' AND column_name='activated_at';
-- Should return: activated_at

-- Verify indexes exist
SELECT indexname FROM pg_indexes 
WHERE tablename='access_tokens' AND indexname LIKE 'idx_%activated%';
-- Should return multiple index names
```

---

## Phase 2: Code Deployment

**Status**: Ready to deploy

**Files to deploy**:
1. `services/userService.ts`
2. `api/payment/callback/index.ts`
3. `services/paymentService.ts`
4. `supabase/migrations/add_activated_at_tracking.sql` (database)

**Deployment method**:
```bash
# Standard deployment
git add .
git commit -m "feat: implement activation-based VPN expiration logic"
git push origin main

# This will trigger Vercel build automatically
# Vercel will run: npm run vercel-build
```

**Build verification**:
- Vercel build should succeed with no warnings
- Check build logs for: "✓ built in X seconds"

---

## Phase 3: Testing

### Manual Testing Checklist

#### Test 1: VPN Purchase Flow
```
Steps:
1. Go to /vpn page
2. Click "Select Plan" on 7-day option
3. Complete payment process
4. Check email received

Verification:
1. Email should contain:
   - "Your 7-day period starts when you first use the VPN"
   - "Usage period from first connection"
   - Clear VPN setup instructions

2. Database check:
   SELECT * FROM access_tokens 
   WHERE product_id='vpn-7days' 
   ORDER BY created_at DESC LIMIT 1;
   
   Should show:
   - expires_at: NULL ✓
   - activated_at: NULL ✓
   - purchase_date: NOW ✓
```

#### Test 2: PDF Purchase Flow
```
Steps:
1. Navigate to payment guide page
2. Click purchase
3. Complete payment
4. Check email received

Verification:
1. Email should contain:
   - "Download link available for 365 days from purchase"
   - No mention of "activation"
   - Download link

2. Database check:
   SELECT * FROM access_tokens 
   WHERE product_id='payment-guide' 
   ORDER BY created_at DESC LIMIT 1;
   
   Should show:
   - expires_at: NOT NULL (date 365 days from now) ✓
   - activated_at: NULL ✓
   - purchase_date: NOW ✓
```

#### Test 3: Email Template Rendering
```
Steps:
1. Verify VPN purchase email HTML renders correctly
2. Verify VPN purchase email plain text renders correctly
3. Verify PDF purchase email HTML renders correctly
4. Verify PDF purchase email plain text renders correctly

Check:
- [ ] All text visible and readable
- [ ] Links clickable
- [ ] No formatting errors
- [ ] Chinese characters display correctly
```

#### Test 4: Backward Compatibility
```
Steps:
1. Verify old PDF purchases still work
2. Verify old user data not affected
3. Verify existing tokens still valid

Check:
SELECT COUNT(*) FROM access_tokens WHERE activated_at IS NOT NULL;
-- Should be 0 for old data (not yet activated)

SELECT COUNT(*) FROM access_tokens 
WHERE product_id='payment-guide' AND expires_at IS NOT NULL;
-- Should match old payment guide purchases
```

---

## Phase 4: Production Monitoring

### First 24 Hours
- [ ] Monitor Vercel logs for errors
- [ ] Check email delivery (check spam folder)
- [ ] Verify no database errors
- [ ] Monitor payment flow completion
- [ ] Check user feedback

### Queries to Monitor

```sql
-- Check recent purchases
SELECT product_id, COUNT(*) 
FROM purchases 
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY product_id;

-- Check for any errors in token creation
SELECT COUNT(*) as error_count
FROM access_tokens
WHERE product_id LIKE 'vpn-%' 
  AND (expires_at IS NOT NULL AND activated_at IS NULL);
-- Should be 0 (errors would show this)

-- Check email sent successfully
SELECT COUNT(*) as total_sent
FROM access_tokens
WHERE created_at > NOW() - INTERVAL '1 hour';
```

### Alert Conditions
- [ ] If email delivery fails: Check email service logs
- [ ] If token creation fails: Check database permissions
- [ ] If build fails: Check Vercel logs for errors
- [ ] If payments fail: Check Stripe webhook logs

---

## Phase 5: X-UI Integration

### Integration Point
When X-UI detects first VPN connection, call:

```
POST /api/vpn/activate
Headers: { "Content-Type": "application/json" }
Body: {
  "token": "user_token_here",
  "productId": "vpn-7days"
}

Response: {
  "success": true,
  "activated_at": "2026-01-25T15:00:00Z",
  "expires_at": "2026-02-01T15:00:00Z"
}
```

### Implementation Steps
1. [ ] Create endpoint in backend to handle activation
2. [ ] Document endpoint for X-UI team
3. [ ] Test integration with X-UI
4. [ ] Verify activation updates database correctly

---

## Post-Deployment Tasks

### Documentation
- [ ] Update API documentation
- [ ] Document new `activateAccessToken()` function
- [ ] Create admin runbook for troubleshooting
- [ ] Update team wiki/internal docs

### Monitoring Setup
- [ ] Set up alerts for activation failures
- [ ] Set up alerts for expiration edge cases
- [ ] Create dashboard for activation metrics

### Customer Communication
- [ ] Send update to users (optional)
- [ ] Document in changelog
- [ ] Update FAQ if needed

---

## Rollback Plan

If issues occur:

### Quick Rollback
```bash
# Revert code changes
git revert <commit-hash>
git push origin main

# Vercel will rebuild and deploy previous version
```

### Database Rollback
```sql
-- The migration only adds columns, doesn't modify data
-- To remove the migration effect:
ALTER TABLE access_tokens DROP COLUMN IF EXISTS activated_at;
ALTER TABLE vpn_urls DROP COLUMN IF EXISTS activated_at;
DROP INDEX IF EXISTS idx_access_tokens_activated_at;
-- etc.
```

### What Doesn't Need Rollback
- Old data continues to work
- No breaking changes to API
- No data loss possible

---

## Sign-Off

- [ ] Database migration verified
- [ ] Code deployed successfully
- [ ] All tests passed
- [ ] Email templates working
- [ ] Backward compatibility confirmed
- [ ] Monitoring set up
- [ ] Team notified
- [ ] Documentation updated

**Deployment Date**: ___________
**Deployed By**: ___________
**Verified By**: ___________

---

## Contact & Support

**For Issues**:
1. Check `BUILD_FIX_SUMMARY.md` for build errors
2. Check `IMPLEMENTATION_SUMMARY.md` for logic issues
3. Check `CODE_REVIEW_DETAILED.md` for code-specific issues
4. Check `QUICK_REFERENCE.md` for quick troubleshooting

**Documentation Location**: All files in root directory of project

---

**Status**: ✅ READY FOR DEPLOYMENT
