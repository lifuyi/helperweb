import React, { useState } from 'react';
import { SectionId } from '../types';
import { Check, Download, BookOpen } from 'lucide-react';
import { StripePayment, PaymentModal } from './StripePayment';
import { PRODUCTS, ProductInfo } from '../services/stripeService';

interface PricingProps {
  onOpenGuide?: () => void;
}

export const Pricing: React.FC<PricingProps> = ({ onOpenGuide }) => {
  const [showPayment, setShowPayment] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductInfo | null>(null);

  const handleBuy = (product: ProductInfo) => {
    setSelectedProduct(product);
    setShowPayment(true);
  };

  const handleClosePayment = () => {
    setShowPayment(false);
    setSelectedProduct(null);
  };

  return (
    <div className="bg-white">
      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPayment}
        onClose={handleClosePayment}
        product={selectedProduct}
      />

      {/* PDF Guide Section */}
      <section id={SectionId.GUIDES} className="py-20 container mx-auto px-6">
        <div className="bg-slate-900 rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row">
          <div className="p-10 md:p-16 flex-1 flex flex-col justify-center">
            <div className="inline-block px-3 py-1 bg-yellow-400 text-yellow-900 rounded-md text-xs font-bold uppercase tracking-wider mb-4 w-fit">
              Best Seller
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              The Ultimate Payment Guide
            </h2>
            <p className="text-slate-300 mb-8 text-lg">
              Don't get stuck unable to pay for a taxi or dumplings. Our step-by-step PDF guide shows you exactly how to verify your identity and link foreign cards to China's essential apps.
            </p>
            <ul className="space-y-4 mb-8">
              {[
                "Step-by-step WeChat Pay setup",
                "Alipay TourCard & International Cards",
                "Identity Verification bypass tips",
                "Emergency payment phrases in Chinese"
              ].map((item, i) => (
                <li key={i} className="flex items-center text-white">
                  <Check className="w-5 h-5 text-green-400 mr-3" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                onClick={() => handleBuy(PRODUCTS.paymentGuide)}
                className="bg-white text-slate-900 hover:bg-slate-100 px-8 py-3 rounded-full font-bold transition-colors flex items-center justify-center"
              >
                Buy Full Guide - $9.99 <Download className="ml-2 w-4 h-4" />
              </button>
              {onOpenGuide && (
                <button 
                  onClick={onOpenGuide}
                  className="bg-transparent border-2 border-slate-600 text-white hover:border-white hover:bg-white/10 px-8 py-3 rounded-full font-bold transition-colors flex items-center justify-center"
                >
                  Read Basic Guide <BookOpen className="ml-2 w-4 h-4" />
                </button>
              )}
            </div>
          </div>
          <div className="flex-1 bg-cover bg-center min-h-[300px]" style={{ backgroundImage: 'url("https://picsum.photos/seed/mobilepay/800/600")' }}>
            <div className="w-full h-full bg-slate-900/40 backdrop-blur-[2px]"></div>
          </div>
        </div>
      </section>
    </div>
  );
};