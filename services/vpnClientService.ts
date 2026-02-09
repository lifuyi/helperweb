/**
 * VPN Client Service
 * Creates X-UI VPN clients with expiration and stores VLESS URLs
 */

import { createClient } from '@supabase/supabase-js';
import { XuiApiClient } from './xuiClient.js';
import { generateVlessUrlFromXui, parseVlessUrl } from '../utils/vlessGenerator.js';
import { sendVpnCredentialsEmail } from '../api/email/send/vpn.js';
import { logger } from '../utils/logger.js';
import { getExpiryDaysForProduct } from '../config/products.js';

/**
 * Get Supabase service role client for admin operations
 * This bypasses RLS policies for creating VPN clients
 */
function getSupabaseServiceClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error('[VPN] Missing Supabase service role configuration');
    throw new Error('Supabase service role configuration missing');
  }

  return createClient(url, key);
}

// Use service role client for VPN operations
const supabase = getSupabaseServiceClient();

export interface VpnClientRecord {
  id: string;
  user_id: string;
  xui_client_uuid: string;
  xui_inbound_id: number;
  email: string;
  vless_url: string;
  product_id: string;
  expiry_days: number;
  expires_at: string;
  status: string;
  is_active: boolean;
  created_at: string;
  day_period?: number;
  traffic_limit?: number;
  vless_uuid?: string;
  vless_host?: string;
  vless_port?: number;
  security_type?: string;
}

export interface CreateVpnClientRequest {
  userId: string;
  email: string;
  productId: string;
  sessionId: string;
}

/**
 * Ensure user exists in the users table
 */
async function ensureUserExists(userId: string, email: string): Promise<void> {
  try {
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();

    if (!existingUser) {
      console.log('[VPN] Creating placeholder user:', userId);
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          id: userId,
          email: email,
          username: email.split('@')[0],
        });

      if (insertError) {
        console.error('[VPN] Failed to create placeholder user:', insertError);
        throw insertError;
      }
      console.log('[VPN] Placeholder user created successfully');
    }
  } catch (error) {
    console.error('[VPN] Error in ensureUserExists:', error);
    throw error;
  }
}

