/**
 * API Endpoint: Create VPN Client
 * POST /api/vpn/create
 * 
 * Creates a new VPN client when user purchases VPN
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { createVpnClient } from '../../services/vpnClientService';
import { logger } from '../../utils/logger';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, email, productId, sessionId } = req.body;

    // Validate required fields
    if (!userId || !email || !productId) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['userId', 'email', 'productId']
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Validate product ID
    if (!productId.startsWith('vpn-')) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }

    logger.log(`Creating VPN client for user ${userId}, product ${productId}`);

    const result = await createVpnClient({
      userId,
      email,
      productId,
      sessionId: sessionId || ''
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    return res.status(200).json({
      success: true,
      client: {
        id: result.client?.id,
        vlessUrl: result.client?.vless_url,
        productId: result.client?.product_id,
        expiryDays: result.client?.expiry_days,
        status: result.client?.status,
      }
    });
  } catch (error) {
    logger.error('Error in VPN create endpoint:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
