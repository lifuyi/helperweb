// services/vpnClientService.ts
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

// services/xuiClient.ts
var XuiApiClient = class {
  constructor(config) {
    this.cookie = null;
    this.config = config;
  }
  /**
   * Login to X-UI panel and get session cookie
   */
  async login() {
    try {
      const response = await fetch(`${this.config.baseUrl}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
          username: this.config.username,
          password: this.config.password
        })
      });
      if (!response.ok) {
        logger.error("X-UI login failed:", response.statusText);
        return false;
      }
      const setCookie = response.headers.get("set-cookie");
      if (setCookie) {
        this.cookie = setCookie.split(";")[0];
        logger.log("X-UI login successful");
        return true;
      }
      logger.error("No cookie in X-UI login response");
      return false;
    } catch (error) {
      logger.error("X-UI login error:", error);
      return false;
    }
  }
  /**
   * Make authenticated request to X-UI API
   */
  async request(endpoint, options = {}) {
    if (!this.cookie) {
      const loggedIn = await this.login();
      if (!loggedIn) {
        logger.error("Not authenticated to X-UI");
        return null;
      }
    }
    try {
      const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          "Cookie": this.cookie,
          ...options.headers
        }
      });
      if (response.status === 401 || response.status === 403) {
        this.cookie = null;
        const loggedIn = await this.login();
        if (!loggedIn) {
          return null;
        }
        return this.request(endpoint, options);
      }
      if (!response.ok) {
        logger.error(`X-UI API error: ${response.statusText}`);
        return null;
      }
      return await response.json();
    } catch (error) {
      logger.error(`X-UI API request failed:`, error);
      return null;
    }
  }
  /**
   * Get list of inbounds (protocols/ports)
   */
  async getInbounds() {
    const response = await this.request("/panel/api/inbounds/list");
    return response?.obj || [];
  }
  /**
   * Get a specific inbound by ID
   */
  async getInbound(id) {
    const response = await this.request(
      `/panel/api/inbounds/${id}`
    );
    return response?.obj || null;
  }
  /**
   * Get clients for a specific inbound
   */
  async getInboundClients(inboundId) {
    const inbound = await this.getInbound(inboundId);
    if (!inbound) {
      return [];
    }
    try {
      const settings = JSON.parse(inbound.settings || "{}");
      return settings.clients || [];
    } catch {
      return [];
    }
  }
  /**
   * Create a new client for an inbound
   * @param inboundId - The inbound (port) ID to add client to
   * @param email - Client identifier (usually user's email)
   * @param expiryDays - Days until expiration (0 = never expires)
   * @param limitIp - Number of concurrent connections (0 = unlimited)
   */
  async createClient(inboundId, email, expiryDays = 30, limitIp = 1) {
    const uuid = crypto.randomUUID();
    const expiryTime = expiryDays > 0 ? Math.floor(Date.now() / 1e3) + expiryDays * 24 * 60 * 60 : 0;
    const clientData = {
      id: inboundId,
      settings: JSON.stringify({
        clients: [
          {
            id: uuid,
            email,
            limitIp,
            totalGB: 0,
            expiryTime,
            enable: true,
            tgId: "",
            subId: ""
          }
        ]
      })
    };
    const response = await this.request(
      "/panel/api/inbounds/addClient",
      {
        method: "POST",
        body: JSON.stringify(clientData)
      }
    );
    if (response?.success) {
      logger.log(`X-UI client created: ${email}`);
      return {
        id: inboundId,
        enable: true,
        email,
        uuid,
        limitIp,
        totalGB: 0,
        expiryTime,
        subId: ""
      };
    }
    logger.error(`Failed to create X-UI client: ${response?.msg}`);
    return null;
  }
  /**
   * Delete a client from an inbound
   */
  async deleteClient(inboundId, clientUuid) {
    const response = await this.request(
      `/panel/api/inbounds/${inboundId}/delClient/${clientUuid}`,
      { method: "POST" }
    );
    if (response?.success) {
      logger.log(`X-UI client deleted: ${clientUuid}`);
      return true;
    }
    logger.error(`Failed to delete X-UI client: ${response?.msg}`);
    return false;
  }
  /**
   * Update client expiration
   */
  async updateClientExpiry(inboundId, clientUuid, expiryDays) {
    const expiryTime = expiryDays > 0 ? Math.floor(Date.now() / 1e3) + expiryDays * 24 * 60 * 60 : 0;
    const inbound = await this.getInbound(inboundId);
    if (!inbound) {
      return false;
    }
    try {
      const settings = JSON.parse(inbound.settings || "{}");
      const client = settings.clients?.find((c) => c.uuid === clientUuid);
      if (!client) {
        logger.error(`Client not found: ${clientUuid}`);
        return false;
      }
      client.expiryTime = expiryTime;
      const updateData = {
        ...inbound,
        settings: JSON.stringify(settings)
      };
      const response = await this.request(
        `/panel/api/inbounds/${inboundId}/update`,
        {
          method: "POST",
          body: JSON.stringify(updateData)
        }
      );
      return response?.success || false;
    } catch (error) {
      logger.error("Error updating client expiry:", error);
      return false;
    }
  }
  /**
   * Enable or disable a client
   */
  async toggleClient(inboundId, clientUuid, enable) {
    const inbound = await this.getInbound(inboundId);
    if (!inbound) {
      return false;
    }
    try {
      const settings = JSON.parse(inbound.settings || "{}");
      const client = settings.clients?.find((c) => c.uuid === clientUuid);
      if (!client) {
        logger.error(`Client not found: ${clientUuid}`);
        return false;
      }
      client.enable = enable;
      const updateData = {
        ...inbound,
        settings: JSON.stringify(settings)
      };
      const response = await this.request(
        `/panel/api/inbounds/${inboundId}/update`,
        {
          method: "POST",
          body: JSON.stringify(updateData)
        }
      );
      if (response?.success) {
        logger.log(`Client ${clientUuid} ${enable ? "enabled" : "disabled"}`);
        return true;
      }
      return false;
    } catch (error) {
      logger.error("Error toggling client:", error);
      return false;
    }
  }
  /**
   * Get client traffic statistics
   */
  async getClientTraffic(inboundId, clientUuid) {
    logger.warn("getClientTraffic not yet implemented");
    return null;
  }
};

// utils/vlessGenerator.ts
function generateVlessUrl(config) {
  const {
    uuid,
    host,
    port,
    security,
    type = "tcp",
    encryption = "none",
    pb,
    fp,
    sni,
    sid,
    spx,
    remark
  } = config;
  const params = new URLSearchParams();
  params.set("type", type);
  if (encryption !== "none") {
    params.set("encryption", encryption);
  }
  params.set("security", security);
  if (pb) {
    params.set("pb", pb);
  }
  if (fp) {
    params.set("fp", fp);
  }
  if (sni) {
    params.set("sni", sni);
  }
  if (sid) {
    params.set("sid", sid);
  }
  if (spx) {
    params.set("spx", spx);
  }
  let url = `vless://${uuid}@${host}:${port}?${params.toString()}`;
  if (remark) {
    url += `#${encodeURIComponent(remark)}`;
  }
  return url;
}
function generateVlessUrlFromXui(inboundHost, inboundPort, clientUuid, clientEmail, options) {
  return generateVlessUrl({
    uuid: clientUuid,
    host: inboundHost,
    port: inboundPort,
    security: options?.security || "reality",
    type: options?.type || "tcp",
    sni: options?.sni,
    fp: options?.fp || "chrome",
    remark: clientEmail
  });
}
function parseVlessUrl(urlString) {
  try {
    if (!urlString.startsWith("vless://")) {
      logger.error("Invalid VLESS URL: must start with vless://");
      return null;
    }
    let remainder = urlString.slice(8);
    let remark;
    if (remainder.includes("#")) {
      const parts = remainder.split("#");
      remainder = parts[0];
      remark = decodeURIComponent(parts[1]);
    }
    let authority;
    let query;
    if (remainder.includes("?")) {
      const parts = remainder.split("?");
      authority = parts[0];
      query = parts[1];
    } else {
      authority = remainder;
      query = "";
    }
    const authorityMatch = authority.match(/^([^@]+)@([^:]+):(\d+)$/);
    if (!authorityMatch) {
      logger.error("Invalid VLESS authority format:", authority);
      return null;
    }
    const uuid = authorityMatch[1];
    const host = authorityMatch[2];
    const port = parseInt(authorityMatch[3], 10);
    const params = new URLSearchParams(query);
    return {
      uuid,
      host,
      port,
      type: params.get("type") || "tcp",
      encryption: params.get("encryption") || "none",
      security: params.get("security") || "none",
      pb: params.get("pb") || void 0,
      fp: params.get("fp") || void 0,
      sni: params.get("sni") || void 0,
      sid: params.get("sid") || void 0,
      spx: params.get("spx") || void 0,
      remark
    };
  } catch (error) {
    logger.error("Error parsing VLESS URL:", error);
    return null;
  }
}

// api/email/send/vpn.ts
import nodemailer from "nodemailer";
function createEmailTransporter() {
  const config = {
    host: process.env.SMTP_HOST || "",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true",
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || ""
  };
  if (!config.host || !config.user || !config.pass) {
    console.warn("Email configuration incomplete");
    return null;
  }
  return nodemailer.createTransport(config);
}
function generateVpnSetupHtml(data) {
  const { userName, productName, expiryDays, vlessUrl, vlessConfig, expiresAt } = data;
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VPN Credentials - ${productName}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">\u{1F680} Your VPN is Ready!</h1>
  </div>

  <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px;">Hi ${userName},</p>

    <p style="font-size: 16px;">Thank you for purchasing <strong>${productName}</strong>!</p>

    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <h3 style="margin-top: 0; color: #667eea;">\u{1F4CB} Your VPN Details</h3>
      <p style="margin: 8px 0;"><strong>Product:</strong> ${productName}</p>
      <p style="margin: 8px 0;"><strong>Duration:</strong> ${expiryDays} days</p>
      <p style="margin: 8px 0;"><strong>Expires:</strong> ${expiresAt ? new Date(expiresAt).toLocaleDateString() : "Never"}</p>
      <p style="margin: 8px 0;"><strong>Status:</strong> <span style="color: #28a745;">Active</span></p>
    </div>

    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <h3 style="margin-top: 0; color: #667eea;">\u{1F517} Your VLESS URL</h3>
      <p style="font-size: 12px; color: #666;">Copy and paste this URL into your VPN client:</p>
      <pre style="background: #f4f4f4; padding: 15px; border-radius: 5px; overflow-x: auto; word-break: break-all; font-size: 12px;">${vlessUrl}</pre>
      <button onclick="navigator.clipboard.writeText('${vlessUrl.replace(/'/g, "\\'")}')" style="background: #667eea; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-size: 14px;">\u{1F4CB} Copy URL</button>
    </div>

    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <h3 style="margin-top: 0; color: #667eea;">\u{1F4F1} Setup Instructions</h3>

      <h4 style="color: #333;">V2RayNG (Android)</h4>
      <ol style="padding-left: 20px;">
        <li>Open V2RayNG app</li>
        <li>Tap the + button \u2192 "Import from clipboard"</li>
        <li>Paste your VLESS URL</li>
        <li>Tap the floating action button to connect</li>
      </ol>

      <h4 style="color: #333;">V2Box (iOS)</h4>
      <ol style="padding-left: 20px;">
        <li>Open V2Box app</li>
        <li>Tap the + button</li>
        <li>Choose "Import from URL"</li>
        <li>Paste your VLESS URL</li>
        <li>Tap to connect</li>
      </ol>

      <h4 style="color: #333;">Nekoray (Windows)</h4>
      <ol style="padding-left: 20px;">
        <li>Open Nekoray</li>
        <li>Right-click the tray icon \u2192 "Import Config" \u2192 "Import from String"</li>
        <li>Paste your VLESS URL</li>
        <li>Click the connect button</li>
      </ol>
    </div>

    <div style="background: #e7f3ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
      <h4 style="margin-top: 0; color: #667eea;">\u{1F4A1} Quick Tips</h4>
      <ul style="padding-left: 20px; margin-bottom: 0;">
        <li>Make sure your device clock is correct (enable automatic time)</li>
        <li>For best performance, choose a server close to your location</li>
        <li>If connection fails, try switching between TCP and WebSocket modes</li>
        <li>Contact support if you need assistance</li>
      </ul>
    </div>

    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">

    <p style="color: #666; font-size: 14px; text-align: center;">
      Thank you for choosing our VPN service!<br>
      If you have any questions, please don't hesitate to contact us.
    </p>

    <p style="color: #999; font-size: 12px; text-align: center; margin-top: 30px;">
      This email was sent to ${data.userEmail}<br>
      \xA9 ${(/* @__PURE__ */ new Date()).getFullYear()} ChinaConnect. All rights reserved.
    </p>
  </div>
</body>
</html>
  `.trim();
}
function generateVpnEmailText(data) {
  const { userName, productName, expiryDays, vlessUrl, expiresAt } = data;
  return `
Hi ${userName},

Thank you for purchasing ${productName}!

YOUR VPN DETAILS
================
Product: ${productName}
Duration: ${expiryDays} days
Expires: ${expiresAt ? new Date(expiresAt).toLocaleDateString() : "Never"}
Status: Active

YOUR VLESS URL
==============
${vlessUrl}

SETUP INSTRUCTIONS
==================

V2RayNG (Android):
1. Open V2RayNG app
2. Tap + button \u2192 "Import from clipboard"
3. Paste your VLESS URL
4. Tap to connect

V2Box (iOS):
1. Open V2Box app
2. Tap + button
3. Choose "Import from URL"
4. Paste your VLESS URL
5. Tap to connect

Nekoray (Windows):
1. Open Nekoray
2. Right-click tray icon \u2192 "Import Config" \u2192 "Import from String"
3. Paste your VLESS URL
4. Click connect

QUICK TIPS
==========
- Ensure your device clock is correct
- Choose a server close to your location
- Contact support if you need help

Thank you for choosing our VPN service!

---
\xA9 ${(/* @__PURE__ */ new Date()).getFullYear()} ChinaConnect
  `.trim();
}
async function sendVpnCredentialsEmail(data) {
  const transporter = createEmailTransporter();
  if (!transporter) {
    console.error("Email transporter not available");
    return false;
  }
  try {
    const html = generateVpnSetupHtml(data);
    const text = generateVpnEmailText(data);
    const info = await transporter.sendMail({
      from: `"ChinaConnect" <${process.env.SMTP_USER}>`,
      to: data.userEmail,
      subject: `\u{1F680} Your ${data.productName} VPN Credentials`,
      html,
      text
    });
    console.log("VPN credentials email sent:", info.messageId);
    return true;
  } catch (error) {
    console.error("Error sending VPN email:", error);
    return false;
  }
}

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
    const { supabase: supabase2 } = await import("./services/supabaseService.js").then((m) => m).catch(() => null);
    if (!supabase2) {
      console.warn("Supabase client not available, using default products");
      return DEFAULT_PRODUCTS;
    }
    const { data, error } = await supabase2.from("products").select("*").eq("is_active", true).order("display_order", { ascending: true });
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

// services/vpnClientService.ts
var supabaseUrl = process.env.VITE_SUPABASE_URL;
var supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
var supabase = supabaseUrl && supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;
async function createVpnClient(request) {
  const { userId, email, productId, sessionId } = request;
  try {
    console.log("[VPN] createVpnClient called:", { userId, email, productId, sessionId });
    const expiryDays = getExpiryDaysForProduct(productId);
    console.log("[VPN] Product expiry days:", { productId, expiryDays });
    if (expiryDays <= 0) {
      console.error("[VPN] Invalid expiry days:", expiryDays);
      return { success: false, error: "Invalid product" };
    }
    console.log("[VPN] Checking for existing VPN client");
    const existing = await getUserVpnClient(userId, productId);
    if (existing) {
      console.log("[VPN] VPN client already exists for this product");
      return { success: false, error: "VPN client already exists for this product" };
    }
    console.log("[VPN] No existing client, proceeding with creation");
    console.log("[VPN] Calling createXuiClientWithExpiration");
    const xuiResult = await createXuiClientWithExpiration(email, expiryDays);
    if (!xuiResult) {
      console.error("[VPN] X-UI client creation returned null");
      return { success: false, error: "Failed to create X-UI client" };
    }
    console.log("[VPN] X-UI client created:", xuiResult);
    const expiresAt = null;
    const inboundHost = process.env.VPN_SERVER_HOST || "vpn.example.com";
    const inboundPort = parseInt(process.env.VPN_SERVER_PORT || "443");
    const security = process.env.VPN_SECURITY || "reality";
    const sni = process.env.VPN_SNI || "example.com";
    const vlessUrl = generateVlessUrlFromXui(
      inboundHost,
      inboundPort,
      xuiResult.uuid,
      email,
      {
        security,
        sni,
        fp: "chrome"
      }
    );
    const parsedUrl = parseVlessUrl(vlessUrl);
    const { data: vpnClient, error: dbError } = await supabase?.from("vpn_urls").insert({
      assigned_to_user_id: userId,
      url: vlessUrl,
      vless_url: vlessUrl,
      vless_uuid: xuiResult.uuid,
      vless_host: inboundHost,
      vless_port: inboundPort,
      product_id: productId,
      day_period: expiryDays,
      traffic_limit: 0,
      // Unlimited by default
      protocol: "tcp",
      encryption: "none",
      security_type: security,
      fingerprint: "chrome",
      sni,
      vless_name: email,
      status: "active",
      is_active: true,
      expires_at: expiresAt
    }).select().single();
    if (dbError || !vpnClient) {
      logger.error("Failed to save VPN client:", dbError);
      await cleanupXuiClient(xuiResult.inboundId, xuiResult.uuid);
      return { success: false, error: "Failed to save VPN client" };
    }
    const emailSent = await sendVpnCredentialsEmail({
      userEmail: email,
      userName: email.split("@")[0],
      productName: productId.replace("vpn-", "").replace("days", " Day").replace(/(\d+)/, "$1 "),
      expiryDays,
      vlessUrl,
      vlessConfig: {
        uuid: xuiResult.uuid,
        host: inboundHost,
        port: inboundPort,
        security: process.env.VPN_SECURITY || "reality"
      },
      expiresAt: expiresAt.toISOString()
    });
    if (!emailSent) {
      logger.warn(`Failed to send VPN email to ${email}`);
    }
    logger.log(`VPN client created: ${vpnClient.id}`);
    return { success: true, client: vpnClient };
  } catch (error) {
    logger.error("Error creating VPN client:", error);
    return { success: false, error: "Internal server error" };
  }
}
async function createXuiClientWithExpiration(email, expiryDays) {
  try {
    console.log("[VPN] Starting X-UI client creation for email:", email);
    const xui = await createDefaultXuiClient();
    if (!xui) {
      console.error("[VPN] Failed to create X-UI client instance");
      logger.error("Failed to create X-UI API client");
      return null;
    }
    console.log("[VPN] X-UI client instance created successfully");
    console.log("[VPN] Fetching inbounds from X-UI");
    const inbounds = await xui.getInbounds();
    console.log("[VPN] Inbounds fetched:", inbounds.length, "inbound(s) available");
    if (inbounds.length === 0) {
      console.error("[VPN] No inbounds available in X-UI");
      logger.error("No inbounds available");
      return null;
    }
    const inbound = inbounds[0];
    console.log("[VPN] Using inbound:", { id: inbound.id, port: inbound.port, protocol: inbound.protocol });
    console.log("[VPN] Creating client with expiry:", expiryDays, "days");
    const created = await xui.createClient(inbound.id, email, expiryDays, 1);
    console.log("[VPN] Client creation response:", created);
    if (!created) {
      console.error("[VPN] Client creation returned null/false");
      logger.error("Failed to create X-UI client");
      return null;
    }
    console.log("[VPN] X-UI client created successfully:", { uuid: created.uuid, inboundId: inbound.id });
    return { uuid: created.uuid, inboundId: inbound.id };
  } catch (error) {
    console.error("[VPN] Error creating X-UI client:", error);
    logger.error("Error creating X-UI client:", error);
    return null;
  }
}
async function createDefaultXuiClient() {
  const baseUrl = process.env.XUI_BASE_URL;
  const username = process.env.XUI_USERNAME;
  const password = process.env.XUI_PASSWORD;
  if (!baseUrl || !username || !password) {
    logger.warn("X-UI not configured");
    return null;
  }
  const client = new XuiApiClient({
    baseUrl: baseUrl.replace(/\/$/, ""),
    username,
    password
  });
  const loggedIn = await client.login();
  if (!loggedIn) {
    logger.error("X-UI login failed");
    return null;
  }
  return client;
}
async function cleanupXuiClient(inboundId, clientUuid) {
  try {
    const xui = await createDefaultXuiClient();
    if (xui) {
      await xui.deleteClient(inboundId, clientUuid);
    }
  } catch (error) {
    logger.error("Cleanup error:", error);
  }
}
async function getUserVpnClient(userId, productId) {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from("vpn_urls").select("*").eq("assigned_to_user_id", userId).eq("product_id", productId).eq("is_active", true).maybeSingle();
    if (error) return null;
    return data;
  } catch {
    return null;
  }
}
async function getUserVpnClients(userId) {
  if (!supabase) return [];
  try {
    const { data } = await supabase.from("vpn_urls").select("*").eq("assigned_to_user_id", userId).eq("is_active", true).not("vless_uuid", "is", null).order("created_at", { ascending: false });
    return data || [];
  } catch {
    return [];
  }
}
async function getUserVpnClientsFromTable(userId) {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase.from("vpn_urls").select("*").eq("assigned_to_user_id", userId).eq("is_active", true).not("vless_uuid", "is", null).order("created_at", { ascending: false });
    if (error) {
      logger.error("Error getting user VPN clients:", error);
      return [];
    }
    return data || [];
  } catch (error) {
    logger.error("Error getting user VPN clients:", error);
    return [];
  }
}
async function revokeVpnClient(clientId) {
  try {
    const { data: client } = await supabase?.from("vpn_urls").select("*").eq("id", clientId).maybeSingle();
    if (!client) return { success: false };
    try {
      const xui = await createDefaultXuiClient();
      if (xui && client.xui_inbound_id && client.vless_uuid) {
        await xui.deleteClient(client.xui_inbound_id, client.vless_uuid);
      }
    } catch {
      logger.warn("Failed to delete X-UI client");
    }
    await supabase?.from("vpn_urls").update({ is_active: false, status: "revoked" }).eq("id", clientId);
    return { success: true };
  } catch {
    return { success: false };
  }
}
export {
  createVpnClient,
  getUserVpnClient,
  getUserVpnClients,
  getUserVpnClientsFromTable,
  revokeVpnClient
};
