import React, { useState } from 'react';
import { LayoutDashboard, BarChart3, DollarSign, Users, LogOut } from 'lucide-react';
import AdminPricingDashboard from './AdminPricingDashboard';
import AnalyticsDashboard from './AnalyticsDashboard';
import AdminUserManagement from './AdminUserManagement';

type TabType = 'analytics' | 'pricing' | 'users';

interface AdminPanelProps {
  onLogout?: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState<TabType>('analytics');

  const tabs: Array<{ id: TabType; label: string; icon: React.ReactNode }> = [
    { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="w-5 h-5" /> },
    { id: 'pricing', label: 'Pricing', icon: <DollarSign className="w-5 h-5" /> },
    { id: 'users', label: 'Users', icon: <Users className="w-5 h-5" /> },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar Navigation */}
      <div className="bg-slate-900 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center space-x-3">
              <LayoutDashboard className="w-8 h-8 text-chinaRed" />
              <h1 className="text-xl font-bold">Admin Dashboard</h1>
            </div>
            {onLogout && (
              <button
                onClick={onLogout}
                className="flex items-center space-x-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm">Logout</span>
              </button>
            )}
          </div>

          {/* Tab Navigation */}
          <div className="flex space-x-1 border-t border-slate-700 pt-0">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-4 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-chinaRed text-chinaRed'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                {tab.icon}
                <span className="font-semibold">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'analytics' && <AnalyticsDashboard />}
        {activeTab === 'pricing' && <AdminPricingDashboard />}
        {activeTab === 'users' && <AdminUserManagement />}
      </div>
    </div>
  );
};

export default AdminPanel;
