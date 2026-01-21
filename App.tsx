import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { Stats } from './components/Stats';
import { Features } from './components/Features';
import { Pricing } from './components/Pricing';
import { Footer } from './components/Footer';
import { Assistant } from './components/Assistant';
import { FlashCards } from './components/FlashCards';
import { PaymentGuide } from './components/PaymentGuide';
import { VpnPage } from './components/VpnPage';
import { UserCenter } from './components/UserCenter';
import { SectionId } from './types';

function App() {
  const [currentPage, setCurrentPage] = useState<'home' | 'vpn' | 'guide' | 'user-center'>('home');

  const handleNavigate = (page: 'home' | 'vpn' | 'user-center', sectionId?: string) => {
    setCurrentPage(page);
    
    if (page === 'home' && sectionId) {
      // Small timeout to allow render to happen if switching back from another page
      setTimeout(() => {
        const element = document.getElementById(sectionId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } else if (page === 'home') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const renderContent = () => {
    switch (currentPage) {
      case 'vpn':
        return <VpnPage onBack={() => handleNavigate('home')} />;
      case 'guide':
        return <PaymentGuide onBack={() => handleNavigate('home')} />;
      case 'user-center':
        return <UserCenter onBack={() => handleNavigate('home')} />;
      case 'home':
      default:
        return (
          <>
            <Hero onNavigate={handleNavigate} />
            <Stats />
            <FlashCards />
            <Features />
            <Pricing onOpenGuide={() => setCurrentPage('guide')} />
          </>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Navbar onNavigate={handleNavigate} currentPage={currentPage} />
      {renderContent()}
      <Footer />
      <Assistant />
    </div>
  );
}

export default App;