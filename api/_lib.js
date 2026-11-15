// Utilitaires partagés : base de données, sessions, réponses, validation.
import { Redis } from "@upstash/redis";
import crypto from "node:crypto";

/* ---------------- Base de données ---------------- */
const RURL = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const RTOK = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const IS_PROD = process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production";
let redis = null;

// Stockage mémoire pour le développement local uniquement (jamais en production).
function memStore() {
  const g = globalThis;
  if (!g.__adzMem) g.__adzMem = { kv: new Map(), sets: new Map(), lists: new Map(), ttl: new Map() };
  const m = g.__adzMem;
  const clone = (v) => (v === undefined || v === null ? null : JSON.parse(JSON.stringify(v)));
  const alive = (k) => { const t = m.ttl.get(k); if (t && t < Date.now()) { m.kv.delete(k); m.ttl.delete(k); return false; } return true; };
  return {
    async get(k) { return alive(k) ? clone(m.kv.get(k)) : null; },
    async set(k, v) { m.kv.set(k, clone(v)); return "OK"; },
    async del(k) { m.kv.delete(k); m.sets.delete(k); m.lists.delete(k); return 1; },
    async mget(...keys) { return keys.flat().map((k) => (alive(k) ? clone(m.kv.get(k)) : null)); },
    async sadd(k, ...v) { const s = m.sets.get(k) || new Set(); v.flat().forEach((x) => s.add(x)); m.sets.set(k, s); return 1; },
    async srem(k, ...v) { const s = m.sets.get(k); if (s) v.flat().forEach((x) => s.delete(x)); return 1; },
    async smembers(k) { return [...(m.sets.get(k) || [])]; },
    async incr(k) { const v = (alive(k) ? Number(m.kv.get(k)) || 0 : 0) + 1; m.kv.set(k, v); return v; },
    async expire(k, s) { m.ttl.set(k, Date.now() + s * 1000); return 1; },
    async lpush(k, ...v) { const l = m.lists.get(k) || []; v.flat().forEach((x) => l.unshift(clone(x))); m.lists.set(k, l); return l.length; },
    async ltrim(k, a, b) { const l = m.lists.get(k) || []; m.lists.set(k, l.slice(a, b + 1)); return "OK"; },
    async lrange(k, a, b) { const l = m.lists.get(k) || []; return clone(l.slice(a, b === -1 ? undefined : b + 1)); },
  };
}

export function db() {
  if (RURL && RTOK) return (redis ||= new Redis({ url: RURL, token: RTOK }));
  if (IS_PROD) throw new HttpError(500, "Base de données non configurée : connectez « Upstash for Redis » au projet Vercel.");
  return memStore();
}

/* ---------------- Erreurs et réponses ---------------- */
export class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }

export function handler(methods, fn) {
  return async (req, res) => {
    try {
      if (!methods.includes(req.method)) throw new HttpError(405, "Méthode non autorisée.");
      if (req.method !== "GET" && req.headers["x-requested-with"] !== "adz") throw new HttpError(403, "Requête refusée.");
      const out = await fn(req, res);
      if (!res.headersSent) send(res, 200, out ?? { ok: true });
    } catch (e) {
      const status = e instanceof HttpError ? e.status : 500;
      if (status === 500) console.error(e);
      send(res, status, { error: e instanceof HttpError ? e.message : "Erreur interne. Réessayez plus tard." });
    }
  };
}
export function send(res, status, obj) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(obj));
}
export function body(req) {
  let b = req.body;
  if (typeof b === "string") { try { b = JSON.parse(b); } catch { b = null; } }
  if (!b || typeof b !== "object" || Array.isArray(b)) throw new HttpError(400, "Requête invalide.");
  return b;
}

/* ---------------- Sessions (cookie signé HMAC) ---------------- */
const COOKIE = "adz_s";
const SESSION_H = 8;
function secret() {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 32) return s;
  if (IS_PROD) throw new HttpError(500, "SESSION_SECRET manquant ou trop court (32 caractères minimum).");
  return "dev-only-secret-do-not-use-in-production-0000";
}
const b64 = (s) => Buffer.from(s).toString("base64url");
const mac = (s) => crypto.createHmac("sha256", secret()).update(s).digest("base64url");

export function setSession(req, res, username) {
  const payload = b64(JSON.stringify({ u: username, exp: Date.now() + SESSION_H * 3600e3 }));
  const secure = (req.headers["x-forwarded-proto"] || "").includes("https") || IS_PROD ? "; Secure" : "";
  res.setHeader("Set-Cookie", `${COOKIE}=${payload}.${mac(payload)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${SESSION_H * 3600}${secure}`);
}
export function clearSession(res) {
  res.setHeader("Set-Cookie", `${COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`);
}
function readSession(req) {
  const raw = (req.headers.cookie || "").split(/;\s*/).find((c) => c.startsWith(COOKIE + "="));
  if (!raw) return null;
  const [payload, sig] = raw.slice(COOKIE.length + 1).split(".");
  if (!payload || !sig) return null;
  const a = Buffer.from(sig), b = Buffer.from(mac(payload));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try { const p = JSON.parse(Buffer.from(payload, "base64url").toString()); return p.exp > Date.now() ? p : null; } catch { return null; }
}

/* ---------------- Comptes ---------------- */
export const USERNAME_RE = /^[a-z0-9._-]{3,32}$/;
export const adminList = () => (process.env.ADMIN_USERNAMES || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
export const roleOf = (u) => (u.role === "admin" || adminList().includes(u.username) ? "admin" : "pharmacien");
export const publicUser = (u) => ({ username: u.username, name: u.name, phone: u.phone, role: roleOf(u), status: u.status, createdAt: u.createdAt, lastLogin: u.lastLogin || null });

export async function currentUser(req, { admin = false } = {}) {
  const s = readSession(req);
  if (!s) throw new HttpError(401, "Session expirée. Reconnectez-vous.");
  const u = await db().get("user:" + s.u);
  if (!u || u.status !== "active") throw new HttpError(401, "Compte inactif. Contactez la coordination.");
  if (admin && roleOf(u) !== "admin") throw new HttpError(403, "Accès réservé à la coordination.");
  return u;
}
export function checkPassword(p) {
  if (typeof p !== "string" || p.length < 8 || p.length > 128) throw new HttpError(400, "Le mot de passe doit contenir entre 8 et 128 caractères.");
  if (!/[A-Za-z]/.test(p) || !/[0-9]/.test(p)) throw new HttpError(400, "Le mot de passe doit contenir au moins une lettre et un chiffre.");
}
export function clientIp(req) { return String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "local"; }
export async function rateLimit(key, max, windowSec) {
  const r = db(); const k = "rl:" + key; const n = await r.incr(k);
  if (n === 1) await r.expire(k, windowSec);
  if (n > max) throw new HttpError(429, "Trop de tentatives. Réessayez dans quelques minutes.");
}
export function safeEqual(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}
export const str = (v, max = 200) => String(v ?? "").trim().slice(0, max);
