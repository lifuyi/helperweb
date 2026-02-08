import { supabase } from './supabaseClient.js';
import { logger } from '../utils/logger.js';
import { sessionManager } from '../utils/sessionManager.js';

export interface AuthUser {
  id: string;
  email?: string;
  displayName?: string;
  avatarUrl?: string;
  provider?: string;
}

export interface AuthError {
  message: string;
  status?: number;
}

/**
 * 使用Google登录
 * 支持服务器端认证（推荐）和客户端认证两种方式
 * @param redirectTo 登录后的重定向URL
 * @returns Promise 返回auth session或错误
 */
export async function signInWithGoogle(redirectTo?: string): Promise<void> {
  // 确定重定向 URL
  // 使用 window.location.origin 确保在所有环境中都使用正确的域名
  // 在本地：http://localhost:3000
  // 在 Vercel：https://your-domain.vercel.app
  // 在其他部署：使用实际的生产域名
  
  let finalRedirectUrl = redirectTo;
  
  if (!finalRedirectUrl && typeof window !== 'undefined') {
    // 确保使用当前页面的完整 origin
    const origin = window.location.origin;
    finalRedirectUrl = `${origin}/auth/callback`;
  }
  
  if (!finalRedirectUrl) {
    finalRedirectUrl = '/auth/callback';
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: finalRedirectUrl,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * 退出登录
 */
export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error(error.message);
  }

  // 使用 session manager 清除会话
  sessionManager.clearSession();
}

/**
 * 获取当前用户
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    displayName: user.user_metadata?.full_name || user.email?.split('@')[0],
    avatarUrl: user.user_metadata?.avatar_url,
    provider: user.app_metadata?.provider,
  };
}

/**
 * 获取当前的认证session
 */
export async function getSession() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session;
}

/**
 * 监听认证状态变化
 * 同时检查存储的令牌（用于页面刷新后恢复登录状态）
 */
export function onAuthStateChange(
  callback: (user: AuthUser | null) => void
) {
  // 首先尝试恢复存储的会话
  const storedSession = sessionManager.getSession();

  if (storedSession?.accessToken && storedSession?.refreshToken) {
    // 如果有存储的令牌，尝试恢复会话
    // 使用 getSession 先检查当前是否有有效会话，避免不必要的 setSession 调用
    supabase.auth.getSession().then(({ data: { session: currentSession }, error: getSessionError }) => {
      if (!getSessionError && currentSession?.user) {
        // 已有有效会话，直接使用
        const user: AuthUser = {
          id: currentSession.user.id,
          email: currentSession.user.email,
          displayName: currentSession.user.user_metadata?.full_name || currentSession.user.email?.split('@')[0],
          avatarUrl: currentSession.user.user_metadata?.avatar_url,
          provider: currentSession.user.app_metadata?.provider,
        };
        callback(user);
        return;
      }

      // 没有有效会话，尝试用存储的令牌恢复
      // 先清除旧的 session，防止自动刷新失败
      sessionManager.clearSession();

      supabase.auth.setSession({
        access_token: storedSession.accessToken,
        refresh_token: storedSession.refreshToken,
      }).catch((error: any) => {
        // 400 Bad Request 通常表示 refresh token 已过期
        // 此时应该清除本地会话，强制用户重新登录
        if (error?.message?.includes('400') || error?.status === 400) {
          logger.log('Refresh token expired, clearing session');
          sessionManager.clearSession();
        } else {
          logger.error('Failed to restore session:', error);
        }
      });
    }).catch((error) => {
      logger.error('Failed to check current session:', error);
    });
  }

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(async (event, session) => {
    if (session?.user) {
      // 会话有更新，刷新 session 过期时间
      sessionManager.refreshSessionExpiration();

      const user: AuthUser = {
        id: session.user.id,
        email: session.user.email,
        displayName: session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
        avatarUrl: session.user.user_metadata?.avatar_url,
        provider: session.user.app_metadata?.provider,
      };
      callback(user);
    } else {
      // 会话被清除或过期
      logger.log('Auth state changed: no session');
      callback(null);
    }
  });

  return subscription;
}

/**
 * 获取访问令牌
 */
export async function getAccessToken(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session?.access_token || null;
}

/**
 * 刷新会话
 */
export async function refreshSession() {
  const {
    data: { session },
    error,
  } = await supabase.auth.refreshSession();

  if (error) {
    throw new Error(error.message);
  }

  return session;
}
