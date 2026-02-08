import React, { useState, useEffect } from 'react';
import { logger } from '../utils/logger';
import {
  Copy,
  Check,
  Eye,
  EyeOff,
  Download,
  Calendar,
  Zap,
  AlertCircle,
  Loader,
} from 'lucide-react';
import { getUserVpnClientsFromTable } from '../services/vpnClientService';

interface VpnClient {
  id: string;
  vless_url: string;
  expiry_days: number;
  status: string;
  created_at: string;
  expires_at: string;
  email: string;
  product_id: string;
}

export const UserVpnCenter: React.FC = () => {
  const [vpnClients, setVpnClients] = useState<VpnClient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showUrls, setShowUrls] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    loadUserVpnClients();
  }, []);

  const loadUserVpnClients = async () => {
    try {
      setIsLoading(true);
      // Get current user ID from Supabase auth
      const { supabase } = await import('../services/supabaseService');
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        logger.warn('No authenticated user');
        setVpnClients([]);
        return;
      }

      const clients = await getUserVpnClientsFromTable(user.id);
      setVpnClients(clients);
    } catch (err) {
      logger.error('Error loading VPN clients:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getDaysRemaining = (expiresAt: string): number => {
    if (!expiresAt) return 0;
    const expiryDate = new Date(expiresAt);
    const now = new Date();
    const diffTime = expiryDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">My VPN Addresses</h2>
          <p className="text-slate-600 text-sm mt-1">
            Your assigned VPN configurations
          </p>
        </div>
        <button
          onClick={() => setShowUrls(!showUrls)}
          className="flex items-center space-x-2 px-4 py-2 bg-chinaRed text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          {showUrls ? (
            <>
              <EyeOff className="w-4 h-4" />
              <span>Hide URLs</span>
            </>
          ) : (
            <>
              <Eye className="w-4 h-4" />
              <span>Show URLs</span>
            </>
          )}
        </button>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader className="w-8 h-8 text-chinaRed animate-spin" />
        </div>
      ) : vpnClients.length === 0 ? (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
          <AlertCircle className="w-12 h-12 text-blue-600 mx-auto mb-4" />
          <p className="text-blue-900 font-semibold">No VPN Clients Yet</p>
          <p className="text-blue-800 text-sm mt-2">
            Purchase a VPN package to get your VPN configuration.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {vpnClients.map((vpn) => {
            const daysRemaining = getDaysRemaining(vpn.expires_at);
            const isExpiring = daysRemaining <= 3;
            const isExpired = daysRemaining <= 0;

            return (
              <div
                key={vpn.id}
                className={`border rounded-lg p-6 transition-all ${
                  isExpired
                    ? 'bg-red-50 border-red-200'
                    : isExpiring
                    ? 'bg-yellow-50 border-yellow-200'
                    : 'bg-white border-slate-200 hover:shadow-lg'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-semibold text-slate-900">
                        {vpn.product_id.replace('vpn-', '').replace('days', ' Day VPN')}
                      </h3>
                      {isExpired && (
                        <span className="px-2 py-1 bg-red-200 text-red-800 text-xs font-semibold rounded">
                          Expired
                        </span>
                      )}
                      {isExpiring && !isExpired && (
                        <span className="px-2 py-1 bg-yellow-200 text-yellow-800 text-xs font-semibold rounded">
                          Expiring Soon
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 mt-1">
                      Created {formatDate(vpn.created_at)}
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      setExpandedId(expandedId === vpn.id ? null : vpn.id)
                    }
                    className="text-slate-600 hover:text-slate-900"
                  >
                    {expandedId === vpn.id ? '−' : '+'}
                  </button>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="bg-slate-100 rounded p-3">
                    <p className="text-xs text-slate-600">Validity</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {daysRemaining} days
                    </p>
                  </div>
                  <div className="bg-slate-100 rounded p-3">
                    <p className="text-xs text-slate-600">Product</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {vpn.product_id}
                    </p>
                  </div>
                  <div className="bg-slate-100 rounded p-3">
                    <p className="text-xs text-slate-600">Status</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {vpn.status}
                    </p>
                  </div>
                </div>

                {/* VPN URL Display */}
                {showUrls && (
                  <div className="mb-4 space-y-3">
                    <div className="bg-slate-100 rounded p-3">
                      <p className="text-xs text-slate-600 mb-2">VPN Address</p>
                      <div className="flex items-center space-x-2">
                        <code className="flex-1 text-xs font-mono text-slate-900 break-all bg-white p-2 rounded border border-slate-300">
                          {vpn.vless_url}
                        </code>
                        <button
                          onClick={() => copyToClipboard(vpn.vless_url, vpn.id)}
                          className="p-2 text-slate-600 hover:bg-white rounded transition-colors"
                        >
                          {copiedId === vpn.id ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => copyToClipboard(vpn.vless_url, vpn.id)}
                    className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 bg-chinaRed text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                  >
                    <Copy className="w-4 h-4" />
                    <span>{copiedId === vpn.id ? 'Copied!' : 'Copy URL'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          <strong>How to use:</strong> Copy your VPN address and import it into your VPN client
          (such as Clash, v2ray, or Nekobox). For detailed setup instructions, visit our help
          center.
        </p>
      </div>
    </div>
  );
};

export default UserVpnCenter;
