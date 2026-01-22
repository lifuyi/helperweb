import { supabase } from './supabaseService';
import { createAccessToken, generateAccessUrl, User } from './userService';
import { logger } from '../utils/logger';

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

    return {
      purchase,
      accessToken,
      accessUrl,
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

/**
 * 根据产品 ID 获取过期天数
 */
function getExpiryDaysForProduct(productId: string): number {
  const expiryMap: Record<string, number> = {
    'vpn-3days': 3,
    'vpn-7days': 7,
    'vpn-14days': 14,
    'vpn-30days': 30,
    'payment-guide': 365, // 1年
  };

  return expiryMap[productId] || 30; // 默认30天
}

/**
 * 生成发送给用户的邮件内容
 */
export function generateEmailContent(
  user: User,
  productId: string,
  accessUrl: string
): { subject: string; html: string; text: string } {
  const productName = getProductName(productId);
  const expiryDays = getExpiryDaysForProduct(productId);

  const subject = `您的 ${productName} 已准备好！`;

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
          
          <p>您可以使用下面的链接访问您的下载内容：</p>
          
          <a href="${accessUrl}" class="button">点击这里访问您的内容</a>
          
          <p>或者复制以下链接到浏览器：<br>
          <code>${accessUrl}</code></p>
          
          <h3>重要信息：</h3>
          <ul>
            <li>此链接将在 ${expiryDays} 天后过期</li>
            <li>您可以无限次下载</li>
            <li>请妥善保管此链接</li>
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

  const text = `
感谢您的购买！

亲爱的 ${user.username},

感谢您的购买！您已成功购买 ${productName}。

您可以使用下面的链接访问您的下载内容：
${accessUrl}

重要信息：
- 此链接将在 ${expiryDays} 天后过期
- 您可以无限次下载
- 请妥善保管此链接

如有问题，请联系我们的支持团队。

© 2025 ChinaConnect. 版权所有。
  `;

  return { subject, html, text };
}

/**
 * 获取产品名称
 */
function getProductName(productId: string): string {
  const productNames: Record<string, string> = {
    'payment-guide': '支付指南 PDF',
    'vpn-3days': 'VPN 3天访问权限',
    'vpn-7days': 'VPN 7天访问权限',
    'vpn-14days': 'VPN 14天访问权限',
    'vpn-30days': 'VPN 30天访问权限',
  };

  return productNames[productId] || productId;
}

/**
 * 获取产品价格
 */
export function getProductPrice(productId: string): number {
  const priceMap: Record<string, number> = {
    'vpn-3days': 4.99,
    'vpn-7days': 9.99,
    'vpn-14days': 16.99,
    'vpn-30days': 29.99,
    'payment-guide': 9.99,
  };

  return priceMap[productId] || 0;
}
