import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { Stats } from './components/Stats';
import { Features } from './components/Features';
import { Pricing } from './components/Pricing';
import { Footer } from './components/Footer';
import { FlashCards } from './components/FlashCards';
import { PaymentGuide } from './components/PaymentGuide';
import { VpnPage } from './components/VpnPage';
import { UserCenter } from './components/UserCenter';
import { AdminDashboard } from './components/AdminDashboard';
import { SectionId } from './types';
import { logger } from './utils/logger';

interface AppProps {
  initialPage?: 'home' | 'vpn' | 'guide' | 'user-center' | 'admin';
  onNavigateHome?: () => void;
}

function App({ initialPage = 'home', onNavigateHome }: AppProps) {
  const [currentPage, setCurrentPage] = useState<'home' | 'vpn' | 'guide' | 'user-center' | 'admin'>(initialPage);

  const handleNavigate = (page: 'home' | 'vpn' | 'user-center' | 'admin', sectionId?: string) => {
    if (page === 'home' && onNavigateHome) {
      onNavigateHome();
      return;
    }
    
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
    logger.log('renderContent called with currentPage:', currentPage);
    switch (currentPage) {
      case 'vpn':
        logger.log('Rendering VpnPage');
        return <VpnPage onBack={() => handleNavigate('home')} />;
      case 'guide':
        logger.log('Rendering PaymentGuide');
        return <PaymentGuide onBack={() => handleNavigate('home')} />;
      case 'user-center':
        logger.log('Rendering UserCenter');
        return <UserCenter onBack={() => handleNavigate('home')} />;
      case 'admin':
        logger.log('Rendering AdminDashboard');
        return <AdminDashboard onBack={() => handleNavigate('home')} />;
      case 'home':
      default:
        logger.log('Rendering Home');
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
      {currentPage !== 'user-center' && <Footer />}
    </div>
  );
}

export default App;