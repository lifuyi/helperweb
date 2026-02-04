import { logger } from './logger';

/**
 * Parsed VLESS URL configuration
 */
export interface VlessConfig {
  uuid: string;
  host: string;
  port: number;
  protocol: string;
  encryption: string;
  security: string;
  pbk?: string;
  fp?: string;
  sni?: string;
  sid?: string;
  spx?: string;
  name?: string;
  rawUrl: string;
}

/**
 * Parse VLESS URL format
 * Format: vless://uuid@host:port?type=tcp&encryption=none&security=reality&pbk=xxx&fp=chrome&sni=xxx&sid=xxx&spx=%2F#name
 */
export function parseVlessUrl(urlString: string): VlessConfig | null {
  try {
    // Trim the URL
    urlString = urlString.trim();

    // Validate VLESS scheme
    if (!urlString.startsWith('vless://')) {
      logger.error('Invalid VLESS URL: does not start with vless://');
      return null;
    }

    // Remove the scheme
    let urlWithoutScheme = urlString.slice(8);

    // Extract name from fragment (after #)
    let name = '';
    if (urlWithoutScheme.includes('#')) {
      const parts = urlWithoutScheme.split('#');
      urlWithoutScheme = parts[0];
      name = parts[1] || '';
    }

    // Split the authority and query
    let authority = '';
    let query = '';
    if (urlWithoutScheme.includes('?')) {
      const parts = urlWithoutScheme.split('?');
      authority = parts[0];
      query = parts[1];
    } else {
      authority = urlWithoutScheme;
    }

    // Parse authority: uuid@host:port
    const authorityMatch = authority.match(/^([^@]+)@([^:]+):(\d+)$/);
    if (!authorityMatch) {
      logger.error('Invalid VLESS URL authority format:', authority);
      return null;
    }

    const uuid = authorityMatch[1];
    const host = authorityMatch[2];
    const port = parseInt(authorityMatch[3], 10);

    // Parse query parameters
    const params = new URLSearchParams(query);
    const config: VlessConfig = {
      uuid,
      host,
      port,
      protocol: params.get('type') || 'tcp',
      encryption: params.get('encryption') || 'none',
      security: params.get('security') || 'none',
      pbk: params.get('pbk') || undefined,
      fp: params.get('fp') || undefined,
      sni: params.get('sni') || undefined,
      sid: params.get('sid') || undefined,
      spx: params.get('spx') || undefined,
      name: name || undefined,
      rawUrl: urlString,
    };

    return config;
  } catch (error) {
    logger.error('Error parsing VLESS URL:', error);
    return null;
  }
}

/**
 * Parse multiple VLESS URLs from text
 */
export function parseVlessUrls(text: string): VlessConfig[] {
  const urls = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && line.startsWith('vless://'));

  const configs: VlessConfig[] = [];
  for (const url of urls) {
    const config = parseVlessUrl(url);
    if (config) {
      configs.push(config);
    }
  }

  return configs;
}

/**
 * Validate VLESS configuration
 */
export function validateVlessConfig(config: VlessConfig): string | null {
  // Validate UUID format (should be UUID v4)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(config.uuid)) {
    return `Invalid UUID format: ${config.uuid}`;
  }

  // Validate host
  if (!config.host) {
    return 'Host is required';
  }

  // Validate port
  if (config.port < 1 || config.port > 65535) {
    return `Invalid port: ${config.port}`;
  }

  // Validate protocol
  if (!['tcp', 'udp'].includes(config.protocol)) {
    return `Invalid protocol: ${config.protocol}`;
  }

  // Validate security
  if (!['none', 'tls', 'reality'].includes(config.security)) {
    return `Invalid security: ${config.security}`;
  }

  return null;
}
