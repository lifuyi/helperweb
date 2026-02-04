/**
 * Generate VLESS URL from X-UI client configuration
 */

import { logger } from './logger';

/**
 * VLESS URL Configuration
 */
export interface VlessUrlConfig {
  uuid: string;
  host: string;
  port: number;
  security: string;
  type?: string;
  encryption?: string;
  pb?: string;
  fp?: string;
  sni?: string;
  sid?: string;
  spx?: string;
  remark?: string;
}

/**
 * Generate VLESS URL from configuration
 */
export function generateVlessUrl(config: VlessUrlConfig): string {
  const {
    uuid,
    host,
    port,
    security,
    type = 'tcp',
    encryption = 'none',
    pb,
    fp,
    sni,
    sid,
    spx,
    remark
  } = config;

  // Build query parameters
  const params = new URLSearchParams();

  params.set('type', type);

  if (encryption !== 'none') {
    params.set('encryption', encryption);
  }

  params.set('security', security);

  if (pb) {
    params.set('pb', pb);
  }

  if (fp) {
    params.set('fp', fp);
  }

  if (sni) {
    params.set('sni', sni);
  }

  if (sid) {
    params.set('sid', sid);
  }

  if (spx) {
    params.set('spx', spx);
  }

  // Build the URL
  let url = `vless://${uuid}@${host}:${port}?${params.toString()}`;

  if (remark) {
    url += `#${encodeURIComponent(remark)}`;
  }

  return url;
}

/**
 * Generate VLESS URL from X-UI inbound and client info
 */
export function generateVlessUrlFromXui(
  inboundHost: string,
  inboundPort: number,
  clientUuid: string,
  clientEmail: string,
  options?: {
    security?: string;
    type?: string;
    sni?: string;
    fp?: string;
  }
): string {
  return generateVlessUrl({
    uuid: clientUuid,
    host: inboundHost,
    port: inboundPort,
    security: options?.security || 'reality',
    type: options?.type || 'tcp',
    sni: options?.sni,
    fp: options?.fp || 'chrome',
    remark: clientEmail
  });
}

/**
 * Parse VLESS URL back to configuration (for validation)
 */
export function parseVlessUrl(urlString: string): VlessUrlConfig | null {
  try {
    if (!urlString.startsWith('vless://')) {
      logger.error('Invalid VLESS URL: must start with vless://');
      return null;
    }

    // Remove protocol
    let remainder = urlString.slice(8);

    // Extract fragment (remark)
    let remark: string | undefined;
    if (remainder.includes('#')) {
      const parts = remainder.split('#');
      remainder = parts[0];
      remark = decodeURIComponent(parts[1]);
    }

    // Split authority and query
    let authority: string;
    let query: string;
    if (remainder.includes('?')) {
      const parts = remainder.split('?');
      authority = parts[0];
      query = parts[1];
    } else {
      authority = remainder;
      query = '';
    }

    // Parse authority: uuid@host:port
    const authorityMatch = authority.match(/^([^@]+)@([^:]+):(\d+)$/);
    if (!authorityMatch) {
      logger.error('Invalid VLESS authority format:', authority);
      return null;
    }

    const uuid = authorityMatch[1];
    const host = authorityMatch[2];
    const port = parseInt(authorityMatch[3], 10);

    // Parse query parameters
    const params = new URLSearchParams(query);

    return {
      uuid,
      host,
      port,
      type: params.get('type') || 'tcp',
      encryption: params.get('encryption') || 'none',
      security: params.get('security') || 'none',
      pb: params.get('pb') || undefined,
      fp: params.get('fp') || undefined,
      sni: params.get('sni') || undefined,
      sid: params.get('sid') || undefined,
      spx: params.get('spx') || undefined,
      remark
    };
  } catch (error) {
    logger.error('Error parsing VLESS URL:', error);
    return null;
  }
}

/**
 * Validate VLESS URL format
 */
export function isValidVlessUrl(url: string): boolean {
  const parsed = parseVlessUrl(url);
  return parsed !== null;
}
