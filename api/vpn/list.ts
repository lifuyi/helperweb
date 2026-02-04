/**
 * API Endpoint: List User VPN Clients
 * GET /api/vpn/list
 * 
 * Returns all VPN clients for a user
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { getUserVpnClients } from '../../services/vpnClientService';
import { logger } from '../../utils/logger';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const userId = req.query.userId as string;

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId parameter' });
    }

    logger.log(`Fetching VPN clients for user: ${userId}`);

    const clients = await getUserVpnClients(userId);

    return res.status(200).json({
      success: true,
      clients: clients.map(client => ({
        id: client.id,
        vlessUrl: client.vless_url,
        productId: client.product_id,
        expiryDays: client.expiry_days,
        status: client.status,
        expiresAt: client.expires_at,
        createdAt: client.created_at,
      }))
    });
  } catch (error) {
    logger.error('Error in VPN list endpoint:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
