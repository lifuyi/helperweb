import { createClient } from '@supabase/supabase-js';

// 客户端初始化 - 用于浏览器端
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase configuration. Please check your environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
 * 同时检查 localStorage 中存储的令牌（用于页面刷新后恢复登录状态）
 */
export function onAuthStateChange(
  callback: (user: AuthUser | null) => void
) {
  // 首先检查 localStorage 中是否有存储的令牌
  // 这用于在页面刷新后恢复登录状态
  const storedAccessToken = localStorage.getItem('supabase_access_token');
  const storedRefreshToken = localStorage.getItem('supabase_refresh_token');

  if (storedAccessToken && storedRefreshToken) {
    // 如果有存储的令牌，尝试恢复会话
    supabase.auth.setSession({
      access_token: storedAccessToken,
      refresh_token: storedRefreshToken,
    }).catch((error) => {
      console.error('Failed to restore session from localStorage:', error);
      // 如果恢复失败，清除存储的令牌
      localStorage.removeItem('supabase_access_token');
      localStorage.removeItem('supabase_refresh_token');
    });
  }

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(async (event, session) => {
    if (session?.user) {
      const user: AuthUser = {
        id: session.user.id,
        email: session.user.email,
        displayName: session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
        avatarUrl: session.user.user_metadata?.avatar_url,
        provider: session.user.app_metadata?.provider,
      };
      callback(user);
    } else {
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
