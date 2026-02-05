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
    const expiryTime = expiryDays > 0 ? Date.now() + expiryDays * 24 * 60 * 60 * 1e3 : 0;
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
    const expiryTime = expiryDays > 0 ? Date.now() + expiryDays * 24 * 60 * 60 * 1e3 : 0;
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
