# VPN Client Creation - Debugging Guide

## Issue
Payment processes successfully but no VPN client created in X-UI panel.

## Solution: Check Vercel Logs

### Step 1: View Live Logs
```bash
vercel logs production --follow
```

Then trigger another test payment to see the logs in real-time.

### Step 2: Look for These Log Lines

**Success Case - You should see:**
```
[VPN] createVpnClient called: { userId: '...', email: 'test@example.com', productId: 'vpn-7days', sessionId: '...' }
[VPN] Product expiry days: { productId: 'vpn-7days', expiryDays: 7 }
[VPN] Checking for existing VPN client
[VPN] No existing client, proceeding with creation
[VPN] Calling createXuiClientWithExpiration
[VPN] Starting X-UI client creation for email: test@example.com
[VPN] X-UI client instance created successfully
[VPN] Fetching inbounds from X-UI
[VPN] Inbounds fetched: 1 inbound(s) available
[VPN] Using inbound: { id: 0, port: 443, protocol: 'vless' }
[VPN] Creating client with expiry: 7 days
[VPN] Client creation response: { uuid: '550e8400-e29b-41d4-a716-446655440000', ... }
[VPN] X-UI client created successfully: { uuid: '550e8400-e29b-41d4-a716-446655440000', inboundId: 0 }
```

**Failure Case - You'll see one of these errors:**

### Error 1: X-UI Connection Failed
```
[VPN] Failed to create X-UI client instance
X-UI login failed
```

**Solution:**
- Check `XUI_BASE_URL` is correct
- Verify X-UI server is running
- Test credentials: `XUI_USERNAME`, `XUI_PASSWORD`
- Test connection: `curl http://XUI_BASE_URL/login`

### Error 2: No Inbounds Available
```
[VPN] Inbounds fetched: 0 inbound(s) available
[VPN] No inbounds available in X-UI
```

**Solution:**
- Log into X-UI panel manually
- Create at least one inbound (e.g., VLESS on port 443)
- The app uses the first inbound, so make sure it exists

### Error 3: Client Creation Failed
```
[VPN] Client creation response: null
[VPN] Client creation returned null/false
```

**Solution:**
- Check X-UI logs for errors
- Verify inbound configuration is correct
- Check if email format is valid
- Test creating a client manually in X-UI

### Error 4: Missing X-UI Configuration
```
[VPN] X-UI login error: connection refused
```

**Solution:**
- Verify `XUI_BASE_URL` environment variable is set
- Check X-UI server is accessible from Vercel
- If X-UI is on private network, use ngrok or public URL

---

## Quick Checklist

- [ ] X-UI server is running
- [ ] X-UI is accessible at `XUI_BASE_URL`
- [ ] X-UI credentials are correct (username/password)
- [ ] At least one inbound exists in X-UI
- [ ] Inbound is configured for VLESS protocol
- [ ] Environment variables set on Vercel:
  - [ ] `XUI_BASE_URL`
  - [ ] `XUI_USERNAME`
  - [ ] `XUI_PASSWORD`
  - [ ] `VPN_SERVER_HOST`
  - [ ] `VPN_SERVER_PORT`
  - [ ] `VPN_SECURITY`
  - [ ] `VPN_SNI`

---

## How to Test

### Test 1: Manual X-UI Connection
```bash
# Test X-UI login
curl -X POST http://YOUR_XUI_URL/login \
  -d "username=admin&password=YOUR_PASSWORD" \
  -H "Content-Type: application/x-www-form-urlencoded"

# Should return cookie in response
```

### Test 2: Get Inbounds
```bash
# After getting cookie, fetch inbounds
curl http://YOUR_XUI_URL/panel/api/inbounds \
  -H "Cookie: [cookie from login]"

# Should return list of inbounds
```

### Test 3: Create Client Manually
```bash
# Prepare client data
CLIENT_DATA='{
  "id": 0,
  "settings": "{\"clients\": [{\"id\": \"test-uuid-here\", \"email\": \"test@example.com\", \"limitIp\": 1, \"totalGB\": 0, \"expiryTime\": 0, \"enable\": true}]}"
}'

# Create client
curl -X POST http://YOUR_XUI_URL/panel/api/inbounds/addClient \
  -d "$CLIENT_DATA" \
  -H "Cookie: [cookie]" \
  -H "Content-Type: application/json"
```

---

## X-UI Setup Requirements

If you haven't set up X-UI yet:

### 1. Install X-UI (Docker)
```bash
docker run -itd \
  -p 54321:54321 \
  -p 10000-10900:10000-10900 \
  --name x-ui \
  vaxilu/x-ui
```

### 2. Access X-UI Panel
- URL: `http://YOUR_SERVER_IP:54321`
- Default username: `admin`
- Default password: `admin`

### 3. Create Inbound
1. Go to Inbound List
2. Click "Add Inbound"
3. Select Protocol: **VLESS**
4. Port: **443**
5. Save

### 4. Get Public IP/Domain
- Set `VPN_SERVER_HOST` to your server's public IP or domain
- Set `VPN_SERVER_PORT` to the inbound port (443)
- Set `VPN_SECURITY` to protocol security (e.g., reality)

---

## Next Steps

1. Check Vercel logs with: `vercel logs production --follow`
2. Make a test payment
3. Look for [VPN] log messages
4. Identify which step is failing
5. Fix that specific step
6. Re-test

---

## Contact & Support

If logs show a specific error, reply with:
- The exact error message from logs
- Your X-UI configuration
- Environment variables set (hide secrets)

I can then provide specific fix!

