import React from 'react';
import { SectionId } from '../types';
import { ArrowRight, Smartphone } from 'lucide-react';

interface HeroProps {
  onNavigate: (page: 'home' | 'vpn', sectionId?: string) => void;
}

export const Hero: React.FC<HeroProps> = ({ onNavigate }) => {
  return (
    <section id={SectionId.HOME} className="relative h-screen min-h-[600px] flex items-center justify-center overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <img 
          src="https://images.unsplash.com/photo-1508804185872-d7badad00f7d?q=80&w=2500&auto=format&fit=crop" 
          alt="Great Wall of China" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 to-slate-900/40"></div>
      </div>

      <div className="container mx-auto px-6 relative z-10 pt-20">
        <div className="max-w-2xl">
          <div className="inline-block px-4 py-1.5 bg-chinaRed/20 border border-chinaRed/40 rounded-full mb-6">
            <span className="text-white font-medium text-sm tracking-wide">WELCOME TO CHINA</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-white leading-tight mb-6">
            Master Mobile Payments <br />
            <span className="text-chinaRed">in China.</span>
          </h1>
          <p className="text-xl text-slate-200 mb-8 leading-relaxed">
            Don't get stuck unable to pay for a taxi or meal. Our step-by-step guide helps you link international cards to WeChat Pay and Alipay. We also offer China VPN with up to 100GB data - usage starts on first connection, so you can buy now and use later.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4">
             <button 
              onClick={() => onNavigate('home', SectionId.GUIDES)}
              className="bg-chinaRed hover:bg-red-700 text-white px-8 py-4 rounded-full font-bold transition-all flex items-center justify-center gap-2"
            >
              Get Payment Guide <Smartphone size={20} />
            </button>
            <button 
              onClick={() => onNavigate('vpn')}
              className="bg-white hover:bg-slate-100 text-slate-900 px-8 py-4 rounded-full font-bold transition-all flex items-center justify-center gap-2"
            >
              VPN Access <ArrowRight size={20} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};