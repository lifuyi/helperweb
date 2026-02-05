// utils/logger.ts
var isDevelopment = false;
var logger = {
  log: (...args) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },
  error: (...args) => {
    if (isDevelopment) {
      console.error(...args);
    }
  },
  warn: (...args) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },
  info: (...args) => {
    if (isDevelopment) {
      console.info(...args);
    }
  }
};

// utils/sessionManager.ts
var SESSION_STORAGE_KEY = "auth_session";
var SESSION_EXPIRATION_TIME = 24 * 60 * 60 * 1e3;
var sessionManager = {
  /**
   * Save session to localStorage
   */
  saveSession(accessToken, refreshToken) {
    try {
      const sessionData = {
        accessToken,
        refreshToken,
        expiresAt: Date.now() + SESSION_EXPIRATION_TIME,
        createdAt: Date.now()
      };
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionData));
      logger.log("Session saved successfully");
    } catch (error) {
      logger.error("Failed to save session:", error);
      throw error;
    }
  },
  /**
   * Retrieve session from localStorage
   */
  getSession() {
    try {
      const sessionStr = localStorage.getItem(SESSION_STORAGE_KEY);
      if (!sessionStr) {
        return null;
      }
      const sessionData = JSON.parse(sessionStr);
      if (sessionData.expiresAt && sessionData.expiresAt < Date.now()) {
        logger.log("Session expired, clearing");
        this.clearSession();
        return null;
      }
      return sessionData;
    } catch (error) {
      logger.error("Failed to retrieve session:", error);
      this.clearSession();
      return null;
    }
  },
  /**
   * Get access token from session
   */
  getAccessToken() {
    const session = this.getSession();
    return session?.accessToken || null;
  },
  /**
   * Get refresh token from session
   */
  getRefreshToken() {
    const session = this.getSession();
    return session?.refreshToken || null;
  },
  /**
   * Check if session exists and is valid
   */
  hasValidSession() {
    return this.getSession() !== null;
  },
  /**
   * Clear session from localStorage
   */
  clearSession() {
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      localStorage.removeItem("supabase_access_token");
      localStorage.removeItem("supabase_refresh_token");
      logger.log("Session cleared");
    } catch (error) {
      logger.error("Failed to clear session:", error);
    }
  },
  /**
   * Refresh session expiration time
   */
  refreshSessionExpiration() {
    try {
      const session = this.getSession();
      if (session) {
        session.expiresAt = Date.now() + SESSION_EXPIRATION_TIME;
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
        logger.log("Session expiration refreshed");
      }
    } catch (error) {
      logger.error("Failed to refresh session expiration:", error);
    }
  },
  /**
   * Get remaining session time in milliseconds
   */
  getSessionTimeRemaining() {
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
  isSessionAboutToExpire() {
    const remaining = this.getSessionTimeRemaining();
    const fiveMinutes = 5 * 60 * 1e3;
    return remaining < fiveMinutes && remaining > 0;
  },
  /**
   * Migrate legacy tokens to new session format
   */
  migrateLegacyTokens() {
    try {
      const legacyAccessToken = localStorage.getItem("supabase_access_token");
      const legacyRefreshToken = localStorage.getItem("supabase_refresh_token");
      if (legacyAccessToken && legacyRefreshToken) {
        this.saveSession(legacyAccessToken, legacyRefreshToken);
        localStorage.removeItem("supabase_access_token");
        localStorage.removeItem("supabase_refresh_token");
        logger.log("Legacy tokens migrated to new session format");
        return true;
      }
      return false;
    } catch (error) {
      logger.error("Failed to migrate legacy tokens:", error);
      return false;
    }
  }
};
export {
  sessionManager
};
