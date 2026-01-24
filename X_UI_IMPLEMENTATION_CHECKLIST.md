# X-UI Integration Implementation Checklist

## Quick Overview

X-UI needs to notify ChinaConnect when a user **first connects to VPN**. This allows ChinaConnect to set the correct expiration date (from activation time, not purchase time).

---

## 🎯 What X-UI Must Do

```
When user connects to X-UI VPN for FIRST TIME:
  1. Get user's ChinaConnect token (from email or stored)
  2. Call: POST /api/vpn/activate
  3. Send: { token, productId }
  4. Receive: { expires_at, activated_at }
  5. Store expiration locally for fast checking
  6. Allow VPN connection
```

---

## 📋 Implementation Steps

### Step 1: Identify Connection Detection Code
- [ ] Find where X-UI detects user VPN connection
- [ ] Locate where to add "first connection" check
- [ ] Determine how to flag users as "first_connected"

**Look for**: Connection handlers, authentication code, session creation

### Step 2: Get User's ChinaConnect Token
- [ ] Decide storage location (database column, config, file)
- [ ] Plan how users add their token (import, manual entry, sync)
- [ ] Create UI/API to store token
- [ ] Test token retrieval

**Storage options**:
```sql
-- Option A: User table column
ALTER TABLE users ADD COLUMN chinaconnect_token VARCHAR(255);

-- Option B: Separate tokens table
CREATE TABLE user_tokens (
  user_id INT,
  chinaconnect_token VARCHAR(255),
  product_id VARCHAR(50),
  expires_at TIMESTAMP,
  activated_at TIMESTAMP
);

-- Option C: Config file
{
  "users": {
    "username": {
      "chinaconnect_token": "abc123..."
    }
  }
}
```

### Step 3: Add Activation Call
- [ ] Add HTTP client library (if not present)
- [ ] Create activation function
- [ ] Add error handling
- [ ] Test API call

**Code location**: Connection handler

```javascript
// Pseudo-code
async function handleVpnConnect(user) {
  // Check if first connection
  if (!user.first_connected && user.chinaconnect_token) {
    // Call ChinaConnect activation
    await activateOnChinaConnect(user.chinaconnect_token);
    user.first_connected = true;
  }
  
  // Allow connection
  return true;
}
```

### Step 4: Handle Response
- [ ] Store activation response
- [ ] Handle errors gracefully
- [ ] Don't block VPN on activation failure
- [ ] Log for monitoring

**Handle these cases**:
```javascript
// Success
{
  "success": true,
  "expires_at": "2026-02-01T15:00:00Z",
  "activated_at": "2026-01-25T15:00:00Z"
}

// Already activated (idempotent)
{
  "success": true,
  "error": "TOKEN_ALREADY_ACTIVATED",
  "expires_at": "2026-02-01T15:00:00Z"
}

// Invalid token
{
  "success": false,
  "error": "TOKEN_NOT_FOUND"
}

// Network error
// → Allow VPN anyway, don't block user
```

### Step 5: Local Expiration Checking
- [ ] Store `expires_at` locally
- [ ] Check expiration before allowing connection
- [ ] Fast local check (no API call)
- [ ] Optional: Display expiration countdown to user

```javascript
// Quick expiration check
function isVpnStillValid(user) {
  const expiresAt = new Date(user.chinaconnect_expires_at);
  return expiresAt > new Date();
}

// Before allowing VPN
if (!isVpnStillValid(user)) {
  return "VPN expired. Please purchase again.";
}
```

### Step 6: Testing
- [ ] Test with real token from purchase email
- [ ] Test first connection → activation called
- [ ] Test second connection → activation NOT called
- [ ] Test expired token → connection denied
- [ ] Test network failure → VPN allowed anyway

---

## 💻 Code Template (Choose Your Language)

