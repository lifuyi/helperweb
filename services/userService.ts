import { supabase } from './supabaseService';
import crypto from 'crypto';

/**
 * 用户接口定义
 */
export interface User {
  id: string;
  email: string;
  username: string;
  avatar_url?: string;
  google_id?: string;
  created_at: string;
  updated_at: string;
}

/**
 * 访问令牌接口定义
 */
export interface AccessToken {
  id: string;
  user_id: string;
  token: string;
  product_id: string;
  purchase_date: string;
  expires_at: string;
  is_used: boolean;
  used_at?: string;
  created_at: string;
}

/**
 * 用户档案接口定义
 */
export interface UserProfile {
  id: string;
  user_id: string;
  purchase_count: number;
  last_purchase_date?: string;
  total_spent: number;
  created_at: string;
  updated_at: string;
}

/**
 * 保存或更新用户信息
 * 在用户首次 Google 登录时调用
 * @param userId - Supabase Auth user ID (not Google ID)
 */
export async function saveOrUpdateUser(
  userId: string,
  email: string,
  username: string,
  avatarUrl?: string
): Promise<User | null> {
  try {
    // 先检查用户是否已存在
    const existingUser = await getUser(userId);

    if (existingUser) {
      // 更新现有用户
      const { data, error } = await supabase
        .from('users')
        .update({
          username,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    }

    // 创建新用户
    const { data, error } = await supabase
      .from('users')
      .insert({
        id: userId,
        email,
        username,
        avatar_url: avatarUrl,
      })
      .select()
      .single();

    if (error) throw error;

    // 创建用户档案
    await createUserProfile(data.id);

    return data;
  } catch (error) {
    console.error('Error saving user:', error);
    throw error;
  }
}

/**
 * 获取用户信息
 */
export async function getUser(userId: string): Promise<User | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  } catch (error) {
    console.error('Error getting user:', error);
    throw error;
  }
}

/**
 * 通过 Google ID 获取用户
 */
export async function getUserByGoogleId(googleId: string): Promise<User | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('google_id', googleId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  } catch (error) {
    console.error('Error getting user by google_id:', error);
    throw error;
  }
}

/**
 * 通过邮箱获取用户
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  } catch (error) {
    console.error('Error getting user by email:', error);
    throw error;
  }
}

/**
 * 创建用户档案
 */
async function createUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .insert({
        user_id: userId,
        purchase_count: 0,
        total_spent: 0,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating user profile:', error);
    throw error;
  }
}

/**
 * 生成唯一的访问令牌
 */
function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * 为用户创建访问令牌
 * 支付成功后调用
 */
export async function createAccessToken(
  userId: string,
  productId: string,
  expiryDays: number = 30
): Promise<AccessToken | null> {
  try {
    const token = generateToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiryDays);

    const { data, error } = await supabase
      .from('access_tokens')
      .insert({
        user_id: userId,
        token,
        product_id: productId,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    // 更新用户档案
    await updateUserProfile(userId, productId);

    return data;
  } catch (error) {
    console.error('Error creating access token:', error);
    throw error;
  }
}

/**
 * 验证访问令牌
 */
export async function verifyAccessToken(token: string): Promise<AccessToken | null> {
  try {
    const { data, error } = await supabase
      .from('access_tokens')
      .select('*')
      .eq('token', token)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    
    if (!data) {
      return null;
    }

    // 检查令牌是否过期
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return null; // 令牌已过期
    }

    return data;
  } catch (error) {
    console.error('Error verifying token:', error);
    throw error;
  }
}

/**
 * 标记令牌为已使用
 */
export async function markTokenAsUsed(token: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('access_tokens')
      .update({
        is_used: true,
        used_at: new Date().toISOString(),
      })
      .eq('token', token);

    if (error) throw error;
  } catch (error) {
    console.error('Error marking token as used:', error);
    throw error;
  }
}

/**
 * 获取用户的所有访问令牌
 */
export async function getUserTokens(userId: string): Promise<AccessToken[]> {
  try {
    const { data, error } = await supabase
      .from('access_tokens')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting user tokens:', error);
    throw error;
  }
}

/**
 * 获取令牌对应的用户信息
 */
export async function getUserByToken(token: string): Promise<User | null> {
  try {
    const { data: tokenData, error: tokenError } = await supabase
      .from('access_tokens')
      .select('user_id')
      .eq('token', token)
      .single();

    if (tokenError || !tokenData) return null;

    return await getUser(tokenData.user_id);
  } catch (error) {
    console.error('Error getting user by token:', error);
    throw error;
  }
}

/**
 * 更新用户档案（购买计数）
 */
async function updateUserProfile(userId: string, productId: string): Promise<void> {
  try {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!profile) return;

    await supabase
      .from('user_profiles')
      .update({
        purchase_count: profile.purchase_count + 1,
        last_purchase_date: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);
  } catch (error) {
    console.error('Error updating user profile:', error);
  }
}

/**
 * 获取用户档案
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    throw error;
  }
}

/**
 * 生成访问 URL
 */
export function generateAccessUrl(token: string, baseUrl: string = window.location.origin): string {
  return `${baseUrl}/access?token=${token}`;
}

/**
 * 从 URL 参数中提取令牌
 */
export function extractTokenFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  
  const params = new URLSearchParams(window.location.search);
  return params.get('token');
}
