# X-UI Integration Guide - VPN Activation Callback

## Overview

The ChinaConnect system now tracks when users **activate** their VPN (first connection), separate from when they **purchase** it. Your X-UI backend needs to notify ChinaConnect when a user first connects so we can calculate the correct expiration date.

---

## 🎯 Integration Goal

**Before**: Expiration counted down from purchase immediately  
**After**: Expiration only starts counting when user first connects

---

## 📋 What X-UI Needs to Do

### Trigger Point
When X-UI detects a user's **first VPN connection** (first time connecting to any X-UI VPN server), it should:

1. Get the user's VPN token/subscription ID
2. Call ChinaConnect activation endpoint
3. Receive confirmation that expiration has been set

---

## 🔌 API Endpoint Specification

### Endpoint Details

**Method**: `POST`  
**URL**: `https://chinaconnect.example.com/api/vpn/activate`  
**Authentication**: Bearer token (user's access token) OR API key

### Request Body

```json
{
  "token": "user_vpn_token_here",
  "productId": "vpn-7days"
}
```

**Parameters**:
- `token` (required): The user's VPN access token from the original purchase
- `productId` (optional): The product ID (vpn-3days, vpn-7days, vpn-14days, vpn-30days)
  - If not provided, system will look it up from token

### Response - Success (200)

```json
{
  "success": true,
  "activated_at": "2026-01-25T15:00:00Z",
  "expires_at": "2026-02-01T15:00:00Z",
  "product_id": "vpn-7days",
  "days_remaining": 7
}
```

### Response - Error (400/404)

```json
{
  "success": false,
  "error": "Token not found",
  "error_code": "TOKEN_NOT_FOUND"
}
```

### Possible Errors

| Error Code | Meaning | Action |
|-----------|---------|--------|
| `TOKEN_NOT_FOUND` | Token doesn't exist | Check token value |
| `TOKEN_ALREADY_ACTIVATED` | Already activated (idempotent) | Safe to ignore, reuse dates |
| `INVALID_PRODUCT` | Product ID doesn't match | Verify product ID |
| `EXPIRED_TOKEN` | Token already past expiration | User needs new purchase |
| `INVALID_REQUEST` | Missing required fields | Check request format |

---

## 🔑 Authentication Methods

### Option 1: User Token (Recommended)
Include user's ChinaConnect access token in Authorization header:

```
POST /api/vpn/activate
Authorization: Bearer user_token_from_purchase_email
Content-Type: application/json

{
  "token": "user_vpn_token"
}
```

### Option 2: API Key
If server-to-server communication preferred:

```
POST /api/vpn/activate
Authorization: Bearer x-ui-api-key
X-API-Key: your-secret-api-key
Content-Type: application/json

{
  "token": "user_vpn_token",
  "user_id": "user_id_from_purchase"
}
```

---

## 🔄 Implementation Flow

### Sequence Diagram

```
X-UI VPN Client              X-UI Backend              ChinaConnect Backend
       │                            │                           │
       │──(Connect)──────────────>  │                           │
       │                            │                           │
       │                    [Detect first connection]           │
       │                            │                           │
       │                    [Look up user token]                │
       │                            │                           │
       │                     [Call activation endpoint]         │
       │                            │──POST /api/vpn/activate─> │
       │                            │                           │
       │                            │        [Set expiration]   │
       │                            │        [Update database]  │
       │                            │                           │
       │                            │<─(Success response)─────  │
       │                            │                           │
       │<────(VPN Access Allowed)─  │                           │
       │                            │                           │
```

### Step-by-Step

1. **User connects to VPN**
   - X-UI receives connection request from client
   - X-UI validates user credentials

2. **X-UI detects first connection**
   - Check: Is this user's first connection ever?
   - If yes, proceed to step 3
   - If no, skip activation (already done)

3. **X-UI retrieves user's token**
   - From: Purchase email or ChinaConnect API
   - Format: Long hex string (64 characters)
   - Store in: X-UI user profile if not already stored

4. **X-UI calls activation endpoint**
   ```javascript
   const response = await fetch('https://chinaconnect.example.com/api/vpn/activate', {
     method: 'POST',
     headers: {
       'Content-Type': 'application/json',
       'Authorization': `Bearer ${userToken}`
     },
     body: JSON.stringify({
       token: userVpnToken,
       productId: userProductId  // optional
     })
   });
   ```

5. **Process response**
   - If success: Store `expires_at` date (optional, for reference)
   - If already activated: No action needed (idempotent)
   - If error: Log error, allow connection anyway (shouldn't block VPN)

6. **Allow or deny VPN connection**
   - Check: Is expiration date > NOW?
   - If yes: Allow connection
   - If no: Deny connection, tell user to renew

---

## 💻 Implementation Examples

### Example 1: Node.js/Express Backend

```javascript
// In X-UI backend, when first connection detected

async function activateVpnForUser(userToken, productId) {
  try {
    const response = await fetch('https://chinaconnect.example.com/api/vpn/activate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`
      },
      body: JSON.stringify({
        token: userToken,
        productId: productId  // e.g., 'vpn-7days'
      })
    });

    const data = await response.json();

    if (data.success) {
      console.log(`User VPN activated. Expires: ${data.expires_at}`);
      console.log(`Days remaining: ${data.days_remaining}`);
      
      // Store for reference
      await saveUserVpnExpiration(userId, {
        activated_at: data.activated_at,
        expires_at: data.expires_at
      });
      
      return true;
    } else {
      console.warn(`Activation failed: ${data.error}`);
      // Don't block VPN, just log
      return false;
    }
  } catch (error) {
    console.error('Activation API error:', error);
    // Network error - allow VPN anyway
    return false;
  }
}

