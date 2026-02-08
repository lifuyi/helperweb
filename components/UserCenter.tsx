import React, { useEffect, useState } from 'react';
import { ArrowLeft, Copy, Check, AlertCircle, Loader } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { logger } from '../utils/logger';
import {
  getUserOrders,
  OrderDetails,
  formatDate,
  getDaysRemaining,
} from '../services/orderService';

interface UserCenterProps {
  onBack: () => void;
}

export const UserCenter: React.FC<UserCenterProps> = ({ onBack }) => {
  const { user, isAuthenticated } = useAuth();
  const [orders, setOrders] = useState<OrderDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    logger.log('UserCenter mounted. Authenticated:', isAuthenticated, 'User:', user);
    if (!isAuthenticated || !user) {
      logger.log('Not authenticated, showing login message');
      setError('Please log in to view your orders');
      setIsLoading(false);
      return;
    }

    loadOrders();
  }, [user, isAuthenticated]);

  const loadOrders = async () => {
    if (!user) {
      logger.log('No user, skipping loadOrders');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      logger.log('Loading orders for user:', user.id);
      const userOrders = await getUserOrders(user.id);
      logger.log('Orders loaded:', userOrders);
      setOrders(userOrders);
    } catch (err) {
      logger.error('Error loading orders:', err);
      setError('Failed to load your orders. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 pt-24 pb-20">
        <div className="container mx-auto px-6">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-slate-600 hover:text-slate-900 mb-6"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Home</span>
          </button>

          <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-lg p-8 text-center">
            <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-slate-900 mb-4">Please Log In</h1>
            <p className="text-slate-600">
              You need to be logged in to view your orders and VPN URLs.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 pt-24 pb-20 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 text-chinaRed animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading your orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-20">
      <div className="container mx-auto px-6">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-slate-600 hover:text-slate-900 mb-6"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Home</span>
          </button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-slate-900 mb-2">My Orders</h1>
              <p className="text-slate-600">
                Welcome, <span className="font-semibold">{user?.displayName || user?.email}</span>
              </p>
            </div>
            <button
              onClick={loadOrders}
              className="px-6 py-2 bg-chinaRed text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Orders List */}
        <div className="space-y-6">
          {orders.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">No Orders Yet</h3>
              <p className="text-slate-600 mb-6">
                You haven't made any purchases yet. Start by exploring our VPN plans!
              </p>
              <button
                onClick={onBack}
                className="inline-block px-6 py-3 bg-chinaRed text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                View Products
              </button>
            </div>
          ) : (
            orders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

interface OrderCardProps {
  order: OrderDetails;
}

const OrderCard: React.FC<OrderCardProps> = ({
  order,
}) => {
  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
      {/* Order Header */}
      <div className="bg-gradient-to-r from-chinaRed to-red-700 px-6 py-4 text-white">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xl font-bold">{order.product_name}</h3>
            <p className="text-red-100 text-sm mt-1">
              Order ID: {order.id.slice(0, 8)}...
            </p>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-sm font-semibold ${order.status === 'completed'
              ? 'bg-green-100 text-green-800'
              : order.status === 'pending'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-red-100 text-red-800'
              }`}
          >
            {order.status_display}
          </span>
        </div>
      </div>

      {/* Order Details */}
      <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">
              Amount
            </p>
            <p className="text-lg font-bold text-slate-900">
              ${order.amount.toFixed(2)} {order.currency.toUpperCase()}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">
              Purchase Date
            </p>
            <p className="text-lg font-bold text-slate-900">{formatDate(order.created_at)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">
              Status
            </p>
            <p className="text-lg font-bold text-slate-900">{order.status_display}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">
              Active URLs
            </p>
            <p className="text-lg font-bold text-chinaRed">{order.vpn_urls?.length || 0}</p>
          </div>
        </div>
      </div>

      {/* Access Tokens / VPN URLs */}
      {order.status === 'completed' && (order.vpn_urls?.length > 0 || vpnTokens.length > 0) ? (
        <div className="px-6 py-4">
          {/* Show VPN URLs from vpn_urls table (actual VLESS URLs) */}
          {order.vpn_urls && order.vpn_urls.length > 0 && (
            <>
              <h4 className="font-semibold text-slate-900 mb-4 flex items-center">
                <svg
                  className="w-5 h-5 mr-2 text-chinaRed"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.658 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                  />
                </svg>
                Your VPN VLESS URLs
              </h4>

              <div className="space-y-3 mb-6">
                {order.vpn_urls.map((vpnUrl: any) => (
                  <VlessUrlItem key={vpnUrl.id} vpnUrl={vpnUrl} />
                ))}
              </div>
            </>
          )}
        </div>
      ) : order.status === 'completed' ? (
        <div className="px-6 py-4">
          <p className="text-slate-600 text-sm">
            {!order.vpn_urls || order.vpn_urls.length === 0
              ? 'VPN client is being provisioned...'
              : ''}
          </p>
        </div>
      ) : (
        <div className="px-6 py-4">
          <p className="text-slate-600 text-sm">
            Access URLs will be available once your payment is confirmed.
          </p>
        </div>
      )}
    </div>
  );
};



interface VlessUrlItemProps {
  vpnUrl: any;
}

const VlessUrlItem: React.FC<VlessUrlItemProps> = ({ vpnUrl }) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(vpnUrl.vless_url).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  const daysRemaining = getDaysRemaining(vpnUrl.expires_at);
  const isProvisioning = daysRemaining === -1;
  const isExpired = !isProvisioning && daysRemaining <= 0;

  return (
    <div className="border border-slate-200 rounded-lg p-4 hover:border-chinaRed transition-colors">
      <div className="mb-3">
        <div className="flex items-center space-x-2 mb-2">
          <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded text-slate-700">
            {vpnUrl.vless_name || vpnUrl.vless_uuid?.slice(0, 12) + '...'}
          </span>
          <span
            className={`text-xs font-semibold px-2 py-1 rounded-full ${isProvisioning
                ? 'bg-blue-100 text-blue-800'
                : isExpired
                  ? 'bg-red-100 text-red-800'
                  : daysRemaining <= 3
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-green-100 text-green-800'
              }`}
          >
            {isProvisioning ? 'Provisioning' : isExpired ? 'Expired' : `${daysRemaining} days left`}
          </span>
          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-semibold">
            VLESS
          </span>
        </div>
        <p className="text-xs text-slate-500">
          Created: {formatDate(vpnUrl.created_at)} • Expires: {formatDate(vpnUrl.expires_at)}
        </p>
        <p className="text-xs text-slate-500 mt-1">
          Server: {vpnUrl.vless_host}:{vpnUrl.vless_port} • Security: {vpnUrl.security_type}
        </p>
      </div>

      {!isExpired && (
        <div className="pt-3 border-t border-slate-200 space-y-2">
          <div className="bg-slate-50 p-3 rounded border border-slate-200 break-all font-mono text-xs text-slate-700">
            {vpnUrl.vless_url}
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className={`flex-1 flex items-center justify-center space-x-2 py-2 px-3 rounded border transition-colors ${isCopied
                  ? 'bg-green-50 border-green-300 text-green-700'
                  : 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
            >
              {isCopied ? (
                <>
                  <Check className="w-4 h-4" />
                  <span className="text-sm font-medium">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span className="text-sm font-medium">Copy VLESS URL</span>
                </>
              )}
            </button>
          </div>

          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
            <p className="text-xs font-semibold text-blue-900 mb-2">📱 Setup Instructions:</p>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• <strong>Android:</strong> V2RayNG → + → Import from clipboard</li>
              <li>• <strong>iOS:</strong> V2Box → + → Import from URL</li>
              <li>• <strong>Windows:</strong> Nekoray → Import Config → Import from String</li>
            </ul>
          </div>
        </div>
      )}

      {isExpired && (
        <div className="pt-3 border-t border-slate-200">
          <p className="text-sm text-red-600">This VPN URL has expired.</p>
        </div>
      )}
    </div>
  );
};

export default UserCenter;
