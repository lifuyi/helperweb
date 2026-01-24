import { supabase } from './supabaseService';
import { Purchase } from './paymentService';
import { logger } from '../utils/logger';
import { parseVlessUrl } from '../utils/vlessParser';

/**
 * VPN URL Interface
 */
export interface VpnUrl {
  id: string;
  url: string;
  day_period: number;
  traffic_limit: number;
  status: 'active' | 'inactive' | 'used';
  assigned_to_user_id?: string;
  assigned_at?: string;
  created_at: string;
  updated_at: string;
}

/**
 * VPN URL with user info
 */
export interface VpnUrlWithUser extends VpnUrl {
  user_email?: string;
  user_name?: string;
}

/**
 * Purchase with user info
 */
export interface PurchaseWithUser extends Purchase {
  user_email: string;
  user_name: string;
}

/**
 * Admin statistics
 */
export interface AdminStats {
  totalPurchases: number;
  totalRevenue: number;
  totalVpnUrls: number;
  activeVpnUrls: number;
  usedVpnUrls: number;
  inactiveVpnUrls: number;
}

/**
 * Get all purchases with user information
 */
export async function getAllPurchases(
  limit: number = 100,
  offset: number = 0
): Promise<PurchaseWithUser[]> {
  try {
    const { data: purchases, error: purchaseError } = await supabase
      .from('purchases')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (purchaseError) throw purchaseError;
    if (!purchases || purchases.length === 0) return [];

    // Fetch user information for each purchase
    const purchasesWithUsers = await Promise.all(
      purchases.map(async (purchase) => {
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('email, username')
          .eq('id', purchase.user_id)
          .single();

        if (userError) {
          logger.error('Error fetching user:', userError);
          return {
            ...purchase,
            user_email: 'Unknown',
            user_name: 'Unknown',
          };
        }

        return {
          ...purchase,
          user_email: user?.email || 'Unknown',
          user_name: user?.username || 'Unknown',
        };
      })
    );

    return purchasesWithUsers;
  } catch (error) {
    logger.error('Error getting all purchases:', error);
    throw error;
  }
}

/**
 * Get total count of purchases
 */
export async function getPurchaseCount(): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('purchases')
      .select('*', { count: 'exact', head: true });

    if (error) throw error;
    return count || 0;
  } catch (error) {
    logger.error('Error getting purchase count:', error);
    throw error;
  }
}

/**
 * Get total revenue from purchases
 */
export async function getTotalRevenue(): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('purchases')
      .select('amount')
      .eq('status', 'completed');

    if (error) throw error;

    const total = (data || []).reduce((sum, purchase) => sum + purchase.amount, 0);
    return total;
  } catch (error) {
    logger.error('Error getting total revenue:', error);
    throw error;
  }
}

/**
 * Add single VPN URL
 */
