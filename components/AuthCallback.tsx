import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

/**
 * AuthCallback 组件
 * 处理来自服务器端认证的回调
 * 在这里接收并存储 access_token 和 refresh_token
 * 
 * 支持两种格式:
 * 1. Query params: ?access_token=xxx&refresh_token=xxx
 * 2. URL fragment (hash): #access_token=xxx&refresh_token=xxx
 */
export const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // 尝试从 query params 获取令牌（服务器端认证）
    let accessToken = searchParams.get('access_token');
    let refreshToken = searchParams.get('refresh_token');
    const authError = searchParams.get('auth_error');

    // 如果 query params 中没有令牌，尝试从 URL fragment 获取（Supabase OAuth 默认行为）
    if (!accessToken && !refreshToken) {
      const hash = window.location.hash.substring(1);
      if (hash) {
        const params = new URLSearchParams(hash);
        accessToken = params.get('access_token');
        refreshToken = params.get('refresh_token');
      }
    }

    if (authError) {
      // 如果有错误，显示错误并重定向回首页
      console.error('Auth error:', authError);
      navigate('/?auth_error=' + encodeURIComponent(authError));
      return;
    }

    if (accessToken && refreshToken) {
      // 存储token到localStorage
      // 注意：在实际生产环境中，应该使用更安全的方式存储token（如httpOnly cookie）
      localStorage.setItem('supabase_access_token', accessToken);
      localStorage.setItem('supabase_refresh_token', refreshToken);

      // 清除 URL 中的敏感信息
      window.history.replaceState({}, document.title, window.location.pathname);

      // 重定向回首页
      navigate('/');
    } else {
      // 如果没有token，重定向回首页
      navigate('/');
    }
  }, [searchParams, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-slate-300 border-t-chinaRed rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate-600 font-medium">Processing authentication...</p>
      </div>
    </div>
  );
};