### Node.js/Express
```javascript
const axios = require('axios');

async function activateVpnOnFirstConnection(user) {
  try {
    // Only on first connection
    if (user.vpn_first_connected_at) {
      return true; // Already activated
    }

    // Call ChinaConnect
    const response = await axios.post(
      'https://chinaconnect.example.com/api/vpn/activate',
      {
        token: user.chinaconnect_token,
        productId: user.chinaconnect_product_id
      },
      {
        headers: {
          'Authorization': `Bearer ${user.chinaconnect_token}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    if (response.data.success) {
      // Update user with expiration
      user.chinaconnect_activated_at = response.data.activated_at;
      user.chinaconnect_expires_at = response.data.expires_at;
      user.vpn_first_connected_at = new Date();
      
      console.log(`VPN activated for ${user.username}, expires: ${response.data.expires_at}`);
      return true;
    } else {
      console.warn(`Activation failed: ${response.data.error}`);
      return false;
    }
  } catch (error) {
    console.error('Activation API error:', error.message);
    // Don't block VPN on network errors
    return true;
  }
}

// In connection handler
app.post('/vpn/connect', async (req, res) => {
  const { username, password } = req.body;
  const user = await validateUser(username, password);
  
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Activate on first connection
  if (user.chinaconnect_token) {
    await activateVpnOnFirstConnection(user);
  }

  // Check expiration
  const expiresAt = new Date(user.chinaconnect_expires_at);
  if (expiresAt < new Date()) {
    return res.status(403).json({ error: 'VPN expired' });
  }

  // Allow connection
  res.json({ success: true });
});
```

### Python/Flask
```python
import requests
from datetime import datetime

def activate_vpn_on_first_connection(user):
    try:
        # Only on first connection
        if user.get('vpn_first_connected_at'):
            return True
        
        # Call ChinaConnect
        response = requests.post(
            'https://chinaconnect.example.com/api/vpn/activate',
            json={
                'token': user['chinaconnect_token'],
                'productId': user.get('chinaconnect_product_id')
            },
            headers={
                'Authorization': f"Bearer {user['chinaconnect_token']}",
                'Content-Type': 'application/json'
            },
            timeout=10
        )
        
        data = response.json()
        
        if data.get('success'):
            # Update user
            user['chinaconnect_activated_at'] = data['activated_at']
            user['chinaconnect_expires_at'] = data['expires_at']
            user['vpn_first_connected_at'] = datetime.now().isoformat()
            
            print(f"VPN activated for {user['username']}, expires: {data['expires_at']}")
            return True
        else:
            print(f"Activation failed: {data.get('error')}")
            return False
            
    except Exception as e:
        print(f"Activation error: {e}")
        return True  # Don't block on error

@app.route('/vpn/connect', methods=['POST'])
def vpn_connect():
    data = request.json
    user = validate_user(data['username'], data['password'])
    
    if not user:
        return {'error': 'Invalid credentials'}, 401
    
    # Activate on first connection
    if user.get('chinaconnect_token'):
        activate_vpn_on_first_connection(user)
    
    # Check expiration
    if user.get('chinaconnect_expires_at'):
        expires = datetime.fromisoformat(user['chinaconnect_expires_at'])
        if expires < datetime.now():
            return {'error': 'VPN expired'}, 403
    
    return {'success': True}
```

### Go
```go
package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

func activateVpnOnFirstConnection(user *User) error {
	// Only on first connection
	if !user.VPNFirstConnectedAt.IsZero() {
		return nil // Already activated
	}

	// Prepare request
	reqBody := map[string]string{
		"token":       user.ChinaConnectToken,
		"productId":   user.ChinaConnectProductID,
	}
	jsonBody, _ := json.Marshal(reqBody)

	req, _ := http.NewRequest(
		"POST",
		"https://chinaconnect.example.com/api/vpn/activate",
		bytes.NewBuffer(jsonBody),
	)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", user.ChinaConnectToken))

	// Call API
	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		fmt.Printf("Activation error: %v\n", err)
		return nil // Don't block on error
	}
	defer resp.Body.Close()

	// Parse response
	var result map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&result)

	if result["success"].(bool) {
		// Update user
		user.ChinaConnectActivatedAt = result["activated_at"].(string)
		user.ChinaConnectExpiresAt = result["expires_at"].(string)
		user.VPNFirstConnectedAt = time.Now()

		fmt.Printf("VPN activated for %s, expires: %s\n", 
			user.Username, user.ChinaConnectExpiresAt)
		return nil
	}

	fmt.Printf("Activation failed: %v\n", result["error"])
	return nil
}

