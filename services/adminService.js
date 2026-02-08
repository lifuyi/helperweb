var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// utils/logger.js
var isDevelopment, logger;
var init_logger = __esm({
  "utils/logger.js"() {
    isDevelopment = false;
    logger = {
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
  }
});

// services/emailService.ts
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
    logger.log("Email sent successfully to:", config.to);
    return true;
  } catch (error) {
    logger.error("Error sending email:", error);
    return false;
  }
}
async function sendLowInventoryAlert(adminEmails, stats) {
  try {
    const lowStockPercentage = 20;
    const availablePercentage = 100 - stats.utilization;
    if (availablePercentage > lowStockPercentage) {
      logger.log("Inventory levels normal, no alert needed");
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
    logger.log(`Sent low inventory alert to ${successCount}/${adminEmails.length} admins`);
    return successCount > 0;
  } catch (error) {
    logger.error("Error sending low inventory alert:", error);
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
    logger.error("Error sending purchase confirmation:", error);
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
    logger.error("Error sending password reset email:", error);
    return false;
  }
}
var init_emailService = __esm({
  "services/emailService.ts"() {
    init_logger();
  }
});

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

// services/adminService.ts
init_logger();

// utils/vlessParser.js
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
function parseVlessUrl(urlString) {
  try {
    urlString = urlString.trim();
    if (!urlString.startsWith("vless://")) {
      logger2.error("Invalid VLESS URL: does not start with vless://");
      return null;
    }
    let urlWithoutScheme = urlString.slice(8);
    let name = "";
    if (urlWithoutScheme.includes("#")) {
      const parts = urlWithoutScheme.split("#");
      urlWithoutScheme = parts[0];
      name = parts[1] || "";
    }
    let authority = "";
    let query = "";
    if (urlWithoutScheme.includes("?")) {
      const parts = urlWithoutScheme.split("?");
      authority = parts[0];
      query = parts[1];
    } else {
      authority = urlWithoutScheme;
    }
    const authorityMatch = authority.match(/^([^@]+)@([^:]+):(\d+)$/);
    if (!authorityMatch) {
      logger2.error("Invalid VLESS URL authority format:", authority);
      return null;
    }
    const uuid = authorityMatch[1];
    const host = authorityMatch[2];
    const port = parseInt(authorityMatch[3], 10);
    const params = new URLSearchParams(query);
    const config = {
      uuid,
      host,
      port,
      protocol: params.get("type") || "tcp",
      encryption: params.get("encryption") || "none",
      security: params.get("security") || "none",
      pbk: params.get("pbk") || void 0,
      fp: params.get("fp") || void 0,
      sni: params.get("sni") || void 0,
      sid: params.get("sid") || void 0,
      spx: params.get("spx") || void 0,
      name: name || void 0,
      rawUrl: urlString
    };
    return config;
  } catch (error) {
    logger2.error("Error parsing VLESS URL:", error);
    return null;
  }
}

// services/adminService.ts
async function getAllPurchases(limit = 100, offset = 0) {
  try {
    const { data: purchases, error: purchaseError } = await supabase.from("purchases").select("*").order("created_at", { ascending: false }).range(offset, offset + limit - 1);
    if (purchaseError) throw purchaseError;
    if (!purchases || purchases.length === 0) return [];
    const purchasesWithUsers = await Promise.all(
      purchases.map(async (purchase) => {
        const { data: user, error: userError } = await supabase.from("users").select("email, username").eq("id", purchase.user_id).single();
        if (userError) {
          logger.error("Error fetching user:", userError);
          return {
            ...purchase,
            user_email: "Unknown",
            user_name: "Unknown"
          };
        }
        return {
          ...purchase,
          user_email: user?.email || "Unknown",
          user_name: user?.username || "Unknown"
        };
      })
    );
    return purchasesWithUsers;
  } catch (error) {
    logger.error("Error getting all purchases:", error);
    throw error;
  }
}
async function getPurchaseCount() {
  try {
    const { count, error } = await supabase.from("purchases").select("*", { count: "exact", head: true });
    if (error) throw error;
    return count || 0;
  } catch (error) {
    logger.error("Error getting purchase count:", error);
    throw error;
  }
}
async function getTotalRevenue() {
  try {
    const { data, error } = await supabase.from("purchases").select("amount").eq("status", "completed");
    if (error) throw error;
    const total = (data || []).reduce((sum, purchase) => sum + purchase.amount, 0);
    return total;
  } catch (error) {
    logger.error("Error getting total revenue:", error);
    throw error;
  }
}
async function addVpnUrl(url, dayPeriod, trafficLimit) {
  try {
    const { data, error } = await supabase.from("vpn_urls").insert({
      url,
      day_period: dayPeriod,
      traffic_limit: trafficLimit,
      status: "active"
    }).select().single();
    if (error) throw error;
    return data;
  } catch (error) {
    logger.error("Error adding VPN URL:", error);
    throw error;
  }
}
async function bulkImportVpnUrls(vpnData) {
  try {
    const errors = [];
    let successCount = 0;
    const batchSize = 50;
    for (let i = 0; i < vpnData.length; i += batchSize) {
      const batch = vpnData.slice(i, i + batchSize);
      const { data, error } = await supabase.from("vpn_urls").insert(
        batch.map((item) => {
          const vlessConfig = parseVlessUrl(item.url);
          return {
            url: item.url,
            day_period: item.day_period,
            traffic_limit: item.traffic_limit,
            status: "active",
            // VLESS-specific fields
            vless_uuid: vlessConfig?.uuid || null,
            vless_host: vlessConfig?.host || null,
            vless_port: vlessConfig?.port || null,
            protocol: vlessConfig?.protocol || "tcp",
            encryption: vlessConfig?.encryption || "none",
            security_type: vlessConfig?.security || "none",
            fingerprint: vlessConfig?.fp || null,
            sni: vlessConfig?.sni || null,
            session_id: vlessConfig?.sid || null,
            path: vlessConfig?.spx || null,
            vless_name: vlessConfig?.name || null,
            pbk: vlessConfig?.pbk || null,
            // Usage tracking
            traffic_used: 0,
            usage_count: 0,
            is_active: true
          };
        })
      ).select();
      if (error) {
        logger.error("Batch import error:", error);
        const errorMsg = error.message || "Unknown error during batch import";
        errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${errorMsg}`);
      } else {
        successCount += data ? data.length : 0;
      }
    }
    return {
      success: successCount,
      failed: vpnData.length - successCount,
      errors
    };
  } catch (error) {
    logger.error("Error bulk importing VPN URLs:", error);
    throw error;
  }
}
async function getAllVpnUrls(status, limit = 100, offset = 0) {
  try {
    let query = supabase.from("vpn_urls").select("*");
    if (status) {
      query = query.eq("status", status);
    }
    const { data: vpnUrls, error } = await query.order("created_at", { ascending: false }).range(offset, offset + limit - 1);
    if (error) throw error;
    if (!vpnUrls || vpnUrls.length === 0) return [];
    const vpnUrlsWithUsers = await Promise.all(
      vpnUrls.map(async (vpnUrl) => {
        if (vpnUrl.assigned_to_user_id) {
          const { data: user, error: userError } = await supabase.from("users").select("email, username").eq("id", vpnUrl.assigned_to_user_id).single();
          if (userError) {
            logger.error("Error fetching user:", userError);
            return {
              ...vpnUrl,
              user_email: "Unknown",
              user_name: "Unknown"
            };
          }
          return {
            ...vpnUrl,
            user_email: user?.email || "Unknown",
            user_name: user?.username || "Unknown"
          };
        }
        return vpnUrl;
      })
    );
    return vpnUrlsWithUsers;
  } catch (error) {
    logger.error("Error getting all VPN URLs:", error);
    throw error;
  }
}
async function getVpnUrlCount(status) {
  try {
    let query = supabase.from("vpn_urls").select("*", { count: "exact", head: true });
    if (status) {
      query = query.eq("status", status);
    }
    const { count, error } = await query;
    if (error) throw error;
    return count || 0;
  } catch (error) {
    logger.error("Error getting VPN URL count:", error);
    throw error;
  }
}
async function updateVpnUrlStatus(vpnUrlId, status) {
  try {
    const { data, error } = await supabase.from("vpn_urls").update({
      status,
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    }).eq("id", vpnUrlId).select().single();
    if (error) throw error;
    return data;
  } catch (error) {
    logger.error("Error updating VPN URL status:", error);
    throw error;
  }
}
async function deleteVpnUrl(vpnUrlId) {
  try {
    const { error } = await supabase.from("vpn_urls").delete().eq("id", vpnUrlId);
    if (error) throw error;
  } catch (error) {
    logger.error("Error deleting VPN URL:", error);
    throw error;
  }
}
async function assignVpnUrlToUser(vpnUrlId, userId) {
  try {
    const { data, error } = await supabase.from("vpn_urls").update({
      assigned_to_user_id: userId,
      assigned_at: (/* @__PURE__ */ new Date()).toISOString(),
      status: "used",
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    }).eq("id", vpnUrlId).select().single();
    if (error) throw error;
    return data;
  } catch (error) {
    logger.error("Error assigning VPN URL to user:", error);
    throw error;
  }
}
async function unassignVpnUrl(vpnUrlId) {
  try {
    const { data, error } = await supabase.from("vpn_urls").update({
      assigned_to_user_id: null,
      assigned_at: null,
      status: "active",
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    }).eq("id", vpnUrlId).select().single();
    if (error) throw error;
    return data;
  } catch (error) {
    logger.error("Error unassigning VPN URL:", error);
    throw error;
  }
}
async function getAvailableVpnUrl() {
  try {
    const { data, error } = await supabase.from("vpn_urls").select("*").eq("status", "active").is("assigned_to_user_id", null).limit(1).single();
    if (error && error.code !== "PGRST116") throw error;
    return data || null;
  } catch (error) {
    logger.error("Error getting available VPN URL:", error);
    throw error;
  }
}
async function assignVpnUrlToUserOnPurchase(vpnUrlId, userId) {
  try {
    const { data, error } = await supabase.from("vpn_urls").update({
      assigned_to_user_id: userId,
      assigned_at: (/* @__PURE__ */ new Date()).toISOString(),
      status: "used",
      // Mark as sold/used
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    }).eq("id", vpnUrlId).select().single();
    if (error) throw error;
    logger.log(`VPN URL assigned to user ${userId}:`, vpnUrlId);
    return data;
  } catch (error) {
    logger.error("Error assigning VPN URL to user:", error);
    throw error;
  }
}
async function getUserAssignedVpnUrl(userId) {
  try {
    const { data, error } = await supabase.from("vpn_urls").select("*").eq("assigned_to_user_id", userId).eq("status", "used").order("assigned_at", { ascending: false }).limit(1).single();
    if (error && error.code !== "PGRST116") throw error;
    return data || null;
  } catch (error) {
    logger.error("Error getting user assigned VPN URL:", error);
    throw error;
  }
}
async function getUserAssignedVpnUrls(userId) {
  try {
    const { data, error } = await supabase.from("vpn_urls").select("*").eq("assigned_to_user_id", userId).order("assigned_at", { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (error) {
    logger.error("Error getting user assigned VPN URLs:", error);
    throw error;
  }
}
async function getAdminStats() {
  try {
    const [
      totalPurchases,
      totalRevenue,
      totalVpnUrls,
      activeVpnUrls,
      usedVpnUrls,
      inactiveVpnUrls
    ] = await Promise.all([
      getPurchaseCount(),
      getTotalRevenue(),
      getVpnUrlCount(),
      getVpnUrlCount("active"),
      getVpnUrlCount("used"),
      getVpnUrlCount("inactive")
    ]);
    return {
      totalPurchases,
      totalRevenue,
      totalVpnUrls,
      activeVpnUrls,
      usedVpnUrls,
      inactiveVpnUrls
    };
  } catch (error) {
    logger.error("Error getting admin stats:", error);
    throw error;
  }
}
async function searchPurchases(query) {
  try {
    const { data: users, error: userError } = await supabase.from("users").select("id").or(`email.ilike.%${query}%,username.ilike.%${query}%`);
    if (userError) throw userError;
    if (!users || users.length === 0) return [];
    const userIds = users.map((u) => u.id);
    const { data: purchases, error: purchaseError } = await supabase.from("purchases").select("*").in("user_id", userIds).order("created_at", { ascending: false });
    if (purchaseError) throw purchaseError;
    if (!purchases || purchases.length === 0) return [];
    const purchasesWithUsers = purchases.map((purchase) => {
      const user = users.find((u) => u.id === purchase.user_id);
      return {
        ...purchase,
        user_email: user?.email || "Unknown",
        user_name: user?.username || "Unknown"
      };
    });
    return purchasesWithUsers;
  } catch (error) {
    logger.error("Error searching purchases:", error);
    throw error;
  }
}
async function getAllProducts() {
  try {
    const { data, error } = await supabase.from("products").select("*").order("display_order", { ascending: true });
    if (error) throw error;
    return data || [];
  } catch (error) {
    logger.error("Error getting all products:", error);
    throw error;
  }
}
async function getActiveProducts() {
  try {
    const { data, error } = await supabase.from("products").select("*").eq("is_active", true).order("display_order", { ascending: true });
    if (error) throw error;
    return data || [];
  } catch (error) {
    logger.error("Error getting active products:", error);
    throw error;
  }
}
async function getProduct(productId) {
  try {
    const { data, error } = await supabase.from("products").select("*").eq("id", productId).single();
    if (error && error.code !== "PGRST116") throw error;
    return data || null;
  } catch (error) {
    logger.error("Error getting product:", error);
    throw error;
  }
}
async function upsertProduct(product) {
  try {
    const { data, error } = await supabase.from("products").upsert({
      ...product,
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    }).select().single();
    if (error) throw error;
    logger.log(`Product ${product.id} upserted successfully`);
    return data;
  } catch (error) {
    logger.error("Error upserting product:", error);
    throw error;
  }
}
async function updateProductPrice(productId, priceCents) {
  try {
    const { data, error } = await supabase.from("products").update({
      price_cents: priceCents,
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    }).eq("id", productId).select().single();
    if (error) throw error;
    logger.log(`Product ${productId} price updated to ${priceCents} cents`);
    return data;
  } catch (error) {
    logger.error("Error updating product price:", error);
    throw error;
  }
}
async function updateProductStatus(productId, isActive) {
  try {
    const { data, error } = await supabase.from("products").update({
      is_active: isActive,
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    }).eq("id", productId).select().single();
    if (error) throw error;
    logger.log(`Product ${productId} status updated to ${isActive ? "active" : "inactive"}`);
    return data;
  } catch (error) {
    logger.error("Error updating product status:", error);
    throw error;
  }
}
async function deleteProduct(productId) {
  try {
    const { error } = await supabase.from("products").delete().eq("id", productId);
    if (error) throw error;
    logger.log(`Product ${productId} deleted successfully`);
  } catch (error) {
    logger.error("Error deleting product:", error);
    throw error;
  }
}
async function getAllAdminUsers() {
  try {
    const { data: adminUsers, error: adminError } = await supabase.from("admin_users").select("*").order("created_at", { ascending: false });
    if (adminError) throw adminError;
    if (!adminUsers || adminUsers.length === 0) return [];
    const adminUsersWithEmails = await Promise.all(
      adminUsers.map(async (admin) => {
        const { data: user, error: userError } = await supabase.from("users").select("email, username").eq("id", admin.user_id).single();
        if (userError) {
          logger.error("Error fetching user for admin:", userError);
          return {
            ...admin,
            email: "Unknown",
            username: "Unknown"
          };
        }
        return {
          ...admin,
          email: user?.email || "Unknown",
          username: user?.username || "Unknown"
        };
      })
    );
    return adminUsersWithEmails;
  } catch (error) {
    logger.error("Error getting admin users:", error);
    throw error;
  }
}
async function createAdminUser(email, role = "viewer") {
  try {
    const { data: user, error: userError } = await supabase.from("users").select("id, email, username").eq("email", email).single();
    if (userError) throw new Error(`User with email ${email} not found`);
    const { data, error } = await supabase.from("admin_users").insert({
      user_id: user.id,
      role
    }).select().single();
    if (error) throw error;
    return {
      ...data,
      email: user.email,
      username: user.username
    };
  } catch (error) {
    logger.error("Error creating admin user:", error);
    throw error;
  }
}
async function updateAdminUserRole(userId, role) {
  try {
    const { data, error } = await supabase.from("admin_users").update({
      role,
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    }).eq("user_id", userId).select().single();
    if (error) throw error;
    const { data: user } = await supabase.from("users").select("email, username").eq("id", userId).single();
    return {
      ...data,
      email: user?.email || "Unknown",
      username: user?.username || "Unknown"
    };
  } catch (error) {
    logger.error("Error updating admin user role:", error);
    throw error;
  }
}
async function deleteAdminUser(userId) {
  try {
    const { error } = await supabase.from("admin_users").delete().eq("user_id", userId);
    if (error) throw error;
    logger.log(`Admin user ${userId} deleted successfully`);
  } catch (error) {
    logger.error("Error deleting admin user:", error);
    throw error;
  }
}
async function isUserAdmin(userId) {
  try {
    const { data, error } = await supabase.from("admin_users").select("id").eq("user_id", userId).single();
    if (error && error.code !== "PGRST116") throw error;
    return !!data;
  } catch (error) {
    logger.error("Error checking admin status:", error);
    return false;
  }
}
async function getUserAdminRole(userId) {
  try {
    const { data, error } = await supabase.from("admin_users").select("role").eq("user_id", userId).single();
    if (error && error.code !== "PGRST116") throw error;
    return data?.role || null;
  } catch (error) {
    logger.error("Error getting user admin role:", error);
    return null;
  }
}
async function checkAndSendInventoryAlerts() {
  try {
    const stats = await getAdminStats();
    const availablePercentage = stats.totalVpnUrls > 0 ? stats.activeVpnUrls / stats.totalVpnUrls * 100 : 0;
    if (availablePercentage > 20) {
      logger.log("Inventory levels normal");
      return;
    }
    logger.warn(`Low inventory alert: ${availablePercentage.toFixed(1)}% available`);
    const adminUsers = await getAllAdminUsers();
    const adminEmails = adminUsers.filter((u) => u.role === "admin" || u.role === "moderator").map((u) => u.email);
    if (adminEmails.length === 0) {
      logger.warn("No admin emails found for alerts");
      return;
    }
    const { sendLowInventoryAlert: sendLowInventoryAlert2 } = await Promise.resolve().then(() => (init_emailService(), emailService_exports));
    await sendLowInventoryAlert2(adminEmails, {
      totalVpnUrls: stats.totalVpnUrls,
      activeVpnUrls: stats.activeVpnUrls,
      usedVpnUrls: stats.usedVpnUrls,
      utilization: stats.usedVpnUrls / stats.totalVpnUrls * 100
    });
  } catch (error) {
    logger.error("Error checking inventory and sending alerts:", error);
  }
}
async function searchVpnUrls(query) {
  try {
    const { data: vpnUrls, error } = await supabase.from("vpn_urls").select("*").or(`url.ilike.%${query}%`).order("created_at", { ascending: false });
    if (error) throw error;
    if (!vpnUrls || vpnUrls.length === 0) return [];
    const vpnUrlsWithUsers = await Promise.all(
      vpnUrls.map(async (vpnUrl) => {
        if (vpnUrl.assigned_to_user_id) {
          const { data: user, error: userError } = await supabase.from("users").select("email, username").eq("id", vpnUrl.assigned_to_user_id).single();
          if (userError) {
            return {
              ...vpnUrl,
              user_email: "Unknown",
              user_name: "Unknown"
            };
          }
          return {
            ...vpnUrl,
            user_email: user?.email || "Unknown",
            user_name: user?.username || "Unknown"
          };
        }
        return vpnUrl;
      })
    );
    return vpnUrlsWithUsers;
  } catch (error) {
    logger.error("Error searching VPN URLs:", error);
    throw error;
  }
}
export {
  addVpnUrl,
  assignVpnUrlToUser,
  assignVpnUrlToUserOnPurchase,
  bulkImportVpnUrls,
  checkAndSendInventoryAlerts,
  createAdminUser,
  deleteAdminUser,
  deleteProduct,
  deleteVpnUrl,
  getActiveProducts,
  getAdminStats,
  getAllAdminUsers,
  getAllProducts,
  getAllPurchases,
  getAllVpnUrls,
  getAvailableVpnUrl,
  getProduct,
  getPurchaseCount,
  getTotalRevenue,
  getUserAdminRole,
  getUserAssignedVpnUrl,
  getUserAssignedVpnUrls,
  getVpnUrlCount,
  isUserAdmin,
  searchPurchases,
  searchVpnUrls,
  unassignVpnUrl,
  updateAdminUserRole,
  updateProductPrice,
  updateProductStatus,
  updateVpnUrlStatus,
  upsertProduct
};
