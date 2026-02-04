import React, { useState, useEffect } from 'react';
import { logger } from '../utils/logger';
import {
  BarChart3,
  TrendingUp,
  Package,
  Users,
  Zap,
  AlertCircle,
  Loader,
} from 'lucide-react';
import {
  getAdminStats,
  getAllVpnUrls,
  getAllProducts,
} from '../services/adminService';

interface AdminStats {
  totalPurchases: number;
  totalRevenue: number;
  totalVpnUrls: number;
  activeVpnUrls: number;
  usedVpnUrls: number;
  inactiveVpnUrls: number;
}

interface Product {
  id: string;
  name: string;
  price_cents: number;
}

interface DashboardMetrics {
  stats: AdminStats;
  products: Product[];
  vpnUtilization: number;
  revenuePerProduct: Record<string, number>;
}

export const AnalyticsDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'inventory' | 'revenue'>(
    'overview'
  );

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setIsLoading(true);
      const [stats, products, vpnUrls] = await Promise.all([
        getAdminStats(),
        getAllProducts(),
        getAllVpnUrls(),
      ]);

      const vpnUtilization =
        stats.totalVpnUrls > 0
          ? Math.round((stats.usedVpnUrls / stats.totalVpnUrls) * 100)
          : 0;

      setMetrics({
        stats,
        products,
        vpnUtilization,
        revenuePerProduct: {},
      });
    } catch (err) {
      logger.error('Error loading analytics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (cents: number): string => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const formatNumber = (num: number): string => {
    return num.toLocaleString();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="w-8 h-8 text-chinaRed animate-spin" />
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
        <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
        <p className="text-red-900 font-semibold">Failed to Load Analytics</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Analytics Dashboard</h2>
        <p className="text-slate-600 text-sm mt-1">
          Real-time business metrics and statistics
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-4 border-b border-slate-200">
        {(['overview', 'inventory', 'revenue'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 font-semibold border-b-2 transition-colors capitalize ${
              activeTab === tab
                ? 'border-chinaRed text-chinaRed'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Revenue */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-blue-900">Total Revenue</h3>
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-blue-900">
              {formatCurrency(metrics.stats.totalRevenue)}
            </p>
            <p className="text-xs text-blue-700 mt-2">
              From {formatNumber(metrics.stats.totalPurchases)} purchases
            </p>
          </div>

          {/* Total Purchases */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-green-900">
                Total Purchases
              </h3>
              <Package className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-green-900">
              {formatNumber(metrics.stats.totalPurchases)}
            </p>
            <p className="text-xs text-green-700 mt-2">All time</p>
          </div>

          {/* VPN URLs Inventory */}
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-purple-900">
                VPN URLs
              </h3>
              <Zap className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-purple-900">
              {formatNumber(metrics.stats.totalVpnUrls)}
            </p>
            <p className="text-xs text-purple-700 mt-2">
              {metrics.vpnUtilization}% utilized
            </p>
          </div>

          {/* Avg Revenue Per Purchase */}
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-orange-900">
                Avg Per Purchase
              </h3>
              <BarChart3 className="w-5 h-5 text-orange-600" />
            </div>
            <p className="text-2xl font-bold text-orange-900">
              {metrics.stats.totalPurchases > 0
                ? formatCurrency(metrics.stats.totalRevenue / metrics.stats.totalPurchases)
                : '$0.00'}
            </p>
            <p className="text-xs text-orange-700 mt-2">Average transaction</p>
          </div>
        </div>
      )}

      {/* Inventory Tab */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Active VPN URLs */}
            <div className="bg-white border border-slate-200 rounded-lg p-6">
              <h3 className="font-semibold text-slate-900 mb-4">Active URLs</h3>
              <p className="text-4xl font-bold text-green-600 mb-2">
                {formatNumber(metrics.stats.activeVpnUrls)}
              </p>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full transition-all"
                  style={{
                    width: `${
                      metrics.stats.totalVpnUrls > 0
                        ? (metrics.stats.activeVpnUrls /
                            metrics.stats.totalVpnUrls) *
                          100
                        : 0
                    }%`,
                  }}
                />
              </div>
              <p className="text-xs text-slate-600 mt-2">Available for purchase</p>
            </div>

            {/* Used VPN URLs */}
            <div className="bg-white border border-slate-200 rounded-lg p-6">
              <h3 className="font-semibold text-slate-900 mb-4">Used URLs</h3>
              <p className="text-4xl font-bold text-blue-600 mb-2">
                {formatNumber(metrics.stats.usedVpnUrls)}
              </p>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{
                    width: `${
                      metrics.stats.totalVpnUrls > 0
                        ? (metrics.stats.usedVpnUrls / metrics.stats.totalVpnUrls) *
                          100
                        : 0
                    }%`,
                  }}
                />
              </div>
              <p className="text-xs text-slate-600 mt-2">Assigned to users</p>
            </div>

            {/* Inactive VPN URLs */}
            <div className="bg-white border border-slate-200 rounded-lg p-6">
              <h3 className="font-semibold text-slate-900 mb-4">Inactive URLs</h3>
              <p className="text-4xl font-bold text-slate-600 mb-2">
                {formatNumber(metrics.stats.inactiveVpnUrls)}
              </p>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div
                  className="bg-slate-600 h-2 rounded-full transition-all"
                  style={{
                    width: `${
                      metrics.stats.totalVpnUrls > 0
                        ? (metrics.stats.inactiveVpnUrls /
                            metrics.stats.totalVpnUrls) *
                          100
                        : 0
                    }%`,
                  }}
                />
              </div>
              <p className="text-xs text-slate-600 mt-2">Disabled or removed</p>
            </div>
          </div>

          {/* Utilization Summary */}
          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <h3 className="font-semibold text-slate-900 mb-4">
              Inventory Utilization
            </h3>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-700">Total Inventory</span>
                  <span className="font-semibold text-slate-900">
                    {formatNumber(metrics.stats.totalVpnUrls)}
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-3">
                  <div className="bg-slate-600 h-3 rounded-full" style={{ width: '100%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-700">Sold/Used</span>
                  <span className="font-semibold text-slate-900">
                    {metrics.vpnUtilization}%
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-3">
                  <div
                    className="bg-chinaRed h-3 rounded-full transition-all"
                    style={{ width: `${metrics.vpnUtilization}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-700">Available</span>
                  <span className="font-semibold text-slate-900">
                    {100 - metrics.vpnUtilization}%
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-3">
                  <div
                    className="bg-green-600 h-3 rounded-full transition-all"
                    style={{ width: `${100 - metrics.vpnUtilization}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Revenue Tab */}
      {activeTab === 'revenue' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Revenue Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded">
                <span className="text-slate-700">Total Revenue</span>
                <span className="text-xl font-bold text-chinaRed">
                  {formatCurrency(metrics.stats.totalRevenue)}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded">
                <span className="text-slate-700">Total Transactions</span>
                <span className="text-xl font-bold text-slate-900">
                  {formatNumber(metrics.stats.totalPurchases)}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded">
                <span className="text-slate-700">Average Transaction</span>
                <span className="text-xl font-bold text-slate-900">
                  {metrics.stats.totalPurchases > 0
                    ? formatCurrency(metrics.stats.totalRevenue / metrics.stats.totalPurchases)
                    : '$0.00'}
                </span>
              </div>
            </div>
          </div>

          {/* Product List */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="p-6 border-b border-slate-200">
              <h3 className="font-semibold text-slate-900">Available Products</h3>
            </div>
            <div className="divide-y divide-slate-200">
              {metrics.products.map((product) => (
                <div key={product.id} className="p-4 flex justify-between items-center hover:bg-slate-50">
                  <div>
                    <p className="font-semibold text-slate-900">{product.name}</p>
                    <p className="text-xs text-slate-600 mt-1">{product.id}</p>
                  </div>
                  <p className="text-lg font-bold text-chinaRed">
                    {formatCurrency(product.price_cents)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsDashboard;
