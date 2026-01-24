-- ============================================================================
-- Extend vpn_urls table with VLESS-specific parameters and usage tracking
-- ============================================================================

-- Add VLESS-specific columns
ALTER TABLE vpn_urls
ADD COLUMN IF NOT EXISTS vless_uuid VARCHAR(36),
ADD COLUMN IF NOT EXISTS vless_host VARCHAR(255),
ADD COLUMN IF NOT EXISTS vless_port INTEGER,
ADD COLUMN IF NOT EXISTS protocol VARCHAR(10) DEFAULT 'tcp', -- tcp, udp
ADD COLUMN IF NOT EXISTS encryption VARCHAR(50) DEFAULT 'none',
ADD COLUMN IF NOT EXISTS security_type VARCHAR(20) DEFAULT 'none', -- none, tls, reality
ADD COLUMN IF NOT EXISTS fingerprint VARCHAR(100),
ADD COLUMN IF NOT EXISTS sni VARCHAR(255),
ADD COLUMN IF NOT EXISTS session_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS path VARCHAR(500),
ADD COLUMN IF NOT EXISTS vless_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS pbk TEXT; -- Public key for REALITY security

-- Add usage tracking columns
ALTER TABLE vpn_urls
ADD COLUMN IF NOT EXISTS traffic_used BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_accessed TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Create indexes on commonly queried VLESS fields
CREATE INDEX IF NOT EXISTS idx_vpn_urls_vless_uuid ON vpn_urls(vless_uuid);
CREATE INDEX IF NOT EXISTS idx_vpn_urls_vless_host ON vpn_urls(vless_host);
CREATE INDEX IF NOT EXISTS idx_vpn_urls_security_type ON vpn_urls(security_type);
CREATE INDEX IF NOT EXISTS idx_vpn_urls_protocol ON vpn_urls(protocol);
CREATE INDEX IF NOT EXISTS idx_vpn_urls_is_active ON vpn_urls(is_active);
CREATE INDEX IF NOT EXISTS idx_vpn_urls_last_accessed ON vpn_urls(last_accessed);

-- Add a unique constraint on VLESS UUID to prevent duplicates
ALTER TABLE vpn_urls
ADD CONSTRAINT unique_vless_uuid UNIQUE (vless_uuid);

-- Create a view for VLESS URL statistics
CREATE OR REPLACE VIEW vless_url_stats AS
SELECT 
  COUNT(*) as total_urls,
  COUNT(CASE WHEN status = 'active' THEN 1 END) as active_urls,
  COUNT(CASE WHEN status = 'used' THEN 1 END) as used_urls,
  COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_urls,
  COUNT(DISTINCT security_type) as security_types,
  COUNT(DISTINCT protocol) as protocols,
  SUM(traffic_used) as total_traffic_used,
  SUM(usage_count) as total_usage_count,
  AVG(usage_count) as avg_usage_count
FROM vpn_urls
WHERE is_active = TRUE;

-- Create a view for security type breakdown
CREATE OR REPLACE VIEW vless_security_breakdown AS
SELECT 
  security_type,
  COUNT(*) as count,
  COUNT(CASE WHEN status = 'active' THEN 1 END) as active_count,
  COUNT(CASE WHEN status = 'used' THEN 1 END) as used_count,
  COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_count,
  AVG(traffic_limit) as avg_traffic_limit,
  AVG(day_period) as avg_validity_days
FROM vpn_urls
WHERE is_active = TRUE
GROUP BY security_type;

-- Create a view for protocol breakdown
CREATE OR REPLACE VIEW vless_protocol_breakdown AS
SELECT 
  protocol,
  COUNT(*) as count,
  COUNT(CASE WHEN status = 'active' THEN 1 END) as active_count,
  COUNT(CASE WHEN status = 'used' THEN 1 END) as used_count,
  COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_count,
  AVG(traffic_limit) as avg_traffic_limit,
  AVG(day_period) as avg_validity_days
FROM vpn_urls
WHERE is_active = TRUE
GROUP BY protocol;

-- Add comments for documentation
COMMENT ON COLUMN vpn_urls.vless_uuid IS 'Extracted UUID from VLESS URL - unique identifier for the VPN connection';
COMMENT ON COLUMN vpn_urls.vless_host IS 'Server hostname or IP address extracted from VLESS URL';
COMMENT ON COLUMN vpn_urls.vless_port IS 'Connection port extracted from VLESS URL';
COMMENT ON COLUMN vpn_urls.protocol IS 'Protocol type: tcp or udp';
COMMENT ON COLUMN vpn_urls.encryption IS 'Encryption method used in VLESS protocol';
COMMENT ON COLUMN vpn_urls.security_type IS 'Security layer: none, tls, or reality';
COMMENT ON COLUMN vpn_urls.fingerprint IS 'TLS/REALITY fingerprint value (e.g., chrome, firefox)';
COMMENT ON COLUMN vpn_urls.sni IS 'Server Name Indication for TLS/REALITY handshake';
COMMENT ON COLUMN vpn_urls.session_id IS 'Session ID for REALITY security';
COMMENT ON COLUMN vpn_urls.path IS 'WebSocket or HTTP/2 path parameter';
COMMENT ON COLUMN vpn_urls.vless_name IS 'Name/alias for the VLESS URL (from URL fragment)';
COMMENT ON COLUMN vpn_urls.pbk IS 'Public key for REALITY security configuration';
COMMENT ON COLUMN vpn_urls.traffic_used IS 'Amount of traffic consumed in bytes';
COMMENT ON COLUMN vpn_urls.last_accessed IS 'Timestamp of last access/usage';
COMMENT ON COLUMN vpn_urls.usage_count IS 'Number of times this URL has been accessed';
COMMENT ON COLUMN vpn_urls.is_active IS 'Whether this URL is currently active and available for use';
