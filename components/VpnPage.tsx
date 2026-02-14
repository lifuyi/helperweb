import React, { useState } from 'react';
import { VpnPlan } from '../types';
import { Check, Clock, Shield, ArrowLeft } from 'lucide-react';
import { StripePayment, PaymentModal } from './StripePayment';
import { PRODUCTS, ProductInfo } from '../services/stripeService';

interface VpnPageProps {
  onBack: () => void;
}

export const VpnPage: React.FC<VpnPageProps> = ({ onBack }) => {
  const [showPayment, setShowPayment] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductInfo | null>(null);

  const vpnPlans: VpnPlan[] = [
    { days: 3, price: 4.99, label: 'Short Trip' },
    { days: 7, price: 9.99, label: 'Weekly', popular: true },
    { days: 14, price: 16.99, label: 'Extended' },
    { days: 30, price: 29.99, label: 'Monthly' },
  ];

  const planProductMap: Record<number, ProductInfo> = {
    3: PRODUCTS.vpn3Days,
    7: PRODUCTS.vpn7Days,
    14: PRODUCTS.vpn14Days,
    30: PRODUCTS.vpn30Days,
  };

  const handleBuy = (plan: VpnPlan) => {
    setSelectedProduct(planProductMap[plan.days]);
    setShowPayment(true);
  };

  const handleClosePayment = () => {
    setShowPayment(false);
    setSelectedProduct(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPayment}
        onClose={handleClosePayment}
        product={selectedProduct}
      />

      <div className="container mx-auto px-6">
        <button 
          onClick={onBack}
          className="flex items-center text-slate-600 hover:text-chinaRed font-medium mb-8 transition-colors"
        >
          <ArrowLeft className="mr-2" size={20} /> Back to Home
        </button>

        <div className="text-center mb-16">
          <div className="inline-block px-3 py-1 bg-red-100 text-chinaRed rounded-full text-xs font-bold uppercase tracking-wider mb-4">
            Bypass the Firewall
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">China Travel VPN</h1>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            Stay connected to Google, Instagram, WhatsApp, and more while in China. 
            Your usage period starts from the moment you first connect - buy now, use later.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {vpnPlans.map((plan) => (
            <div 
              key={plan.days} 
              className={`relative bg-white rounded-2xl p-8 border-2 transition-transform hover:-translate-y-2 ${
                plan.popular ? 'border-chinaRed shadow-xl scale-105 z-10' : 'border-transparent shadow-lg'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-chinaRed text-white text-sm font-bold px-4 py-1 rounded-full">
                  Most Popular
                </div>
              )}
              <div className="text-center mb-6">
                <h3 className="text-lg font-medium text-slate-500 mb-2">{plan.label}</h3>
                <div className="flex items-baseline justify-center text-slate-900">
                  <span className="text-4xl font-bold">${plan.price}</span>
                </div>
                <div className="text-slate-400 text-sm mt-1">One-time payment</div>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex items-center text-sm text-slate-600">
                  <Clock className="w-4 h-4 text-chinaRed mr-3" />
                  {plan.days} Days Access (starts on first use)
                </div>
                <div className="flex items-center text-sm text-slate-600">
                  <Shield className="w-4 h-4 text-chinaRed mr-3" />
                  50GB Data
                </div>
                <div className="flex items-center text-sm text-slate-600">
                  <Check className="w-4 h-4 text-chinaRed mr-3" />
                  Connect 3 Devices
                </div>
              </div>

              <button 
                onClick={() => handleBuy(plan)}
                className={`w-full py-3 rounded-xl font-bold transition-colors ${
                  plan.popular 
                    ? 'bg-chinaRed text-white hover:bg-red-700' 
                    : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
                }`}
              >
                Select Plan
              </button>
            </div>
          ))}
        </div>
        
        {/* FAQ Section specific to VPN */}
        <div className="mt-20 max-w-3xl mx-auto">
             <h3 className="text-2xl font-bold text-slate-900 mb-8 text-center">Common Questions</h3>
             <div className="space-y-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <h4 className="font-bold text-slate-900 mb-2">When does my VPN usage start?</h4>
                    <p className="text-slate-600">Your usage period starts from the moment you first connect to the VPN - not from the purchase date. Buy now, use later. Perfect if you're planning a future trip to China.</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <h4 className="font-bold text-slate-900 mb-2">How much data do I get?</h4>
                    <p className="text-slate-600">Each plan includes 50GB of data per subscription period. That's enough for browsing, video calls, streaming, and more.</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <h4 className="font-bold text-slate-900 mb-2">Do I need to install an app?</h4>
                    <p className="text-slate-600">Yes, we provide a custom client for iOS, Android, Windows, and Mac. Download links will be emailed immediately after purchase.</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <h4 className="font-bold text-slate-900 mb-2">Does it work for streaming?</h4>
                    <p className="text-slate-600">Absolutely. Our servers are optimized for 4K streaming on Netflix, YouTube, and other platforms that are normally blocked.</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <h4 className="font-bold text-slate-900 mb-2">Can I share my account?</h4>
                    <p className="text-slate-600">Each plan supports up to 3 simultaneous device connections. Perfect for your phone, laptop, and tablet.</p>
                </div>
             </div>
        </div>
      </div>
    </div>
  );
};