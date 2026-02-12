import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { verifyAccessToken, getUserByToken, User, AccessToken } from '../services/userService';
import { logger } from '../utils/logger';

export const AccessPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<AccessToken | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  useEffect(() => {
    const verifyAndLoadData = async () => {
      try {
        setIsLoading(true);
        const tokenParam = searchParams.get('token');

        if (!tokenParam) {
          setError('Missing access token');
          return;
        }

        // 验证令牌
        const accessToken = await verifyAccessToken(tokenParam);

        if (!accessToken) {
          setError('Invalid or expired access token');
          return;
        }

        // 获取用户信息
        const userData = await getUserByToken(tokenParam);

        if (!userData) {
          setError('User not found');
          return;
        }

        setToken(accessToken);
        setUser(userData);

        // 生成下载 URL（根据产品 ID）
        const url = generateDownloadUrl(accessToken.product_id);
        setDownloadUrl(url);

      } catch (err) {
        logger.error('Error verifying token:', err);
        setError('An error occurred while processing your request');
      } finally {
        setIsLoading(false);
      }
    };

    verifyAndLoadData();
  }, [searchParams]);

  /**
   * 根据产品 ID 生成下载 URL
   * 你可以根据实际需求修改这个函数
   */
  const generateDownloadUrl = (productId: string): string => {
    const downloadLinks: Record<string, string> = {
      'payment-guide': '/payment-guide.pdf',
      'vpn-3days': '',
      'vpn-7days': '',
      'vpn-14days': '',
      'vpn-30days': '',
    };

    return downloadLinks[productId] || '';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-slate-300 border-t-chinaRed rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">验证您的访问权限...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl text-red-600">✕</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">访问失败</h1>
          <p className="text-slate-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="bg-chinaRed text-white px-6 py-2 rounded-full font-semibold hover:bg-red-700 transition"
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  if (!user || !token) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <p className="text-slate-600">未找到用户信息</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* 标题 */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">您的下载内容</h1>
          <p className="text-slate-600">感谢您的购买！</p>
        </div>

        {/* 用户信息卡片 */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-6">
          <div className="flex items-center mb-6">
            {user.avatar_url && (
              <img
                src={user.avatar_url}
                alt={user.username}
                className="w-16 h-16 rounded-full mr-4 object-cover"
              />
            )}
            <div>
              <h2 className="text-2xl font-bold text-slate-900">{user.username}</h2>
              <p className="text-slate-600">{user.email}</p>
            </div>
          </div>

          {/* 产品信息 */}
          <div className="bg-slate-50 rounded-lg p-4 mb-6">
            <h3 className="text-sm font-semibold text-slate-600 uppercase mb-2">您购买的产品</h3>
            <p className="text-lg font-semibold text-slate-900 mb-2">
              {getProductName(token.product_id)}
            </p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-600">购买日期</p>
                <p className="font-semibold text-slate-900">
                  {new Date(token.purchase_date).toLocaleDateString('zh-CN')}
                </p>
              </div>
              <div>
                <p className="text-slate-600">过期日期</p>
                <p className="font-semibold text-slate-900">
                  {new Date(token.expires_at).toLocaleDateString('zh-CN')}
                </p>
              </div>
            </div>
          </div>

          {/* 下载按钮 */}
          {downloadUrl ? (
            <a
              href={downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full bg-chinaRed text-white px-6 py-3 rounded-lg font-semibold text-center hover:bg-red-700 transition mb-4"
            >
              📥 点击下载
            </a>
          ) : (
            <div className="block w-full bg-slate-300 text-slate-700 px-6 py-3 rounded-lg font-semibold text-center mb-4">
              下载链接暂不可用
            </div>
          )}

          {/* 访问信息 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">📋 访问信息</h3>
            <div className="text-xs text-blue-800 space-y-1">
              <p>• 此链接将在 {getExpiryDaysRemaining(token.expires_at)} 天后过期</p>
              <p>• 您可以无限次下载</p>
              <p>• 如有问题，请联系我们的支持团队</p>
            </div>
          </div>

          {/* 返回按钮 */}
          <button
            onClick={() => navigate('/')}
            className="w-full border-2 border-slate-300 text-slate-700 px-6 py-3 rounded-lg font-semibold hover:bg-slate-50 transition"
          >
            返回首页
          </button>
        </div>

        {/* 底部提示 */}
        <div className="text-center text-sm text-slate-600">
          <p>需要帮助？<a href="mailto:support@example.com" className="text-chinaRed hover:underline">联系我们</a></p>
        </div>
      </div>
    </div>
  );
};

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
 * 计算剩余天数
 */
function getExpiryDaysRemaining(expiresAt: string): number {
  const expiryDate = new Date(expiresAt);
  const now = new Date();
  const diffTime = expiryDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}
