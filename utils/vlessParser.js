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

// utils/vlessParser.ts
function parseVlessUrl(urlString) {
  try {
    urlString = urlString.trim();
    if (!urlString.startsWith("vless://")) {
      logger.error("Invalid VLESS URL: does not start with vless://");
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
      logger.error("Invalid VLESS URL authority format:", authority);
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
    logger.error("Error parsing VLESS URL:", error);
    return null;
  }
}
function parseVlessUrls(text) {
  const urls = text.split("\n").map((line) => line.trim()).filter((line) => line && line.startsWith("vless://"));
  const configs = [];
  for (const url of urls) {
    const config = parseVlessUrl(url);
    if (config) {
      configs.push(config);
    }
  }
  return configs;
}
function validateVlessConfig(config) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(config.uuid)) {
    return `Invalid UUID format: ${config.uuid}`;
  }
  if (!config.host) {
    return "Host is required";
  }
  if (config.port < 1 || config.port > 65535) {
    return `Invalid port: ${config.port}`;
  }
  if (!["tcp", "udp"].includes(config.protocol)) {
    return `Invalid protocol: ${config.protocol}`;
  }
  if (!["none", "tls", "reality"].includes(config.security)) {
    return `Invalid security: ${config.security}`;
  }
  return null;
}
export {
  parseVlessUrl,
  parseVlessUrls,
  validateVlessConfig
};
