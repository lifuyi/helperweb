# Database Schema for VPN Client Management

## Run these SQL commands in your Supabase SQL Editor

```sql
-- VPN Clients table - stores created VPN clients
CREATE TABLE IF NOT EXISTS vpn_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- X-UI Client details
  xui_client_uuid VARCHAR(255) NOT NULL UNIQUE,
  xui_inbound_id INTEGER NOT NULL,
  email VARCHAR(255) NOT NULL,
  
  -- VLESS URL
  vless_url TEXT NOT NULL,
  
  -- Expiration (managed by X-UI)
  product_id VARCHAR(50) NOT NULL,
  expiry_days INTEGER NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Status
  status VARCHAR(50) DEFAULT 'active',
  is_active BOOLEAN DEFAULT true,
  
  -- Management
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_vpn_clients_user_id ON vpn_clients(user_id);
CREATE INDEX IF NOT EXISTS idx_vpn_clients_xui_uuid ON vpn_clients(xui_client_uuid);
CREATE INDEX IF NOT EXISTS idx_vpn_clients_status ON vpn_clients(status);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_vpn_clients_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_vpn_clients_updated_at ON vpn_clients;
CREATE TRIGGER trigger_vpn_clients_updated_at
  BEFORE UPDATE ON vpn_clients
  FOR EACH ROW
  EXECUTE FUNCTION update_vpn_clients_updated_at();

-- Enable Row Level Security
ALTER TABLE vpn_clients ENABLE ROW LEVEL SECURITY;

-- Create policies (adjust based on your auth setup)
CREATE POLICY "Users can view their own VPN clients" ON vpn_clients
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create VPN clients" ON vpn_clients
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

## API Endpoints

### Create VPN Client (called after successful payment)
```
POST /api/vpn/create
Body: {
  "userId": "user-uuid",
  "email": "user@example.com",
  "productId": "vpn-3days",
  "sessionId": "cs_test_xxx"
}
```

### Get User's VPN Clients
```
GET /api/vpn/list?userId=xxx
```

## Example API Endpoints

### Create VPN Client (called after successful payment)
```
POST /api/vpn/create
Body: {
  "userId": "user-uuid",
  "email": "user@example.com",
  "productId": "vpn-3days",
  "sessionId": "cs_test_xxx" // Stripe session ID
}
```

### Activate VPN (called on first connection)
```
POST /api/vpn/activate
Body: {
  "token": "vpn-client-uuid"
}
```

### Get User's VPN Clients
```
GET /api/vpn/list?userId=xxx
```
