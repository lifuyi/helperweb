-- ============================================================================
-- Migration: Drop access_tokens table and related objects
-- This migration removes the access_tokens functionality as it has been
-- replaced by the vpn_urls table with VLESS protocol support.
-- ============================================================================

-- Drop the user_access_summary view
DROP VIEW IF EXISTS user_access_summary CASCADE;

-- Drop the access_tokens table
DROP TABLE IF EXISTS access_tokens CASCADE;

-- Note: The RLS policies for access_tokens will be automatically dropped
-- when the table is dropped with CASCADE.