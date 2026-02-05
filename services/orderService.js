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
var SESSION_EXPIRATION_TIME = 24 * 60 * 60 * 1e3;

// services/supabaseService.ts
var supabaseUrl = process.env.VITE_SUPABASE_URL;
var supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase configuration. Please check your environment variables.");
}
var supabase = createClient(supabaseUrl, supabaseAnonKey);

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
          const { data: urls, error: urlError } = await supabase.from("vpn_urls").select("*").eq("user_id", userId).eq("product_id", purchase.product_id).eq("is_active", true).order("created_at", { ascending: false });
          if (urlError) {
            logger.error("Error fetching VPN URLs for purchase:", urlError);
          } else {
            vpnUrls = urls || [];
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
