import { supabase } from './supabaseService.js';
import { Purchase } from './paymentService.js';
import { AccessToken } from './userService.js';
import { logger } from '../utils/logger.js';

/**
 * Order details interface combining purchase and access token info
 */
export interface OrderDetails extends Purchase {
  access_tokens: AccessToken[];
  vpn_urls: any[]; // VPN URLs from vpn_urls table
  product_name: string;
  status_display: string;
}

/**
 * Get all orders for a user with their access tokens and product details
 */
export async function getUserOrders(userId: string): Promise<OrderDetails[]> {
  try {
    logger.log('getUserOrders called with userId:', userId);
    // Fetch purchases
    const { data: purchases, error: purchaseError } = await supabase
      .from('purchases')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (purchaseError) {
      logger.error('Purchase fetch error:', purchaseError);
      throw purchaseError;
    }

    logger.log('Purchases fetched:', purchases);
    if (!purchases || purchases.length === 0) {
      logger.log('No purchases found for user');
      return [];
    }

    // For each purchase, fetch its access tokens and VPN URLs
    const ordersWithTokens = await Promise.all(
      purchases.map(async (purchase) => {
        const { data: tokens, error: tokenError } = await supabase
          .from('access_tokens')
          .select('*')
          .eq('user_id', userId)
          .eq('product_id', purchase.product_id)
          .order('created_at', { ascending: false });

        if (tokenError) {
          logger.error('Error fetching tokens for purchase:', tokenError);
          return {
            ...purchase,
            access_tokens: [],
            product_name: getProductName(purchase.product_id),
            status_display: getStatusDisplay(purchase.status),
            vpn_urls: [], // Added for consistency
          };
        }

        // Also fetch VPN URLs for VPN products via backend API
        let vpnUrls: any[] = [];
        if (purchase.product_id.startsWith('vpn-')) {
          try {
            const response = await fetch(`/api/vpn/list?user_id=${userId}&product_id=${purchase.product_id}`);
            if (response.ok) {
              const data = await response.json();
              vpnUrls = data.vpn_urls || [];
            } else {
              // Silently fail - VPN URLs might not be available yet
              logger.log('VPN URLs not available for product:', purchase.product_id);
            }
          } catch (fetchError) {
            // Silently fail - VPN URLs might not be available yet
            logger.log('VPN list API not available');
          }
        }

        return {
          ...purchase,
          access_tokens: tokens || [],
          vpn_urls: vpnUrls,
          product_name: getProductName(purchase.product_id),
          status_display: getStatusDisplay(purchase.status),
        };
      })
    );

    return ordersWithTokens;
  } catch (error) {
    logger.error('Error getting user orders:', error);
    throw error;
  }
}

/**
 * Get a single order with its access tokens
 */
export async function getOrderDetails(
  purchaseId: string,
  userId: string
): Promise<OrderDetails | null> {
  try {
    const { data: purchase, error: purchaseError } = await supabase
      .from('purchases')
      .select('*')
      .eq('id', purchaseId)
      .eq('user_id', userId)
      .single();

    if (purchaseError) throw purchaseError;

    if (!purchase) return null;

    const { data: tokens, error: tokenError } = await supabase
      .from('access_tokens')
      .select('*')
      .eq('user_id', userId)
      .eq('product_id', purchase.product_id)
      .order('created_at', { ascending: false });

    if (tokenError) {
      logger.error('Error fetching tokens:', tokenError);
    }

    return {
      ...purchase,
      access_tokens: tokens || [],
      product_name: getProductName(purchase.product_id),
      status_display: getStatusDisplay(purchase.status),
    };
  } catch (error) {
    logger.error('Error getting order details:', error);
    throw error;
  }
}

/**
 * Generate VPN access URL from token
 */
export function generateVpnUrl(token: string, baseUrl: string = window.location.origin): string {
  return `${baseUrl}/access?token=${token}`;
}

/**
 * Get product name from product ID
 */
function getProductName(productId: string): string {
  const productNames: Record<string, string> = {
    'payment-guide': 'Payment Guide PDF',
    'vpn-3days': 'VPN 3-Day Pass',
    'vpn-7days': 'VPN 7-Day Pass',
    'vpn-14days': 'VPN 14-Day Pass',
    'vpn-30days': 'VPN 30-Day Pass',
  };

  return productNames[productId] || productId;
}

/**
 * Get human-readable status display
 */
function getStatusDisplay(status: string): string {
  const statusMap: Record<string, string> = {
    completed: 'Completed',
    pending: 'Pending',
    failed: 'Failed',
  };

  return statusMap[status] || status;
}

/**
 * Check if a token is still active (not expired)
 */
export function isTokenActive(token: AccessToken): boolean {
  if (!token.expires_at) return false;
  return new Date(token.expires_at) > new Date();
}

/**
 * Format date for display
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Calculate days remaining for a token
 */
export function getDaysRemaining(expiresAt: string): number {
  const expDate = new Date(expiresAt);
  const now = new Date();
  const diffTime = expDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}
