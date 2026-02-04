import React from 'react';
import { CheckCircle, Download, Mail, ArrowLeft } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

export const PaymentSuccess: React.FC = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const product = searchParams.get('product');

  const productNames: Record<string, string> = {
    'vpn-3days': 'VPN 3-Day Pass',
    'vpn-7days': 'VPN Weekly Pass',
    'vpn-14days': 'VPN 14-Day Pass',
    'vpn-30days': 'VPN Monthly Pass',
    'payment-guide': 'Payment Guide PDF',
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-20">
      <div className="container mx-auto px-6 max-w-lg">
        <div className="bg-white rounded-3xl shadow-lg p-8 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>

          <h1 className="text-3xl font-bold text-slate-900 mb-4">Payment Successful!</h1>
          <p className="text-slate-600 mb-6">
            Thank you for your purchase. Your {productNames[product || ''] || 'order'} has been confirmed.
          </p>

          <div className="bg-slate-50 rounded-xl p-4 mb-6">
            <p className="text-sm text-slate-500 mb-2">Order Details</p>
            <p className="font-semibold text-slate-900">{productNames[product || ''] || 'Product'}</p>
            <p className="text-xs text-slate-400">Session ID: {sessionId?.slice(0, 20)}...</p>
          </div>

          <div className="space-y-3">
            <a
              href="/user-center"
              className="block w-full bg-chinaRed hover:bg-red-700 text-white py-3 rounded-xl font-bold transition-colors flex items-center justify-center text-center"
            >
              <svg className="mr-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              View My Orders & VPN URLs
            </a>

            <button className="w-full bg-slate-100 hover:bg-slate-200 text-slate-900 py-3 rounded-xl font-bold transition-colors flex items-center justify-center">
              <Mail className="mr-2 w-4 h-4" />
              Check Email for Details
            </button>

            {product === 'payment-guide' && (
              <button className="w-full bg-slate-100 hover:bg-slate-200 text-slate-900 py-3 rounded-xl font-bold transition-colors flex items-center justify-center">
                <Download className="mr-2 w-4 h-4" />
                Download PDF Guide
              </button>
            )}

            <a
              href="/"
              className="block w-full text-slate-500 hover:text-slate-700 py-3 text-sm"
            >
              <ArrowLeft className="inline mr-1 w-4 h-4" />
              Back to Home
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;