export async function createVpnClient(request: CreateVpnClientRequest): Promise<{
  success: boolean;
  client?: VpnClientRecord;
  error?: string;
  details?: any;
  code?: string;
}> {
  const { userId, email, productId, sessionId } = request;

  try {
    console.log('[VPN] createVpnClient called:', { userId, email, productId, sessionId });
    
    // Ensure user exists in the database
    await ensureUserExists(userId, email);
    
    const expiryDays = getExpiryDaysForProduct(productId);
    console.log('[VPN] Product expiry days:', { productId, expiryDays });
    
    if (expiryDays <= 0) {
      console.error('[VPN] Invalid expiry days:', expiryDays);
      return { success: false, error: 'Invalid product' };
    }

    // Use user's email directly from Stripe checkout
    const uniqueEmail = email;
    console.log('[VPN] Using user email for VPN client:', uniqueEmail);
    
    console.log('[VPN] Proceeding to create new VPN client');
    console.log('[VPN] Calling createXuiClientWithExpiration');
    const xuiResult = await createXuiClientWithExpiration(uniqueEmail, expiryDays);
    if (!xuiResult) {
      console.error('[VPN] X-UI client creation returned null');
      return { success: false, error: 'Failed to create X-UI client' };
    }
    console.log('[VPN] X-UI client created:', xuiResult);

    // Use X-UI expiry time if available, otherwise calculate ourselves
    let expiresAt: string | null = null;
    if (xuiResult.expiryTime && xuiResult.expiryTime > 0) {
      expiresAt = new Date(xuiResult.expiryTime).toISOString();
    } else if (expiryDays > 0) {
      // Fallback: calculate expiry time ourselves
      // Today (purchase day) is FREE. Next X days are paid. Expires at 00:00 after paid days.
      // e.g., 3 days paid on Feb 6 -> expires Feb 10 00:00 (6 free, 7/8/9 are 3 paid days)
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + expiryDays + 1);
      expiryDate.setHours(0, 0, 0, 0);
      expiresAt = expiryDate.toISOString();
    }

    const inboundHost = process.env.VPN_SERVER_HOST || 'vpn.example.com';
    const inboundPort = parseInt(process.env.VPN_SERVER_PORT || '443');
    const security = process.env.VPN_SECURITY || 'reality';
    const sni = process.env.VPN_SNI || 'example.com';
    
    const vlessUrl = generateVlessUrlFromXui(
      inboundHost,
      inboundPort,
      xuiResult.uuid,
      uniqueEmail,
      {
        security,
        sni,
        fp: 'chrome',
      }
    );

    // Parse VLESS URL to extract components
    const parsedUrl = parseVlessUrl(vlessUrl);

    const { data: vpnClient, error: dbError } = await supabase
      ?.from('vpn_urls')
      .insert({
        assigned_to_user_id: userId,
        url: vlessUrl,
        vless_url: vlessUrl,
        vless_uuid: xuiResult.uuid,
        vless_host: inboundHost,
        vless_port: inboundPort,
        product_id: productId,
        day_period: expiryDays,
        traffic_limit: 0, // Unlimited by default
        protocol: 'tcp',
        encryption: 'none',
        security_type: security,
        fingerprint: 'chrome',
        sni: sni,
        vless_name: uniqueEmail,
        status: 'active',
        is_active: true,
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (dbError || !vpnClient) {
      console.error('[VPN] Database error details:', {
        message: dbError?.message,
        code: dbError?.code,
        details: dbError?.details,
        hint: dbError?.hint,
        userId,
        productId,
        xuiResult
      });
      logger.error('Failed to save VPN client:', dbError);
      await cleanupXuiClient(xuiResult.inboundId, xuiResult.uuid);
      return { 
        success: false, 
        error: 'Failed to save VPN client', 
        details: dbError?.message || 'Unknown database error',
        code: dbError?.code
      };
    }

    const emailSent = await sendVpnCredentialsEmail({
      userEmail: email,
      userName: email.split('@')[0],
      productName: productId.replace('vpn-', '').replace('days', ' Day').replace(/(\d+)/, '$1 '),
      expiryDays: expiryDays,
      vlessUrl: vlessUrl,
      vlessConfig: {
        uuid: xuiResult.uuid,
        host: inboundHost,
        port: inboundPort,
        security: process.env.VPN_SECURITY || 'reality',
      },
      expiresAt: expiresAt,
    });

    if (!emailSent) {
      logger.warn(`Failed to send VPN email to ${email}`);
    }

    logger.log(`VPN client created: ${vpnClient.id}`);

    return { success: true, client: vpnClient };
  } catch (error) {
    logger.error('Error creating VPN client:', error);
    return { success: false, error: 'Internal server error' };
  }
}

async function createXuiClientWithExpiration(
  email: string,
  expiryDays: number
): Promise<{ uuid: string; inboundId: number; expiryTime: number } | null> {
  try {
    console.log('[VPN] Starting X-UI client creation for email:', email);
    
    const xui = await createDefaultXuiClient();
    if (!xui) {
      console.error('[VPN] Failed to create X-UI client instance');
      logger.error('Failed to create X-UI API client');
      return null;
    }
    console.log('[VPN] X-UI client instance created successfully');

    console.log('[VPN] Fetching inbounds from X-UI');
    const inbounds = await xui.getInbounds();
    console.log('[VPN] Inbounds fetched:', inbounds.length, 'inbound(s) available');
    
    if (inbounds.length === 0) {
      console.error('[VPN] No inbounds available in X-UI');
      logger.error('No inbounds available');
      return null;
    }

    const inbound = inbounds[0];
    console.log('[VPN] Using inbound:', { id: inbound.id, port: inbound.port, protocol: inbound.protocol });
    
    console.log('[VPN] Creating client with expiry:', expiryDays, 'days');
    const created = await xui.createClient(inbound.id, email, expiryDays, 1);
    console.log('[VPN] Client creation response:', created);

    if (!created) {
      console.error('[VPN] Client creation returned null');
      logger.error('Failed to create X-UI client');
      return null;
    }

    console.log('[VPN] X-UI client created successfully:', { uuid: created.uuid, inboundId: inbound.id, expiryTime: created.expiryTime });
    return { uuid: created.uuid, inboundId: inbound.id, expiryTime: created.expiryTime };
  } catch (error) {
    console.error('[VPN] Error creating X-UI client:', error);
    logger.error('Error creating X-UI client:', error);
    return null;
  }
}

async function createDefaultXuiClient(): Promise<XuiApiClient | null> {
  const baseUrl = process.env.XUI_BASE_URL;
  const username = process.env.XUI_USERNAME;
  const password = process.env.XUI_PASSWORD;

  if (!baseUrl || !username || !password) {
    logger.warn('X-UI not configured');
    return null;
  }

  const client = new XuiApiClient({
    baseUrl: baseUrl.replace(/\/$/, ''),
    username,
    password,
  });

  const loggedIn = await client.login();
  if (!loggedIn) {
    logger.error('X-UI login failed');
    return null;
  }

  return client;
}

async function cleanupXuiClient(inboundId: number, clientUuid: string): Promise<void> {
  try {
    const xui = await createDefaultXuiClient();
    if (xui) {
      await xui.deleteClient(inboundId, clientUuid);
    }
  } catch (error) {
    logger.error('Cleanup error:', error);
  }
}

export async function getUserVpnClient(
  userId: string,
  productId: string
): Promise<VpnClientRecord | null> {
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('vpn_urls')
      .select('*')
      .eq('assigned_to_user_id', userId)
      .eq('product_id', productId)
      .eq('is_active', true)
      .maybeSingle();

    if (error) return null;
    return data;
  } catch {
    return null;
  }
}

export async function getUserVpnClients(userId: string): Promise<VpnClientRecord[]> {
  if (!supabase) return [];

  try {
    const { data } = await supabase
      .from('vpn_urls')
      .select('*')
      .eq('assigned_to_user_id', userId)
      .eq('is_active', true)
      .not('vless_uuid', 'is', null)  // Only show newly created VLESS URLs (from purchases), not old imports
      .order('created_at', { ascending: false });

    return data || [];
  } catch {
    return [];
  }
}

export async function getUserVpnClientsFromTable(userId: string): Promise<VpnClientRecord[]> {
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('vpn_urls')
      .select('*')
      .eq('assigned_to_user_id', userId)
      .eq('is_active', true)
      .not('vless_uuid', 'is', null)  // Only show newly created VLESS URLs (from purchases), not old imports
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error getting user VPN clients:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    logger.error('Error getting user VPN clients:', error);
    return [];
  }
}

export async function revokeVpnClient(clientId: string): Promise<{ success: boolean }> {
  try {
    const { data: client } = await supabase
      ?.from('vpn_urls')
      .select('*')
      .eq('id', clientId)
      .maybeSingle();

    if (!client) return { success: false };

    try {
      const xui = await createDefaultXuiClient();
      if (xui && client.xui_inbound_id && client.vless_uuid) {
        await xui.deleteClient(client.xui_inbound_id, client.vless_uuid);
      }
    } catch {
      logger.warn('Failed to delete X-UI client');
    }

    await supabase
      ?.from('vpn_urls')
      .update({ is_active: false, status: 'revoked' })
      .eq('id', clientId);

    return { success: true };
  } catch {
    return { success: false };
  }
}
