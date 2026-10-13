/** Lightweight UA parsing — no extra dependency. */

export type ParsedUserAgent = {
  browser: string | null;
  os: string | null;
  deviceType: "Desktop" | "Mobile" | "Tablet" | "Bot" | "Unknown";
};

export function parseUserAgent(uaRaw: string | null | undefined): ParsedUserAgent {
  const ua = String(uaRaw || "").trim();
  if (!ua || ua === "unknown") {
    return { browser: null, os: null, deviceType: "Unknown" };
  }

  let os: string | null = null;
  if (/Windows NT 10/i.test(ua)) os = "Windows 10+";
  else if (/Windows NT 6\.3/i.test(ua)) os = "Windows 8.1";
  else if (/Windows/i.test(ua)) os = "Windows";
  else if (/Mac OS X ([\d_]+)/i.test(ua)) {
    const m = ua.match(/Mac OS X ([\d_]+)/i);
    os = m ? `macOS ${m[1].replace(/_/g, ".")}` : "macOS";
  } else if (/Android ([\d.]+)/i.test(ua)) {
    const m = ua.match(/Android ([\d.]+)/i);
    os = m ? `Android ${m[1]}` : "Android";
  } else if (/iPhone|iPad|iPod/i.test(ua)) os = "iOS";
  else if (/Linux/i.test(ua)) os = "Linux";
  else if (/CrOS/i.test(ua)) os = "Chrome OS";

  let browser: string | null = null;
  if (/Edg\/([\d.]+)/i.test(ua)) {
    const m = ua.match(/Edg\/([\d.]+)/i);
    browser = m ? `Edge ${m[1]}` : "Edge";
  } else if (/Chrome\/([\d.]+)/i.test(ua) && !/Edg\//i.test(ua)) {
    const m = ua.match(/Chrome\/([\d.]+)/i);
    browser = m ? `Chrome ${m[1]}` : "Chrome";
  } else if (/Firefox\/([\d.]+)/i.test(ua)) {
    const m = ua.match(/Firefox\/([\d.]+)/i);
    browser = m ? `Firefox ${m[1]}` : "Firefox";
  } else if (/Version\/([\d.]+).*Safari/i.test(ua) || (/Safari\/([\d.]+)/i.test(ua) && !/Chrome/i.test(ua))) {
    const m = ua.match(/Version\/([\d.]+)/i);
    browser = m ? `Safari ${m[1]}` : "Safari";
  } else if (/MSIE |Trident\//i.test(ua)) browser = "IE";

  let deviceType: ParsedUserAgent["deviceType"] = "Desktop";
  if (/bot|crawl|spider|slurp|facebookexternalhit/i.test(ua)) deviceType = "Bot";
  else if (/iPad|Tablet|PlayBook/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua))) {
    deviceType = "Tablet";
  } else if (/Mobile|iPhone|Android.*Mobile|webOS|BlackBerry/i.test(ua)) {
    deviceType = "Mobile";
  }

  return { browser, os, deviceType };
}

export function clientIpFromReq(req: any): string | null {
  if (!req) return null;
  const xf = req.headers?.["x-forwarded-for"];
  if (typeof xf === "string" && xf.trim()) return xf.split(",")[0]!.trim();
  if (Array.isArray(xf) && xf[0]) return String(xf[0]).split(",")[0]!.trim();
  if (req.ip) return String(req.ip);
  if (req.socket?.remoteAddress) return String(req.socket.remoteAddress);
  return null;
}

/** Optional geo from reverse-proxy headers (Cloudflare / custom). No MaxMind in-app. */
export function geoFromReq(req: any): { country: string | null; city: string | null } {
  if (!req?.headers) return { country: null, city: null };
  const h = req.headers;
  const country =
    (h["cf-ipcountry"] as string) ||
    (h["x-geo-country"] as string) ||
    (h["x-country-code"] as string) ||
    null;
  const city = (h["x-geo-city"] as string) || (h["x-city"] as string) || null;
  return {
    country: country && country !== "XX" ? String(country) : null,
    city: city ? String(city) : null,
  };
}