func vpnConnect(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	json.NewDecoder(r.Body).Decode(&req)

	user, err := validateUser(req.Username, req.Password)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid credentials"})
		return
	}

	// Activate on first connection
	if user.ChinaConnectToken != "" {
		activateVpnOnFirstConnection(user)
	}

	// Check expiration
	expiresAt, _ := time.Parse(time.RFC3339, user.ChinaConnectExpiresAt)
	if expiresAt.Before(time.Now()) {
		w.WriteHeader(http.StatusForbidden)
		json.NewEncoder(w).Encode(map[string]string{"error": "VPN expired"})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"success": true})
}
```

---

## 🧪 Testing Checklist

### Pre-Testing Setup
- [ ] Have a ChinaConnect test purchase with email token
- [ ] X-UI code updated with activation logic
- [ ] X-UI can store/retrieve ChinaConnect token
- [ ] X-UI has HTTP client configured

### Test 1: First Connection Triggers Activation
```
Steps:
1. X-UI user connects for first time
2. Check logs: Activation API called
3. Check: expires_at and activated_at set
4. Verify: VPN connection allowed
```

### Test 2: Second Connection Skips Activation
```
Steps:
1. Same user connects again
2. Check logs: Activation API NOT called
3. Verify: VPN connection allowed immediately
```

### Test 3: Expired VPN Denies Connection
```
Steps:
1. Set user's expires_at to past date
2. User tries to connect
3. Verify: Connection denied with "expired" message
```

### Test 4: Network Failure Allows Connection
```
Steps:
1. Block/disable ChinaConnect API temporarily
2. User connects
3. Verify: VPN connection allowed anyway (don't block)
4. Check logs: Error logged
```

### Test 5: Invalid Token Handled
```
Steps:
1. Set user's token to invalid value
2. User connects
3. Check logs: "Token not found" error
4. Verify: VPN connection allowed anyway (graceful degradation)
```

---

## 🚀 Deployment Steps

### Phase 1: Development
- [ ] Implement activation call
- [ ] Test with test token
- [ ] Verify idempotency
- [ ] Error handling working

### Phase 2: Staging
- [ ] Deploy to staging X-UI
- [ ] Test with real ChinaConnect test API
- [ ] Verify logs and monitoring
- [ ] Load testing (if applicable)

### Phase 3: Production
- [ ] Deploy to production X-UI
- [ ] Monitor activation calls
- [ ] Check for errors/failures
- [ ] Verify VPN connections working

### Phase 4: Monitoring
- [ ] Set up alerts for activation failures
- [ ] Track activation rate
- [ ] Monitor API response times
- [ ] Check for network timeouts

---

## ❓ Common Questions

### Q: What if user doesn't have ChinaConnect token?
A: Check if token exists, skip activation if not. VPN works as before.

### Q: What if activation fails?
A: Allow VPN anyway (don't block user). Log error for investigation.

### Q: Can we call activation every time?
A: Yes (idempotent), but unnecessary. Only do on first connection.

### Q: How do we know it's the first connection?
A: Store flag in database: `vpn_first_connected_at` or `activation_done`

### Q: What about the user's local VPN expiration check?
A: Optional. Can check ChinaConnect API or trust local database.

### Q: If network fails, what happens?
A: VPN allowed immediately. Activation will happen on next connection attempt.

---

## 📞 Support & Questions

**X-UI Integration Documentation**: `X_UI_INTEGRATION_GUIDE.md`
**ChinaConnect VPN Logic**: `VPN_ACTIVATION_IMPLEMENTATION_GUIDE.md`
**Quick Reference**: `QUICK_REFERENCE.md`

---

## Completion Checklist

- [ ] Code updated to detect first connection
- [ ] ChinaConnect token storage implemented
- [ ] Activation API call implemented
- [ ] Error handling added
- [ ] Local expiration checking added
- [ ] Logging implemented
- [ ] All tests passed
- [ ] Deployed to production
- [ ] Monitoring set up
- [ ] Team notified

---

**Status**: Ready for implementation  
**Documentation**: See `X_UI_INTEGRATION_GUIDE.md` for detailed specs
