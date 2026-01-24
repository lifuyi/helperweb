# VPN Expiration Logic - Quick Reference

## TL;DR - What Changed

| Aspect | Before | After |
|--------|--------|-------|
| VPN expiration | Set at purchase ❌ | Set at activation ✅ |
| PDF expiration | Set at purchase ✅ | Set at purchase ✅ |
| User fairness | Unfair: lose time if don't use immediately | Fair: full X days from first use |
| Email messaging | Misleading | Clear & accurate |

---

## Files Modified/Created

### New Files
```
supabase/migrations/add_activated_at_tracking.sql
VPN_EXPIRATION_LOGIC_REVIEW.md
VPN_ACTIVATION_IMPLEMENTATION_GUIDE.md
CODE_REVIEW_DETAILED.md
IMPLEMENTATION_SUMMARY.md
QUICK_REFERENCE.md (this file)
```

### Modified Files
```
services/userService.ts
  - Updated: AccessToken interface
  - Updated: createAccessToken()
  - NEW: activateAccessToken()
  - Updated: verifyAccessToken()

api/payment/callback/index.ts
  - Updated: Token creation logic

services/paymentService.ts
  - Updated: Email templates (HTML & text)
```

---

## New Database Fields

```sql
ALTER TABLE access_tokens ADD COLUMN activated_at TIMESTAMP NULL;
ALTER TABLE vpn_urls ADD COLUMN activated_at TIMESTAMP NULL;
```

---

## New Function: activateAccessToken()

**When to use**: When user first activates their VPN (from X-UI integration)

**Signature**:
```typescript
activateAccessToken(token: string, expiryDays: number): Promise<AccessToken | null>
```

**What it does**:
1. Checks if token exists
2. Returns early if already activated (idempotent)
3. Calculates expiration from NOW (for VPN products)
4. Updates database with activation timestamp
5. Returns updated token

**Example**:
```typescript
// X-UI detects first connection
const activated = await activateAccessToken(userToken, 7);
// Now: activated.expires_at = NOW + 7 days
```

---

## Expiration Logic

### VPN Products (vpn-3days, vpn-7days, vpn-14days, vpn-30days)

**Purchase → Token Creation**
```javascript
{
  product_id: 'vpn-7days',
  expires_at: null,        // NOT SET YET
  activated_at: null,      // NOT SET YET
  purchase_date: '2026-01-20T10:00:00Z'
}
```

**First Use → Activation**
```javascript
{
  product_id: 'vpn-7days',
  expires_at: '2026-02-01T15:00:00Z',  // SET NOW
  activated_at: '2026-01-25T15:00:00Z' // SET NOW
  purchase_date: '2026-01-20T10:00:00Z'
}
// Expiration = Activation + 7 days
```

### PDF Products (payment-guide)

**Purchase → Token Creation**
```javascript
{
  product_id: 'payment-guide',
  expires_at: '2027-01-20T10:00:00Z',  // SET IMMEDIATELY
  activated_at: null,                  // NOT USED FOR PDF
  purchase_date: '2026-01-20T10:00:00Z'
}
```

---

## Verification Logic

**For All Tokens**:
```typescript
if (token.expires_at && new Date(token.expires_at) < new Date()) {
  return null; // EXPIRED
}
return token; // VALID
```

**Works for both**:
- VPN with activation: Checks if past `activated_at + X days`
- PDF without activation: Checks if past `purchase_date + 365 days`

---

## Email Changes

### VPN Products
**Old**: "Link will expire in 7 days"
**New**: "Your 7-day period starts when you first use the VPN"

**Details**:
- Explains activation-based timing
- Sets correct expectations
- Reduces support requests

### PDF Products
**Old**: "Link will expire in 365 days"
**New**: "Download link available for 365 days from purchase"

**Details**:
- Unchanged from user perspective
- Clarifies it's from purchase date
- No activation needed

---

## Testing Scenarios

### Scenario 1: Buy VPN, Wait, Then Use
```
Day 1:  Buy 7-day VPN
        → Token: expires_at=NULL, activated_at=NULL
        
Day 5:  Activate VPN
        → Token: expires_at=Day12, activated_at=Day5
        
Day 12: Access expires
        → Token invalid
        
RESULT: Full 7 days from first use ✅
```

### Scenario 2: Buy PDF
```
Day 1:  Buy PDF
        → Token: expires_at=Day1+365, activated_at=NULL
        
Any day: Download PDF
         → Works until Day1+365
         
RESULT: 365 days from purchase ✅
```

