import React, { useState, useEffect } from 'react';
import { SectionId } from '../types';
import { Menu, X } from 'lucide-react';
import { GoogleLoginButton } from './GoogleLoginButton';
import { useAuth } from '../contexts/AuthContext';
import { signOut } from '../services/supabaseService';

interface NavbarProps {
  onNavigate: (page: 'home' | 'vpn' | 'user-center', sectionId?: string) => void;
  currentPage: 'home' | 'vpn' | 'guide' | 'user-center';
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
        <div className="hidden md:flex items-center space-x-6">
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
          <div className="flex items-center space-x-4">
            <UserDropdown 
              isScrolled={isScrolled || currentPage !== 'home'} 
              onNavigate={onNavigate}
            />
            <button 
              onClick={() => handleNavClick(SectionId.VPN)}
              className={`px-5 py-2 rounded-full font-semibold transition-transform hover:scale-105 ${
                isScrolled || currentPage !== 'home' ? 'bg-chinaRed text-white' : 'bg-white text-chinaRed'
              }`}
            >
              Get Connected
            </button>
          </div>
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
          <div className="pt-4 border-t border-slate-100">
            <UserDropdown 
              isScrolled={true} 
              onNavigate={onNavigate}
            />
          </div>
        </div>
      )}
    </nav>
  );
};

interface UserDropdownProps {
  isScrolled: boolean;
  onNavigate: (page: 'home' | 'vpn' | 'user-center', sectionId?: string) => void;
}

const UserDropdown: React.FC<UserDropdownProps> = ({ isScrolled, onNavigate }) => {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setIsOpen(false);
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  const getUserDropdownClass = () => {
    const baseClass = 'relative';
    return baseClass;
  };

  const getDropdownButtonClass = () => {
    const baseClass = 'flex items-center space-x-2 rounded-full transition-all';
    const variantClass = isScrolled 
      ? 'bg-slate-100 hover:bg-slate-200 text-slate-900' 
      : 'bg-white/20 hover:bg-white/30 text-white';
    
    return `${baseClass} ${variantClass} px-3 py-1.5 text-sm font-semibold`;
  };

  const getDropdownMenuClass = () => {
    const baseClass = 'absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-slate-200 z-50 overflow-hidden';
    return baseClass;
  };

  if (isLoading) {
    return (
      <div className={getDropdownButtonClass()}>
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        <span>Loading...</span>
      </div>
    );
  }

  if (isAuthenticated && user) {
    return (
      <div className={getUserDropdownClass()}>
        <button
          onClick={handleToggle}
          className={getDropdownButtonClass()}
        >
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.displayName || 'User'}
              className="w-8 h-8 rounded-full"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-chinaRed flex items-center justify-center text-white font-bold">
              {user.displayName?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || 'U'}
            </div>
          )}
          <span className="truncate max-w-[100px]">{user.displayName || user.email}</span>
          <svg 
            className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {isOpen && (
          <div className={getDropdownMenuClass()}>
            <div className="p-4 border-b border-slate-100">
              <div className="font-semibold text-slate-900 truncate">
                {user.displayName || 'User'}
              </div>
              <div className="text-sm text-slate-600 truncate">
                {user.email}
              </div>
            </div>
            <button
              onClick={() => {
                onNavigate('user-center');
                setIsOpen(false);
              }}
              className="w-full px-4 py-3 text-left text-slate-700 hover:bg-slate-50 border-b border-slate-100 flex items-center"
            >
              <svg className="w-5 h-5 mr-3 text-chinaRed" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              My Account
            </button>
            <button
              onClick={handleSignOut}
              className="w-full px-4 py-3 text-left text-slate-700 hover:bg-slate-50 flex items-center"
            >
              <svg className="w-5 h-5 mr-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign Out
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <GoogleLoginButton 
      variant={isScrolled ? 'default' : 'outline'}
      size="sm"
      showUserInfo={false}
    />
  );
};