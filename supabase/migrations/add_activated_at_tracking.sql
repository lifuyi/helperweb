-- Migration: Add activation tracking for VPN products
-- Date: 2026-01-24
-- Purpose: Track when users activate their VPN/product access, separate from purchase time
--
-- Business Logic:
-- - VPN products (3, 7, 14, 30 days): Expiration = activation_time + X days
-- - PDF guide (365 days): Expiration = purchase_time + 365 days (no activation needed)
-- - Users can purchase but not activate VPN for days/weeks

-- Add activated_at column to access_tokens table
ALTER TABLE access_tokens ADD COLUMN IF NOT EXISTS activated_at TIMESTAMP NULL;

-- Add comment explaining the column
COMMENT ON COLUMN access_tokens.activated_at IS 
'Timestamp when user first activated the access (started using VPN or downloaded product).
For VPN products: expiration = activated_at + expiry_days
For PDF products: expiration = purchase_date + 365 days (activated_at not used)
NULL means not yet activated.';

-- Add activated_at column to vpn_urls table
ALTER TABLE vpn_urls ADD COLUMN IF NOT EXISTS activated_at TIMESTAMP NULL;

-- Add comment explaining the column
COMMENT ON COLUMN vpn_urls.activated_at IS 
'Timestamp when user first activated/used the VPN URL.
assigned_at = when URL was assigned to user (at purchase)
activated_at = when user first actually used the URL (managed by X-UI system)
Used to calculate actual expiration: activated_at + day_period';

-- Create index on activated_at for faster queries
CREATE INDEX IF NOT EXISTS idx_access_tokens_activated_at ON access_tokens(activated_at);
CREATE INDEX IF NOT EXISTS idx_vpn_urls_activated_at ON vpn_urls(activated_at);

-- Create index on user_id + activated_at for efficient user queries
CREATE INDEX IF NOT EXISTS idx_access_tokens_user_activated ON access_tokens(user_id, activated_at);
CREATE INDEX IF NOT EXISTS idx_vpn_urls_user_activated ON vpn_urls(assigned_to_user_id, activated_at);
