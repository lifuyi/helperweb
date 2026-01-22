/**
 * Session Manager - Handles user session storage and management
 * Provides secure, centralized session handling with expiration and cleanup
 */

import { logger } from './logger';

interface SessionData {
  accessToken: string;
  refreshToken: string;
  expiresAt?: number;
  createdAt: number;
}

const SESSION_STORAGE_KEY = 'auth_session';
const SESSION_EXPIRATION_TIME = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

/**
 * Session Manager - centralized session handling
 */
export const sessionManager = {
  /**
   * Save session to localStorage
   */
  saveSession(accessToken: string, refreshToken: string): void {
    try {
      const sessionData: SessionData = {
        accessToken,
        refreshToken,
        expiresAt: Date.now() + SESSION_EXPIRATION_TIME,
        createdAt: Date.now(),
      };
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionData));
      logger.log('Session saved successfully');
    } catch (error) {
      logger.error('Failed to save session:', error);
      throw error;
    }
  },

  /**
   * Retrieve session from localStorage
   */
  getSession(): SessionData | null {
    try {
      const sessionStr = localStorage.getItem(SESSION_STORAGE_KEY);
      if (!sessionStr) {
        return null;
      }

      const sessionData = JSON.parse(sessionStr) as SessionData;

      // Check if session has expired
      if (sessionData.expiresAt && sessionData.expiresAt < Date.now()) {
        logger.log('Session expired, clearing');
        this.clearSession();
        return null;
      }

      return sessionData;
    } catch (error) {
      logger.error('Failed to retrieve session:', error);
      // If parsing fails, clear corrupted session
      this.clearSession();
      return null;
    }
  },

  /**
   * Get access token from session
   */
  getAccessToken(): string | null {
    const session = this.getSession();
    return session?.accessToken || null;
  },

  /**
   * Get refresh token from session
   */
  getRefreshToken(): string | null {
    const session = this.getSession();
    return session?.refreshToken || null;
  },

  /**
   * Check if session exists and is valid
   */
  hasValidSession(): boolean {
    return this.getSession() !== null;
  },

  /**
   * Clear session from localStorage
   */
  clearSession(): void {
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      // Also clear legacy token keys for backward compatibility
      localStorage.removeItem('supabase_access_token');
      localStorage.removeItem('supabase_refresh_token');
      logger.log('Session cleared');
    } catch (error) {
      logger.error('Failed to clear session:', error);
    }
  },

  /**
   * Refresh session expiration time
   */
  refreshSessionExpiration(): void {
    try {
      const session = this.getSession();
      if (session) {
        session.expiresAt = Date.now() + SESSION_EXPIRATION_TIME;
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
        logger.log('Session expiration refreshed');
      }
    } catch (error) {
      logger.error('Failed to refresh session expiration:', error);
    }
  },

  /**
   * Get remaining session time in milliseconds
   */
  getSessionTimeRemaining(): number {
    const session = this.getSession();
    if (!session || !session.expiresAt) {
      return 0;
    }
    const remaining = session.expiresAt - Date.now();
    return Math.max(0, remaining);
  },

  /**
   * Check if session is about to expire (within 5 minutes)
   */
  isSessionAboutToExpire(): boolean {
    const remaining = this.getSessionTimeRemaining();
    const fiveMinutes = 5 * 60 * 1000;
    return remaining < fiveMinutes && remaining > 0;
  },

  /**
   * Migrate legacy tokens to new session format
   */
  migrateLegacyTokens(): boolean {
    try {
      const legacyAccessToken = localStorage.getItem('supabase_access_token');
      const legacyRefreshToken = localStorage.getItem('supabase_refresh_token');

      if (legacyAccessToken && legacyRefreshToken) {
        this.saveSession(legacyAccessToken, legacyRefreshToken);
        // Remove legacy keys after migration
        localStorage.removeItem('supabase_access_token');
        localStorage.removeItem('supabase_refresh_token');
        logger.log('Legacy tokens migrated to new session format');
        return true;
      }
      return false;
    } catch (error) {
      logger.error('Failed to migrate legacy tokens:', error);
      return false;
    }
  },
};
