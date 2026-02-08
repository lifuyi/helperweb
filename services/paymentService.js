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

// services/userService.js
import { createClient as createClient2 } from "@supabase/supabase-js";
var supabaseUrl2 = (typeof __SUPABASE_URL__ !== "undefined" ? __SUPABASE_URL__ : "") || process.env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
var supabaseAnonKey2 = (typeof __SUPABASE_ANON_KEY__ !== "undefined" ? __SUPABASE_ANON_KEY__ : "") || import.meta?.env?.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";
var supabaseInstance2 = null;
function getSupabaseClient2() {
  if (!supabaseInstance2) {
    const url = supabaseUrl2 || process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
    const key = supabaseAnonKey2 || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
    if (!url || !key) {
      throw new Error("Missing Supabase configuration");
    }
    supabaseInstance2 = createClient2(url, key);
  }
  return supabaseInstance2;
}
var supabase2 = getSupabaseClient2();
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
    const { data, error } = await supabase2.from("access_tokens").insert({
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
async function updateUserProfile(userId, productId) {
  try {
    const { data: profile } = await supabase2.from("user_profiles").select("*").eq("user_id", userId).single();
    if (!profile) return;
    await supabase2.from("user_profiles").update({
      purchase_count: profile.purchase_count + 1,
      last_purchase_date: (/* @__PURE__ */ new Date()).toISOString(),
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    }).eq("user_id", userId);
  } catch (error) {
    logger.error("Error updating user profile:", error);
  }
}
function generateAccessUrl(token, baseUrl = window.location.origin) {
  return `${baseUrl}/access?token=${token}`;
}

// utils/logger.js
var isDevelopment2 = false;
var logger2 = {
  log: (...args) => {
    if (isDevelopment2) {
      console.log(...args);
    }
  },
  error: (...args) => {
    if (isDevelopment2) {
      console.error(...args);
    }
  },
  warn: (...args) => {
    if (isDevelopment2) {
      console.warn(...args);
    }
  },
  info: (...args) => {
    if (isDevelopment2) {
      console.info(...args);
    }
  }
};

// config/products.js
var DEFAULT_PRODUCTS = {
  "vpn-3days": {
    price_cents: 499,
    name: "VPN 3-Day Pass",
    description: "Access to VPN service for 3 days",
    expiry_days: 3
  },
  "vpn-7days": {
    price_cents: 999,
    name: "VPN Weekly Pass",
    description: "Access to VPN service for 7 days",
    expiry_days: 7
  },
  "vpn-14days": {
    price_cents: 1699,
    name: "VPN 14-Day Pass",
    description: "Access to VPN service for 14 days",
    expiry_days: 14
  },
  "vpn-30days": {
    price_cents: 2999,
    name: "VPN Monthly Pass",
    description: "Access to VPN service for 30 days",
    expiry_days: 30
  },
  "payment-guide": {
    price_cents: 999,
    name: "Payment Guide PDF",
    description: "Complete payment guide with step-by-step instructions",
    expiry_days: 365
  }
};
var productsCache = null;
var cacheTimestamp = 0;
var CACHE_TTL = 5 * 60 * 1e3;
async function loadProductsFromDatabase() {
  try {
    if (productsCache && Date.now() - cacheTimestamp < CACHE_TTL) {
      return productsCache;
    }
    const { supabase: supabase4 } = await import("./services/supabaseService.js").then((m) => m).catch(() => null);
    if (!supabase4) {
      console.warn("Supabase client not available, using default products");
      return DEFAULT_PRODUCTS;
    }
    const { data, error } = await supabase4.from("products").select("*").eq("is_active", true).order("display_order", { ascending: true });
    if (error) throw error;
    const products = {};
    if (data && Array.isArray(data)) {
      data.forEach((product) => {
        products[product.id] = {
          price_cents: product.price_cents,
          name: product.name,
          description: product.description,
          expiry_days: product.expiry_days
        };
      });
    }
    productsCache = products;
    cacheTimestamp = Date.now();
    return products;
  } catch (error) {
    console.error("Error loading products from database:", error);
    return DEFAULT_PRODUCTS;
  }
}
var PRODUCTS = DEFAULT_PRODUCTS;
if (typeof window !== "undefined") {
  loadProductsFromDatabase().then((products) => {
    PRODUCTS = products;
  });
}
function getExpiryDaysForProduct(productId) {
  return PRODUCTS[productId]?.expiry_days || 30;
}
function getProductName(productId) {
  return PRODUCTS[productId]?.name || productId;
}

// services/adminService.js
import { createClient as createClient3 } from "@supabase/supabase-js";
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var isDevelopment3;
var logger3;
var init_logger = __esm({
  "utils/logger.js"() {
    isDevelopment3 = false;
    logger3 = {
      log: (...args) => {
        if (isDevelopment3) {
          console.log(...args);
        }
      },
      error: (...args) => {
        if (isDevelopment3) {
          console.error(...args);
        }
      },
      warn: (...args) => {
        if (isDevelopment3) {
          console.warn(...args);
        }
      },
      info: (...args) => {
        if (isDevelopment3) {
          console.info(...args);
        }
      }
    };
  }
});
var emailService_exports = {};
__export(emailService_exports, {
  sendEmail: () => sendEmail,
  sendLowInventoryAlert: () => sendLowInventoryAlert,
  sendPasswordResetEmail: () => sendPasswordResetEmail,
  sendPurchaseConfirmation: () => sendPurchaseConfirmation
});
async function sendEmail(config) {
  try {
    const response = await fetch("/api/email/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(config)
    });
    if (!response.ok) {
      throw new Error(`Failed to send email: ${response.statusText}`);
    }
    logger3.log("Email sent successfully to:", config.to);
    return true;
  } catch (error) {
    logger3.error("Error sending email:", error);
    return false;
  }
}
async function sendLowInventoryAlert(adminEmails, stats) {
  try {
    const lowStockPercentage = 20;
    const availablePercentage = 100 - stats.utilization;
    if (availablePercentage > lowStockPercentage) {
      logger3.log("Inventory levels normal, no alert needed");
      return true;
    }
    const subject = `\u26A0\uFE0F Low VPN Inventory Alert - ${stats.activeVpnUrls} URLs Remaining`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #dc2626; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
          .alert-box { background-color: #fef2f2; border: 2px solid #fca5a5; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
          .stats { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 20px 0; }
          .stat-item { background-color: #f3f4f6; padding: 15px; border-radius: 6px; }
          .stat-label { font-size: 12px; color: #6b7280; margin-bottom: 5px; }
          .stat-value { font-size: 24px; font-weight: bold; color: #111827; }
          .button { 
            background-color: #dc2626; 
            color: white; 
            padding: 12px 24px; 
            text-decoration: none; 
            border-radius: 6px; 
            display: inline-block; 
            margin: 20px 0;
          }
          .footer { margin-top: 20px; color: #666; font-size: 12px; border-top: 1px solid #e5e7eb; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>\u26A0\uFE0F Low VPN Inventory Alert</h1>
          </div>

          <div class="alert-box">
            <p><strong>Inventory levels are running low!</strong></p>
            <p>You have only ${stats.activeVpnUrls} active VPN URLs remaining (${availablePercentage.toFixed(1)}% available).</p>
            <p>Consider importing more VPN URLs to avoid stockouts.</p>
          </div>

          <h2>Current Inventory Status</h2>
          <div class="stats">
            <div class="stat-item">
              <div class="stat-label">Total URLs</div>
              <div class="stat-value">${stats.totalVpnUrls}</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">Active (Available)</div>
              <div class="stat-value">${stats.activeVpnUrls}</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">Used (Sold)</div>
              <div class="stat-value">${stats.usedVpnUrls}</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">Utilization</div>
              <div class="stat-value">${stats.utilization.toFixed(1)}%</div>
            </div>
          </div>

          <p>To add more VPN URLs, go to your admin panel and use the VPN Import feature.</p>

          <a href="${window.location.origin}/admin" class="button">Go to Admin Panel</a>

          <div class="footer">
            <p>\xA9 2025 ChinaConnect. This is an automated alert. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    const text = `
Low VPN Inventory Alert

You have only ${stats.activeVpnUrls} active VPN URLs remaining (${availablePercentage.toFixed(1)}% available).

Current Status:
- Total URLs: ${stats.totalVpnUrls}
- Active (Available): ${stats.activeVpnUrls}
- Used (Sold): ${stats.usedVpnUrls}
- Utilization: ${stats.utilization.toFixed(1)}%

Please import more VPN URLs to avoid stockouts.

Go to: ${window.location.origin}/admin

\xA9 2025 ChinaConnect
    `;
    const results = await Promise.all(
      adminEmails.map(
        (email) => sendEmail({
          from: process.env.REACT_APP_EMAIL_FROM || "noreply@chinaconnect.com",
          to: email,
          subject,
          html,
          text
        })
      )
    );
    const successCount = results.filter((r) => r).length;
    logger3.log(`Sent low inventory alert to ${successCount}/${adminEmails.length} admins`);
    return successCount > 0;
  } catch (error) {
    logger3.error("Error sending low inventory alert:", error);
    return false;
  }
}
async function sendPurchaseConfirmation(email, productName, vpnUrl, accessUrl) {
  try {
    const subject = `\u2713 Your ${productName} Purchase Confirmation`;
    const vpnSection = vpnUrl ? `
      <h3>Your VPN Address:</h3>
      <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; word-break: break-all; font-family: monospace; font-size: 12px;">
        ${vpnUrl}
      </div>
      <p style="color: #666; font-size: 12px; margin-top: 10px;">
        <strong>Note:</strong> This VPN address is for your personal use only.
      </p>
    ` : "";
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #dc2626; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
          .button { 
            background-color: #dc2626; 
            color: white; 
            padding: 12px 24px; 
            text-decoration: none; 
            border-radius: 6px; 
            display: inline-block; 
            margin: 20px 0;
          }
          .footer { margin-top: 20px; color: #666; font-size: 12px; border-top: 1px solid #e5e7eb; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>\u2713 Thank You for Your Purchase!</h1>
          </div>

          <p>Your purchase of <strong>${productName}</strong> has been confirmed.</p>

          ${vpnSection}

          ${accessUrl ? `
          <p>You can access your content here:</p>
          <a href="${accessUrl}" class="button">Access Your Content</a>
          ` : ""}

          <p>If you have any questions, please contact our support team.</p>

          <div class="footer">
            <p>\xA9 2025 ChinaConnect.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    return await sendEmail({
      from: process.env.REACT_APP_EMAIL_FROM || "noreply@chinaconnect.com",
      to: email,
      subject,
      html
    });
  } catch (error) {
    logger3.error("Error sending purchase confirmation:", error);
    return false;
  }
}
async function sendPasswordResetEmail(email, resetLink) {
  try {
    const subject = "Password Reset Request";
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #dc2626; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
          .button { 
            background-color: #dc2626; 
            color: white; 
            padding: 12px 24px; 
            text-decoration: none; 
            border-radius: 6px; 
            display: inline-block; 
            margin: 20px 0;
          }
          .footer { margin-top: 20px; color: #666; font-size: 12px; border-top: 1px solid #e5e7eb; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Request</h1>
          </div>

          <p>We received a password reset request for your account. Click the button below to reset your password:</p>

          <a href="${resetLink}" class="button">Reset Password</a>

          <p>This link will expire in 24 hours.</p>

          <p>If you did not request this, you can safely ignore this email.</p>

          <div class="footer">
            <p>\xA9 2025 ChinaConnect.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    return await sendEmail({
      from: process.env.REACT_APP_EMAIL_FROM || "noreply@chinaconnect.com",
      to: email,
      subject,
      html
    });
  } catch (error) {
    logger3.error("Error sending password reset email:", error);
    return false;
  }
}
var init_emailService = __esm({
  "services/emailService.ts"() {
    init_logger();
  }
});
var supabaseUrl3 = (typeof __SUPABASE_URL__ !== "undefined" ? __SUPABASE_URL__ : "") || process.env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
var supabaseAnonKey3 = (typeof __SUPABASE_ANON_KEY__ !== "undefined" ? __SUPABASE_ANON_KEY__ : "") || import.meta?.env?.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";
var supabaseInstance3 = null;
function getSupabaseClient3() {
  if (!supabaseInstance3) {
    const url = supabaseUrl3 || process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
    const key = supabaseAnonKey3 || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
    if (!url || !key) {
      throw new Error("Missing Supabase configuration");
    }
    supabaseInstance3 = createClient3(url, key);
  }
  return supabaseInstance3;
}
var supabase3 = getSupabaseClient3();
init_logger();
async function getAvailableVpnUrl() {
  try {
    const { data, error } = await supabase3.from("vpn_urls").select("*").eq("status", "active").is("assigned_to_user_id", null).limit(1).single();
    if (error && error.code !== "PGRST116") throw error;
    return data || null;
  } catch (error) {
    logger3.error("Error getting available VPN URL:", error);
    throw error;
  }
}
async function assignVpnUrlToUserOnPurchase(vpnUrlId, userId) {
  try {
    const { data, error } = await supabase3.from("vpn_urls").update({
      assigned_to_user_id: userId,
      assigned_at: (/* @__PURE__ */ new Date()).toISOString(),
      status: "used",
      // Mark as sold/used
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    }).eq("id", vpnUrlId).select().single();
    if (error) throw error;
    logger3.log(`VPN URL assigned to user ${userId}:`, vpnUrlId);
    return data;
  } catch (error) {
    logger3.error("Error assigning VPN URL to user:", error);
    throw error;
  }
}

// services/paymentService.ts
async function handlePaymentSuccess(userId, productId, amount, currency = "usd", stripeSessionId) {
  try {
    const purchase = await savePurchase(
      userId,
      productId,
      amount,
      currency,
      stripeSessionId,
      "completed"
    );
    if (!purchase) {
      throw new Error("Failed to save purchase record");
    }
    const expiryDays = getExpiryDaysForProduct(productId);
    const accessToken = await createAccessToken(userId, productId, expiryDays);
    if (!accessToken) {
      throw new Error("Failed to create access token");
    }
    const accessUrl = generateAccessUrl(accessToken.token);
    let vpnUrl;
    let vpnAssignmentSuccess = false;
    if (productId.startsWith("vpn-")) {
      try {
        const availableVpnUrl = await getAvailableVpnUrl();
        if (availableVpnUrl) {
          const assignedUrl = await assignVpnUrlToUserOnPurchase(availableVpnUrl.id, userId);
          if (assignedUrl) {
            vpnUrl = assignedUrl.url;
            vpnAssignmentSuccess = true;
            logger2.log(`VPN URL assigned to user ${userId} for product ${productId}`);
          }
        } else {
          logger2.warn(`No available VPN URLs for product ${productId}`);
        }
      } catch (vpnError) {
        logger2.error("Error assigning VPN URL:", vpnError);
      }
    }
    return {
      purchase,
      accessToken,
      accessUrl,
      vpnUrl,
      vpnAssignmentSuccess
    };
  } catch (error) {
    logger2.error("Error handling payment success:", error);
    throw error;
  }
}
async function savePurchase(userId, productId, amount, currency = "usd", stripeSessionId, status = "pending") {
  try {
    const { data, error } = await supabase.from("purchases").insert({
      user_id: userId,
      product_id: productId,
      amount,
      currency,
      stripe_session_id: stripeSessionId,
      status
    }).select().single();
    if (error) throw error;
    return data;
  } catch (error) {
    logger2.error("Error saving purchase:", error);
    throw error;
  }
}
async function getPurchase(purchaseId) {
  try {
    const { data, error } = await supabase.from("purchases").select("*").eq("id", purchaseId).single();
    if (error && error.code !== "PGRST116") throw error;
    return data || null;
  } catch (error) {
    logger2.error("Error getting purchase:", error);
    throw error;
  }
}
async function getUserPurchases(userId) {
  try {
    const { data, error } = await supabase.from("purchases").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (error) {
    logger2.error("Error getting user purchases:", error);
    throw error;
  }
}
async function getPurchaseByStripeSession(stripeSessionId) {
  try {
    const { data, error } = await supabase.from("purchases").select("*").eq("stripe_session_id", stripeSessionId).single();
    if (error && error.code !== "PGRST116") throw error;
    return data || null;
  } catch (error) {
    logger2.error("Error getting purchase by stripe session:", error);
    throw error;
  }
}
async function updatePurchaseStatus(purchaseId, status) {
  try {
    const { data, error } = await supabase.from("purchases").update({
      status,
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    }).eq("id", purchaseId).select().single();
    if (error) throw error;
    return data;
  } catch (error) {
    logger2.error("Error updating purchase status:", error);
    throw error;
  }
}
function generateEmailContent(user, productId, accessUrl, vpnUrl) {
  const productName = getProductName(productId);
  const expiryDays = getExpiryDaysForProduct(productId);
  const isVpnProduct = productId.startsWith("vpn-");
  const subject = `\u60A8\u7684 ${productName} \u5DF2\u51C6\u5907\u597D\uFF01`;
  const vpnSection = vpnUrl ? `
          <h3>VPN \u8FDE\u63A5\u4FE1\u606F\uFF1A</h3>
          <p>\u60A8\u7684\u4E13\u5C5E VPN \u5730\u5740\u5DF2\u5206\u914D\uFF0C\u8BF7\u590D\u5236\u4EE5\u4E0B\u5730\u5740\u5230\u60A8\u7684 VPN \u5BA2\u6237\u7AEF\uFF1A</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 6px; word-break: break-all; font-family: monospace; font-size: 12px;">
            ${vpnUrl}
          </div>
          <p style="color: #666; font-size: 12px; margin-top: 10px;">
            <strong>\u91CD\u8981\u63D0\u793A\uFF1A</strong>\u60A8\u7684 ${expiryDays} \u5929\u4F7F\u7528\u671F\u9650\u4ECE<strong>\u60A8\u9996\u6B21\u4F7F\u7528\u8BE5 VPN \u5730\u5740\u65F6\u5F00\u59CB\u8BA1\u7B97</strong>\uFF0C\u800C\u975E\u8D2D\u4E70\u65F6\u95F4\u3002\u8FD9\u6837\u53EF\u4EE5\u786E\u4FDD\u60A8\u80FD\u5145\u5206\u5229\u7528\u8D2D\u4E70\u7684\u670D\u52A1\u3002
          </p>
          <p style="color: #666; font-size: 12px;">
            \u6B64 VPN \u5730\u5740\u4EC5\u4F9B\u60A8\u4E2A\u4EBA\u4F7F\u7528\uFF0C\u8BF7\u52FF\u5206\u4EAB\u7ED9\u4ED6\u4EBA\u3002
          </p>
  ` : "";
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #dc2626; color: white; padding: 20px; border-radius: 8px; }
        .content { margin: 20px 0; }
        .button { 
          background-color: #dc2626; 
          color: white; 
          padding: 12px 24px; 
          text-decoration: none; 
          border-radius: 6px; 
          display: inline-block; 
          margin: 20px 0;
        }
        .footer { margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>\u611F\u8C22\u60A8\u7684\u8D2D\u4E70\uFF01</h1>
        </div>
        
        <div class="content">
          <p>\u4EB2\u7231\u7684 ${user.username},</p>
          
          <p>\u611F\u8C22\u60A8\u7684\u8D2D\u4E70\uFF01\u60A8\u5DF2\u6210\u529F\u8D2D\u4E70 <strong>${productName}</strong>\u3002</p>
          
          ${isVpnProduct ? "" : `
          <p>\u60A8\u53EF\u4EE5\u4F7F\u7528\u4E0B\u9762\u7684\u94FE\u63A5\u8BBF\u95EE\u60A8\u7684\u4E0B\u8F7D\u5185\u5BB9\uFF1A</p>
          
          <a href="${accessUrl}" class="button">\u70B9\u51FB\u8FD9\u91CC\u8BBF\u95EE\u60A8\u7684\u5185\u5BB9</a>
          
          <p>\u6216\u8005\u590D\u5236\u4EE5\u4E0B\u94FE\u63A5\u5230\u6D4F\u89C8\u5668\uFF1A<br>
          <code>${accessUrl}</code></p>
          `}
          
          ${vpnSection}
          
          <h3>\u91CD\u8981\u4FE1\u606F\uFF1A</h3>
          <ul>
            ${isVpnProduct ? `<li>\u6B64 VPN \u94FE\u63A5\u5C06\u5728<strong>\u60A8\u9996\u6B21\u4F7F\u7528\u540E\u7684 ${expiryDays} \u5929\u5185</strong>\u6709\u6548</li>
                 <li>\u4F7F\u7528\u671F\u9650\u4ECE\u60A8\u9996\u6B21\u8FDE\u63A5\u65F6\u5F00\u59CB\u8BA1\u7B97</li>
                 <li>\u60A8\u53EF\u4EE5\u5728\u6709\u6548\u671F\u5185\u65E0\u9650\u6B21\u8FDE\u63A5</li>` : `<li>\u6B64\u4E0B\u8F7D\u94FE\u63A5\u5C06\u5728\u8D2D\u4E70\u540E\u7684 ${expiryDays} \u5929\u5185\u6709\u6548</li>
                 <li>\u60A8\u53EF\u4EE5\u65E0\u9650\u6B21\u4E0B\u8F7D</li>`}
            <li>\u8BF7\u59A5\u5584\u4FDD\u7BA1\u6B64\u4FE1\u606F</li>
          </ul>
          
          <p>\u5982\u6709\u95EE\u9898\uFF0C\u8BF7\u8054\u7CFB\u6211\u4EEC\u7684\u652F\u6301\u56E2\u961F\u3002</p>
        </div>
        
        <div class="footer">
          <p>\xA9 2025 ChinaConnect. \u7248\u6743\u6240\u6709\u3002</p>
        </div>
      </div>
    </body>
    </html>
  `;
  const vpnTextSection = vpnUrl ? `
VPN \u8FDE\u63A5\u4FE1\u606F\uFF1A
\u60A8\u7684\u4E13\u5C5E VPN \u5730\u5740\u5DF2\u5206\u914D\uFF0C\u8BF7\u5728\u60A8\u7684 VPN \u5BA2\u6237\u7AEF\u4E2D\u4F7F\u7528\u4EE5\u4E0B\u5730\u5740\uFF1A
${vpnUrl}

\u91CD\u8981\u63D0\u793A\uFF1A\u60A8\u7684 ${expiryDays} \u5929\u4F7F\u7528\u671F\u9650\u4ECE\u60A8\u9996\u6B21\u4F7F\u7528\u8BE5 VPN \u5730\u5740\u65F6\u5F00\u59CB\u8BA1\u7B97\uFF0C\u800C\u975E\u8D2D\u4E70\u65F6\u95F4\u3002\u8FD9\u6837\u53EF\u4EE5\u786E\u4FDD\u60A8\u80FD\u5145\u5206\u5229\u7528\u8D2D\u4E70\u7684\u670D\u52A1\u3002

\u6CE8\u610F\uFF1A\u6B64 VPN \u5730\u5740\u4EC5\u4F9B\u60A8\u4E2A\u4EBA\u4F7F\u7528\uFF0C\u8BF7\u52FF\u5206\u4EAB\u7ED9\u4ED6\u4EBA\u3002
  ` : "";
  const text = `
\u611F\u8C22\u60A8\u7684\u8D2D\u4E70\uFF01

\u4EB2\u7231\u7684 ${user.username},

\u611F\u8C22\u60A8\u7684\u8D2D\u4E70\uFF01\u60A8\u5DF2\u6210\u529F\u8D2D\u4E70 ${productName}\u3002

${isVpnProduct ? "" : `\u60A8\u53EF\u4EE5\u4F7F\u7528\u4E0B\u9762\u7684\u94FE\u63A5\u8BBF\u95EE\u60A8\u7684\u4E0B\u8F7D\u5185\u5BB9\uFF1A
${accessUrl}
`}
${vpnTextSection}

\u91CD\u8981\u4FE1\u606F\uFF1A
${isVpnProduct ? `- \u6B64 VPN \u94FE\u63A5\u5C06\u5728\u60A8\u9996\u6B21\u4F7F\u7528\u540E\u7684 ${expiryDays} \u5929\u5185\u6709\u6548
- \u4F7F\u7528\u671F\u9650\u4ECE\u60A8\u9996\u6B21\u8FDE\u63A5\u65F6\u5F00\u59CB\u8BA1\u7B97
- \u60A8\u53EF\u4EE5\u5728\u6709\u6548\u671F\u5185\u65E0\u9650\u6B21\u8FDE\u63A5` : `- \u6B64\u4E0B\u8F7D\u94FE\u63A5\u5C06\u5728\u8D2D\u4E70\u540E\u7684 ${expiryDays} \u5929\u5185\u6709\u6548
- \u60A8\u53EF\u4EE5\u65E0\u9650\u6B21\u4E0B\u8F7D`}
- \u8BF7\u59A5\u5584\u4FDD\u7BA1\u6B64\u4FE1\u606F

\u5982\u6709\u95EE\u9898\uFF0C\u8BF7\u8054\u7CFB\u6211\u4EEC\u7684\u652F\u6301\u56E2\u961F\u3002

\xA9 2025 ChinaConnect. \u7248\u6743\u6240\u6709\u3002
  `;
  return { subject, html, text };
}
export {
  generateEmailContent,
  getPurchase,
  getPurchaseByStripeSession,
  getUserPurchases,
  handlePaymentSuccess,
  savePurchase,
  updatePurchaseStatus
};
