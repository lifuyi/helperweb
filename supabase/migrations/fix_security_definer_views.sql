-- Migration: Fix SECURITY DEFINER views to use SECURITY INVOKER
-- This addresses the Supabase database linter security warnings
-- Views affected: vless_url_stats, vless_protocol_breakdown, vless_security_breakdown, user_access_summary

-- Fix 1: vless_url_stats view
-- Changes from SECURITY DEFINER to SECURITY INVOKER to enforce RLS policies of the querying user
ALTER VIEW public.vless_url_stats SET (security_invoker = on);

-- Fix 2: vless_protocol_breakdown view
-- Changes from SECURITY DEFINER to SECURITY INVOKER to enforce RLS policies of the querying user
ALTER VIEW public.vless_protocol_breakdown SET (security_invoker = on);

-- Fix 3: vless_security_breakdown view
-- Changes from SECURITY DEFINER to SECURITY INVOKER to enforce RLS policies of the querying user
ALTER VIEW public.vless_security_breakdown SET (security_invoker = on);

-- Fix 4: user_access_summary view
-- Changes from SECURITY DEFINER to SECURITY INVOKER to enforce RLS policies of the querying user
ALTER VIEW public.user_access_summary SET (security_invoker = on);

-- Verification comments:
-- After applying this migration:
-- 1. Views will execute with the permissions of the querying user (not the creator)
-- 2. Row Level Security (RLS) policies on underlying tables will be properly enforced
-- 3. Users will only see data they are authorized to see based on RLS policies
-- 4. Run `supabase db lint` to verify the security warnings are resolved