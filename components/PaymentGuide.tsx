import React from 'react';
import { ArrowLeft, CheckCircle, Info } from 'lucide-react';

interface PaymentGuideProps {
  onBack: () => void;
}

export const PaymentGuide: React.FC<PaymentGuideProps> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="container mx-auto px-6 max-w-4xl">
        <button 
          onClick={onBack}
          className="flex items-center text-slate-600 hover:text-chinaRed font-medium mb-8 transition-colors"
        >
          <ArrowLeft className="mr-2" size={20} /> Back to Home
        </button>

        <article className="bg-white rounded-3xl shadow-lg overflow-hidden">
          <div className="bg-chinaDark p-8 md:p-12 text-white">
            <h1 className="text-3xl md:text-5xl font-bold mb-6">How to Pay in China as a Foreigner?</h1>
            <p className="text-xl text-slate-300">The Ultimate WeChat Pay & Alipay Set-Up Guide (2025 Edition)</p>
          </div>

          <div className="p-8 md:p-12 space-y-10 text-slate-800 leading-relaxed">
            
            {/* Intro */}
            <section>
              <p className="text-lg mb-4">
                China has made a tremendous shift towards cashless payment in recent years, with many restaurants and shops in bigger cities no longer accepting cash payments. Cashless payment platforms like WeChat Pay and Alipay are becoming ubiquitous.
              </p>
              <p className="text-lg">
                As a foreigner traveling to China, understanding and utilizing these payment platforms are essential for a smooth and hassle-free payment. In this guide, we'll walk you through everything you need to know.
              </p>
            </section>

            {/* Quick Summary Box */}
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6">
              <h3 className="text-xl font-bold text-blue-900 mb-4 flex items-center">
                <Info className="mr-2" /> Quick Summary: The Essentials
              </h3>
              <ul className="space-y-2">
                <li className="flex items-start"><CheckCircle className="w-5 h-5 text-blue-600 mr-2 mt-1 shrink-0" /> <span>Yes, you can use international cards (Visa/Mastercard).</span></li>
                <li className="flex items-start"><CheckCircle className="w-5 h-5 text-blue-600 mr-2 mt-1 shrink-0" /> <span>WeChat Pay is essential for social & daily life.</span></li>
                <li className="flex items-start"><CheckCircle className="w-5 h-5 text-blue-600 mr-2 mt-1 shrink-0" /> <span>Alipay offers a "Tour Pass" specifically for tourists.</span></li>
              </ul>
            </div>

            {/* WeChat Section */}
            <section>
              <h2 className="text-3xl font-bold text-chinaDark mb-6 pb-2 border-b">Guide on WeChat Pay</h2>
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold mb-3">What you'll need:</h3>
                  <ul className="list-disc pl-6 space-y-2 text-slate-600">
                    <li>A phone with a phone number (International is fine)</li>
                    <li>Your passport details</li>
                    <li>An International Bank Card (Visa, Mastercard, JCB)</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl font-bold mb-3">Setup Steps:</h3>
                  <ol className="list-decimal pl-6 space-y-4 font-medium">
                    <li>
                      <span className="text-slate-900">Download & Register:</span> Get the WeChat app and sign up with your mobile number.
                    </li>
                    <li>
                      <span className="text-slate-900">Verify Identity:</span> Go to Wallet &gt; Services. You will need to upload your passport photo.
                    </li>
                    <li>
                      <span className="text-slate-900">Link Card:</span> Add your Visa or Mastercard. 
                      <p className="text-sm font-normal text-slate-500 mt-1">Note: International cards may take up to 24 hours to verify. Do this 1-2 days before your trip.</p>
                    </li>
                  </ol>
                </div>
              </div>
            </section>

            {/* Alipay Section */}
            <section>
              <h2 className="text-3xl font-bold text-chinaDark mb-6 pb-2 border-b">Guide on Alipay</h2>
              <p className="mb-6">
                Alipay is often friendlier for international travelers. Their 'Tour Pass' program (valid for 90 days) allows you to use the app without a Chinese bank account.
              </p>
              
              <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                <h3 className="text-xl font-bold mb-4">How to set up Alipay Tour Pass:</h3>
                <ol className="list-decimal pl-6 space-y-4">
                  <li>Download Alipay International Version from your app store.</li>
                  <li>Sign up with your international phone number.</li>
                  <li>Search for <strong>"Tour Pass"</strong> inside the app.</li>
                  <li>Link your international credit card to load funds (pre-paid mode) or pay directly.</li>
                  <li>Transaction Limit: Approx 3,000 CNY per transaction for international cards.</li>
                </ol>
              </div>
            </section>

            {/* Limits Table */}
            <section>
              <h2 className="text-3xl font-bold text-chinaDark mb-6">Transaction Limits</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200">
                      <th className="p-4 font-bold">Platform</th>
                      <th className="p-4 font-bold">Transaction Limit</th>
                      <th className="p-4 font-bold">Monthly Limit</th>
                      <th className="p-4 font-bold">Yearly Limit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="p-4 font-medium">WeChat Pay</td>
                      <td className="p-4">6,000 CNY</td>
                      <td className="p-4">50,000 CNY</td>
                      <td className="p-4">60,000 CNY</td>
                    </tr>
                    <tr>
                      <td className="p-4 font-medium">Alipay (Intl Card)</td>
                      <td className="p-4">3,000 CNY</td>
                      <td className="p-4">50,000 CNY</td>
                      <td className="p-4">65,000 CNY</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-sm text-slate-500 mt-4">*Limits are subject to change by the platforms.</p>
            </section>
          </div>
        </article>
      </div>
    </div>
  );
};