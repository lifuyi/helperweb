import React, { useState, useEffect } from 'react';
import { logger } from '../utils/logger';
import {
  Edit2,
  Trash2,
  Plus,
  Check,
  X,
  Loader,
  AlertCircle,
} from 'lucide-react';
import {
  getAllProducts,
  updateProductPrice,
  updateProductStatus,
  deleteProduct,
  upsertProduct,
} from '../services/adminService';

interface Product {
  id: string;
  name: string;
  description: string;
  price_cents: number;
  expiry_days: number;
  category: string;
  is_active: boolean;
  display_order: number;
}

export const AdminPricingDashboard: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState<number>(0);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newProduct, setNewProduct] = useState({
    id: '',
    name: '',
    description: '',
    price_cents: 0,
    expiry_days: 30,
    category: 'vpn',
    is_active: true,
    display_order: 0,
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setIsLoading(true);
      const data = await getAllProducts();
      setProducts(data);
    } catch (err) {
      logger.error('Error loading products:', err);
      setError('Failed to load products');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePriceEdit = async (productId: string, newPrice: number) => {
    try {
      await updateProductPrice(productId, newPrice);
      setProducts(
        products.map((p) =>
          p.id === productId ? { ...p, price_cents: newPrice } : p
        )
      );
      setEditingId(null);
      setSuccess(`Price updated for ${productId}`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      logger.error('Error updating price:', err);
      setError('Failed to update price');
    }
  };

  const handleStatusToggle = async (productId: string, isActive: boolean) => {
    try {
      await updateProductStatus(productId, !isActive);
      setProducts(
        products.map((p) =>
          p.id === productId ? { ...p, is_active: !isActive } : p
        )
      );
      setSuccess(`Product ${productId} ${!isActive ? 'activated' : 'deactivated'}`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      logger.error('Error updating status:', err);
      setError('Failed to update product status');
    }
  };

  const handleDelete = async (productId: string) => {
    if (!confirm(`Are you sure you want to delete ${productId}?`)) return;

    try {
      await deleteProduct(productId);
      setProducts(products.filter((p) => p.id !== productId));
      setSuccess(`Product ${productId} deleted`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      logger.error('Error deleting product:', err);
      setError('Failed to delete product');
    }
  };

  const handleAddProduct = async () => {
    if (!newProduct.id || !newProduct.name || newProduct.price_cents <= 0) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      await upsertProduct(newProduct);
      await loadProducts();
      setNewProduct({
        id: '',
        name: '',
        description: '',
        price_cents: 0,
        expiry_days: 30,
        category: 'vpn',
        is_active: true,
        display_order: 0,
      });
      setShowAddForm(false);
      setSuccess('Product added successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      logger.error('Error adding product:', err);
      setError('Failed to add product');
    }
  };

  const formatPrice = (cents: number): string => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Product Pricing</h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center space-x-2 px-4 py-2 bg-chinaRed text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add Product</span>
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

      {/* Add Product Form */}
      {showAddForm && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 space-y-4">
          <h3 className="font-semibold text-slate-900">Add New Product</h3>
          <div className="grid grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Product ID (e.g., vpn-60days)"
              value={newProduct.id}
              onChange={(e) =>
                setNewProduct({ ...newProduct, id: e.target.value })
              }
              className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-chinaRed"
            />
            <input
              type="text"
              placeholder="Product Name"
              value={newProduct.name}
              onChange={(e) =>
                setNewProduct({ ...newProduct, name: e.target.value })
              }
              className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-chinaRed"
            />
            <input
              type="number"
              placeholder="Price (cents)"
              value={newProduct.price_cents}
              onChange={(e) =>
                setNewProduct({
                  ...newProduct,
                  price_cents: parseInt(e.target.value) || 0,
                })
              }
              className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-chinaRed"
            />
            <input
              type="number"
              placeholder="Expiry Days"
              value={newProduct.expiry_days}
              onChange={(e) =>
                setNewProduct({
                  ...newProduct,
                  expiry_days: parseInt(e.target.value) || 30,
                })
              }
              className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-chinaRed"
            />
          </div>
          <textarea
            placeholder="Description"
            value={newProduct.description}
            onChange={(e) =>
              setNewProduct({ ...newProduct, description: e.target.value })
            }
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-chinaRed resize-none h-20"
          />
          <div className="flex gap-2">
            <button
              onClick={handleAddProduct}
              className="flex-1 px-4 py-2 bg-chinaRed text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Add Product
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

      {/* Products Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader className="w-8 h-8 text-chinaRed animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-100 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">
                    Product ID
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">
                    Expiry (Days)
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">
                    Status
                  </th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-slate-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-sm text-slate-900">
                      {product.id}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-900">
                      {product.name}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {editingId === product.id ? (
                        <div className="flex items-center space-x-2">
                          <input
                            type="number"
                            value={editPrice}
                            onChange={(e) =>
                              setEditPrice(parseInt(e.target.value) || 0)
                            }
                            className="w-24 px-2 py-1 border border-slate-300 rounded"
                          />
                          <button
                            onClick={() =>
                              handlePriceEdit(product.id, editPrice)
                            }
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
                          <span className="font-semibold text-slate-900">
                            {formatPrice(product.price_cents)}
                          </span>
                          <button
                            onClick={() => {
                              setEditingId(product.id);
                              setEditPrice(product.price_cents);
                            }}
                            className="p-1 text-slate-600 hover:bg-slate-100 rounded"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-900">
                      {product.expiry_days}d
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() =>
                          handleStatusToggle(product.id, product.is_active)
                        }
                        className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                          product.is_active
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                        }`}
                      >
                        {product.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleDelete(product.id)}
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
    </div>
  );
};

export default AdminPricingDashboard;