// When user connects to VPN
app.post('/vpn/connect', async (req, res) => {
  const { userId, username, password } = req.body;
  
  // Validate user
  const user = await validateXUIUser(username, password);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Check if first connection
  const isFirstConnection = !user.vpn_first_connected_at;
  
  if (isFirstConnection && user.chinaconnect_token) {
    // Activate on ChinaConnect
    await activateVpnForUser(user.chinaconnect_token, user.product_id);
    
    // Mark as connected
    await updateUser(userId, {
      vpn_first_connected_at: new Date()
    });
  }

  // Check expiration
  const expirationDate = new Date(user.chinaconnect_expires_at);
  if (expirationDate < new Date()) {
    return res.status(403).json({ error: 'VPN access expired. Please purchase again.' });
  }

  // Allow connection
  res.json({ success: true, message: 'VPN access granted' });
});
```

### Example 2: Python/Flask Backend

```python
import requests
from datetime import datetime

def activate_vpn_for_user(user_token, product_id):
    """
    Call ChinaConnect activation endpoint
    """
    url = 'https://chinaconnect.example.com/api/vpn/activate'
    
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {user_token}'
    }
    
    payload = {
        'token': user_token,
        'productId': product_id
    }
    
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        
        if data.get('success'):
            print(f"Activation successful. Expires: {data['expires_at']}")
            print(f"Days remaining: {data['days_remaining']}")
            return data
        else:
            print(f"Activation failed: {data.get('error')}")
            return None
            
    except requests.exceptions.RequestException as e:
        print(f"API error: {e}")
        # Don't block VPN on network errors
        return None

@app.route('/vpn/connect', methods=['POST'])
def vpn_connect():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    
    # Validate user
    user = validate_xui_user(username, password)
    if not user:
        return jsonify({'error': 'Invalid credentials'}), 401
    
    # Check if first connection
    if not user.get('vpn_first_connected_at') and user.get('chinaconnect_token'):
        # Activate on ChinaConnect
        result = activate_vpn_for_user(
            user['chinaconnect_token'],
            user.get('product_id', 'vpn-7days')
        )
        
        if result:
            # Store expiration for local checks
            update_user(user['id'], {
                'chinaconnect_expires_at': result['expires_at'],
                'vpn_first_connected_at': datetime.now().isoformat()
            })
    
    # Check expiration
    expires_at = user.get('chinaconnect_expires_at')
    if expires_at and datetime.fromisoformat(expires_at) < datetime.now():
        return jsonify({'error': 'VPN access expired. Please purchase again.'}), 403
    
    # Allow connection
    return jsonify({'success': True, 'message': 'VPN access granted'})
