import React, { useState, useEffect } from 'react';
import { logger } from '../utils/logger';
import {
  AlertCircle,
  CheckCircle,
  Loader,
  Trash2,
  Eye,
  EyeOff,
  Server,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
} from 'lucide-react';
import {
  getAllVpnUrls,
  getVpnUrlCount,
  updateVpnUrlStatus,
  deleteVpnUrl,
  VpnUrlWithUser,
  searchVpnUrls,
} from '../services/adminService';

interface VpnManagementProps {
  onSuccess?: () => void;
}

export const VpnManagement: React.FC<VpnManagementProps> = ({ onSuccess }) => {
  const [vpnUrls, setVpnUrls] = useState<VpnUrlWithUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'used' | 'inactive'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalVpnUrls, setTotalVpnUrls] = useState(0);
  const [showMaskedUrls, setShowMaskedUrls] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const itemsPerPage = 20;

  useEffect(() => {
    loadVpnUrls();
  }, [filterStatus, currentPage]);

  const loadVpnUrls = async () => {
    try {
      setIsLoading(true);
      const offset = (currentPage - 1) * itemsPerPage;

      let results: VpnUrlWithUser[] = [];
      if (filterStatus === 'all') {
        results = await getAllVpnUrls(undefined, itemsPerPage, offset);
      } else {
        results = await getAllVpnUrls(filterStatus as any, itemsPerPage, offset);
      }

      const count = await getVpnUrlCount(filterStatus === 'all' ? undefined : (filterStatus as any));
      setVpnUrls(results);
      setTotalVpnUrls(count);
    } catch (error) {
      logger.error('Error loading VPN URLs:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadVpnUrls();
    onSuccess?.();
  };

  const handleStatusChange = async (vpnUrlId: string, newStatus: 'active' | 'inactive' | 'used') => {
    try {
      await updateVpnUrlStatus(vpnUrlId, newStatus);
      const updated = vpnUrls.map((u) => (u.id === vpnUrlId ? { ...u, status: newStatus } : u));
      setVpnUrls(updated);
    } catch (error) {
      logger.error('Error updating status:', error);
      alert('Failed to update status');
    }
  };

  const handleToggleActive = async (vpnUrl: VpnUrlWithUser) => {
    const newStatus = vpnUrl.status === 'active' ? 'inactive' : 'active';
    await handleStatusChange(vpnUrl.id, newStatus);
  };

  const handleDeleteUrl = async (vpnUrlId: string) => {
    if (!confirm('Are you sure you want to delete this VPN URL?')) return;

    try {
      await deleteVpnUrl(vpnUrlId);
      setVpnUrls(vpnUrls.filter((u) => u.id !== vpnUrlId));
      setTotalVpnUrls(Math.max(0, totalVpnUrls - 1));
    } catch (error) {
      logger.error('Error deleting VPN URL:', error);
      alert('Failed to delete VPN URL');
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      try {
        setIsLoading(true);
        const results = await searchVpnUrls(query);
        setVpnUrls(results);
        setTotalVpnUrls(results.length);
      } catch (error) {
        logger.error('Error searching:', error);
      } finally {
        setIsLoading(false);
      }
    } else {
      setCurrentPage(1);
      loadVpnUrls();
    }
  };

  const totalPages = Math.ceil(totalVpnUrls / itemsPerPage);

  const getStatusBadgeColor = (status: string): string => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'used':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'inactive':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'used':
        return <Server className="w-4 h-4 text-blue-600" />;
      case 'inactive':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return null;
    }
  };

  const formatTrafficLimit = (bytes: number): string => {
    if (bytes >= 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }
    if (bytes >= 1024) {
      return `${(bytes / 1024).toFixed(2)} KB`;
    }
    return `${bytes} B`;
  };

  const maskUrl = (url: string): string => {
    if (url.length <= 8) return url;
    return url.substring(0, 4) + '...' + url.substring(url.length - 4);
  };

  // Statistics
  const activeCount = vpnUrls.filter(u => u.status === 'active').length;
  const usedCount = vpnUrls.filter(u => u.status === 'used').length;
  const inactiveCount = vpnUrls.filter(u => u.status === 'inactive').length;

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">VPN URL Management</h2>
            <p className="text-slate-600 mt-1">View and manage all VPN URLs in the database</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center space-x-2 px-4 py-2 bg-chinaRed text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <p className="text-sm text-slate-600 mb-1">Total URLs</p>
            <p className="text-2xl font-bold text-slate-900">{totalVpnUrls}</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <div className="flex items-center space-x-2 mb-1">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <p className="text-sm text-green-700">Active</p>
            </div>
            <p className="text-2xl font-bold text-green-700">{filterStatus === 'all' ? '—' : activeCount}</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center space-x-2 mb-1">
              <Server className="w-4 h-4 text-blue-600" />
              <p className="text-sm text-blue-700">Used</p>
            </div>
            <p className="text-2xl font-bold text-blue-700">{filterStatus === 'all' ? '—' : usedCount}</p>
          </div>
          <div className="bg-red-50 rounded-lg p-4 border border-red-200">
            <div className="flex items-center space-x-2 mb-1">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <p className="text-sm text-red-700">Unavailable</p>
            </div>
            <p className="text-2xl font-bold text-red-700">{filterStatus === 'all' ? '—' : inactiveCount}</p>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="Search VPN URLs..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-chinaRed"
          />
          {searchQuery && (
            <button
              onClick={() => handleSearch('')}
              className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        {!searchQuery && (
          <div className="flex gap-2 flex-wrap">
            {(['all', 'active', 'used', 'inactive'] as const).map((status) => (
              <button
                key={status}
                onClick={() => {
                  setFilterStatus(status);
                  setCurrentPage(1);
                }}
                className={`px-4 py-2 rounded-lg transition-colors capitalize ${
                  filterStatus === status
                    ? 'bg-chinaRed text-white'
                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                }`}
              >
                {status === 'inactive' ? 'Unavailable' : status}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* VPN URLs Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12 bg-white rounded-lg shadow">
          <div className="text-center">
            <Loader className="w-12 h-12 text-chinaRed animate-spin mx-auto mb-4" />
            <p className="text-slate-600">Loading VPN URLs...</p>
          </div>
        </div>
      ) : vpnUrls.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Server className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600">No VPN URLs found.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-100 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">URL</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Days</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Traffic</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Toggle</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Assigned To</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Created</th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {vpnUrls.map((vpnUrl) => (
                  <tr key={vpnUrl.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-sm text-slate-900 max-w-xs truncate">
                      {showMaskedUrls ? maskUrl(vpnUrl.url) : vpnUrl.url}
                    </td>
                    <td className="px-6 py-4 text-slate-900">{vpnUrl.day_period}d</td>
                    <td className="px-6 py-4 text-slate-900">
                      {formatTrafficLimit(vpnUrl.traffic_limit)}
                    </td>
                    <td className="px-6 py-4">
                      <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-semibold border ${getStatusBadgeColor(vpnUrl.status)}`}>
                        {getStatusIcon(vpnUrl.status)}
                        <span className="capitalize">
                          {vpnUrl.status === 'inactive' ? 'Unavailable' : vpnUrl.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {vpnUrl.status !== 'used' ? (
                        <button
                          onClick={() => handleToggleActive(vpnUrl)}
                          className="flex items-center space-x-1 transition-colors"
                          title={vpnUrl.status === 'active' ? 'Click to disable' : 'Click to enable'}
                        >
                          {vpnUrl.status === 'active' ? (
                            <>
                              <ToggleRight className="w-8 h-8 text-green-600 hover:text-green-700" />
                              <span className="text-xs text-green-600 font-medium">ON</span>
                            </>
                          ) : (
                            <>
                              <ToggleLeft className="w-8 h-8 text-red-500 hover:text-red-600" />
                              <span className="text-xs text-red-500 font-medium">OFF</span>
                            </>
                          )}
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Assigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {vpnUrl.user_email ? (
                        <div>
                          <p className="text-sm text-slate-900">{vpnUrl.user_name}</p>
                          <p className="text-xs text-slate-500">{vpnUrl.user_email}</p>
                        </div>
                      ) : (
                        <span className="text-slate-500 text-sm">Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {new Date(vpnUrl.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleDeleteUrl(vpnUrl.id)}
                        className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                        title="Delete URL"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Footer with Show/Hide Toggle and Pagination */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setShowMaskedUrls(!showMaskedUrls)}
          className="flex items-center space-x-2 text-slate-600 hover:text-slate-900"
        >
          {showMaskedUrls ? (
            <>
              <Eye className="w-4 h-4" />
              <span className="text-sm">Show Full URLs</span>
            </>
          ) : (
            <>
              <EyeOff className="w-4 h-4" />
              <span className="text-sm">Mask URLs</span>
            </>
          )}
        </button>

        {/* Pagination */}
        {totalPages > 1 && !searchQuery && (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 border border-slate-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
            >
              Previous
            </button>
            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map(
                (page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-2 rounded-lg transition-colors ${
                      currentPage === page
                        ? 'bg-chinaRed text-white'
                        : 'border border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {page}
                  </button>
                )
              )}
            </div>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 border border-slate-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default VpnManagement;