export async function addVpnUrl(
  url: string,
  dayPeriod: number,
  trafficLimit: number
): Promise<VpnUrl | null> {
  try {
    const { data, error } = await supabase
      .from('vpn_urls')
      .insert({
        url,
        day_period: dayPeriod,
        traffic_limit: trafficLimit,
        status: 'active',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    logger.error('Error adding VPN URL:', error);
    throw error;
  }
}

/**
 * Bulk import VPN URLs with VLESS configuration parsing
 */
export async function bulkImportVpnUrls(
  vpnData: Array<{ url: string; day_period: number; traffic_limit: number }>
): Promise<{ success: number; failed: number; errors: string[] }> {
  try {
    const errors: string[] = [];
    let successCount = 0;

    // Insert in batches to avoid timeout
    const batchSize = 50;
    for (let i = 0; i < vpnData.length; i += batchSize) {
      const batch = vpnData.slice(i, i + batchSize);

      const { data, error } = await supabase
        .from('vpn_urls')
        .insert(
          batch.map((item) => {
            // Parse VLESS configuration
            const vlessConfig = parseVlessUrl(item.url);
            
            return {
              url: item.url,
              day_period: item.day_period,
              traffic_limit: item.traffic_limit,
              status: 'active',
              // VLESS-specific fields
              vless_uuid: vlessConfig?.uuid || null,
              vless_host: vlessConfig?.host || null,
              vless_port: vlessConfig?.port || null,
              protocol: vlessConfig?.protocol || 'tcp',
              encryption: vlessConfig?.encryption || 'none',
              security_type: vlessConfig?.security || 'none',
              fingerprint: vlessConfig?.fp || null,
              sni: vlessConfig?.sni || null,
              session_id: vlessConfig?.sid || null,
              path: vlessConfig?.spx || null,
              vless_name: vlessConfig?.name || null,
              pbk: vlessConfig?.pbk || null,
              // Usage tracking
              traffic_used: 0,
              usage_count: 0,
              is_active: true,
            };
          })
        )
        .select();

      if (error) {
        logger.error('Batch import error:', error);
        // Continue with next batch, but record error
        const errorMsg = error.message || 'Unknown error during batch import';
        errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${errorMsg}`);
      } else {
        successCount += data ? data.length : 0;
      }
    }

    return {
      success: successCount,
      failed: vpnData.length - successCount,
      errors,
    };
  } catch (error) {
    logger.error('Error bulk importing VPN URLs:', error);
    throw error;
  }
}

/**
 * Get all VPN URLs with optional filtering
 */
export async function getAllVpnUrls(
  status?: 'active' | 'inactive' | 'used',
  limit: number = 100,
  offset: number = 0
): Promise<VpnUrlWithUser[]> {
  try {
    let query = supabase.from('vpn_urls').select('*');

    if (status) {
      query = query.eq('status', status);
    }

    const { data: vpnUrls, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    if (!vpnUrls || vpnUrls.length === 0) return [];

    // Fetch user information for assigned URLs
    const vpnUrlsWithUsers = await Promise.all(
      vpnUrls.map(async (vpnUrl) => {
        if (vpnUrl.assigned_to_user_id) {
          const { data: user, error: userError } = await supabase
            .from('users')
            .select('email, username')
            .eq('id', vpnUrl.assigned_to_user_id)
            .single();

          if (userError) {
            logger.error('Error fetching user:', userError);
            return {
              ...vpnUrl,
              user_email: 'Unknown',
              user_name: 'Unknown',
            };
          }

          return {
            ...vpnUrl,
            user_email: user?.email || 'Unknown',
            user_name: user?.username || 'Unknown',
          };
        }

        return vpnUrl;
      })
    );

    return vpnUrlsWithUsers;
  } catch (error) {
    logger.error('Error getting all VPN URLs:', error);
    throw error;
  }
}

/**
 * Get VPN URL count by status
 */
export async function getVpnUrlCount(status?: 'active' | 'inactive' | 'used'): Promise<number> {
  try {
    let query = supabase.from('vpn_urls').select('*', { count: 'exact', head: true });

    if (status) {
      query = query.eq('status', status);
    }

    const { count, error } = await query;

    if (error) throw error;
    return count || 0;
  } catch (error) {
    logger.error('Error getting VPN URL count:', error);
    throw error;
  }
}

/**
 * Update VPN URL status
 */
export async function updateVpnUrlStatus(
  vpnUrlId: string,
  status: 'active' | 'inactive' | 'used'
): Promise<VpnUrl | null> {
  try {
    const { data, error } = await supabase
      .from('vpn_urls')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', vpnUrlId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    logger.error('Error updating VPN URL status:', error);
    throw error;
  }
}

/**
 * Delete VPN URL
 */
export async function deleteVpnUrl(vpnUrlId: string): Promise<void> {
  try {
    const { error } = await supabase.from('vpn_urls').delete().eq('id', vpnUrlId);

    if (error) throw error;
  } catch (error) {
    logger.error('Error deleting VPN URL:', error);
    throw error;
  }
}

/**
 * Assign VPN URL to user
 */
export async function assignVpnUrlToUser(
  vpnUrlId: string,
  userId: string
): Promise<VpnUrl | null> {
  try {
    const { data, error } = await supabase
      .from('vpn_urls')
      .update({
        assigned_to_user_id: userId,
        assigned_at: new Date().toISOString(),
        status: 'used',
        updated_at: new Date().toISOString(),
      })
      .eq('id', vpnUrlId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    logger.error('Error assigning VPN URL to user:', error);
    throw error;
  }
}

/**
 * Unassign VPN URL from user
 */
export async function unassignVpnUrl(vpnUrlId: string): Promise<VpnUrl | null> {
  try {
    const { data, error } = await supabase
      .from('vpn_urls')
      .update({
        assigned_to_user_id: null,
        assigned_at: null,
        status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', vpnUrlId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    logger.error('Error unassigning VPN URL:', error);
    throw error;
  }
}

/**
 * Get admin statistics
 */
export async function getAdminStats(): Promise<AdminStats> {
  try {
    const [
      totalPurchases,
      totalRevenue,
      totalVpnUrls,
      activeVpnUrls,
      usedVpnUrls,
      inactiveVpnUrls,
    ] = await Promise.all([
      getPurchaseCount(),
      getTotalRevenue(),
      getVpnUrlCount(),
      getVpnUrlCount('active'),
      getVpnUrlCount('used'),
      getVpnUrlCount('inactive'),
    ]);

    return {
      totalPurchases,
      totalRevenue,
      totalVpnUrls,
      activeVpnUrls,
      usedVpnUrls,
      inactiveVpnUrls,
    };
  } catch (error) {
    logger.error('Error getting admin stats:', error);
    throw error;
  }
}

/**
 * Search purchases by user email or name
 */
export async function searchPurchases(query: string): Promise<PurchaseWithUser[]> {
  try {
    // First, search for users
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id')
      .or(`email.ilike.%${query}%,username.ilike.%${query}%`);

    if (userError) throw userError;
    if (!users || users.length === 0) return [];

    const userIds = users.map((u) => u.id);

    // Then, get purchases for those users
    const { data: purchases, error: purchaseError } = await supabase
      .from('purchases')
      .select('*')
      .in('user_id', userIds)
      .order('created_at', { ascending: false });

    if (purchaseError) throw purchaseError;
    if (!purchases || purchases.length === 0) return [];

    // Attach user information
    const purchasesWithUsers = purchases.map((purchase) => {
      const user = users.find((u) => u.id === purchase.user_id);
      return {
        ...purchase,
        user_email: user?.email || 'Unknown',
        user_name: user?.username || 'Unknown',
      };
    });

    return purchasesWithUsers;
  } catch (error) {
    logger.error('Error searching purchases:', error);
    throw error;
  }
}

/**
 * Search VPN URLs
 */
export async function searchVpnUrls(query: string): Promise<VpnUrlWithUser[]> {
  try {
    const { data: vpnUrls, error } = await supabase
      .from('vpn_urls')
      .select('*')
      .or(`url.ilike.%${query}%`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!vpnUrls || vpnUrls.length === 0) return [];

    // Fetch user information for assigned URLs
    const vpnUrlsWithUsers = await Promise.all(
      vpnUrls.map(async (vpnUrl) => {
        if (vpnUrl.assigned_to_user_id) {
          const { data: user, error: userError } = await supabase
            .from('users')
            .select('email, username')
            .eq('id', vpnUrl.assigned_to_user_id)
            .single();

          if (userError) {
            return {
              ...vpnUrl,
              user_email: 'Unknown',
              user_name: 'Unknown',
            };
          }

          return {
            ...vpnUrl,
            user_email: user?.email || 'Unknown',
            user_name: user?.username || 'Unknown',
          };
        }

        return vpnUrl;
      })
    );

    return vpnUrlsWithUsers;
  } catch (error) {
    logger.error('Error searching VPN URLs:', error);
    throw error;
  }
}
