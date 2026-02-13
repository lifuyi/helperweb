import React, { useState, useEffect } from 'react';
import { ArrowLeft, BarChart3, Package, Server, AlertCircle, Loader } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getAdminStats, AdminStats } from '../services/adminService';
import { PurchaseManagement } from './PurchaseManagement';
import { VpnManagement } from './VpnManagement';
import { logger } from '../utils/logger';

/**
 * Check if user is admin
 */
function isAdminUser(email?: string): boolean {
  if (!email) return false;
  const adminEmails = import.meta.env.VITE_ADMIN_EMAILS?.split(',') || [];
  return adminEmails.some((adminEmail) => adminEmail.trim().toLowerCase() === email.toLowerCase());
}

interface AdminDashboardProps {
  onBack: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBack }) => {
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'purchases' | 'vpn-management'>('overview');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user is admin
  const isAdmin = isAuthenticated && user && isAdminUser(user.email);

  useEffect(() => {
    if (!isAdmin) {
      setError('You do not have permission to access the admin dashboard.');
      setIsLoading(false);
      return;
    }

    loadStats();
  }, [isAdmin]);

  const loadStats = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const adminStats = await getAdminStats();
      setStats(adminStats);
    } catch (err) {
      logger.error('Error loading admin stats:', err);
      setError('Failed to load dashboard statistics. Please try again later.');
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
              You need to be logged in to access the admin dashboard.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
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
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-slate-900 mb-4">Access Denied</h1>
            <p className="text-slate-600">
              You do not have permission to access the admin dashboard.
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
          <p className="text-slate-600">Loading admin dashboard...</p>
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
              <h1 className="text-4xl font-bold text-slate-900 mb-2">Admin Dashboard</h1>
              <p className="text-slate-600">
                Manage purchases and VPN inventory
              </p>
            </div>
            <button
              onClick={loadStats}
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

        {/* Statistics Cards */}
        {activeTab === 'overview' && stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Total Purchases"
              value={stats.totalPurchases}
              icon="📦"
              color="blue"
            />
            <StatCard
              title="Total Revenue"
              value={`$${stats.totalRevenue.toFixed(2)}`}
              icon="💰"
              color="green"
            />
            <StatCard
              title="Active VPN URLs"
              value={stats.activeVpnUrls}
              icon="✅"
              color="emerald"
            />
            <StatCard
              title="Used VPN URLs"
              value={stats.usedVpnUrls}
              icon="🔗"
              color="purple"
            />
          </div>
        )}

        {/* Tab Navigation */}
        <div className="mb-6 flex space-x-4 border-b border-slate-200">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-3 font-semibold border-b-2 transition-colors ${
              activeTab === 'overview'
                ? 'border-chinaRed text-chinaRed'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-5 h-5 inline mr-2" />
            Overview
          </button>
          <button
            onClick={() => setActiveTab('purchases')}
            className={`px-6 py-3 font-semibold border-b-2 transition-colors ${
              activeTab === 'purchases'
                ? 'border-chinaRed text-chinaRed'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Package className="w-5 h-5 inline mr-2" />
            Purchases
          </button>
          <button
            onClick={() => setActiveTab('vpn-management')}
            className={`px-6 py-3 font-semibold border-b-2 transition-colors ${
              activeTab === 'vpn-management'
                ? 'border-chinaRed text-chinaRed'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Server className="w-5 h-5 inline mr-2" />
            VPN Management
          </button>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'overview' && stats && (
            <OverviewTab stats={stats} />
          )}
          {activeTab === 'purchases' && (
            <PurchaseManagement />
          )}
          {activeTab === 'vpn-management' && (
            <VpnManagement onSuccess={loadStats} />
          )}
        </div>
      </div>
    </div>
  );
};

interface StatCardProps {
  title: string;
  value: string | number;
  icon: string;
  color: 'blue' | 'green' | 'emerald' | 'purple';
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color }) => {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200',
    green: 'bg-green-50 border-green-200',
    emerald: 'bg-emerald-50 border-emerald-200',
    purple: 'bg-purple-50 border-purple-200',
  };

  return (
    <div className={`${colorClasses[color]} border rounded-lg p-6`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-slate-900">{value}</p>
        </div>
        <span className="text-4xl">{icon}</span>
      </div>
    </div>
  );
};

interface OverviewTabProps {
  stats: AdminStats;
}

const OverviewTab: React.FC<OverviewTabProps> = ({ stats }) => {
  return (
    <div className="space-y-8">
      {/* VPN URL Statistics */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-6">VPN URL Inventory</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="border-l-4 border-emerald-500 pl-4">
            <p className="text-sm text-slate-600 mb-1">Active URLs</p>
            <p className="text-3xl font-bold text-emerald-600">{stats.activeVpnUrls}</p>
          </div>
          <div className="border-l-4 border-purple-500 pl-4">
            <p className="text-sm text-slate-600 mb-1">Used URLs</p>
            <p className="text-3xl font-bold text-purple-600">{stats.usedVpnUrls}</p>
          </div>
          <div className="border-l-4 border-red-500 pl-4">
            <p className="text-sm text-slate-600 mb-1">Inactive URLs</p>
            <p className="text-3xl font-bold text-red-600">{stats.inactiveVpnUrls}</p>
          </div>
        </div>
        <p className="text-sm text-slate-500 mt-4">
          Total: {stats.totalVpnUrls} VPN URLs
        </p>
      </div>

      {/* Purchase Statistics */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-6">Purchase Statistics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border-l-4 border-blue-500 pl-4">
            <p className="text-sm text-slate-600 mb-1">Total Purchases</p>
            <p className="text-3xl font-bold text-blue-600">{stats.totalPurchases}</p>
          </div>
          <div className="border-l-4 border-green-500 pl-4">
            <p className="text-sm text-slate-600 mb-1">Total Revenue</p>
            <p className="text-3xl font-bold text-green-600">${stats.totalRevenue.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-6">Quick Actions</h2>
        <p className="text-slate-600 mb-4">Navigate to other sections using the tabs above:</p>
        <ul className="space-y-2 text-slate-600">
          <li className="flex items-center">
            <span className="w-2 h-2 bg-chinaRed rounded-full mr-3"></span>
            <span><strong>Purchases:</strong> View and manage all customer purchases</span>
          </li>
          <li className="flex items-center">
            <span className="w-2 h-2 bg-chinaRed rounded-full mr-3"></span>
            <span><strong>VPN Management:</strong> View and manage all VPN URLs, toggle active/inactive status</span>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default AdminDashboard;
