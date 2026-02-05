// services/supabaseService.ts
import { createClient } from "@supabase/supabase-js";

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

// services/supabaseService.ts
var supabaseUrl = process.env.VITE_SUPABASE_URL;
var supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase configuration. Please check your environment variables.");
}
var supabase = createClient(supabaseUrl, supabaseAnonKey);
async function signInWithGoogle(redirectTo) {
  let finalRedirectUrl = redirectTo;
  if (!finalRedirectUrl && typeof window !== "undefined") {
    const origin = window.location.origin;
    finalRedirectUrl = `${origin}/auth/callback`;
  }
  if (!finalRedirectUrl) {
    finalRedirectUrl = "/auth/callback";
  }
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: finalRedirectUrl,
      queryParams: {
        access_type: "offline",
        prompt: "consent"
      }
    }
  });
  if (error) {
    throw new Error(error.message);
  }
}
async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw new Error(error.message);
  }
  sessionManager.clearSession();
}
async function getCurrentUser() {
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }
  return {
    id: user.id,
    email: user.email,
    displayName: user.user_metadata?.full_name || user.email?.split("@")[0],
    avatarUrl: user.user_metadata?.avatar_url,
    provider: user.app_metadata?.provider
  };
}
async function getSession() {
  const {
    data: { session }
  } = await supabase.auth.getSession();
  return session;
}
function onAuthStateChange(callback) {
  const session = sessionManager.getSession();
  if (session?.accessToken && session?.refreshToken) {
    supabase.auth.setSession({
      access_token: session.accessToken,
      refresh_token: session.refreshToken
    }).catch((error) => {
      logger.error("Failed to restore session:", error);
      sessionManager.clearSession();
    });
  }
  const {
    data: { subscription }
  } = supabase.auth.onAuthStateChange(async (event, session2) => {
    if (session2?.user) {
      sessionManager.refreshSessionExpiration();
      const user = {
        id: session2.user.id,
        email: session2.user.email,
        displayName: session2.user.user_metadata?.full_name || session2.user.email?.split("@")[0],
        avatarUrl: session2.user.user_metadata?.avatar_url,
        provider: session2.user.app_metadata?.provider
      };
      callback(user);
    } else {
      callback(null);
    }
  });
  return subscription;
}
async function getAccessToken() {
  const {
    data: { session }
  } = await supabase.auth.getSession();
  return session?.access_token || null;
}
async function refreshSession() {
  const {
    data: { session },
    error
  } = await supabase.auth.refreshSession();
  if (error) {
    throw new Error(error.message);
  }
  return session;
}
export {
  getAccessToken,
  getCurrentUser,
  getSession,
  onAuthStateChange,
  refreshSession,
  signInWithGoogle,
  signOut,
  supabase
};
