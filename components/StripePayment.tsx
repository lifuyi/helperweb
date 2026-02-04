import React, { useState } from 'react';
import { CreditCard, Lock, Loader2, AlertCircle } from 'lucide-react';
import { initiateCheckout, ProductInfo } from '../services/stripeService';
import { useAuth } from '../contexts/AuthContext';
import { logger } from '../utils/logger';

interface StripePaymentProps {
  product: ProductInfo;
  onSuccess?: (sessionId: string) => void;
  onError?: (error: string) => void;
  onCancel?: () => void;
}

export const StripePayment: React.FC<StripePaymentProps> = ({
  product,
  onSuccess,
  onError,
  onCancel,
}) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [promotionCode, setPromotionCode] = useState('');

  const handleCheckout = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (!user) {
        throw new Error('You must be logged in to make a purchase');
      }

      logger.log('Starting checkout with user:', {
        userId: user.id,
        userEmail: user.email,
        productId: product.id,
        productType: product.type,
      });

      await initiateCheckout({
        productId: product.id,
        productType: product.type,
        promotionCode: promotionCode || undefined,
        userId: user.id,
      });
      onSuccess?.('redirecting');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Payment initialization failed';
      logger.error('Checkout error:', errorMessage);
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-slate-900">Complete Purchase</h3>
        <div className="flex items-center text-sm text-slate-500">
          <Lock size={14} className="mr-1" />
          Secure
        </div>
      </div>

      <div className="bg-slate-50 rounded-xl p-4 mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-slate-600">{product.name}</span>
          <span className="font-bold text-slate-900">${product.price.toFixed(2)}</span>
        </div>
        {product.description && (
          <p className="text-sm text-slate-500">{product.description}</p>
        )}
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 flex items-center text-sm">
          <AlertCircle size={16} className="mr-2 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">
            Promotion Code (optional)
          </label>
          <input
            type="text"
            value={promotionCode}
            onChange={(e) => setPromotionCode(e.target.value)}
            placeholder="Enter code"
            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-chinaRed/20 focus:border-chinaRed"
          />
        </div>

        <button
          onClick={handleCheckout}
          disabled={isLoading}
          className="w-full bg-chinaRed hover:bg-red-700 disabled:bg-slate-300 text-white py-3 rounded-xl font-bold transition-colors flex items-center justify-center"
        >
          {isLoading ? (
            <>
              <Loader2 size={20} className="mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <CreditCard size={20} className="mr-2" />
              Pay ${product.price.toFixed(2)}
            </>
          )}
        </button>

        <div className="text-center">
          <div className="flex items-center justify-center space-x-2 text-xs text-slate-400">
            <span>Powered by</span>
            <span className="font-semibold text-slate-600">Stripe</span>
          </div>
        </div>

        {onCancel && (
          <button
            onClick={onCancel}
            className="w-full text-slate-500 hover:text-slate-700 text-sm py-2"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
};

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: ProductInfo | null;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  product,
}) => {
  if (!isOpen || !product) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md">
        <StripePayment
          product={product}
          onCancel={onClose}
          onSuccess={(sessionId) => {
            logger.log('Checkout session created:', sessionId);
          }}
          onError={(error) => {
            logger.error('Payment error:', error);
          }}
        />
      </div>
    </div>
  );
};

export default StripePayment;
