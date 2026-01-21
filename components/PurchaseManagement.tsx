import React, { useState, useEffect } from 'react';
import { Search, ChevronDown, ChevronUp, Download, Loader, AlertCircle } from 'lucide-react';
import {
  getAllPurchases,
  getPurchaseCount,
  searchPurchases,
  PurchaseWithUser,
} from '../services/adminService';

export const PurchaseManagement: React.FC = () => {
  const [purchases, setPurchases] = useState<PurchaseWithUser[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedPurchaseId, setExpandedPurchaseId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const itemsPerPage = 20;

  useEffect(() => {
    loadPurchases();
  }, [currentPage, sortBy, sortOrder]);

  const loadPurchases = async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (searchQuery.trim()) {
        // Search mode
        const results = await searchPurchases(searchQuery);
        setPurchases(results);
        setTotalCount(results.length);
      } else {
        // Normal mode - load all purchases with pagination
        const offset = (currentPage - 1) * itemsPerPage;
        const results = await getAllPurchases(itemsPerPage, offset);
        const count = await getPurchaseCount();

        // Sort purchases
        const sorted = sortPurchases(results, sortBy, sortOrder);
        setPurchases(sorted);
        setTotalCount(count);
      }
    } catch (err) {
      console.error('Error loading purchases:', err);
      setError('Failed to load purchases. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCurrentPage(1);
    loadPurchases();
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setCurrentPage(1);
  };

  const handleSort = (column: 'date' | 'amount') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const handleExportCSV = () => {
    const headers = ['Purchase ID', 'User Email', 'User Name', 'Product ID', 'Amount', 'Currency', 'Status', 'Date'];
    const rows = purchases.map((p) => [
      p.id.slice(0, 8),
      p.user_email,
      p.user_name,
      p.product_id,
      p.amount,
      p.currency,
      p.status,
      new Date(p.created_at).toLocaleDateString(),
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `purchases_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const getProductName = (productId: string): string => {
    const productNames: Record<string, string> = {
      'payment-guide': 'Payment Guide PDF',
      'vpn-3days': 'VPN 3-Day Pass',
      'vpn-7days': 'VPN 7-Day Pass',
      'vpn-14days': 'VPN 14-Day Pass',
      'vpn-30days': 'VPN 30-Day Pass',
    };
    return productNames[productId] || productId;
  };

  const getStatusBadgeColor = (status: string): string => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  if (isLoading && purchases.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader className="w-12 h-12 text-chinaRed animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading purchases...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="bg-white rounded-lg shadow p-6">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by user email or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-chinaRed"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-2 bg-chinaRed text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Search
          </button>
          {searchQuery && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
            >
              Clear
            </button>
          )}
        </form>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Export Button */}
      {purchases.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-2 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export as CSV</span>
          </button>
        </div>
      )}

      {/* Purchases Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {purchases.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-slate-600">No purchases found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-100 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">User</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Product</th>
                  <th
                    className="px-6 py-3 text-left text-sm font-semibold text-slate-700 cursor-pointer hover:bg-slate-200"
                    onClick={() => handleSort('amount')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Amount</span>
                      {sortBy === 'amount' && (
                        sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Status</th>
                  <th
                    className="px-6 py-3 text-left text-sm font-semibold text-slate-700 cursor-pointer hover:bg-slate-200"
                    onClick={() => handleSort('date')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Date</span>
                      {sortBy === 'date' && (
                        sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-slate-700">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {purchases.map((purchase) => (
                  <React.Fragment key={purchase.id}>
                    <tr className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-slate-900">{purchase.user_name}</p>
                          <p className="text-sm text-slate-500">{purchase.user_email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-slate-900">{getProductName(purchase.product_id)}</p>
                        <p className="text-sm text-slate-500">{purchase.product_id}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-900">
                          ${purchase.amount.toFixed(2)} {purchase.currency.toUpperCase()}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusBadgeColor(purchase.status)}`}>
                          {purchase.status.charAt(0).toUpperCase() + purchase.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {new Date(purchase.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() =>
                            setExpandedPurchaseId(
                              expandedPurchaseId === purchase.id ? null : purchase.id
                            )
                          }
                          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          {expandedPurchaseId === purchase.id ? (
                            <ChevronUp className="w-5 h-5 text-slate-600" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-slate-600" />
                          )}
                        </button>
                      </td>
                    </tr>

                    {/* Expanded Details */}
                    {expandedPurchaseId === purchase.id && (
                      <tr className="bg-slate-50">
                        <td colSpan={6} className="px-6 py-4">
                          <div className="grid grid-cols-2 gap-6">
                            <div>
                              <p className="text-sm text-slate-600 mb-1">Purchase ID</p>
                              <p className="font-mono text-sm text-slate-900">{purchase.id}</p>
                            </div>
                            <div>
                              <p className="text-sm text-slate-600 mb-1">User ID</p>
                              <p className="font-mono text-sm text-slate-900">{purchase.user_id}</p>
                            </div>
                            <div>
                              <p className="text-sm text-slate-600 mb-1">Created At</p>
                              <p className="text-sm text-slate-900">
                                {new Date(purchase.created_at).toLocaleString()}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-slate-600 mb-1">Updated At</p>
                              <p className="text-sm text-slate-900">
                                {new Date(purchase.updated_at).toLocaleString()}
                              </p>
                            </div>
                            {purchase.stripe_session_id && (
                              <div className="col-span-2">
                                <p className="text-sm text-slate-600 mb-1">Stripe Session ID</p>
                                <p className="font-mono text-sm text-slate-900">
                                  {purchase.stripe_session_id}
                                </p>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && !searchQuery && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-600">
            Showing {Math.min((currentPage - 1) * itemsPerPage + 1, totalCount)} to{' '}
            {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} purchases
          </p>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 border border-slate-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
            >
              Previous
            </button>
            <div className="flex items-center space-x-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
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
              ))}
            </div>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 border border-slate-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Sort purchases
 */
function sortPurchases(
  purchases: PurchaseWithUser[],
  sortBy: 'date' | 'amount',
  sortOrder: 'asc' | 'desc'
): PurchaseWithUser[] {
  const sorted = [...purchases].sort((a, b) => {
    let comparison = 0;

    if (sortBy === 'date') {
      comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    } else if (sortBy === 'amount') {
      comparison = a.amount - b.amount;
    }

    return sortOrder === 'asc' ? comparison : -comparison;
  });

  return sorted;
}

export default PurchaseManagement;
