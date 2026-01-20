import React, { useState } from 'react';
import { signInWithGoogle, signOut } from '../services/supabaseService';
import { useAuth } from '../contexts/AuthContext';
import { LogOut } from 'lucide-react';

interface GoogleLoginButtonProps {
  className?: string;
  variant?: 'default' | 'outline' | 'minimal';
  size?: 'sm' | 'md' | 'lg';
  showUserInfo?: boolean;
}

export const GoogleLoginButton: React.FC<GoogleLoginButtonProps> = ({
  className = '',
  variant = 'default',
  size = 'md',
  showUserInfo = true,
}) => {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    try {
      setError(null);
      await signInWithGoogle();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sign in with Google';
      setError(errorMessage);
      console.error('Google login error:', err);
    }
  };

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      setError(null);
      await signOut();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sign out';
      setError(errorMessage);
      console.error('Sign out error:', err);
    } finally {
      setIsSigningOut(false);
    }
  };

  const getButtonClass = () => {
    const baseClass = 'font-semibold transition-all flex items-center justify-center gap-2 rounded-full';
    const sizeClass = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-5 py-2 text-base',
      lg: 'px-6 py-3 text-lg',
    }[size];

    const variantClass = {
      default: 'bg-white hover:bg-slate-100 text-slate-900 shadow-sm hover:shadow-md',
      outline: 'border-2 border-white hover:bg-white/10 text-white',
      minimal: 'hover:bg-white/10 text-white',
    }[variant];

    return `${baseClass} ${sizeClass} ${variantClass} ${className}`;
  };

  if (isLoading) {
    return (
      <div className={getButtonClass()}>
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        <span>Loading...</span>
      </div>
    );
  }

  if (isAuthenticated && user) {
    return (
      <div className="flex items-center gap-3">
        {showUserInfo && (
          <div className="flex items-center gap-2">
            {user.avatarUrl && (
              <img
                src={user.avatarUrl}
                alt={user.displayName || 'User'}
                className="w-8 h-8 rounded-full"
              />
            )}
            <div className="text-sm">
              <div className="font-semibold text-slate-900">{user.displayName}</div>
              <div className="text-xs text-slate-600">{user.email}</div>
            </div>
          </div>
        )}
        <button
          onClick={handleSignOut}
          disabled={isSigningOut}
          className={`${getButtonClass()} ml-auto`}
          title="Sign out"
        >
          <LogOut size={18} />
          {isSigningOut ? 'Signing out...' : 'Sign out'}
        </button>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={handleGoogleLogin}
        className={getButtonClass()}
      >
        {/* Google Icon SVG */}
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="currentColor"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="currentColor"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="currentColor"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="currentColor"
          />
        </svg>
        <span>Sign in with Google</span>
      </button>
      {error && (
        <div className="mt-2 p-2 bg-red-100 text-red-700 text-sm rounded">
          {error}
        </div>
      )}
    </div>
  );
};
