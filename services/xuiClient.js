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
      console.log("[X-UI] Attempting login to:", `${this.config.baseUrl}/login`);
      const response = await fetch(`${this.config.baseUrl}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Accept": "application/json, text/plain, */*",
          "X-Requested-With": "XMLHttpRequest"
        },
        body: new URLSearchParams({
          username: this.config.username,
          password: this.config.password
        })
      });
      console.log("[X-UI] Login response status:", response.status, response.statusText);
      if (!response.ok) {
        const errorText = await response.text().catch(() => "No error body");
        logger.error("X-UI login failed:", response.statusText);
        console.error("[X-UI] Login error body:", errorText);
        return false;
      }
      const setCookie = response.headers.get("set-cookie");
      console.log("[X-UI] Set-Cookie header:", setCookie ? "Present" : "Missing");
      if (setCookie) {
        this.cookie = setCookie.split(";")[0];
        console.log("[X-UI] Cookie extracted:", this.cookie.substring(0, 20) + "...");
        logger.log("X-UI login successful");
        return true;
      }
      const responseText = await response.text();
      console.log("[X-UI] Login response body preview:", responseText.substring(0, 200));
      logger.error("No cookie in X-UI login response");
      return false;
    } catch (error) {
      logger.error("X-UI login error:", error);
      console.error("[X-UI] Login exception:", error);
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
        console.error("[X-UI] Login failed, cannot make request");
        return null;
      }
    }
    try {
      const url = `${this.config.baseUrl}${endpoint}`;
      console.log("[X-UI] Making request to:", url);
      const response = await fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          "Cookie": this.cookie,
          ...options.headers
        }
      });
      console.log("[X-UI] Response status:", response.status, response.statusText);
      if (response.status === 401 || response.status === 403) {
        console.log("[X-UI] Session expired, re-logging in...");
        this.cookie = null;
        const loggedIn = await this.login();
        if (!loggedIn) {
          return null;
        }
        return this.request(endpoint, options);
      }
      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`X-UI API error: ${response.status} ${response.statusText}`);
        console.error("[X-UI] Error response body:", errorText);
        return null;
      }
      const data = await response.json();
      console.log("[X-UI] Response data:", data);
      return data;
    } catch (error) {
      logger.error(`X-UI API request failed:`, error);
      console.error("[X-UI] Request error:", error);
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
   * Get a specific client by UUID from an inbound
   * @param inboundId - The inbound ID
   * @param clientUuid - The client UUID to find
   */
  async getClientByUuid(inboundId, clientUuid) {
    const clients = await this.getInboundClients(inboundId);
    const client = clients.find((c) => String(c.id) === clientUuid);
    if (client) {
      return {
        id: inboundId,
        enable: client.enable,
        email: client.email,
        uuid: String(client.id),
        limitIp: client.limitIp,
        totalGB: client.totalGB,
        expiryTime: client.expiryTime,
        subId: client.subId,
      };
    }
    return null;
  }
  /**
   * Find an existing client by email
   * @param email - Client email to search for
   */
  async findClientByEmail(email) {
    const inbounds = await this.getInbounds();
    for (const inbound of inbounds) {
      const clients = this.getClientsFromInbound(inbound);
      const existingClient = clients.find((c) => c.email === email);
      if (existingClient) {
        console.log("[X-UI] Found existing client by email:", {
          email,
          uuid: existingClient.id,
          inboundId: inbound.id
        });
        return {
          id: inbound.id,
          enable: existingClient.enable,
          email: existingClient.email,
          uuid: existingClient.id,
          limitIp: existingClient.limitIp,
          totalGB: existingClient.totalGB,
          expiryTime: existingClient.expiryTime,
          subId: existingClient.subId
        };
      }
    }
    return null;
  }
  /**
   * Create a new client for an inbound
   * @param inboundId - The inbound (port) ID to add client to
   * @param email - Client identifier (usually user's email)
   * @param expiryDays - Days until expiration (0 = never expires)
   * @param limitIp - Number of concurrent connections (0 = unlimited)
   */
  async createClient(inboundId, email, expiryDays = 30, limitIp = 1, trafficLimitGB = 50) {
    const uuid = crypto.randomUUID();
    const subId = crypto.randomUUID().replace(/-/g, "").substring(0, 16);
    // Use negative expiryTime to trigger expiration countdown AFTER first use
    // -86400000 = 1 day after first use, -2592000000 = 30 days after first use
    // This allows users to buy first, then start using abroad - expiry starts on first connection
    const expiryTime = expiryDays > 0 ? -(expiryDays * 24 * 60 * 60 * 1000) : 0;
    console.log("[X-UI] DEBUG: expiryDays =", expiryDays);
    console.log("[X-UI] DEBUG: expiryTime (should be negative) =", expiryTime);
    console.log("[X-UI] DEBUG: trafficLimitGB =", trafficLimitGB);
    const trafficLimitBytes = trafficLimitGB * 1024 * 1024 * 1024;
    const settingsData = {
      clients: [{
        id: uuid,
        flow: "",
        email,
        limitIp,
        totalGB: trafficLimitBytes,
        expiryTime,
        enable: true,
        tgId: "",
        subId,
        comment: "",
        reset: 0
      }]
    };
    const formData = new URLSearchParams();
    formData.append("id", inboundId.toString());
    formData.append("settings", JSON.stringify(settingsData));
    console.log("[X-UI] Creating client with form data:", {
      id: inboundId,
      settings: JSON.stringify(settingsData, null, 2)
    });
    console.log("[X-UI] Expiry (negative = starts on first use):", expiryTime, "ms");
    const response = await this.request(
      "/panel/api/inbounds/addClient",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: formData.toString()
      }
    );
    console.log("[X-UI] Create client response:", response);
    if (response?.success) {
      logger.log(`X-UI client created: ${email}`);
      return {
        id: inboundId,
        enable: true,
        email,
        uuid,
        limitIp,
        totalGB: 100,
        expiryTime,
        subId
      };
    }
    logger.error(`Failed to create X-UI client: ${response?.msg || "Unknown error"}`);
    console.error("[X-UI] Full response:", response);
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
function createDefaultXuiClient() {
  const baseUrl = process.env.XUI_BASE_URL;
  const username = process.env.XUI_USERNAME;
  const password = process.env.XUI_PASSWORD;
  if (!baseUrl || !username || !password) {
    logger.warn("X-UI environment variables not configured");
    return null;
  }
  return new XuiApiClient({
    baseUrl: baseUrl.replace(/\/$/, ""),
    // Remove trailing slash
    username,
    password
  });
}
export {
  XuiApiClient,
  createDefaultXuiClient
};
