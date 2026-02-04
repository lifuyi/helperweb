/**
 * VPN Client Service
 * Creates X-UI VPN clients with expiration
 */

import { createClient } from '@supabase/supabase-js';
import { XuiApiClient } from './xuiClient';
import { generateVlessUrlFromXui } from '../utils/vlessGenerator';
import { sendVpnCredentialsEmail } from '../api/email/send/vpn';
import { logger } from '../utils/logger';
import { getExpiryDaysForProduct } from '../config/products';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

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
}

export interface CreateVpnClientRequest {
  userId: string;
  email: string;
  productId: string;
  sessionId: string;
}

export async function createVpnClient(request: CreateVpnClientRequest): Promise<{
  success: boolean;
  client?: VpnClientRecord;
  error?: string;
}> {
  const { userId, email, productId, sessionId } = request;

  try {
    const expiryDays = getExpiryDaysForProduct(productId);
    if (expiryDays <= 0) {
      return { success: false, error: 'Invalid product' };
    }

    const existing = await getUserVpnClient(userId, productId);
    if (existing) {
      return { success: false, error: 'VPN client already exists for this product' };
    }

    const xuiResult = await createXuiClientWithExpiration(email, expiryDays);
    if (!xuiResult) {
      return { success: false, error: 'Failed to create X-UI client' };
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiryDays);

    const inboundHost = process.env.VPN_SERVER_HOST || 'vpn.example.com';
    const inboundPort = parseInt(process.env.VPN_SERVER_PORT || '443');
    const vlessUrl = generateVlessUrlFromXui(
      inboundHost,
      inboundPort,
      xuiResult.uuid,
      email,
      {
        security: process.env.VPN_SECURITY || 'reality',
        sni: process.env.VPN_SNI,
        fp: 'chrome',
      }
    );

    const { data: vpnClient, error: dbError } = await supabase
      ?.from('vpn_clients')
      .insert({
        user_id: userId,
        xui_client_uuid: xuiResult.uuid,
        xui_inbound_id: xuiResult.inboundId,
        email: email,
        vless_url: vlessUrl,
        product_id: productId,
        expiry_days: expiryDays,
        expires_at: expiresAt.toISOString(),
        status: 'active',
        is_active: true,
      })
      .select()
      .single();

    if (dbError || !vpnClient) {
      logger.error('Failed to save VPN client:', dbError);
      await cleanupXuiClient(xuiResult.inboundId, xuiResult.uuid);
      return { success: false, error: 'Failed to save VPN client' };
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
      expiresAt: expiresAt.toISOString(),
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
): Promise<{ uuid: string; inboundId: number } | null> {
  try {
    const xui = await createDefaultXuiClient();
    if (!xui) return null;

    const inbounds = await xui.getInbounds();
    if (inbounds.length === 0) {
      logger.error('No inbounds available');
      return null;
    }

    const inbound = inbounds[0];
    const created = await xui.createClient(inbound.id, email, expiryDays, 1);

    if (!created) {
      logger.error('Failed to create X-UI client');
      return null;
    }

    return { uuid: created.uuid, inboundId: inbound.id };
  } catch (error) {
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
      .from('vpn_clients')
      .select('*')
      .eq('user_id', userId)
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
      .from('vpn_clients')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    return data || [];
  } catch {
    return [];
  }
}

export async function revokeVpnClient(clientId: string): Promise<{ success: boolean }> {
  try {
    const { data: client } = await supabase
      ?.from('vpn_clients')
      .select('*')
      .eq('id', clientId)
      .maybeSingle();

    if (!client) return { success: false };

    try {
      const xui = await createDefaultXuiClient();
      if (xui) {
        await xui.toggleClient(client.xui_inbound_id, client.xui_client_uuid, false);
      }
    } catch {
      logger.warn('Failed to disable X-UI client');
    }

    await supabase
      ?.from('vpn_clients')
      .update({ is_active: false, status: 'revoked' })
      .eq('id', clientId);

    return { success: true };
  } catch {
    return { success: false };
  }
}
