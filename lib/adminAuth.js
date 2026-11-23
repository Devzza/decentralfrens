import crypto from "crypto";

const TOKEN_TTL_MS = 1000 * 60 * 60 * 8; // 8 hours

function sign(secret, payload) {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

export function createAdminToken(secret) {
  const expiry = String(Date.now() + TOKEN_TTL_MS);
  return `${Buffer.from(expiry).toString("base64url")}.${sign(secret, expiry)}`;
}

export function verifyAdminToken(secret, token) {
  if (!token || typeof token !== "string") return false;
  const [encoded, mac] = token.split(".");
  if (!encoded || !mac) return false;
  let expiry;
  try {
    expiry = Buffer.from(encoded, "base64url").toString("utf8");
  } catch {
    return false;
  }
  const expected = sign(secret, expiry);
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  if (!crypto.timingSafeEqual(a, b)) return false;
  return Number(expiry) > Date.now();
}

/** Returns true if the request carries a valid admin bearer token. */
export function isAuthorized(req) {
  const secret = process.env.ADMIN_PASSWORD;
  if (!secret) return false;
  const header = req.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  return verifyAdminToken(secret, token);
}
