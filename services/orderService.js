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

// services/orderService.ts
async function getUserOrders(userId) {
  try {
    logger.log("getUserOrders called with userId:", userId);
    const { data: purchases, error: purchaseError } = await supabase.from("purchases").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    if (purchaseError) {
      logger.error("Purchase fetch error:", purchaseError);
      throw purchaseError;
    }
    logger.log("Purchases fetched:", purchases);
    if (!purchases || purchases.length === 0) {
      logger.log("No purchases found for user");
      return [];
    }
    const ordersWithTokens = await Promise.all(
      purchases.map(async (purchase) => {
        const { data: tokens, error: tokenError } = await supabase.from("access_tokens").select("*").eq("user_id", userId).eq("product_id", purchase.product_id).order("created_at", { ascending: false });
        if (tokenError) {
          logger.error("Error fetching tokens for purchase:", tokenError);
          return {
            ...purchase,
            access_tokens: [],
            product_name: getProductName(purchase.product_id),
            status_display: getStatusDisplay(purchase.status),
            vpn_urls: []
            // Added for consistency
          };
        }
        let vpnUrls = [];
        if (purchase.product_id.startsWith("vpn-")) {
          try {
            const response = await fetch(`/api/vpn/list?user_id=${userId}&product_id=${purchase.product_id}`);
            if (response.ok) {
              const data = await response.json();
              vpnUrls = data.vpn_urls || [];
            } else {
              logger.log("VPN URLs not available for product:", purchase.product_id);
            }
          } catch (fetchError) {
            logger.log("VPN list API not available");
          }
        }
        return {
          ...purchase,
          access_tokens: tokens || [],
          vpn_urls: vpnUrls,
          product_name: getProductName(purchase.product_id),
          status_display: getStatusDisplay(purchase.status)
        };
      })
    );
    return ordersWithTokens;
  } catch (error) {
    logger.error("Error getting user orders:", error);
    throw error;
  }
}
async function getOrderDetails(purchaseId, userId) {
  try {
    const { data: purchase, error: purchaseError } = await supabase.from("purchases").select("*").eq("id", purchaseId).eq("user_id", userId).single();
    if (purchaseError) throw purchaseError;
    if (!purchase) return null;
    const { data: tokens, error: tokenError } = await supabase.from("access_tokens").select("*").eq("user_id", userId).eq("product_id", purchase.product_id).order("created_at", { ascending: false });
    if (tokenError) {
      logger.error("Error fetching tokens:", tokenError);
    }
    return {
      ...purchase,
      access_tokens: tokens || [],
      product_name: getProductName(purchase.product_id),
      status_display: getStatusDisplay(purchase.status)
    };
  } catch (error) {
    logger.error("Error getting order details:", error);
    throw error;
  }
}
function generateVpnUrl(token, baseUrl = window.location.origin) {
  return `${baseUrl}/access?token=${token}`;
}
function getProductName(productId) {
  const productNames = {
    "payment-guide": "Payment Guide PDF",
    "vpn-3days": "VPN 3-Day Pass",
    "vpn-7days": "VPN 7-Day Pass",
    "vpn-14days": "VPN 14-Day Pass",
    "vpn-30days": "VPN 30-Day Pass"
  };
  return productNames[productId] || productId;
}
function getStatusDisplay(status) {
  const statusMap = {
    completed: "Completed",
    pending: "Pending",
    failed: "Failed"
  };
  return statusMap[status] || status;
}
function isTokenActive(token) {
  if (!token.expires_at) return false;
  return new Date(token.expires_at) > /* @__PURE__ */ new Date();
}
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}
function getDaysRemaining(expiresAt) {
  if (!expiresAt) return -1;
  const expDate = new Date(expiresAt);
  const now = /* @__PURE__ */ new Date();
  const diffTime = expDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1e3 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}
export {
  formatDate,
  generateVpnUrl,
  getDaysRemaining,
  getOrderDetails,
  getUserOrders,
  isTokenActive
};
