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
function isValidVlessUrl(url) {
  const parsed = parseVlessUrl(url);
  return parsed !== null;
}
export {
  generateVlessUrl,
  generateVlessUrlFromXui,
  isValidVlessUrl,
  parseVlessUrl
};
