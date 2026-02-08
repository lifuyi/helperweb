/**
 * Shared Supabase Client Singleton
 * Ensures only one GoTrueClient instance exists across the application
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

declare const __SUPABASE_URL__: string;
declare const __SUPABASE_ANON_KEY__: string;

const supabaseUrl = (typeof __SUPABASE_URL__ !== 'undefined' ? __SUPABASE_URL__ : '') 
  || (import.meta as any)?.env?.VITE_SUPABASE_URL 
  || process.env.VITE_SUPABASE_URL 
  || process.env.SUPABASE_URL 
  || '';

const supabaseAnonKey = (typeof __SUPABASE_ANON_KEY__ !== 'undefined' ? __SUPABASE_ANON_KEY__ : '') 
  || (import.meta as any)?.env?.VITE_SUPABASE_ANON_KEY 
  || process.env.VITE_SUPABASE_ANON_KEY 
  || process.env.SUPABASE_ANON_KEY 
  || '';

let supabaseInstance: SupabaseClient | null = null;

// Singleton getter - creates instance on first access
export function getSupabaseClient(): SupabaseClient {
  if (!supabaseInstance) {
    // Additional check at runtime
    const url = supabaseUrl || process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
    const key = supabaseAnonKey || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
    
    if (!url || !key) {
      throw new Error('Missing Supabase configuration');
    }
    supabaseInstance = createClient(url, key);
  }
  return supabaseInstance;
}

// Export singleton instance for backward compatibility
export const supabase: SupabaseClient = getSupabaseClient();
