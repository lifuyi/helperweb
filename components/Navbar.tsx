import React, { useState, useEffect } from 'react';
import { SectionId } from '../types';
import { Menu, X } from 'lucide-react';

interface NavbarProps {
  onNavigate: (page: 'home' | 'vpn', sectionId?: string) => void;
  currentPage: 'home' | 'vpn' | 'guide';
}

export const Navbar: React.FC<NavbarProps> = ({ onNavigate, currentPage }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavClick = (id: string) => {
    setIsMobileMenuOpen(false);
    if (id === SectionId.VPN) {
      onNavigate('vpn');
    } else {
      onNavigate('home', id);
    }
  };

  const navItems = [
    { id: SectionId.HOME, label: 'Home' },
    { id: SectionId.GUIDES, label: 'Payment Guide' },
    { id: SectionId.VPN, label: 'VPN Service' },
    { id: SectionId.FAQ, label: 'FAQ' },
  ];

  return (
    <nav className={`fixed w-full z-50 transition-all duration-300 ${isScrolled || currentPage !== 'home' ? 'bg-white shadow-md py-4' : 'bg-transparent py-6'}`}>
      <div className="container mx-auto px-6 flex justify-between items-center">
        <div className="flex items-center space-x-2 cursor-pointer" onClick={() => handleNavClick(SectionId.HOME)}>
          <span className={`text-2xl font-bold ${isScrolled || currentPage !== 'home' ? 'text-chinaRed' : 'text-white'}`}>ChinaConnect</span>
        </div>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center space-x-8">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`font-medium transition-colors ${
                isScrolled || currentPage !== 'home' ? 'text-slate-700 hover:text-chinaRed' : 'text-white/90 hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
          <button 
            onClick={() => handleNavClick(SectionId.VPN)}
            className={`px-5 py-2 rounded-full font-semibold transition-transform hover:scale-105 ${
              isScrolled || currentPage !== 'home' ? 'bg-chinaRed text-white' : 'bg-white text-chinaRed'
            }`}
          >
            Get Connected
          </button>
        </div>

        {/* Mobile Toggle */}
        <button 
          className="md:hidden"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? 
            <X className={isScrolled || currentPage !== 'home' ? 'text-slate-900' : 'text-white'} /> : 
            <Menu className={isScrolled || currentPage !== 'home' ? 'text-slate-900' : 'text-white'} />
          }
        </button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 w-full bg-white shadow-lg p-6 flex flex-col space-y-4">
           {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className="text-left text-slate-700 font-medium py-2 border-b border-slate-100"
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </nav>
  );
};