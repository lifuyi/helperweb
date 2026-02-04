import { supabase } from './supabaseService';
import { createAccessToken, generateAccessUrl, User } from './userService';
import { logger } from '../utils/logger';
import { getExpiryDaysForProduct, getProductName, getProductDescription } from '../config/products';
import { getAvailableVpnUrl, assignVpnUrlToUserOnPurchase } from './adminService';

/**
 * 购买记录接口
 */
export interface Purchase {
  id: string;
  user_id: string;
  product_id: string;
  amount: number;
  currency: string;
  stripe_session_id?: string;
  status: 'completed' | 'pending' | 'failed';
  created_at: string;
  updated_at: string;
}

/**
 * 处理支付成功回调
 * 在 Stripe webhook 中调用
 */
export async function handlePaymentSuccess(
  userId: string,
  productId: string,
  amount: number,
  currency: string = 'usd',
  stripeSessionId?: string
): Promise<{
  purchase: Purchase;
  accessToken: any;
  accessUrl: string;
  vpnUrl?: string;
  vpnAssignmentSuccess: boolean;
}> {
  try {
    // 1. 保存购买记录
    const purchase = await savePurchase(
      userId,
      productId,
      amount,
      currency,
      stripeSessionId,
      'completed'
    );

    if (!purchase) {
      throw new Error('Failed to save purchase record');
    }

    // 2. 创建访问令牌
    // 根据产品类型确定过期天数
    const expiryDays = getExpiryDaysForProduct(productId);
    const accessToken = await createAccessToken(userId, productId, expiryDays);

    if (!accessToken) {
      throw new Error('Failed to create access token');
    }

    // 3. 生成访问 URL
    const accessUrl = generateAccessUrl(accessToken.token);

    // 4. 分配 VPN URL（如果是 VPN 产品）
    let vpnUrl: string | undefined;
    let vpnAssignmentSuccess = false;
    
    if (productId.startsWith('vpn-')) {
      try {
        const availableVpnUrl = await getAvailableVpnUrl();
        
        if (availableVpnUrl) {
          const assignedUrl = await assignVpnUrlToUserOnPurchase(availableVpnUrl.id, userId);
          if (assignedUrl) {
            vpnUrl = assignedUrl.url;
            vpnAssignmentSuccess = true;
            logger.log(`VPN URL assigned to user ${userId} for product ${productId}`);
          }
        } else {
          logger.warn(`No available VPN URLs for product ${productId}`);
        }
      } catch (vpnError) {
        logger.error('Error assigning VPN URL:', vpnError);
        // 不中断购买流程，即使 VPN URL 分配失败
      }
    }

    return {
      purchase,
      accessToken,
      accessUrl,
      vpnUrl,
      vpnAssignmentSuccess,
    };
  } catch (error) {
    logger.error('Error handling payment success:', error);
    throw error;
  }
}

/**
 * 保存购买记录
 */
