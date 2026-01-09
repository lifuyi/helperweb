import React from 'react';
import { CreditCard, Wifi, ShieldCheck, Zap } from 'lucide-react';

export const Features: React.FC = () => {
  const features = [
    {
      icon: <CreditCard className="w-8 h-8 text-chinaRed" />,
      title: "Master Mobile Payments",
      description: "China is a cashless society. Learn to link your Visa/Mastercard to Alipay & WeChat Pay instantly."
    },
    {
      icon: <Wifi className="w-8 h-8 text-chinaRed" />,
      title: "Unrestricted Internet",
      description: "Bypass geographical restrictions with our high-speed VPN optimized specifically for China's networks."
    },
    {
      icon: <ShieldCheck className="w-8 h-8 text-chinaRed" />,
      title: "Secure & Private",
      description: "Your data is encrypted. Browse securely on public Wi-Fi in airports, hotels, and cafes."
    },
    {
      icon: <Zap className="w-8 h-8 text-chinaRed" />,
      title: "Instant Delivery",
      description: "Receive your PDF guides and VPN credentials immediately via email after purchase."
    }
  ];

  return (
    <section className="py-20 bg-slate-50">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16 max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Everything You Need to Know</h2>
          <p className="text-slate-600">
            Navigating China's digital landscape can be tricky. We bridge the gap so you can travel like a local.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-xl transition-shadow border border-slate-100">
              <div className="bg-red-50 w-16 h-16 rounded-xl flex items-center justify-center mb-6">
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
              <p className="text-slate-600 text-sm leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};