```

### Example 3: Go Backend

```go
package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

type ActivationRequest struct {
	Token     string `json:"token"`
	ProductID string `json:"productId,omitempty"`
}

type ActivationResponse struct {
	Success       bool   `json:"success"`
	ActivatedAt   string `json:"activated_at"`
	ExpiresAt     string `json:"expires_at"`
	ProductID     string `json:"product_id"`
	DaysRemaining int    `json:"days_remaining"`
	Error         string `json:"error,omitempty"`
}

func activateVpnForUser(userToken, productID string) (*ActivationResponse, error) {
	url := "https://chinaconnect.example.com/api/vpn/activate"
	
	reqBody := ActivationRequest{
		Token:     userToken,
		ProductID: productID,
	}
	
	jsonBody, _ := json.Marshal(reqBody)
	
	req, _ := http.NewRequest("POST", url, bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", userToken))
	
	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		fmt.Printf("API error: %v\n", err)
		return nil, err
	}
	defer resp.Body.Close()
	
	body, _ := io.ReadAll(resp.Body)
	
	var result ActivationResponse
	json.Unmarshal(body, &result)
	
	if result.Success {
		fmt.Printf("Activation successful. Expires: %s\n", result.ExpiresAt)
	} else {
		fmt.Printf("Activation failed: %s\n", result.Error)
	}
	
	return &result, nil
}

func vpnConnect(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	json.NewDecoder(r.Body).Decode(&req)
	
	// Validate user
	user, err := validateXUIUser(req.Username, req.Password)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid credentials"})
		return
	}
	
	// Check if first connection
	if user.VPNFirstConnectedAt.IsZero() && user.ChinaConnectToken != "" {
		// Activate on ChinaConnect
		result, _ := activateVpnForUser(user.ChinaConnectToken, user.ProductID)
		
		if result != nil && result.Success {
			// Store expiration
			updateUser(user.ID, map[string]interface{}{
				"chinaconnect_expires_at":   result.ExpiresAt,
				"vpn_first_connected_at":    time.Now(),
			})
		}
	}
	
	// Check expiration
	if user.ChinaConnectExpiresAt.Before(time.Now()) {
		w.WriteHeader(http.StatusForbidden)
		json.NewEncoder(w).Encode(map[string]string{"error": "VPN access expired"})
		return
	}
	
	// Allow connection
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "VPN access granted",
	})
}
```

---

## 🔍 How to Get the User's Token

The user receives their token in the purchase confirmation email from ChinaConnect. 

### Token Location in Email

```
Subject: 您的 VPN 7-Day Pass 已准备好！(Your VPN 7-Day Pass is Ready!)

Body:
...
您的 VPN 地址：vless://[address]

重要提示：您的 7 天使用期限从您首次使用该 VPN 地址时开始计算

以下是您的访问令牌（用于服务验证）：
[ACCESS_TOKEN_HERE - 64 character hex string]
...
```

### Storing in X-UI

You should store this token in your X-UI database when:
1. User first purchases VPN (from email)
2. User syncs their purchases from ChinaConnect
3. User enters it manually in settings

**Suggested storage**:
```sql
-- In your X-UI users/subscriptions table
ALTER TABLE users ADD COLUMN chinaconnect_token VARCHAR(255);
ALTER TABLE users ADD COLUMN chinaconnect_product_id VARCHAR(50);
ALTER TABLE users ADD COLUMN chinaconnect_expires_at TIMESTAMP;
ALTER TABLE users ADD COLUMN chinaconnect_activated_at TIMESTAMP;
ALTER TABLE users ADD COLUMN vpn_first_connected_at TIMESTAMP;
```

---

## ⏰ When to Call Activation

### Correct: When First Connection is Detected

```
✅ User connects to X-UI VPN for the first time
   → X-UI hasn't seen this user before
   → Call activation endpoint
   → Set expiration on ChinaConnect side
```

### Incorrect: Every Time User Connects

```
❌ WRONG: Call on every connection
   → Activation is idempotent but unnecessary
   → Causes extra API calls
   → Worse performance
