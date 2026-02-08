// services/supabaseClient.js
import { createClient } from "@supabase/supabase-js";
var supabaseUrl = (typeof __SUPABASE_URL__ !== "undefined" ? __SUPABASE_URL__ : "") || process.env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
var supabaseAnonKey = (typeof __SUPABASE_ANON_KEY__ !== "undefined" ? __SUPABASE_ANON_KEY__ : "") || import.meta?.env?.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";
var supabaseInstance = null;
function getSupabaseClient() {
  if (!supabaseInstance) {
    const url = supabaseUrl || process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
    const key = supabaseAnonKey || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
    if (!url || !key) {
      throw new Error("Missing Supabase configuration");
    }
    supabaseInstance = createClient(url, key);
  }
  return supabaseInstance;
}
var supabase = getSupabaseClient();

// utils/logger.js
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

// services/userService.ts
async function saveOrUpdateUser(userId, email, username, avatarUrl) {
  try {
    const existingUser = await getUser(userId);
    if (existingUser) {
      const { data: data2, error: error2 } = await supabase.from("users").update({
        username,
        avatar_url: avatarUrl,
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      }).eq("id", userId).select().single();
      if (error2) throw error2;
      return data2;
    }
    const { data, error } = await supabase.from("users").insert({
      id: userId,
      email,
      username,
      avatar_url: avatarUrl
    }).select().single();
    if (error) throw error;
    await createUserProfile(data.id);
    return data;
  } catch (error) {
    logger.error("Error saving user:", error);
    throw error;
  }
}
async function getUser(userId) {
  try {
    const { data, error } = await supabase.from("users").select("*").eq("id", userId).single();
    if (error && error.code !== "PGRST116") throw error;
    return data || null;
  } catch (error) {
    logger.error("Error getting user:", error);
    throw error;
  }
}
async function getUserByGoogleId(googleId) {
  try {
    const { data, error } = await supabase.from("users").select("*").eq("google_id", googleId).maybeSingle();
    if (error && error.code !== "PGRST116") throw error;
    return data || null;
  } catch (error) {
    logger.error("Error getting user by google_id:", error);
    throw error;
  }
}
async function getUserByEmail(email) {
  try {
    const { data, error } = await supabase.from("users").select("*").eq("email", email).maybeSingle();
    if (error && error.code !== "PGRST116") throw error;
    return data || null;
  } catch (error) {
    logger.error("Error getting user by email:", error);
    throw error;
  }
}
async function createUserProfile(userId) {
  try {
    const { data, error } = await supabase.from("user_profiles").insert({
      user_id: userId,
      purchase_count: 0,
      total_spent: 0
    }).select().single();
    if (error) throw error;
    return data;
  } catch (error) {
    logger.error("Error creating user profile:", error);
    throw error;
  }
}
function generateToken() {
  const array = new Uint8Array(32);
  if (typeof window !== "undefined" && window.crypto) {
    window.crypto.getRandomValues(array);
  } else {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
async function createAccessToken(userId, productId, expiryDays = 30) {
  try {
    const token = generateToken();
    const now = /* @__PURE__ */ new Date();
    const isVpnProduct = productId.startsWith("vpn-");
    let expiresAt = null;
    if (!isVpnProduct) {
      const expirationDate = new Date(now);
      expirationDate.setDate(expirationDate.getDate() + expiryDays);
      expiresAt = expirationDate.toISOString();
    }
    const { data, error } = await supabase.from("access_tokens").insert({
      user_id: userId,
      token,
      product_id: productId,
      purchase_date: now.toISOString(),
      expires_at: expiresAt,
      activated_at: null
      // Will be set when user activates
    }).select().single();
    if (error) throw error;
    await updateUserProfile(userId, productId);
    return data;
  } catch (error) {
    logger.error("Error creating access token:", error);
    throw error;
  }
}
async function activateAccessToken(token, expiryDays) {
  try {
    const now = /* @__PURE__ */ new Date();
    const isVpnProduct = token.startsWith("vpn-");
    const { data: tokenData, error: fetchError } = await supabase.from("access_tokens").select("*").eq("token", token).single();
    if (fetchError || !tokenData) {
      logger.error("Token not found for activation:", token);
      return null;
    }
    if (tokenData.activated_at) {
      logger.log("Token already activated:", token);
      return tokenData;
    }
    const productId = tokenData.product_id;
    const isVpn = productId.startsWith("vpn-");
    let expiresAt = tokenData.expires_at;
    if (isVpn && !tokenData.expires_at) {
      const expirationDate = new Date(now);
      expirationDate.setDate(expirationDate.getDate() + expiryDays + 1);
      expirationDate.setHours(0, 0, 0, 0);
      expiresAt = expirationDate.toISOString();
    }
    const { data, error } = await supabase.from("access_tokens").update({
      activated_at: now.toISOString(),
      expires_at: expiresAt,
      is_used: true,
      used_at: now.toISOString()
    }).eq("token", token).select().single();
    if (error) {
      logger.error("Error activating token:", error);
      throw error;
    }
    logger.log(`Token activated for product ${productId}:`, token);
    return data;
  } catch (error) {
    logger.error("Error in activateAccessToken:", error);
    throw error;
  }
}
async function verifyAccessToken(token) {
  try {
    const { data, error } = await supabase.from("access_tokens").select("*").eq("token", token).single();
    if (error && error.code !== "PGRST116") throw error;
    if (!data) {
      return null;
    }
    if (data.expires_at && new Date(data.expires_at) < /* @__PURE__ */ new Date()) {
      logger.log("Token expired:", token);
      return null;
    }
    if (data.product_id.startsWith("vpn-") && data.activated_at && data.expires_at) {
      if (new Date(data.expires_at) < /* @__PURE__ */ new Date()) {
        logger.log("VPN token activation-based expiration reached:", token);
        return null;
      }
    }
    return data;
  } catch (error) {
    logger.error("Error verifying token:", error);
    throw error;
  }
}
async function markTokenAsUsed(token) {
  try {
    const { error } = await supabase.from("access_tokens").update({
      is_used: true,
      used_at: (/* @__PURE__ */ new Date()).toISOString()
    }).eq("token", token);
    if (error) throw error;
  } catch (error) {
    logger.error("Error marking token as used:", error);
    throw error;
  }
}
async function getUserTokens(userId) {
  try {
    const { data, error } = await supabase.from("access_tokens").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (error) {
    logger.error("Error getting user tokens:", error);
    throw error;
  }
}
async function getUserByToken(token) {
  try {
    const { data: tokenData, error: tokenError } = await supabase.from("access_tokens").select("user_id").eq("token", token).single();
    if (tokenError || !tokenData) return null;
    return await getUser(tokenData.user_id);
  } catch (error) {
    logger.error("Error getting user by token:", error);
    throw error;
  }
}
async function updateUserProfile(userId, productId) {
  try {
    const { data: profile } = await supabase.from("user_profiles").select("*").eq("user_id", userId).single();
    if (!profile) return;
    await supabase.from("user_profiles").update({
      purchase_count: profile.purchase_count + 1,
      last_purchase_date: (/* @__PURE__ */ new Date()).toISOString(),
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    }).eq("user_id", userId);
  } catch (error) {
    logger.error("Error updating user profile:", error);
  }
}
async function getUserProfile(userId) {
  try {
    const { data, error } = await supabase.from("user_profiles").select("*").eq("user_id", userId).single();
    if (error && error.code !== "PGRST116") throw error;
    return data || null;
  } catch (error) {
    logger.error("Error getting user profile:", error);
    throw error;
  }
}
function generateAccessUrl(token, baseUrl = window.location.origin) {
  return `${baseUrl}/access?token=${token}`;
}
function extractTokenFromUrl() {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  return params.get("token");
}
export {
  activateAccessToken,
  createAccessToken,
  extractTokenFromUrl,
  generateAccessUrl,
  getUser,
  getUserByEmail,
  getUserByGoogleId,
  getUserByToken,
  getUserProfile,
  getUserTokens,
  markTokenAsUsed,
  saveOrUpdateUser,
  verifyAccessToken
};
