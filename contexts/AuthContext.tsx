import React, { createContext, useContext, useEffect, useState } from 'react';
import { AuthUser, onAuthStateChange } from '../services/supabaseService';
import { saveOrUpdateUser } from '../services/userService';

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 监听认证状态变化
    const subscription = onAuthStateChange(async (authUser) => {
      if (authUser) {
        // 用户登录成功，保存或更新用户信息到数据库
        try {
          await saveOrUpdateUser(
            authUser.id,
            authUser.email || '',
            authUser.displayName || authUser.email?.split('@')[0] || 'User',
            authUser.avatarUrl
          );
        } catch (error) {
          console.error('Failed to save user to database:', error);
          // 不阻止登录，仅记录错误
        }
      }
      setUser(authUser);
      setIsLoading(false);
    });

    // 清理函数
    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
