import React, { useState, useEffect } from 'react';
import { logger } from '../utils/logger';
import {
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Loader,
  AlertCircle,
  Shield,
} from 'lucide-react';
import {
  getAllAdminUsers,
  createAdminUser,
  updateAdminUserRole,
  deleteAdminUser,
} from '../services/adminService';

interface AdminUser {
  id: string;
  user_id: string;
  email: string;
  username: string;
  role: 'admin' | 'moderator' | 'viewer';
  created_at: string;
  updated_at: string;
}

export const AdminUserManagement: React.FC = () => {
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<'admin' | 'moderator' | 'viewer'>('viewer');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminRole, setNewAdminRole] = useState<'admin' | 'moderator' | 'viewer'>('viewer');

  useEffect(() => {
    loadAdminUsers();
  }, []);

  const loadAdminUsers = async () => {
    try {
      setIsLoading(true);
      const data = await getAllAdminUsers();
      setAdminUsers(data);
    } catch (err) {
      logger.error('Error loading admin users:', err);
      setError('Failed to load admin users');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddAdmin = async () => {
    if (!newAdminEmail) {
      setError('Please enter an email address');
      return;
    }

    try {
      await createAdminUser(newAdminEmail, newAdminRole);
      await loadAdminUsers();
      setNewAdminEmail('');
      setNewAdminRole('viewer');
      setShowAddForm(false);
      setSuccess('Admin user added successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      logger.error('Error adding admin user:', err);
      setError('Failed to add admin user. Make sure the email exists.');
    }
  };

  const handleUpdateRole = async (userId: string, newRole: 'admin' | 'moderator' | 'viewer') => {
    try {
      await updateAdminUserRole(userId, newRole);
      setAdminUsers(
        adminUsers.map((u) => (u.user_id === userId ? { ...u, role: newRole } : u))
      );
      setEditingId(null);
      setSuccess('Role updated successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      logger.error('Error updating role:', err);
      setError('Failed to update role');
    }
  };

  const handleDeleteAdmin = async (userId: string, email: string) => {
    if (!confirm(`Remove admin access from ${email}?`)) return;

    try {
      await deleteAdminUser(userId);
      setAdminUsers(adminUsers.filter((u) => u.user_id !== userId));
      setSuccess('Admin user removed');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      logger.error('Error deleting admin user:', err);
      setError('Failed to remove admin user');
    }
  };

  const getRoleBadgeColor = (role: string): string => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'moderator':
        return 'bg-yellow-100 text-yellow-800';
      case 'viewer':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  const getRoleDescription = (role: string): string => {
    switch (role) {
      case 'admin':
        return 'Full access - manage all settings, users, and products';
      case 'moderator':
        return 'Manage products and inventory, view analytics';
      case 'viewer':
        return 'View-only access to analytics and reports';
      default:
        return 'Unknown role';
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Admin Users</h2>
          <p className="text-slate-600 text-sm mt-1">Manage admin and moderator access</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center space-x-2 px-4 py-2 bg-chinaRed text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add Admin</span>
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="flex items-start space-x-3 bg-red-50 border border-red-200 rounded-lg p-4">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="flex items-start space-x-3 bg-green-50 border border-green-200 rounded-lg p-4">
          <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-green-800">{success}</p>
        </div>
      )}

      {/* Add Admin Form */}
      {showAddForm && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 space-y-4">
          <h3 className="font-semibold text-slate-900">Add New Admin User</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                placeholder="user@example.com"
                value={newAdminEmail}
                onChange={(e) => setNewAdminEmail(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-chinaRed"
              />
              <p className="text-xs text-slate-600 mt-1">
                Must be an existing user in the system
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Role
              </label>
              <select
                value={newAdminRole}
                onChange={(e) =>
                  setNewAdminRole(e.target.value as 'admin' | 'moderator' | 'viewer')
                }
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-chinaRed"
              >
                <option value="viewer">Viewer (View-only access)</option>
                <option value="moderator">Moderator (Manage products & inventory)</option>
                <option value="admin">Admin (Full access)</option>
              </select>
              <p className="text-xs text-slate-600 mt-1">
                {getRoleDescription(newAdminRole)}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleAddAdmin}
              className="flex-1 px-4 py-2 bg-chinaRed text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Add Admin User
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="flex-1 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Admin Users Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader className="w-8 h-8 text-chinaRed animate-spin" />
        </div>
      ) : adminUsers.length === 0 ? (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-8 text-center">
          <Shield className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-700 font-semibold">No Admin Users Yet</p>
          <p className="text-slate-600 text-sm mt-2">Add your first admin user to get started</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-100 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">
                    Username
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">
                    Added
                  </th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-slate-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {adminUsers.map((user) => (
                  <tr key={user.user_id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-900 font-medium">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">{user.username}</td>
                    <td className="px-6 py-4">
                      {editingId === user.user_id ? (
                        <div className="flex items-center space-x-2">
                          <select
                            value={editRole}
                            onChange={(e) =>
                              setEditRole(e.target.value as 'admin' | 'moderator' | 'viewer')
                            }
                            className="px-2 py-1 border border-slate-300 rounded text-sm"
                          >
                            <option value="viewer">Viewer</option>
                            <option value="moderator">Moderator</option>
                            <option value="admin">Admin</option>
                          </select>
                          <button
                            onClick={() => handleUpdateRole(user.user_id, editRole)}
                            className="p-1 text-green-600 hover:bg-green-50 rounded"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getRoleBadgeColor(user.role)}`}>
                            {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                          </span>
                          <button
                            onClick={() => {
                              setEditingId(user.user_id);
                              setEditRole(user.role);
                            }}
                            className="p-1 text-slate-600 hover:bg-slate-100 rounded"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {formatDate(user.created_at)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleDeleteAdmin(user.user_id, user.email)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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

      {/* Role Information */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
        <h3 className="font-semibold text-blue-900">Role Permissions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="font-semibold text-blue-900">Admin</p>
            <p className="text-blue-800 text-xs mt-1">Full access to all features including user management</p>
          </div>
          <div>
            <p className="font-semibold text-blue-900">Moderator</p>
            <p className="text-blue-800 text-xs mt-1">Manage products, pricing, and VPN inventory</p>
          </div>
          <div>
            <p className="font-semibold text-blue-900">Viewer</p>
            <p className="text-blue-800 text-xs mt-1">View analytics and reports, read-only access</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminUserManagement;
