import React from 'react';

export const Stats: React.FC = () => {
  return (
    <section className="bg-white py-16 border-b border-slate-100">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center divide-x divide-slate-100">
          <div>
            <div className="text-4xl font-bold text-chinaRed mb-2">50k+</div>
            <div className="text-slate-500 text-sm font-medium">Travelers Helped</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-chinaRed mb-2">99%</div>
            <div className="text-slate-500 text-sm font-medium">Uptime Guarantee</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-chinaRed mb-2">24/7</div>
            <div className="text-slate-500 text-sm font-medium">English Support</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-chinaRed mb-2">150+</div>
            <div className="text-slate-500 text-sm font-medium">Countries Supported</div>
          </div>
        </div>
      </div>
    </section>
  );
};