### Scenario 3: Buy Multiple VPNs
```
Day 1:  Buy VPN-7days
        → Token A: expires_at=NULL

Day 3:  Buy VPN-30days
        → Token B: expires_at=NULL

Day 5:  Activate A
        → Token A: expires_at=Day12

Day 10: Activate B
        → Token B: expires_at=Day40

RESULT: Each tracked independently ✅
```

---

## Admin SQL Queries

### Active VPN Tokens
```sql
SELECT user_id, product_id, activated_at, expires_at
FROM access_tokens
WHERE product_id LIKE 'vpn-%'
  AND activated_at IS NOT NULL
  AND expires_at > NOW()
ORDER BY expires_at ASC;
```

### Unused VPN Tokens (In Last 30 Days)
```sql
SELECT user_id, product_id, purchase_date
FROM access_tokens
WHERE product_id LIKE 'vpn-%'
  AND activated_at IS NULL
  AND created_at > NOW() - INTERVAL '30 days'
ORDER BY purchase_date DESC;
```

### Expiring in Next 3 Days
```sql
SELECT user_id, product_id, expires_at
FROM access_tokens
WHERE expires_at BETWEEN NOW() AND NOW() + INTERVAL '3 days'
ORDER BY expires_at ASC;
```

---

## Deployment Checklist

- [ ] Apply database migration
- [ ] Deploy userService.ts changes
- [ ] Deploy payment callback changes
- [ ] Deploy email template changes
- [ ] Test: Purchase VPN → verify expires_at=NULL
- [ ] Test: Call activateAccessToken() → verify expires_at set
- [ ] Test: Email template displays correctly
- [ ] Test: PDF purchase still works
- [ ] Monitor logs for activation calls
- [ ] Document X-UI integration point

---

## Key Code Snippets

### Creating VPN Token
```typescript
const token = await createAccessToken(userId, 'vpn-7days', 7);
// Result: { expires_at: null, activated_at: null, ... }
```

### Activating VPN Token
```typescript
const activated = await activateAccessToken(token.token, 7);
// Result: { expires_at: NOW+7days, activated_at: NOW, ... }
```

### Verifying Token
```typescript
const valid = await verifyAccessToken(token.token);
if (valid) {
  // Token is still good
} else {
  // Token expired or not found
}
```

---

## Backward Compatibility

**Existing Data**: 
- Columns added with NULL defaults
- Old rows unaffected
- No data migration required

**Old VPN Tokens**:
- Will have `activated_at = NULL`
- If `expires_at` is in past: already expired
- If `expires_at` is in future: still valid until then

---

## Support

### What to Tell Users

**For VPN**:
"Your X-day period starts when you first connect to the VPN, not when you buy it. So you get the full X days to use it."

**For PDF**:
"Your PDF is available to download for 365 days from your purchase date."

### Admin Metrics

```
Total VPN Sales:     COUNT(purchases WHERE product_id LIKE 'vpn-%')
Activation Rate:     COUNT(activated_at NOT NULL) / Total
Average Days Used:   AVG(NOW - activated_at)
Revenue Impact:      SUM(amount) WHERE activated_at IS NOT NULL
```

---

## Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| VPN expires_at = NULL | Correct for new VPN token | Call activateAccessToken() |
| Token won't activate | Already activated | Check idempotency, it returns existing data |
| PDF has no activated_at | Correct, PDF doesn't use it | Don't worry, it's expected |
| Old token showing wrong expiry | Pre-migration data | No action needed, still works |

---

## One-Pager Summary

**Problem Solved**: VPN users were losing time if they purchased but didn't activate immediately.

**Solution**: Expiration now starts from first use, not purchase.

**Files Changed**: 3 main service files + 1 migration + 4 docs

**Integration Point**: Call `activateAccessToken()` when X-UI detects first connection

**User Benefit**: Fair value - full X days of guaranteed usage

**Admin Benefit**: Better metrics - can track activation rate and usage patterns

**Rollout**: Safe - backward compatible, no data migration needed

---

## Links to Full Documentation

- **Implementation Details**: See `VPN_ACTIVATION_IMPLEMENTATION_GUIDE.md`
- **Code Quality Review**: See `CODE_REVIEW_DETAILED.md`
- **Problem Analysis**: See `VPN_EXPIRATION_LOGIC_REVIEW.md`
- **Full Summary**: See `IMPLEMENTATION_SUMMARY.md`

---

**Status**: ✅ Implementation complete and ready for deployment
