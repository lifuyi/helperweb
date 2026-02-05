/**
 * X-UI API Client Service
 * Handles communication with X-UI panel to create and manage VPN clients
 */

import { logger } from '../utils/logger';

/**
 * X-UI Configuration
 */
export interface XuiConfig {
  baseUrl: string;
  username: string;
  password: string;
}

/**
 * X-UI Client (user) interface
 */
export interface XuiClient {
  id: number;
  enable: boolean;
  email: string;
  uuid: string;
  limitIp: number;
  totalGB: number;
  expiryTime: number; // Unix timestamp, 0 = never expires
  subId: string;
}

/**
 * X-UI Inbound interface
 */
export interface XuiInbound {
  id: number;
  port: number;
  protocol: string;
  network: string;
  security: string;
  settings: string; // JSON string containing client configurations
  listen: string;
  tag: string;
}

/**
 * Response from X-UI API
 */
export interface XuiResponse<T = any> {
  success: boolean;
  msg: string;
  obj?: T;
}

/**
 * Create a new X-UI API client
 */
export class XuiApiClient {
  private config: XuiConfig;
  private cookie: string | null = null;

  constructor(config: XuiConfig) {
    this.config = config;
  }

  /**
   * Login to X-UI panel and get session cookie
   */
  async login(): Promise<boolean> {
    try {
      console.log('[X-UI] Attempting login to:', `${this.config.baseUrl}/login`);
      
      const response = await fetch(`${this.config.baseUrl}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json, text/plain, */*',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: new URLSearchParams({
          username: this.config.username,
          password: this.config.password,
        }),
      });

      console.log('[X-UI] Login response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'No error body');
        logger.error('X-UI login failed:', response.statusText);
        console.error('[X-UI] Login error body:', errorText);
        return false;
      }

      // Extract cookie from response headers
      const setCookie = response.headers.get('set-cookie');
      console.log('[X-UI] Set-Cookie header:', setCookie ? 'Present' : 'Missing');
      
      if (setCookie) {
        // Extract session cookie (usually the first part before semicolon)
        this.cookie = setCookie.split(';')[0];
        console.log('[X-UI] Cookie extracted:', this.cookie.substring(0, 20) + '...');
        logger.log('X-UI login successful');
        return true;
      }

      const responseText = await response.text();
      console.log('[X-UI] Login response body preview:', responseText.substring(0, 200));
      
      logger.error('No cookie in X-UI login response');
      return false;
    } catch (error) {
      logger.error('X-UI login error:', error);
      console.error('[X-UI] Login exception:', error);
      return false;
    }
  }

  /**
   * Make authenticated request to X-UI API
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T | null> {
    if (!this.cookie) {
      const loggedIn = await this.login();
      if (!loggedIn) {
        logger.error('Not authenticated to X-UI');
        console.error('[X-UI] Login failed, cannot make request');
        return null;
      }
    }

    try {
      const url = `${this.config.baseUrl}${endpoint}`;
      console.log('[X-UI] Making request to:', url);
      
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Cookie': this.cookie!,
          ...options.headers,
        },
      });

      console.log('[X-UI] Response status:', response.status, response.statusText);

      if (response.status === 401 || response.status === 403) {
        // Session expired, try to re-login
        console.log('[X-UI] Session expired, re-logging in...');
        this.cookie = null;
        const loggedIn = await this.login();
        if (!loggedIn) {
          return null;
        }
        // Retry the request
        return this.request(endpoint, options);
      }

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`X-UI API error: ${response.status} ${response.statusText}`);
        console.error('[X-UI] Error response body:', errorText);
        return null;
      }

      const data = await response.json();
      console.log('[X-UI] Response data:', data);
      return data;
    } catch (error) {
      logger.error(`X-UI API request failed:`, error);
      console.error('[X-UI] Request error:', error);
      return null;
    }
  }

  /**
   * Get list of inbounds (protocols/ports)
   */
  async getInbounds(): Promise<XuiInbound[]> {
    const response = await this.request<XuiResponse<XuiInbound[]>>('/panel/api/inbounds/list');
    return response?.obj || [];
  }

  /**
   * Get a specific inbound by ID
   */
  async getInbound(id: number): Promise<XuiInbound | null> {
    const response = await this.request<XuiResponse<XuiInbound>>(
      `/panel/api/inbounds/${id}`
    );
    return response?.obj || null;
  }

  /**
   * Get clients for a specific inbound
   */
  async getInboundClients(inboundId: number): Promise<XuiClient[]> {
    const inbound = await this.getInbound(inboundId);
    if (!inbound) {
      return [];
    }

    // Parse clients from settings
    try {
      const settings = JSON.parse(inbound.settings || '{}');
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
  async createClient(
    inboundId: number,
    email: string,
    expiryDays: number = 30,
    limitIp: number = 1
  ): Promise<XuiClient | null> {
    // Generate a unique UUID for the client
    const uuid = crypto.randomUUID();

    // Calculate expiry timestamp
    const expiryTime = expiryDays > 0
      ? Math.floor(Date.now() / 1000) + (expiryDays * 24 * 60 * 60)
      : 0; // 0 means no expiry

    const clientData = {
      id: inboundId,
      settings: JSON.stringify({
        clients: [
          {
            id: uuid,
            email: email,
            limitIp: limitIp,
            totalGB: 0,
            expiryTime: expiryTime,
            enable: true,
            tgId: '',
            subId: '',
          },
        ],
      }),
    };

    console.log('[X-UI] Creating client with data:', JSON.stringify(clientData, null, 2));
    console.log('[X-UI] Endpoint:', `${this.config.baseUrl}/panel/api/inbounds/addClient`);

    const response = await this.request<XuiResponse<XuiClient>>(
      '/panel/api/inbounds/addClient',
      {
        method: 'POST',
        body: JSON.stringify(clientData),
      }
    );

    console.log('[X-UI] Create client response:', response);

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
        subId: '',
      };
    }

    logger.error(`Failed to create X-UI client: ${response?.msg || 'Unknown error'}`);
    console.error('[X-UI] Full response:', response);
    return null;
  }

  /**
   * Delete a client from an inbound
   */
  async deleteClient(inboundId: number, clientUuid: string): Promise<boolean> {
    const response = await this.request<XuiResponse<any>>(
      `/panel/api/inbounds/${inboundId}/delClient/${clientUuid}`,
      { method: 'POST' }
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
  async updateClientExpiry(
    inboundId: number,
    clientUuid: string,
    expiryDays: number
  ): Promise<boolean> {
    const expiryTime = expiryDays > 0
      ? Math.floor(Date.now() / 1000) + (expiryDays * 24 * 60 * 60)
      : 0;

    // First, get current inbound settings
    const inbound = await this.getInbound(inboundId);
    if (!inbound) {
      return false;
    }

    try {
      const settings = JSON.parse(inbound.settings || '{}');
      const client = settings.clients?.find((c: XuiClient) => c.uuid === clientUuid);

      if (!client) {
        logger.error(`Client not found: ${clientUuid}`);
        return false;
      }

      // Update client expiry
      client.expiryTime = expiryTime;

      // Update inbound with modified settings
      const updateData = {
        ...inbound,
        settings: JSON.stringify(settings),
      };

      const response = await this.request<XuiResponse<any>>(
        `/panel/api/inbounds/${inboundId}/update`,
        {
          method: 'POST',
          body: JSON.stringify(updateData),
        }
      );

      return response?.success || false;
    } catch (error) {
      logger.error('Error updating client expiry:', error);
      return false;
    }
  }

  /**
   * Enable or disable a client
   */
  async toggleClient(
    inboundId: number,
    clientUuid: string,
    enable: boolean
  ): Promise<boolean> {
    const inbound = await this.getInbound(inboundId);
    if (!inbound) {
      return false;
    }

    try {
      const settings = JSON.parse(inbound.settings || '{}');
      const client = settings.clients?.find((c: XuiClient) => c.uuid === clientUuid);

      if (!client) {
        logger.error(`Client not found: ${clientUuid}`);
        return false;
      }

      // Update client enable status
      client.enable = enable;

      // Update inbound with modified settings
      const updateData = {
        ...inbound,
        settings: JSON.stringify(settings),
      };

      const response = await this.request<XuiResponse<any>>(
        `/panel/api/inbounds/${inboundId}/update`,
        {
          method: 'POST',
          body: JSON.stringify(updateData),
        }
      );

      if (response?.success) {
        logger.log(`Client ${clientUuid} ${enable ? 'enabled' : 'disabled'}`);
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Error toggling client:', error);
      return false;
    }
  }

  /**
   * Get client traffic statistics
   */
  async getClientTraffic(
    inboundId: number,
    clientUuid: string
  ): Promise<{ uploaded: number; downloaded: number } | null> {
    // This requires additional X-UI endpoint which may not be available in all versions
    logger.warn('getClientTraffic not yet implemented');
    return null;
  }
}

/**
 * Create a default X-UI client instance from environment variables
 */
export function createDefaultXuiClient(): XuiApiClient | null {
  const baseUrl = process.env.XUI_BASE_URL;
  const username = process.env.XUI_USERNAME;
  const password = process.env.XUI_PASSWORD;

  if (!baseUrl || !username || !password) {
    logger.warn('X-UI environment variables not configured');
    return null;
  }

  return new XuiApiClient({
    baseUrl: baseUrl.replace(/\/$/, ''), // Remove trailing slash
    username,
    password,
  });
}
