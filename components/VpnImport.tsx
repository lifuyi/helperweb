import React, { useState, useEffect } from 'react';
import {
  Upload,
  AlertCircle,
  CheckCircle,
  Loader,
  Trash2,
  Filter,
  Eye,
  EyeOff,
} from 'lucide-react';
import {
  bulkImportVpnUrls,
  getAllVpnUrls,
  getVpnUrlCount,
  updateVpnUrlStatus,
  deleteVpnUrl,
  VpnUrlWithUser,
  searchVpnUrls,
} from '../services/adminService';

interface VpnImportProps {
  onSuccess?: () => void;
}

export const VpnImport: React.FC<VpnImportProps> = ({ onSuccess }) => {
  const [activeTab, setActiveTab] = useState<'import' | 'inventory'>('import');
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<Array<{url: string; day_period: number; traffic_limit: number}>>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    successCount: number;
    failedCount: number;
    errors: string[];
  } | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // Inventory tab states
  const [vpnUrls, setVpnUrls] = useState<VpnUrlWithUser[]>([]);
  const [isLoadingInventory, setIsLoadingInventory] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'used' | 'inactive'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [inventoryPage, setInventoryPage] = useState(1);
  const [totalVpnUrls, setTotalVpnUrls] = useState(0);
  const [showMaskedUrls, setShowMaskedUrls] = useState(true);

  const itemsPerPage = 20;

  useEffect(() => {
    if (activeTab === 'inventory') {
      loadInventory();
    }
  }, [activeTab, filterStatus, inventoryPage]);

  const loadInventory = async () => {
    try {
      setIsLoadingInventory(true);
      const offset = (inventoryPage - 1) * itemsPerPage;

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
      console.error('Error loading inventory:', error);
    } finally {
      setIsLoadingInventory(false);
    }
  };

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      const droppedFile = files[0];
      if (droppedFile.type === 'text/csv' || droppedFile.name.endsWith('.csv')) {
        setFile(droppedFile);
        parseCSV(droppedFile);
      } else {
        alert('Please drop a CSV file');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (files && files[0]) {
      const selectedFile = files[0];
      if (selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv')) {
        setFile(selectedFile);
        parseCSV(selectedFile);
      } else {
        alert('Please select a CSV file');
      }
    }
  };

  const parseCSV = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter((line) => line.trim());

        // Parse CSV - expect: url,day_period,traffic_limit
        const data = lines
          .slice(1) // Skip header
          .map((line) => {
            const [url, dayPeriodStr, trafficLimitStr] = line.split(',').map((s) => s.trim());
            const dayPeriod = parseInt(dayPeriodStr, 10);
            const trafficLimit = parseInt(trafficLimitStr, 10);

            if (!url || isNaN(dayPeriod) || isNaN(trafficLimit)) {
              throw new Error(`Invalid data in row: ${line}`);
            }

            return {
              url,
              day_period: dayPeriod,
              traffic_limit: trafficLimit,
            };
          });

        setPreviewData(data);
        setImportResult(null);
      } catch (error) {
        console.error('CSV parse error:', error);
        alert(`Error parsing CSV: ${(error as Error).message}`);
        setPreviewData([]);
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (previewData.length === 0) {
      alert('No data to import');
      return;
    }

    try {
      setIsImporting(true);
      const result = await bulkImportVpnUrls(previewData);
      setImportResult({
        success: result.failed === 0,
        successCount: result.success,
        failedCount: result.failed,
        errors: result.errors,
      });

      if (result.failed === 0) {
        setFile(null);
        setPreviewData([]);
        onSuccess?.();
      }
    } catch (error) {
      console.error('Import error:', error);
      setImportResult({
        success: false,
        successCount: 0,
        failedCount: previewData.length,
        errors: [(error as Error).message],
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleDeleteUrl = async (vpnUrlId: string) => {
    if (!confirm('Are you sure you want to delete this VPN URL?')) return;

    try {
      await deleteVpnUrl(vpnUrlId);
      setVpnUrls(vpnUrls.filter((u) => u.id !== vpnUrlId));
      setTotalVpnUrls(Math.max(0, totalVpnUrls - 1));
    } catch (error) {
      console.error('Error deleting VPN URL:', error);
      alert('Failed to delete VPN URL');
    }
  };

  const handleStatusChange = async (vpnUrlId: string, newStatus: 'active' | 'inactive' | 'used') => {
    try {
      await updateVpnUrlStatus(vpnUrlId, newStatus);
      const updated = vpnUrls.map((u) => (u.id === vpnUrlId ? { ...u, status: newStatus } : u));
      setVpnUrls(updated);
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      try {
        const results = await searchVpnUrls(query);
        setVpnUrls(results);
        setTotalVpnUrls(results.length);
      } catch (error) {
        console.error('Error searching:', error);
      }
    } else {
      setInventoryPage(1);
      loadInventory();
    }
  };

  const totalPages = Math.ceil(totalVpnUrls / itemsPerPage);
  const getStatusBadgeColor = (status: string): string => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'used':
        return 'bg-blue-100 text-blue-800';
      case 'inactive':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-slate-100 text-slate-800';
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

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex space-x-4 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('import')}
          className={`px-6 py-3 font-semibold border-b-2 transition-colors ${
            activeTab === 'import'
              ? 'border-chinaRed text-chinaRed'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Upload className="w-5 h-5 inline mr-2" />
          Import VPN URLs
        </button>
        <button
          onClick={() => setActiveTab('inventory')}
          className={`px-6 py-3 font-semibold border-b-2 transition-colors ${
            activeTab === 'inventory'
              ? 'border-chinaRed text-chinaRed'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Filter className="w-5 h-5 inline mr-2" />
          Inventory
        </button>
      </div>

      {/* Import Tab */}
      {activeTab === 'import' && (
        <div className="space-y-6">
          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="font-semibold text-blue-900 mb-2">CSV Format Instructions</h3>
            <p className="text-blue-800 text-sm mb-4">
              Your CSV file must have the following columns in this order:
            </p>
            <div className="bg-white p-3 rounded font-mono text-sm text-slate-700 mb-4">
              url,day_period,traffic_limit
            </div>
            <div className="text-blue-800 text-sm space-y-2">
              <p>• <strong>url</strong>: The VPN URL (e.g., vpn.example.com)</p>
              <p>• <strong>day_period</strong>: Validity period in days (e.g., 30)</p>
              <p>• <strong>traffic_limit</strong>: Traffic limit in bytes (e.g., 1073741824 for 1GB)</p>
            </div>
            <div className="mt-4 bg-white p-3 rounded text-sm">
              <p className="font-semibold text-slate-900 mb-2">Example row:</p>
              <p className="font-mono text-slate-700">vpn1.example.com,30,1073741824</p>
            </div>
          </div>

          {/* File Upload */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive
                ? 'border-chinaRed bg-red-50'
                : 'border-slate-300 hover:border-chinaRed'
            }`}
          >
            <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Upload CSV File</h3>
            <p className="text-slate-600 mb-6">
              Drag and drop your CSV file here or click to select
            </p>
            <label className="inline-block px-6 py-2 bg-chinaRed text-white rounded-lg hover:bg-red-700 transition-colors cursor-pointer">
              Select File
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>

          {/* File Info */}
          {file && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <p className="text-sm text-slate-600">
                <strong>File:</strong> {file.name}
              </p>
            </div>
          )}

          {/* Preview Data */}
          {previewData.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">
                  Preview ({previewData.length} rows)
                </h3>
                <button
                  onClick={() => {
                    setPreviewData([]);
                    setFile(null);
                  }}
                  className="text-sm text-slate-600 hover:text-slate-900"
                >
                  Clear
                </button>
              </div>

              <div className="overflow-x-auto bg-white rounded-lg border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">#</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">URL</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Days</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Traffic Limit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.slice(0, 10).map((item, index) => (
                      <tr key={index} className="border-b border-slate-200 hover:bg-slate-50">
                        <td className="px-4 py-3 text-slate-600">{index + 1}</td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-900">
                          {maskUrl(item.url)}
                        </td>
                        <td className="px-4 py-3 text-slate-900">{item.day_period}</td>
                        <td className="px-4 py-3 text-slate-900">
                          {formatTrafficLimit(item.traffic_limit)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {previewData.length > 10 && (
                <p className="text-sm text-slate-600 text-center">
                  ... and {previewData.length - 10} more rows
                </p>
              )}

              {/* Import Button */}
              <button
                onClick={handleImport}
                disabled={isImporting}
                className="w-full px-6 py-3 bg-chinaRed text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
              >
                {isImporting ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    <span>Importing...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    <span>Import {previewData.length} VPN URLs</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Import Result */}
          {importResult && (
            <div
              className={`border rounded-lg p-6 ${
                importResult.success
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
              }`}
            >
              <div className="flex items-start space-x-3">
                {importResult.success ? (
                  <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <h3
                    className={`font-semibold mb-2 ${
                      importResult.success ? 'text-green-900' : 'text-red-900'
                    }`}
                  >
                    {importResult.success ? 'Import Successful!' : 'Import Failed'}
                  </h3>
                  <p className={importResult.success ? 'text-green-800' : 'text-red-800'}>
                    Successfully imported: {importResult.successCount}
                    {importResult.failedCount > 0 && ` | Failed: ${importResult.failedCount}`}
                  </p>
                  {importResult.errors.length > 0 && (
                    <div className="mt-3 space-y-1">
                      {importResult.errors.map((error, index) => (
                        <p key={index} className="text-sm text-red-700">
                          • {error}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Inventory Tab */}
      {activeTab === 'inventory' && (
        <div className="space-y-6">
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
              <div className="flex gap-2">
                {(['all', 'active', 'used', 'inactive'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => {
                      setFilterStatus(status);
                      setInventoryPage(1);
                    }}
                    className={`px-4 py-2 rounded-lg transition-colors capitalize ${
                      filterStatus === status
                        ? 'bg-chinaRed text-white'
                        : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Inventory Table */}
          {isLoadingInventory ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader className="w-12 h-12 text-chinaRed animate-spin mx-auto mb-4" />
                <p className="text-slate-600">Loading inventory...</p>
              </div>
            </div>
          ) : vpnUrls.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
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
                      <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Assigned To</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Created</th>
                      <th className="px-6 py-3 text-center text-sm font-semibold text-slate-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {vpnUrls.map((vpnUrl) => (
                      <tr key={vpnUrl.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-mono text-sm text-slate-900">
                          {showMaskedUrls ? maskUrl(vpnUrl.url) : vpnUrl.url}
                        </td>
                        <td className="px-6 py-4 text-slate-900">{vpnUrl.day_period}d</td>
                        <td className="px-6 py-4 text-slate-900">
                          {formatTrafficLimit(vpnUrl.traffic_limit)}
                        </td>
                        <td className="px-6 py-4">
                          <select
                            value={vpnUrl.status}
                            onChange={(e) =>
                              handleStatusChange(vpnUrl.id, e.target.value as any)
                            }
                            className={`px-3 py-1 rounded-full text-sm font-semibold border-0 cursor-pointer ${getStatusBadgeColor(
                              vpnUrl.status
                            )}`}
                          >
                            <option value="active">Active</option>
                            <option value="used">Used</option>
                            <option value="inactive">Inactive</option>
                          </select>
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

          {/* Show/Hide URLs Toggle */}
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
                  onClick={() => setInventoryPage(Math.max(1, inventoryPage - 1))}
                  disabled={inventoryPage === 1}
                  className="px-4 py-2 border border-slate-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                >
                  Previous
                </button>
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map(
                    (page) => (
                      <button
                        key={page}
                        onClick={() => setInventoryPage(page)}
                        className={`px-3 py-2 rounded-lg transition-colors ${
                          inventoryPage === page
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
                  onClick={() => setInventoryPage(Math.min(totalPages, inventoryPage + 1))}
                  disabled={inventoryPage === totalPages}
                  className="px-4 py-2 border border-slate-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VpnImport;