```

### Best Practice: One-Time Check

```javascript
// Pseudo-code
if (!user.vpn_first_connected_at && user.chinaconnect_token) {
  // Only activate on first connection ever
  await activateVpn(user.chinaconnect_token);
  user.vpn_first_connected_at = now;
}

// Subsequent connections - just check expiration
if (user.chinaconnect_expires_at > now) {
  allowVpnConnection();
} else {
  denyVpnConnection('Expired');
}
```

---

## 🔒 Security Considerations

### Token Handling

✅ **DO**:
- Store tokens securely (encrypted in database)
- Use HTTPS for API calls
- Validate tokens before using
- Include in Authorization header (not URL params)

❌ **DON'T**:
- Log tokens in plaintext
- Send tokens in URL parameters
- Store in frontend/client
- Share tokens between users

### API Key Storage (if using server-to-server)

✅ **DO**:
- Store in environment variables
- Rotate regularly
- Use separate keys per integration
- Monitor API key usage

❌ **DON'T**:
- Hardcode in source code
- Commit to git
- Share with client applications

---

## 🧪 Testing the Integration

### Test Case 1: First Connection

```
1. User purchases VPN on ChinaConnect
2. User receives email with token
3. X-UI user connects to VPN for first time
4. X-UI calls activation endpoint with token
5. ChinaConnect responds with activation success
6. Verify: expires_at is set to NOW + product_days
```

### Test Case 2: Idempotency

```
1. Call activation endpoint
2. Immediately call again with same token
3. Verify: Returns same activation times (idempotent)
4. No error should occur
```

### Test Case 3: Expired Subscription

```
1. X-UI checks expired token
2. Call activation endpoint with expired token
3. Verify: Response indicates token is expired
4. VPN connection should be denied
```

### Test Case 4: Invalid Token

```
1. Call activation endpoint with invalid token
2. Verify: Response error = TOKEN_NOT_FOUND
3. VPN connection can still be allowed (optional based on policy)
```

---

## 🐛 Troubleshooting

### Issue: Activation endpoint returns 404

**Cause**: Endpoint not yet implemented on ChinaConnect  
**Solution**: Confirm endpoint is deployed on correct server

### Issue: Token not found error

**Cause**: Token doesn't exist or is wrong format  
**Solution**: Verify token from user's purchase email

### Issue: Network timeout

**Cause**: Server unreachable or very slow  
**Solution**: Add retry logic, don't block VPN, log for monitoring

### Issue: Idempotent endpoint keeps updating

**Cause**: Different times on each call  
**Solution**: This is normal - activation timestamp is when first called

### Issue: Email not containing token

**Cause**: Old ChinaConnect version or email formatting issue  
**Solution**: Check with ChinaConnect admin that emails include token

---

## 📞 Integration Support

### Implementation Checklist

- [ ] Identify where first-connection is detected in X-UI code
- [ ] Add logic to retrieve/store user's ChinaConnect token
- [ ] Implement activation API call
- [ ] Handle activation response/errors
- [ ] Update user expiration tracking
- [ ] Test with real purchase token
- [ ] Deploy to production
- [ ] Monitor API calls and errors
- [ ] Set up alerts for activation failures

### Questions to Ask ChinaConnect Admin

1. What is the exact endpoint URL for production?
2. Should we use user token or API key for authentication?
3. What happens if user never activates? (Does access timeout?)
4. Can users have multiple active VPN tokens?
5. What's the rate limit on activation endpoint?

---

## 📚 Reference

**Related Files**:
- `services/userService.ts` - Contains `activateAccessToken()` function
- `VPN_ACTIVATION_IMPLEMENTATION_GUIDE.md` - Technical details
- `IMPLEMENTATION_SUMMARY.md` - Admin operations info

**X-UI Considerations**:
- Each VPN connection should only trigger activation once
- Store expiration date for fast local checking
- Call activation asynchronously (don't block connection)
- Handle network failures gracefully

---

**Status**: Ready for X-UI integration  
**Next Step**: Implement activation endpoint call in X-UI backend