export async function savePurchase(
  userId: string,
  productId: string,
  amount: number,
  currency: string = 'usd',
  stripeSessionId?: string,
  status: 'completed' | 'pending' | 'failed' = 'pending'
): Promise<Purchase | null> {
  try {
    const { data, error } = await supabase
      .from('purchases')
      .insert({
        user_id: userId,
        product_id: productId,
        amount,
        currency,
        stripe_session_id: stripeSessionId,
        status,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    logger.error('Error saving purchase:', error);
    throw error;
  }
}

/**
 * 获取购买记录
 */
export async function getPurchase(purchaseId: string): Promise<Purchase | null> {
  try {
    const { data, error } = await supabase
      .from('purchases')
      .select('*')
      .eq('id', purchaseId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  } catch (error) {
    logger.error('Error getting purchase:', error);
    throw error;
  }
}

/**
 * 获取用户的所有购买记录
 */
export async function getUserPurchases(userId: string): Promise<Purchase[]> {
  try {
    const { data, error } = await supabase
      .from('purchases')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    logger.error('Error getting user purchases:', error);
    throw error;
  }
}

/**
 * 通过 Stripe Session ID 获取购买记录
 */
export async function getPurchaseByStripeSession(
  stripeSessionId: string
): Promise<Purchase | null> {
  try {
    const { data, error } = await supabase
      .from('purchases')
      .select('*')
      .eq('stripe_session_id', stripeSessionId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  } catch (error) {
    logger.error('Error getting purchase by stripe session:', error);
    throw error;
  }
}

/**
 * 更新购买状态
 */
export async function updatePurchaseStatus(
  purchaseId: string,
  status: 'completed' | 'pending' | 'failed'
): Promise<Purchase | null> {
  try {
    const { data, error } = await supabase
      .from('purchases')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', purchaseId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    logger.error('Error updating purchase status:', error);
    throw error;
  }
}

// getExpiryDaysForProduct is now imported from config/products.ts

/**
 * 生成发送给用户的邮件内容
 */
export function generateEmailContent(
  user: User,
  productId: string,
  accessUrl: string,
  vpnUrl?: string
): { subject: string; html: string; text: string } {
  const productName = getProductName(productId);
  const expiryDays = getExpiryDaysForProduct(productId);
  const isVpnProduct = productId.startsWith('vpn-');

  const subject = `您的 ${productName} 已准备好！`;

  const vpnSection = vpnUrl ? `
          <h3>VPN 连接信息：</h3>
          <p>您的专属 VPN 地址已分配，请复制以下地址到您的 VPN 客户端：</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 6px; word-break: break-all; font-family: monospace; font-size: 12px;">
            ${vpnUrl}
          </div>
          <p style="color: #666; font-size: 12px; margin-top: 10px;">
            <strong>重要提示：</strong>您的 ${expiryDays} 天使用期限从<strong>您首次使用该 VPN 地址时开始计算</strong>，而非购买时间。这样可以确保您能充分利用购买的服务。
          </p>
          <p style="color: #666; font-size: 12px;">
            此 VPN 地址仅供您个人使用，请勿分享给他人。
          </p>
  ` : '';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #dc2626; color: white; padding: 20px; border-radius: 8px; }
        .content { margin: 20px 0; }
        .button { 
          background-color: #dc2626; 
          color: white; 
          padding: 12px 24px; 
          text-decoration: none; 
          border-radius: 6px; 
          display: inline-block; 
          margin: 20px 0;
        }
        .footer { margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>感谢您的购买！</h1>
        </div>
        
        <div class="content">
          <p>亲爱的 ${user.username},</p>
          
          <p>感谢您的购买！您已成功购买 <strong>${productName}</strong>。</p>
          
          ${isVpnProduct ? '' : `
          <p>您可以使用下面的链接访问您的下载内容：</p>
          
          <a href="${accessUrl}" class="button">点击这里访问您的内容</a>
          
          <p>或者复制以下链接到浏览器：<br>
          <code>${accessUrl}</code></p>
          `}
          
          ${vpnSection}
          
          <h3>重要信息：</h3>
          <ul>
            ${isVpnProduct 
              ? `<li>此 VPN 链接将在<strong>您首次使用后的 ${expiryDays} 天内</strong>有效</li>
                 <li>使用期限从您首次连接时开始计算</li>
                 <li>您可以在有效期内无限次连接</li>`
              : `<li>此下载链接将在购买后的 ${expiryDays} 天内有效</li>
                 <li>您可以无限次下载</li>`
            }
            <li>请妥善保管此信息</li>
          </ul>
          
          <p>如有问题，请联系我们的支持团队。</p>
        </div>
        
        <div class="footer">
          <p>© 2025 ChinaConnect. 版权所有。</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const vpnTextSection = vpnUrl ? `
VPN 连接信息：
您的专属 VPN 地址已分配，请在您的 VPN 客户端中使用以下地址：
${vpnUrl}

重要提示：您的 ${expiryDays} 天使用期限从您首次使用该 VPN 地址时开始计算，而非购买时间。这样可以确保您能充分利用购买的服务。

注意：此 VPN 地址仅供您个人使用，请勿分享给他人。
  ` : '';

  const text = `
感谢您的购买！

亲爱的 ${user.username},

感谢您的购买！您已成功购买 ${productName}。

${isVpnProduct ? '' : `您可以使用下面的链接访问您的下载内容：
${accessUrl}
`}
${vpnTextSection}

重要信息：
${isVpnProduct 
  ? `- 此 VPN 链接将在您首次使用后的 ${expiryDays} 天内有效
- 使用期限从您首次连接时开始计算
- 您可以在有效期内无限次连接`
  : `- 此下载链接将在购买后的 ${expiryDays} 天内有效
- 您可以无限次下载`
}
- 请妥善保管此信息

如有问题，请联系我们的支持团队。

© 2025 ChinaConnect. 版权所有。
  `;

  return { subject, html, text };
}

// getProductName is now imported from config/products.ts
// Note: getProductPrice in config/products.ts returns price in cents for Stripe API
// For display purposes, divide by 100 to get dollars
