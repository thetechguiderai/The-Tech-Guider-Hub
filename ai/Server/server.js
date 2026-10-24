// server.js
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { tmpdir } from "os";
import { nanoid } from "nanoid";
import crypto from "crypto";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import morgan from "morgan";
import { z } from "zod";
import { generateSecret, generateURI, verifySync } from "otplib";
import QRCode from "qrcode";
import nodemailer from "nodemailer";
import multer from "multer";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from "./database.mjs";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 3000;
const sessionSecret = process.env.SESSION_SECRET;
const productionSessionMissing = !sessionSecret && (process.env.NODE_ENV === "production" || process.env.VERCEL);
const SECRET = sessionSecret || "dev-secret-change-me";

// Mounted under /ai inside The Guider Hub. Override with TG_AI_BASE_PATH when
// running standalone (set it to an empty value) or under a different prefix.
const AI_BASE = (process.env.TG_AI_BASE_PATH || "/ai").replace(/\/+$/, "");

const isServerlessRuntime = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

// Vercel/Lambda deploys the application bundle on a read-only filesystem.
// The data layer is provided by ./database.mjs: a managed libSQL/Turso database
// when TURSO_DATABASE_URL is configured, otherwise a local node:sqlite file
// (/tmp on serverless). Both expose the same synchronous API used below.

// ---------- DATABASE ----------
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'user',
  plan TEXT DEFAULT 'free',
  credits INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS usage_log (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  model TEXT,
  day TEXT,
  count INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS ai_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  model TEXT,
  status TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT DEFAULT 'New Chat',
  model TEXT DEFAULT 'guider-astron',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  plan TEXT,
  amount INTEGER,
  status TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS announcements (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS announcement_reads (
  announcement_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  read_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (announcement_id, user_id)
);
CREATE TABLE IF NOT EXISTS owner_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS owner_model_settings (model_id TEXT PRIMARY KEY, enabled INTEGER NOT NULL DEFAULT 1, tier TEXT, daily_limit INTEGER);
CREATE TABLE IF NOT EXISTS owner_plan_settings (plan_id TEXT PRIMARY KEY, monthly INTEGER, yearly INTEGER, enabled INTEGER NOT NULL DEFAULT 1, daily_limit INTEGER, features TEXT);
CREATE TABLE IF NOT EXISTS owner_audit_log (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, action TEXT NOT NULL, target TEXT, detail TEXT, created_at TEXT DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS owner_assistant_messages (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, role TEXT NOT NULL, content TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS wallet_transactions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, amount INTEGER NOT NULL, balance_after INTEGER NOT NULL, type TEXT NOT NULL, reason TEXT NOT NULL, payment_id TEXT, created_at TEXT DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS promo_codes (id TEXT PRIMARY KEY, code TEXT UNIQUE NOT NULL, discount_type TEXT NOT NULL, discount_value INTEGER NOT NULL, plan_id TEXT, expires_at TEXT, max_uses INTEGER, per_user_limit INTEGER NOT NULL DEFAULT 1, active INTEGER NOT NULL DEFAULT 1, created_at TEXT DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS promo_redemptions (id TEXT PRIMARY KEY, promo_id TEXT NOT NULL, user_id TEXT NOT NULL, payment_id TEXT, created_at TEXT DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS payment_methods (id TEXT PRIMARY KEY, name TEXT NOT NULL, instructions TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1, proof_required INTEGER NOT NULL DEFAULT 1, created_at TEXT DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS roles (id TEXT PRIMARY KEY, name TEXT UNIQUE NOT NULL, permissions TEXT NOT NULL DEFAULT '[]', system INTEGER NOT NULL DEFAULT 0, created_at TEXT DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS payment_proofs (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, filename TEXT, mimetype TEXT, size INTEGER, data TEXT, created_at TEXT DEFAULT (datetime('now')));
`);
// Non-destructive migration for accounts created through Google OAuth.
for (const statement of [
  "ALTER TABLE users ADD COLUMN oauth_provider TEXT",
  "ALTER TABLE users ADD COLUMN oauth_subject TEXT",
  "ALTER TABLE users ADD COLUMN two_factor_secret TEXT",
  "ALTER TABLE users ADD COLUMN two_factor_enabled INTEGER DEFAULT 0",
  "ALTER TABLE users ADD COLUMN trial_started_at TEXT",
  "ALTER TABLE users ADD COLUMN trial_expires_at TEXT",
  "ALTER TABLE users ADD COLUMN trial_claimed INTEGER DEFAULT 0",
  "ALTER TABLE users ADD COLUMN disabled INTEGER DEFAULT 0",
  "ALTER TABLE conversations ADD COLUMN share_id TEXT",
  "ALTER TABLE payments ADD COLUMN original_amount INTEGER",
  "ALTER TABLE payments ADD COLUMN discount_amount INTEGER DEFAULT 0",
  "ALTER TABLE payments ADD COLUMN final_amount INTEGER",
  "ALTER TABLE payments ADD COLUMN payment_method_id TEXT",
  "ALTER TABLE payments ADD COLUMN transaction_id TEXT",
  "ALTER TABLE payments ADD COLUMN proof_reference TEXT",
  "ALTER TABLE payments ADD COLUMN admin_note TEXT",
  "ALTER TABLE payments ADD COLUMN billing_interval TEXT",
  "ALTER TABLE payments ADD COLUMN promo_id TEXT",
  "ALTER TABLE payments ADD COLUMN reviewed_at TEXT",
  "ALTER TABLE payments ADD COLUMN reviewed_by TEXT",
  "ALTER TABLE announcements ADD COLUMN type TEXT NOT NULL DEFAULT 'info'",
  "ALTER TABLE announcements ADD COLUMN active INTEGER NOT NULL DEFAULT 1",
  "ALTER TABLE announcements ADD COLUMN starts_at TEXT",
  "ALTER TABLE announcements ADD COLUMN ends_at TEXT",
]) {
  try { db.exec(statement); } catch { /* Column already exists. */ }
}
try { db.exec("CREATE UNIQUE INDEX IF NOT EXISTS users_oauth_identity ON users(oauth_provider, oauth_subject)"); } catch { /* Existing data can be repaired by an admin. */ }

// ---------- MODELS (The Tech Guider Hub Helper AI) ----------
// Single flagship model. tier "guest" now means "open to everyone" — signed-in
// users and guests share the same helper, limits are enforced per usage key.
const VALID_OPENROUTER_FREE_MODEL = "recursive/flint-v1.0:free";
const MODELS = {
  "guider-astron": { name: "Guider Astron", tier: "guest", provider: "openrouter", model: VALID_OPENROUTER_FREE_MODEL, dailyLimit: 30, desc: "The Tech Guider Hub Helper AI — chat, Hub navigation, content ideas aur support. Sab ke liye free." },
};

// ---------- PLANS (info only — the helper is free; checkout stays closed) ----------
const plan = (id, name, monthly, yearly, unlocks, desc) => ({ id, name, monthly, yearly, unlocks, desc });
const PLANS = [
  plan("free", "Free", 0, 0, ["guider-astron"], "Guider Astron — the Hub Helper AI, free for everyone."),
];
for (const [id, model] of Object.entries(MODELS)) {
  db.prepare("INSERT OR IGNORE INTO owner_model_settings (model_id, enabled, tier, daily_limit) VALUES (?, 1, ?, ?)").run(id, model.tier, model.dailyLimit);
}
for (const item of PLANS) {
  db.prepare("INSERT OR IGNORE INTO owner_plan_settings (plan_id, monthly, yearly, enabled, features) VALUES (?, ?, ?, 1, ?)")
    .run(item.id, item.monthly, item.yearly, JSON.stringify(item.unlocks));
}
db.prepare("INSERT OR IGNORE INTO owner_settings (key, value) VALUES ('maintenance', '0')").run();
db.prepare("INSERT OR IGNORE INTO owner_settings (key, value) VALUES ('maintenance_message', 'We are performing scheduled maintenance. Please check back shortly.')").run();
db.prepare("INSERT OR IGNORE INTO owner_settings (key, value) VALUES ('maintenance_starts_at', '')").run();
db.prepare("INSERT OR IGNORE INTO owner_settings (key, value) VALUES ('maintenance_ends_at', '')").run();
for (const role of ["owner", "admin", "moderator", "support"]) db.prepare("INSERT OR IGNORE INTO roles (id,name,permissions,system) VALUES (?,?,?,1)").run(role, role[0].toUpperCase() + role.slice(1), role === "owner" ? JSON.stringify(["*"]) : "[]");
for (const method of [
  ["jazzcash", "JazzCash", "Send payment to Rubina Imran, 03224936337 (Personal). Enter your transaction/reference ID below.", 1, 1],
  ["bank_transfer", "Bank Transfer", "Use the bank-transfer instructions supplied by the owner, then enter your transaction/reference ID.", 1, 1],
  ["card", "Card Payment", "Card payments are reviewed manually. Never enter card number, CVV, PIN, password, or OTP here.", 1, 0],
]) db.prepare("INSERT OR IGNORE INTO payment_methods (id,name,instructions,active,proof_required) VALUES (?,?,?,?,?)").run(...method);

function modelConfig(id) {
  const base = MODELS[id];
  if (!base) return null;
  const setting = db.prepare("SELECT * FROM owner_model_settings WHERE model_id = ?").get(id);
  return { ...base, enabled: setting ? Boolean(setting.enabled) : true, tier: setting?.tier || base.tier, dailyLimit: setting?.daily_limit ?? base.dailyLimit };
}
function planConfig(id) {
  const base = PLANS.find((item) => item.id === id);
  if (!base) return null;
  const setting = db.prepare("SELECT * FROM owner_plan_settings WHERE plan_id = ?").get(id);
  return { ...base, monthly: setting?.monthly ?? base.monthly, yearly: setting?.yearly ?? base.yearly, enabled: setting ? Boolean(setting.enabled) : true, dailyLimit: setting?.daily_limit ?? null, features: setting?.features ? JSON.parse(setting.features) : base.unlocks };
}
function planUnlocksModel(planId, modelId) {
  const plan = planConfig(planId);
  return Boolean(plan?.enabled && plan.features.includes(modelId));
}

// ---------- APP SETUP ----------
const app = express();
app.set("trust proxy", 1);

// Security headers. Content-Security-Policy is disabled because the frontend
// pages rely on inline scripts, inline styles, and inline event handlers.
// Re-enable a nonce-based policy after moving those inline usages to files.
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

// Attach a short request id to every API request so a failure the client sees
// can be traced to the exact server log line. The id carries no secrets.
app.use("/api", (req, res, next) => {
  req.id = String(req.headers["x-request-id"] || nanoid(8));
  res.setHeader("X-Request-Id", req.id);
  next();
});

// Log API traffic only; static asset requests are skipped to keep logs readable.
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev", {
  skip: (req) => !req.path.startsWith("/api"),
}));

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "2mb" }));
app.use((error, req, res, next) => {
  if (req.path?.startsWith("/api/") && error?.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Request body must be valid JSON." });
  }
  next(error);
});
app.use(cookieParser());

// ---------- RATE LIMITING ----------
// Default in-memory store: per serverless instance on Vercel. Swap in a shared
// store (for example Upstash Redis) if a limit must hold across all instances.
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 600,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many requests. Please slow down and try again shortly." },
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many authentication attempts. Please try again later." },
});
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many AI requests. Please wait a moment and try again." },
});
app.use("/api", apiLimiter);
app.use(["/api/auth/login", "/api/auth/signup"], authLimiter);
app.use(["/api/chat", "/api/image/generate", "/api/owner/assistant"], chatLimiter);

app.use("/api", (req, res, next) => {
  if (productionSessionMissing) return res.status(503).json({ error: "Authentication is temporarily unavailable because SESSION_SECRET is not configured on the server." });
  next();
});
const publicDir = path.join(__dirname, "..", "Public");
app.get(["/owner", "/owner.html"], requireOwner, (req, res) => res.sendFile(path.join(publicDir, "owner-dashboard.html")));
app.use(express.static(publicDir));

// ---------- OWNER AUTO-SETUP ----------
(async function ensureOwner() {
  const email = (process.env.OWNER_EMAIL || "").toLowerCase().trim();
  const password = process.env.OWNER_PASSWORD;
  if (!email || !password) return;
  const existing = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  if (existing) {
    if (existing.role !== "owner") db.prepare("UPDATE users SET role = 'owner' WHERE id = ?").run(existing.id);
    return;
  }
  const hash = await bcrypt.hash(password, 10);
  db.prepare("INSERT INTO users (id, email, password_hash, name, role, plan) VALUES (?, ?, ?, 'Owner', 'owner', 'gpt')")
    .run(nanoid(), email, hash);
  console.log(`[boot] Owner account created: ${email}`);
})();

// ---------- AUTH HELPERS ----------
function signToken(user) { return jwt.sign({ sub: user.id }, SECRET, { expiresIn: "30d" }); }
function isSecureRequest(req) { return req.secure || req.get("x-forwarded-proto") === "https"; }
function setSession(res, req, user) {
  res.cookie("tg_session", signToken(user), { httpOnly: true, sameSite: "lax", secure: isSecureRequest(req), maxAge: 30 * 24 * 60 * 60 * 1000 });
}
function getUser(req) {
  const token = req.cookies?.tg_session;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, SECRET);
    return db.prepare("SELECT * FROM users WHERE id = ?").get(payload.sub);
  } catch { return null; }
}
function publicUser(u) {
  return { id: u.id, email: u.email, name: u.name, role: u.role, plan: u.plan, credits: u.credits,
    trialExpiresAt: u.trial_expires_at || null,
    guiderGptTrialActive: hasGuiderGptTrial(u) };
}
function hasGuiderGptTrial(user) {
  return Boolean(user?.trial_expires_at && new Date(user.trial_expires_at).getTime() > Date.now());
}
function canUseModel(user, modelId) {
  const model = modelConfig(modelId);
  if (!model?.enabled) return false;
  if (!user) return false;
  return user.role === "owner" || planUnlocksModel(user.plan, modelId);
}
function isConfiguredOwner(user) {
  const email = (process.env.OWNER_EMAIL || "").toLowerCase().trim();
  return Boolean(email && user?.role === "owner" && user.email.toLowerCase() === email);
}
function maintenanceEnabled() { return db.prepare("SELECT value FROM owner_settings WHERE key = 'maintenance'").get()?.value === "1"; }
function setting(key, fallback = "") { return db.prepare("SELECT value FROM owner_settings WHERE key = ?").get(key)?.value ?? fallback; }
function maintenanceConfig() {
  return { enabled: maintenanceEnabled(), message: setting("maintenance_message"), startsAt: setting("maintenance_starts_at"), endsAt: setting("maintenance_ends_at") };
}
function audit(ownerId, action, target = null, detail = null) {
  db.prepare("INSERT INTO owner_audit_log (id, owner_id, action, target, detail) VALUES (?, ?, ?, ?, ?)").run(nanoid(), ownerId, action, target, detail ? JSON.stringify(detail) : null);
}
function creditWallet(userId, amount, type, reason, paymentId = null) {
  if (!Number.isInteger(amount) || !amount) throw new Error("Wallet adjustment must be a non-zero integer.");
  const user = db.prepare("SELECT credits FROM users WHERE id=?").get(userId);
  if (!user) throw new Error("User not found.");
  const balance = Math.max(0, (user.credits || 0) + amount);
  const applied = balance - (user.credits || 0);
  db.prepare("UPDATE users SET credits=? WHERE id=?").run(balance, userId);
  db.prepare("INSERT INTO wallet_transactions (id,user_id,amount,balance_after,type,reason,payment_id) VALUES (?,?,?,?,?,?,?)").run(nanoid(), userId, applied, balance, type, String(reason).slice(0, 300), paymentId);
  return balance;
}
function paymentQuote(user, planId, interval, promoCode) {
  const selected = planConfig(planId);
  if (!selected || planId === "free" || !selected.enabled) throw new Error("This plan is unavailable.");
  if (!["monthly", "yearly"].includes(interval)) throw new Error("Choose monthly or yearly billing.");
  const original = interval === "yearly" ? selected.yearly : selected.monthly;
  let promo = null, discount = 0;
  if (promoCode?.trim()) {
    promo = db.prepare("SELECT * FROM promo_codes WHERE upper(code)=upper(?)").get(promoCode.trim());
    if (!promo || !promo.active || (promo.expires_at && new Date(promo.expires_at) <= new Date()) || (promo.plan_id && promo.plan_id !== planId)) throw new Error("Promo code is invalid or unavailable.");
    const used = db.prepare("SELECT COUNT(*) AS c FROM promo_redemptions WHERE promo_id=?").get(promo.id).c;
    const userUsed = db.prepare("SELECT COUNT(*) AS c FROM promo_redemptions WHERE promo_id=? AND user_id=?").get(promo.id, user.id).c;
    if ((promo.max_uses != null && used >= promo.max_uses) || userUsed >= promo.per_user_limit) throw new Error("Promo code usage limit reached.");
    discount = promo.discount_type === "percent" ? Math.floor(original * promo.discount_value / 100) : promo.discount_value;
    discount = Math.min(original, Math.max(0, discount));
  }
  return { plan: selected, originalAmount: original, discountAmount: discount, finalAmount: original - discount, promo };
}
function requireAuth(req, res, next) {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: "Sign in required." });
  if (user.disabled) return res.status(403).json({ error: "This account has been disabled." });
  req.user = user;
  next();
}
function requireOwner(req, res, next) {
  const user = getUser(req);
  if (!isConfiguredOwner(user)) return res.status(403).json({ error: "Owner access only." });
  req.user = user;
  next();
}

// ---------- EMAIL (optional) ----------
// Email is sent only when SMTP_* variables are configured; otherwise every
// call is a safe no-op so the platform keeps working without a mail server.
const mailer = (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE || "").toLowerCase() === "true",
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  : null;
async function sendMail({ to, subject, text }) {
  if (!mailer || !to) return { skipped: true };
  try {
    await mailer.sendMail({ from: process.env.SMTP_FROM || process.env.SMTP_USER, to, subject, text });
    return { sent: true };
  } catch (error) {
    console.error("Email send failed:", error.message);
    return { sent: false };
  }
}

// ---------- REQUEST VALIDATION (zod) ----------
function validate(schema, value) {
  const result = schema.safeParse(value ?? {});
  if (result.success) return { data: result.data };
  const issue = result.error.issues[0];
  const field = issue?.path?.length ? `${issue.path.join(".")}: ` : "";
  return { error: `${field}${issue?.message || "Invalid request."}` };
}
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const signupSchema = z.object({
  name: z.string().trim().max(120).optional(),
  email: z.string().trim().toLowerCase().regex(EMAIL_PATTERN, "A valid email address is required."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});
const loginSchema = z.object({
  email: z.string().trim().toLowerCase().regex(EMAIL_PATTERN, "A valid email address is required."),
  password: z.string().min(1, "Password is required."),
  token: z.string().trim().regex(/^\d{6}$/, "Two-factor code must be 6 digits.").optional(),
});
const chatSchema = z.object({
  message: z.string().trim().min(1, "Message is required.").max(100000),
  modelId: z.string().trim().max(60).optional(),
  conversationId: z.string().trim().max(60).optional(),
  mode: z.enum(["hub-help"]).optional(),
});

// System prompt for on-site help. The helper widget uses this so answers stay
// grounded in what the Hub actually contains instead of inventing pages.
const HUB_HELP_SYSTEM = [
  "You are The Tech Guider Hub Helper AI's on-site hub-help assistant inside The Tech Guider Hub website.",
  "Help users understand and navigate the Hub: pages, features, tools, the Hub Helper AI, plans and payments.",
  "Answer in the same language the user used (English, Urdu or Roman Urdu). Keep replies short and practical.",
  "When a page is relevant, give its exact path as a clickable markdown link using the site domain aware paths shown below.",
  "If something is not part of the Hub, do not invent it; write a short honest reply and steer back to the Hub.",
  "",
  "Hub map (paths are real):",
  "- Home: / (channel highlights, AI assistant section)",
  "- Videos: /videos (all YouTube tutorials, category browsing)",
  "- Gaming: /minecraft (Minecraft Hub), /free-fire-sensitivity (Free Fire sensitivity generator), /videos (gaming tutorials)",
  "- TikTok page with official embeds: /tiktok",
  "- Tools: /tools (all tools), Free Fire generator, Tech Guider AI workspace",
  "- Services: /video-editing-packages (video editing), /logo-packages (logo design), /website-packages (website development), /games-packages (games)",
  "- Resources: /resources (downloadable resources with search)",
  "- Hub Helper AI workspace: /ai, chat history at /ai/chat/<id>, plans & usage at /ai/plans",
  "- Community: /about, /team",
  "- Free search: press / (slash) anywhere to open the Hub search modal.",
  "",
  "AI inside the Hub: The Tech Guider Hub Helper AI (model: Guider Astron) — free for everyone at /ai and in the",
  "floating help widget; daily limit 30 chats/day, shown with usage at /ai/plans.",
  "Payments: manual review — user sends money (e.g. JazzCash / bank transfer), enters the transaction reference at checkout,",
  "and the owner approves it in the owner dashboard; the plan unlocks after approval.",
  "The owner panel lives at /owner (10-digit access code).",
  "Never ask for passwords, card numbers or OTPs. Point users to the official YouTube channel for video content.",
].join("\n");
const imageSchema = z.object({
  prompt: z.string().trim().min(1, "Prompt is required.").max(4000),
});
const quoteSchema = z.object({
  planId: z.string().trim().min(1, "Choose a plan."),
  interval: z.enum(["monthly", "yearly"], { message: "Choose monthly or yearly billing." }),
  promoCode: z.string().trim().max(32).optional(),
});
const checkoutSchema = quoteSchema.extend({
  paymentMethodId: z.string().trim().min(1, "Choose an available payment method."),
  transactionId: z.string().trim().min(1, "A transaction/reference ID is required.").max(120),
  proofReference: z.string().trim().max(1000).optional(),
});

// ---------- AUTH ROUTES ----------
app.post("/api/auth/signup", async (req, res) => {
  const parsed = validate(signupSchema, req.body);
  if (parsed.error) return res.status(400).json({ error: parsed.error });
  const { email, password, name } = parsed.data;
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (existing) return res.status(409).json({ error: "Account already exists." });

  const hash = await bcrypt.hash(password, 10);
  const id = nanoid();
  db.prepare("INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)")
    .run(id, email, hash, name || null);

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
  setSession(res, req, user);
  res.status(201).json({ user: publicUser(user) });
});

app.post("/api/auth/login", async (req, res) => {
  const parsed = validate(loginSchema, req.body);
  if (parsed.error) return res.status(400).json({ error: parsed.error });
  const { email, password, token } = parsed.data;
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  if (!user) return res.status(401).json({ error: "Invalid email or password." });
  if (user.disabled) return res.status(403).json({ error: "This account has been disabled." });
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: "Invalid email or password." });
  if (user.two_factor_enabled) {
    let valid = false;
    try { valid = Boolean(token) && verifySync({ secret: user.two_factor_secret, token, epochTolerance: 30 }).valid; } catch { valid = false; }
    if (!valid) {
      return res.status(401).json({
        error: token ? "Invalid two-factor authentication code." : "Enter your two-factor authentication code.",
        requires2FA: true,
      });
    }
  }
  setSession(res, req, user);
  res.json({ user: publicUser(user) });
});

// ---------- TWO-FACTOR AUTHENTICATION (TOTP) ----------
app.get("/api/auth/2fa/status", requireAuth, (req, res) => {
  res.json({ enabled: Boolean(req.user.two_factor_enabled) });
});

app.post("/api/auth/2fa/setup", requireAuth, async (req, res) => {
  try {
    const secret = generateSecret();
    db.prepare("UPDATE users SET two_factor_secret = ?, two_factor_enabled = 0 WHERE id = ?").run(secret, req.user.id);
    const otpauth = generateURI({ issuer: "The Tech Guider AI", label: req.user.email, secret });
    const qrDataUrl = await QRCode.toDataURL(otpauth);
    res.json({ secret, otpauth, qrDataUrl });
  } catch (error) {
    console.error("2FA setup failed:", error.message);
    res.status(500).json({ error: "Could not start two-factor setup." });
  }
});

app.post("/api/auth/2fa/enable", requireAuth, (req, res) => {
  if (!req.user.two_factor_secret) return res.status(400).json({ error: "Start two-factor setup first." });
  const token = String(req.body?.token || "");
  let valid = false;
  try { valid = verifySync({ secret: req.user.two_factor_secret, token, epochTolerance: 30 }).valid; } catch { valid = false; }
  if (!valid) return res.status(400).json({ error: "That code is not valid. Enter the current 6-digit code." });
  db.prepare("UPDATE users SET two_factor_enabled = 1 WHERE id = ?").run(req.user.id);
  res.json({ enabled: true });
});

app.post("/api/auth/2fa/disable", requireAuth, (req, res) => {
  if (!req.user.two_factor_enabled) return res.status(400).json({ error: "Two-factor authentication is not enabled." });
  const token = String(req.body?.token || "");
  let valid = false;
  try { valid = verifySync({ secret: req.user.two_factor_secret, token, epochTolerance: 30 }).valid; } catch { valid = false; }
  if (!valid) return res.status(400).json({ error: "Enter a valid code to disable two-factor authentication." });
  db.prepare("UPDATE users SET two_factor_enabled = 0, two_factor_secret = NULL WHERE id = ?").run(req.user.id);
  res.json({ enabled: false });
});

app.post("/api/auth/logout", (req, res) => { res.clearCookie("tg_session"); res.json({ ok: true }); });

app.get("/api/auth/me", (req, res) => {
  const user = getUser(req);
  res.json({ user: user ? publicUser(user) : null });
});


app.patch("/api/auth/me", requireAuth, (req, res) => {
  const { name } = req.body || {};
  if (name) db.prepare("UPDATE users SET name = ? WHERE id = ?").run(name, req.user.id);
  const updated = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);
  res.json({ user: publicUser(updated) });
});

// ---------- MODELS / PLANS ----------
app.get("/api/models", (req, res) => {
  const user = getUser(req);
  const list = Object.entries(MODELS).map(([id]) => {
    const m = modelConfig(id);
    let locked = false;
    if (!m.enabled) locked = true;
    if (m.tier === "paid") locked = !canUseModel(user, id);
    return { id, name: m.name, tier: m.tier, desc: m.desc, locked, enabled: m.enabled, dailyLimit: m.dailyLimit };
  });
  res.json({ models: list });
});

app.get("/api/plans", (req, res) => res.json({ plans: PLANS.map((item) => planConfig(item.id)) }));

app.get("/api/usage", requireAuth, (req, res) => {
  const day = new Date().toISOString().slice(0, 10);
  const used = db.prepare("SELECT model, count FROM usage_log WHERE user_id = ? AND day = ?").all(req.user.id, day);
  const models = used.map(row => { const model = modelConfig(row.model); const limit = model?.dailyLimit || 0; return { modelId: row.model, name: model?.name || row.model, used: row.count, limit, remaining: Math.max(0, limit - row.count) }; });
  res.json({ day, models, total: models.reduce((sum, item) => sum + item.used, 0) });
});

app.get("/api/announcements", requireAuth, (req, res) => {
  const rows = db.prepare(`SELECT a.*, CASE WHEN r.user_id IS NULL THEN 0 ELSE 1 END AS read
    FROM announcements a LEFT JOIN announcement_reads r ON r.announcement_id = a.id AND r.user_id = ?
    WHERE a.active=1 AND (a.starts_at IS NULL OR a.starts_at='' OR a.starts_at <= datetime('now'))
      AND (a.ends_at IS NULL OR a.ends_at='' OR a.ends_at >= datetime('now'))
    ORDER BY a.created_at DESC LIMIT 30`).all(req.user.id);
  res.json({ announcements: rows });
});
app.post("/api/announcements", requireOwner, (req, res) => {
  const { title, body, type = "info", active = true, startsAt = null, endsAt = null } = req.body || {};
  if (!title?.trim() || !body?.trim()) return res.status(400).json({ error: "Title and message are required." });
  if (!['info', 'success', 'warning', 'important'].includes(type)) return res.status(400).json({ error: "Invalid announcement type." });
  const id = nanoid();
  db.prepare("INSERT INTO announcements (id, title, body, type, active, starts_at, ends_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .run(id, title.trim().slice(0, 120), body.trim().slice(0, 2000), type, Number(Boolean(active)), startsAt || null, endsAt || null);
  audit(req.user.id, "announcement.created", id, { title: title.trim().slice(0, 120) });
  res.status(201).json({ announcement: db.prepare("SELECT * FROM announcements WHERE id = ?").get(id) });
});
app.post("/api/announcements/:id/read", requireAuth, (req, res) => {
  db.prepare("INSERT OR IGNORE INTO announcement_reads (announcement_id, user_id) VALUES (?, ?)").run(req.params.id, req.user.id);
  res.json({ ok: true });
});

// ---------- WALLET / PAYMENT HISTORY (honest — no fake balances) ----------
app.get("/api/wallet", requireAuth, (req, res) => {
  res.json({ credits: req.user.credits || 0, plan: req.user.plan, transactions: db.prepare("SELECT * FROM wallet_transactions WHERE user_id=? ORDER BY created_at DESC LIMIT 100").all(req.user.id) });
});

app.get("/api/payments", requireAuth, (req, res) => {
  const rows = db.prepare("SELECT * FROM payments WHERE user_id = ? ORDER BY created_at DESC").all(req.user.id);
  res.json({ payments: rows });
});

// ---------- BILLING / MANUAL PAYMENT REVIEW ----------
app.get("/api/billing/methods", requireAuth, (req, res) => res.json({ methods: db.prepare("SELECT id,name,instructions,proof_required FROM payment_methods WHERE active=1 ORDER BY name").all() }));
app.post("/api/billing/quote", requireAuth, (req, res) => {
  const parsed = validate(quoteSchema, req.body);
  if (parsed.error) return res.status(400).json({ error: parsed.error });
  try { const q = paymentQuote(req.user, parsed.data.planId, parsed.data.interval, parsed.data.promoCode); res.json({ plan: { id:q.plan.id, name:q.plan.name }, originalAmount:q.originalAmount, discountAmount:q.discountAmount, finalAmount:q.finalAmount, promoCode:q.promo?.code || null }); }
  catch (error) { res.status(400).json({ error: error.message }); }
});
app.post("/api/billing/checkout", requireAuth, (req, res) => {
  const parsed = validate(checkoutSchema, req.body);
  if (parsed.error) return res.status(400).json({ error: parsed.error });
  try {
    const { planId, interval, promoCode, paymentMethodId, transactionId, proofReference } = parsed.data;
    const method = db.prepare("SELECT * FROM payment_methods WHERE id=? AND active=1").get(paymentMethodId);
    if (!method) throw new Error("Choose an available payment method.");
    if (method.proof_required && !proofReference?.trim()) throw new Error("Payment proof reference is required for this method.");
    const q = paymentQuote(req.user, planId, interval, promoCode), id = nanoid();
    db.prepare("INSERT INTO payments (id,user_id,plan,amount,status,original_amount,discount_amount,final_amount,payment_method_id,transaction_id,proof_reference,billing_interval,promo_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)").run(id, req.user.id, planId, q.finalAmount, "pending", q.originalAmount, q.discountAmount, q.finalAmount, method.id, transactionId.trim(), String(proofReference || "").trim().slice(0, 1000), interval, q.promo?.id || null);
    if (q.promo) db.prepare("INSERT INTO promo_redemptions (id,promo_id,user_id,payment_id) VALUES (?,?,?,?)").run(nanoid(), q.promo.id, req.user.id, id);
    res.status(201).json({ payment: db.prepare("SELECT * FROM payments WHERE id=?").get(id) });
  } catch (error) { res.status(400).json({ error: error.message }); }
});

// ---------- PAYMENT PROOF UPLOAD (multer) ----------
// Uploads are held in memory, validated, then stored with the payment record so
// the owner can review proof without external object storage. Keep files small;
// on serverless runtimes the database itself must be a persistent store.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => cb(null, ["image/png", "image/jpeg", "image/webp", "application/pdf"].includes(file.mimetype)),
});
app.post("/api/billing/proof", requireAuth, (req, res) => {
  upload.single("file")(req, res, (error) => {
    if (error) return res.status(400).json({ error: error.code === "LIMIT_FILE_SIZE" ? "Proof file must be 2 MB or smaller." : "Upload a PNG, JPEG, WEBP, or PDF proof file." });
    if (!req.file) return res.status(400).json({ error: "Attach a PNG, JPEG, WEBP, or PDF proof file (max 2 MB)." });
    const id = nanoid();
    db.prepare("INSERT INTO payment_proofs (id,user_id,filename,mimetype,size,data) VALUES (?,?,?,?,?,?)")
      .run(id, req.user.id, String(req.file.originalname || "").slice(0, 200), req.file.mimetype, req.file.size, req.file.buffer.toString("base64"));
    res.status(201).json({ proofReference: id, filename: req.file.originalname, mimetype: req.file.mimetype, size: req.file.size });
  });
});

// ---------- CONVERSATIONS (chat history) ----------
app.get("/api/conversations", requireAuth, (req, res) => {
  const rows = db.prepare("SELECT id, title, model, updated_at FROM conversations WHERE user_id = ? ORDER BY updated_at DESC").all(req.user.id);
  res.json({ conversations: rows });
});

app.get("/api/conversations/:id", requireAuth, (req, res) => {
  const conv = db.prepare("SELECT * FROM conversations WHERE id = ? AND user_id = ?").get(req.params.id, req.user.id);
  if (!conv) return res.status(404).json({ error: "Not found." });
  const messages = db.prepare("SELECT role, content, created_at FROM messages WHERE conversation_id = ? ORDER BY created_at ASC").all(conv.id);
  res.json({ conversation: conv, messages });
});

app.delete("/api/conversations/:id", requireAuth, (req, res) => {
  const conv = db.prepare("SELECT * FROM conversations WHERE id = ? AND user_id = ?").get(req.params.id, req.user.id);
  if (!conv) return res.status(404).json({ error: "Not found." });
  db.prepare("DELETE FROM messages WHERE conversation_id = ?").run(conv.id);
  db.prepare("DELETE FROM conversations WHERE id = ?").run(conv.id);
  res.json({ ok: true });
});

app.patch("/api/conversations/:id", requireAuth, (req, res) => {
  const { title } = req.body || {};
  db.prepare("UPDATE conversations SET title = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?")
    .run(title, req.params.id, req.user.id);
  res.json({ ok: true });
});
app.post("/api/conversations/:id/share", requireAuth, (req, res) => {
  const conversation = db.prepare("SELECT * FROM conversations WHERE id = ? AND user_id = ?").get(req.params.id, req.user.id);
  if (!conversation) return res.status(404).json({ error: "Conversation not found." });
  const shareId = conversation.share_id || nanoid(16);
  if (!conversation.share_id) db.prepare("UPDATE conversations SET share_id = ? WHERE id = ?").run(shareId, conversation.id);
  res.json({ shareId, url: `${(process.env.APP_URL || `${isSecureRequest(req) ? "https" : "http"}://${req.get("host")}`).replace(/\/$/, "")}${AI_BASE}/shared.html?s=${shareId}` });
});
app.get("/api/shared/:shareId", (req, res) => {
  const conversation = db.prepare("SELECT id, title, model, created_at FROM conversations WHERE share_id = ?").get(req.params.shareId);
  if (!conversation) return res.status(404).json({ error: "This shared conversation is unavailable." });
  const messages = db.prepare("SELECT role, content, created_at FROM messages WHERE conversation_id = ? ORDER BY created_at ASC").all(conversation.id);
  res.json({ conversation, messages });
});

// ---------- OWNER-ONLY ----------
app.get("/api/owner/overview", requireOwner, (req, res) => {
  const scalar = (sql) => db.prepare(sql).get().c || 0;
  const recentActivity = db.prepare(`SELECT 'request' AS type, model AS label, status AS detail, created_at FROM ai_requests
    UNION ALL SELECT 'payment', plan, status, created_at FROM payments
    UNION ALL SELECT 'user', email, plan, created_at FROM users ORDER BY created_at DESC LIMIT 20`).all();
  res.json({
    totalUsers: scalar("SELECT COUNT(*) c FROM users"), activeUsers: scalar("SELECT COUNT(DISTINCT user_id) c FROM ai_requests WHERE user_id IS NOT NULL AND created_at >= datetime('now', '-30 days')"),
    guests: scalar("SELECT COUNT(DISTINCT user_id) c FROM ai_requests WHERE user_id IS NULL"), chats: scalar("SELECT COUNT(*) c FROM conversations"),
    totalRequests: scalar("SELECT COUNT(*) c FROM ai_requests"), newUsers: scalar("SELECT COUNT(*) c FROM users WHERE created_at >= datetime('now', '-30 days')"),
    revenue: scalar("SELECT COALESCE(SUM(amount),0) c FROM payments WHERE status = 'approved'"), payments: scalar("SELECT COUNT(*) c FROM payments"),
    pendingPayments: scalar("SELECT COUNT(*) c FROM payments WHERE status = 'pending'"), failedPayments: scalar("SELECT COUNT(*) c FROM payments WHERE status IN ('failed','rejected')"),
    activeSubscriptions: scalar("SELECT COUNT(*) c FROM users WHERE plan <> 'free' AND disabled = 0"),
    creditsIssued: scalar("SELECT COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END),0) c FROM wallet_transactions"),
    creditsUsed: scalar("SELECT COALESCE(ABS(SUM(CASE WHEN amount < 0 THEN amount ELSE 0 END)),0) c FROM wallet_transactions"),
    trialUsers: scalar("SELECT COUNT(*) c FROM users WHERE trial_expires_at > datetime('now')"), expiredTrials: scalar("SELECT COUNT(*) c FROM users WHERE trial_claimed = 1 AND (trial_expires_at IS NULL OR trial_expires_at <= datetime('now'))"),
    planDistribution: db.prepare("SELECT plan, COUNT(*) AS count FROM users GROUP BY plan").all(),
    modelUsage: db.prepare("SELECT model, COUNT(*) AS count FROM ai_requests GROUP BY model ORDER BY count DESC LIMIT 12").all(),
    recentActivity, systemStatus: maintenanceEnabled() ? "maintenance" : "operational"
  });
});
app.get("/api/owner/analytics", requireOwner, (req, res) => {
  const days = Math.min(365, Math.max(1, Number.parseInt(req.query.days, 10) || 30));
  const modifier = `-${days - 1} days`;
  res.json({
    days,
    users: db.prepare("SELECT substr(created_at,1,10) AS day, COUNT(*) AS count FROM users WHERE created_at >= datetime('now', ?) GROUP BY day ORDER BY day").all(modifier),
    requests: db.prepare("SELECT substr(created_at,1,10) AS day, COUNT(*) AS count FROM ai_requests WHERE created_at >= datetime('now', ?) GROUP BY day ORDER BY day").all(modifier),
    revenue: db.prepare("SELECT substr(created_at,1,10) AS day, COALESCE(SUM(amount),0) AS amount FROM payments WHERE status='approved' AND created_at >= datetime('now', ?) GROUP BY day ORDER BY day").all(modifier),
    models: db.prepare("SELECT model, COUNT(*) AS count FROM ai_requests WHERE created_at >= datetime('now', ?) GROUP BY model ORDER BY count DESC LIMIT 12").all(modifier),
  });
});
app.get("/api/owner/users", requireOwner, (req, res) => {
  const like = `%${String(req.query.q || "").trim()}%`;
  const users = db.prepare(`SELECT u.id,u.email,u.name,u.role,u.plan,u.credits,u.disabled,u.trial_started_at,u.trial_expires_at,u.trial_claimed,u.created_at,
    COALESCE((SELECT SUM(count) FROM usage_log WHERE user_id=u.id),0) AS usage,
    (SELECT COUNT(*) FROM conversations WHERE user_id=u.id) AS chats FROM users u WHERE u.email LIKE ? OR u.name LIKE ? ORDER BY u.created_at DESC LIMIT 100`).all(like, like);
  res.json({ users });
});
app.get("/api/owner/users/:id", requireOwner, (req, res) => {
  const user = db.prepare("SELECT id,email,name,role,plan,disabled,credits,trial_started_at,trial_expires_at,created_at FROM users WHERE id=?").get(req.params.id);
  if (!user) return res.status(404).json({ error: "User not found." });
  const usage = db.prepare("SELECT model, SUM(count) AS count FROM usage_log WHERE user_id=? GROUP BY model").all(user.id);
  const requests = db.prepare("SELECT model,status,created_at FROM ai_requests WHERE user_id=? ORDER BY created_at DESC LIMIT 30").all(user.id);
  res.json({ user, usage, requests });
});
app.patch("/api/owner/users/:id", requireOwner, (req, res) => {
  const user = db.prepare("SELECT * FROM users WHERE id=?").get(req.params.id);
  if (!user) return res.status(404).json({ error: "User not found." });
  if (isConfiguredOwner(user)) return res.status(400).json({ error: "The configured owner account cannot be changed here." });
  const disabled = req.body?.disabled ? 1 : 0;
  db.prepare("UPDATE users SET disabled=? WHERE id=?").run(disabled, user.id);
  audit(req.user.id, disabled ? "user.disabled" : "user.enabled", user.id, { email: user.email });
  res.json({ ok: true });
});
app.get("/api/owner/models", requireOwner, (req, res) => res.json({ models: Object.keys(MODELS).map((id) => ({ id, ...modelConfig(id) })) }));
app.patch("/api/owner/models/:id", requireOwner, (req, res) => {
  const base = MODELS[req.params.id]; if (!base) return res.status(404).json({ error: "Model not found." });
  const { enabled, tier, dailyLimit } = req.body || {};
  if (tier && !["free","paid","guest"].includes(tier)) return res.status(400).json({ error: "Invalid model availability tier." });
  if (dailyLimit != null && (!Number.isInteger(dailyLimit) || dailyLimit < 0 || dailyLimit > 100000)) return res.status(400).json({ error: "Invalid daily limit." });
  const current = modelConfig(req.params.id);
  db.prepare("UPDATE owner_model_settings SET enabled=?, tier=?, daily_limit=? WHERE model_id=?").run(enabled == null ? Number(current.enabled) : Number(Boolean(enabled)), tier || current.tier, dailyLimit ?? current.dailyLimit, req.params.id);
  audit(req.user.id, "model.updated", req.params.id, { enabled, tier, dailyLimit });
  res.json({ model: { id: req.params.id, ...modelConfig(req.params.id) } });
});
app.get("/api/owner/plans", requireOwner, (req, res) => res.json({ plans: PLANS.map((item) => planConfig(item.id)) }));
app.patch("/api/owner/plans/:id", requireOwner, (req, res) => {
  const current = planConfig(req.params.id); if (!current) return res.status(404).json({ error: "Plan not found." });
  const { monthly, yearly, enabled, dailyLimit, features } = req.body || {};
  if ([monthly, yearly, dailyLimit].some((value) => value != null && (!Number.isInteger(value) || value < 0))) return res.status(400).json({ error: "Prices and limits must be non-negative integers." });
  if (features != null && (!Array.isArray(features) || features.some((id) => !MODELS[id]))) return res.status(400).json({ error: "Invalid plan features." });
  db.prepare("UPDATE owner_plan_settings SET monthly=?,yearly=?,enabled=?,daily_limit=?,features=? WHERE plan_id=?").run(monthly ?? current.monthly, yearly ?? current.yearly, enabled == null ? Number(current.enabled) : Number(Boolean(enabled)), dailyLimit ?? current.dailyLimit, JSON.stringify(features ?? current.features), req.params.id);
  audit(req.user.id, "plan.updated", req.params.id, { monthly, yearly, enabled, dailyLimit, features });
  res.json({ plan: planConfig(req.params.id) });
});
app.get("/api/owner/usage", requireOwner, (req,res) => res.json({ usage: db.prepare("SELECT user_id,model,SUM(count) AS count,MAX(day) AS last_day FROM usage_log GROUP BY user_id,model ORDER BY count DESC LIMIT 200").all() }));
app.get("/api/owner/payments", requireOwner, (req,res) => {
  const status = String(req.query.status || "").trim();
  const q = `%${String(req.query.q || "").trim()}%`;
  const payments = db.prepare(`SELECT p.*,u.email,pm.name AS payment_method FROM payments p LEFT JOIN users u ON u.id=p.user_id LEFT JOIN payment_methods pm ON pm.id=p.payment_method_id WHERE (?='' OR p.status=?) AND (u.email LIKE ? OR p.transaction_id LIKE ? OR p.plan LIKE ?) ORDER BY p.created_at DESC LIMIT 200`).all(status,status,q,q,q);
  res.json({ payments, totals: db.prepare("SELECT status,COUNT(*) AS count,COALESCE(SUM(amount),0) AS amount FROM payments GROUP BY status").all() });
});
app.patch("/api/owner/payments/:id", requireOwner, async (req,res) => {
  const payment = db.prepare("SELECT * FROM payments WHERE id=?").get(req.params.id);
  const { status, adminNote } = req.body || {};
  if (!payment) return res.status(404).json({ error:"Payment not found." });
  if (!['pending','approved','rejected','refunded'].includes(status)) return res.status(400).json({ error:"Invalid payment status." });
  if (payment.status !== 'pending' && status === 'approved') return res.status(409).json({ error:"Only pending payments can be approved." });
  if (status === 'refunded' && payment.status !== 'approved') return res.status(409).json({ error:"Only approved payments can be refunded." });
  if (payment.status !== 'pending' && status === 'rejected') return res.status(409).json({ error:"Only pending payments can be rejected." });
  if (status === 'approved') db.prepare("UPDATE users SET plan=? WHERE id=?").run(payment.plan, payment.user_id);
  if (status === 'refunded' && payment.status === 'approved') creditWallet(payment.user_id, Math.max(1, payment.final_amount || payment.amount || 0), 'refund', `Refund for payment ${payment.id}`, payment.id);
  db.prepare("UPDATE payments SET status=?,admin_note=?,reviewed_at=datetime('now'),reviewed_by=? WHERE id=?").run(status, String(adminNote || '').slice(0,1000), req.user.id, payment.id);
  audit(req.user.id, `payment.${status}`, payment.id, { userId:payment.user_id, plan:payment.plan, amount:payment.final_amount || payment.amount });
  // Notify the customer when their payment is reviewed. No-op without SMTP config.
  const customer = db.prepare("SELECT email, name FROM users WHERE id=?").get(payment.user_id);
  await sendMail({
    to: customer?.email,
    subject: `The Tech Guider AI payment ${status}`,
    text: `Hello ${customer?.name || "there"},\n\nYour payment (${payment.plan} plan) has been ${status}.${adminNote ? `\n\nNote: ${adminNote}` : ""}\n\n— The Tech Guider AI`,
  });
  res.json({ payment: db.prepare("SELECT * FROM payments WHERE id=?").get(payment.id) });
});
app.get("/api/owner/payment-proofs/:id", requireOwner, (req, res) => {
  const proof = db.prepare("SELECT * FROM payment_proofs WHERE id = ?").get(req.params.id);
  if (!proof) return res.status(404).json({ error: "Proof not found." });
  res.json({ proof: { id: proof.id, filename: proof.filename, mimetype: proof.mimetype, size: proof.size, created_at: proof.created_at, dataUrl: `data:${proof.mimetype};base64,${proof.data}` } });
});
app.post("/api/owner/wallets/:userId/adjust", requireOwner, (req,res) => {
  try { const amount=Number(req.body?.amount), reason=String(req.body?.reason || '').trim(); if(!Number.isInteger(amount)||!amount||!reason) throw new Error('A non-zero whole-credit amount and reason are required.'); const balance=creditWallet(req.params.userId,amount,'owner_adjustment',reason); audit(req.user.id,'wallet.adjusted',req.params.userId,{amount,reason}); res.json({balance}); } catch(error) { res.status(400).json({error:error.message}); }
});
app.get("/api/owner/promos", requireOwner, (req,res) => res.json({ promos: db.prepare("SELECT p.*,COUNT(r.id) AS uses FROM promo_codes p LEFT JOIN promo_redemptions r ON r.promo_id=p.id GROUP BY p.id ORDER BY p.created_at DESC").all() }));
app.post("/api/owner/promos", requireOwner, (req,res) => {
  try { const b=req.body||{}, code=String(b.code||'').trim().toUpperCase(); if(!/^[A-Z0-9_-]{3,32}$/.test(code)) throw new Error('Use 3–32 letters, numbers, dashes, or underscores.'); if(!['percent','fixed'].includes(b.discountType)||!Number.isInteger(b.discountValue)||b.discountValue<1||(b.discountType==='percent'&&b.discountValue>100)) throw new Error('Invalid discount.'); const id=nanoid(); db.prepare("INSERT INTO promo_codes (id,code,discount_type,discount_value,plan_id,expires_at,max_uses,per_user_limit,active) VALUES (?,?,?,?,?,?,?,?,?)").run(id,code,b.discountType,b.discountValue,b.planId||null,b.expiresAt||null,b.maxUses??null,b.perUserLimit??1,Number(b.active!==false)); audit(req.user.id,'promo.created',id,{code}); res.status(201).json({promo:db.prepare('SELECT * FROM promo_codes WHERE id=?').get(id)}); } catch(error){res.status(400).json({error:error.message});}
});
app.patch("/api/owner/promos/:id", requireOwner, (req,res) => { const p=db.prepare('SELECT * FROM promo_codes WHERE id=?').get(req.params.id); if(!p)return res.status(404).json({error:'Promo not found.'}); const active=req.body?.active==null?p.active:Number(Boolean(req.body.active)); db.prepare('UPDATE promo_codes SET active=? WHERE id=?').run(active,p.id); audit(req.user.id,'promo.updated',p.id,{active});res.json({ok:true}); });
app.delete("/api/owner/promos/:id", requireOwner, (req,res) => { db.prepare('DELETE FROM promo_redemptions WHERE promo_id=?').run(req.params.id); const r=db.prepare('DELETE FROM promo_codes WHERE id=?').run(req.params.id);if(!r.changes)return res.status(404).json({error:'Promo not found.'});audit(req.user.id,'promo.deleted',req.params.id);res.json({ok:true}); });
app.get("/api/owner/payment-methods", requireOwner, (req,res) => res.json({ methods: db.prepare('SELECT * FROM payment_methods ORDER BY name').all() }));
app.post("/api/owner/payment-methods", requireOwner, (req,res) => { const b=req.body||{},name=String(b.name||'').trim(),instructions=String(b.instructions||'').trim();if(!name||!instructions)return res.status(400).json({error:'Name and instructions are required.'});const id=nanoid();db.prepare('INSERT INTO payment_methods (id,name,instructions,active,proof_required) VALUES (?,?,?,?,?)').run(id,name.slice(0,80),instructions.slice(0,1500),Number(b.active!==false),Number(Boolean(b.proofRequired)));audit(req.user.id,'payment_method.created',id,{name});res.status(201).json({id}); });
app.patch("/api/owner/payment-methods/:id", requireOwner, (req,res) => { const b=req.body||{},m=db.prepare('SELECT * FROM payment_methods WHERE id=?').get(req.params.id);if(!m)return res.status(404).json({error:'Payment method not found.'});db.prepare('UPDATE payment_methods SET name=?,instructions=?,active=?,proof_required=? WHERE id=?').run(String(b.name||m.name).slice(0,80),String(b.instructions||m.instructions).slice(0,1500),b.active==null?m.active:Number(Boolean(b.active)),b.proofRequired==null?m.proof_required:Number(Boolean(b.proofRequired)),m.id);audit(req.user.id,'payment_method.updated',m.id);res.json({ok:true}); });
app.get("/api/owner/roles", requireOwner, (req,res) => res.json({ roles: db.prepare('SELECT * FROM roles ORDER BY system DESC,name').all() }));
app.post("/api/owner/roles", requireOwner, (req,res) => { const b=req.body||{},name=String(b.name||'').trim();if(!/^[A-Za-z][A-Za-z0-9 _-]{2,40}$/.test(name)||!Array.isArray(b.permissions))return res.status(400).json({error:'Valid role name and permissions are required.'});const id=nanoid();try{db.prepare('INSERT INTO roles (id,name,permissions) VALUES (?,?,?)').run(id,name,JSON.stringify(b.permissions));audit(req.user.id,'role.created',id,{name});res.status(201).json({id});}catch{res.status(409).json({error:'Role already exists.'});} });
app.patch("/api/owner/roles/:id", requireOwner, (req,res) => { const role=db.prepare('SELECT * FROM roles WHERE id=?').get(req.params.id),b=req.body||{};if(!role)return res.status(404).json({error:'Role not found.'});if(role.system)return res.status(400).json({error:'Built-in roles cannot be renamed or deleted.'});if(!Array.isArray(b.permissions))return res.status(400).json({error:'Permissions must be an array.'});db.prepare('UPDATE roles SET name=?,permissions=? WHERE id=?').run(String(b.name||role.name).slice(0,40),JSON.stringify(b.permissions),role.id);audit(req.user.id,'role.updated',role.id);res.json({ok:true}); });
app.delete("/api/owner/roles/:id", requireOwner, (req,res) => { const role=db.prepare('SELECT * FROM roles WHERE id=?').get(req.params.id);if(!role)return res.status(404).json({error:'Role not found.'});if(role.system)return res.status(400).json({error:'Built-in roles cannot be deleted.'});if(db.prepare('SELECT id FROM users WHERE role=? LIMIT 1').get(role.id))return res.status(409).json({error:'Assign affected users another role first.'});db.prepare('DELETE FROM roles WHERE id=?').run(role.id);audit(req.user.id,'role.deleted',role.id);res.json({ok:true}); });
app.patch("/api/owner/users/:id/role", requireOwner, (req,res) => { const role=String(req.body?.role||'');if(!db.prepare('SELECT id FROM roles WHERE id=?').get(role))return res.status(400).json({error:'Unknown role.'});if(!db.prepare('SELECT id FROM users WHERE id=?').get(req.params.id))return res.status(404).json({error:'User not found.'});db.prepare('UPDATE users SET role=? WHERE id=?').run(role,req.params.id);audit(req.user.id,'user.role_updated',req.params.id,{role});res.json({ok:true}); });
app.get("/api/owner/announcements", requireOwner, (req,res) => res.json({ announcements: db.prepare("SELECT * FROM announcements ORDER BY created_at DESC LIMIT 100").all() }));
app.patch("/api/owner/announcements/:id", requireOwner, (req,res) => {
  const existing = db.prepare("SELECT * FROM announcements WHERE id=?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Announcement not found." });
  const b = req.body || {}, title = String(b.title ?? existing.title), body = String(b.body ?? existing.body), type = b.type ?? existing.type ?? 'info';
  if (!title.trim() || !body.trim() || !['info','success','warning','important'].includes(type)) return res.status(400).json({ error: "Valid title, message, and type are required." });
  const result = db.prepare("UPDATE announcements SET title=?,body=?,type=?,active=?,starts_at=?,ends_at=? WHERE id=?")
    .run(title.trim().slice(0,120),body.trim().slice(0,2000),type,b.active == null ? existing.active : Number(Boolean(b.active)),b.startsAt ?? existing.starts_at,b.endsAt ?? existing.ends_at,req.params.id);
  if (!result.changes) return res.status(404).json({ error: "Announcement not found." }); audit(req.user.id, "announcement.updated", req.params.id); res.json({ ok:true });
});
app.delete("/api/owner/announcements/:id", requireOwner, (req,res) => { db.prepare("DELETE FROM announcement_reads WHERE announcement_id=?").run(req.params.id); const result=db.prepare("DELETE FROM announcements WHERE id=?").run(req.params.id); if(!result.changes)return res.status(404).json({error:"Announcement not found."}); audit(req.user.id,"announcement.deleted",req.params.id);res.json({ok:true}); });
app.get("/api/owner/maintenance", requireOwner, (req,res) => res.json(maintenanceConfig()));
app.patch("/api/owner/maintenance", requireOwner, (req,res) => {
  const b = req.body || {}, enabled = Boolean(b.enabled), message = String(b.message || setting("maintenance_message")).trim();
  if (!message || message.length > 500) return res.status(400).json({ error: "Maintenance message is required and must be 500 characters or fewer." });
  for (const [key, value] of [["maintenance", enabled ? "1" : "0"], ["maintenance_message", message], ["maintenance_starts_at", String(b.startsAt || "")], ["maintenance_ends_at", String(b.endsAt || "")]]) db.prepare("UPDATE owner_settings SET value=? WHERE key=?").run(value, key);
  audit(req.user.id,"maintenance.updated",null,{enabled,message});res.json(maintenanceConfig());
});
app.get("/api/owner/audit", requireOwner, (req,res) => res.json({ audit: db.prepare("SELECT a.*,u.email AS owner_email FROM owner_audit_log a LEFT JOIN users u ON u.id=a.owner_id ORDER BY a.created_at DESC LIMIT 200").all() }));

// ---------- USAGE LIMIT ----------
function checkLimit(userId, modelId) {
  const model = modelConfig(modelId);
  if (!model) return { allowed: false, reason: "Unknown model." };
  if (!model.enabled) return { allowed: false, reason: `${model.name} is temporarily unavailable.` };
  const account = db.prepare("SELECT plan FROM users WHERE id = ?").get(userId);
  const planLimit = account ? planConfig(account.plan)?.dailyLimit : null;
  const day = new Date().toISOString().slice(0, 10);
  if (planLimit > 0) {
    const planUsed = db.prepare("SELECT COALESCE(SUM(count),0) AS count FROM usage_log WHERE user_id = ? AND day = ?").get(userId, day).count;
    if (planUsed >= planLimit) return { allowed: false, reason: `Daily plan limit reached (${planLimit}/day).` };
  }
  if (model.dailyLimit === 0) return { allowed: true };
  const row = db.prepare("SELECT * FROM usage_log WHERE user_id = ? AND model = ? AND day = ?").get(userId, modelId, day);
  const used = row?.count || 0;
  if (used >= model.dailyLimit) return { allowed: false, reason: `Daily limit reached for ${model.name} (${model.dailyLimit}/day).` };
  if (row) db.prepare("UPDATE usage_log SET count = count + 1 WHERE id = ?").run(row.id);
  else db.prepare("INSERT INTO usage_log (id, user_id, model, day, count) VALUES (?, ?, ?, ?, 1)").run(nanoid(), userId, modelId, day);
  return { allowed: true, remaining: model.dailyLimit - used - 1 };
}
function logRequest(userId, modelId, status) {
  db.prepare("INSERT INTO ai_requests (id, user_id, model, status) VALUES (?, ?, ?, ?)").run(nanoid(), userId, modelId, status);
}

function providerErrorText(detail, fallback = "The AI provider returned an error.") {
  if (!detail) return fallback;
  if (typeof detail === "string") {
    try {
      const parsed = JSON.parse(detail);
      if (parsed?.error?.message) return parsed.error.message;
      if (parsed?.message) return parsed.message;
    } catch {
      // Fall through to plain text handling below.
    }
    return detail;
  }
  if (detail?.error?.message) return detail.error.message;
  if (detail?.message) return detail.message;
  return fallback;
}

function sdkErrorDetail(error, fallback) {
  return error?.error?.error?.message || error?.error?.message || error?.message || fallback;
}

// Maps a normalized provider failure to a stable, user-safe response. Provider
// internals (raw messages, keys) stay in the server log; the client only gets a
// category, a friendly message, and the request id.
function classifyProviderError(err, model) {
  const name = model?.name || "This model";
  if (err?.config) {
    const envName = `${String(err.provider || "").toUpperCase()}_API_KEY`;
    return { status: 503, code: "provider_not_configured", message: `${name} isn't configured yet (missing ${envName}).` };
  }
  if (err?.empty) {
    return { status: 502, code: "empty_response", message: `${name} returned an empty response. Please try again.` };
  }

  const raw = String(providerErrorText(err?.detail, "") || "").toLowerCase();
  const statusCode = err?.detail?.status || err?.detail?.statusCode || err?.detail?.response?.status;
  const detailCode = String(err?.detail?.code || "").toLowerCase();

  // Billing/quota failures first: OpenAI reports exhausted credit as HTTP 429,
  // so this must be checked before the generic rate-limit branch.
  if (detailCode === "credit_balance_exhausted" ||
      /insufficient_quota|credit_balance|no credits|exceeded your current quota|billing hard limit|out of credit/.test(raw)) {
    return { status: 503, code: "provider_quota", message: `${name} is temporarily unavailable: the provider account has no remaining credit.` };
  }
  if (statusCode === 401 ||
      /invalid x-api-key|invalid_api_key|invalid api key|incorrect api key|user not found|authentication_error|access_token_type_unsupported|unauthenticated|unauthorized|no auth credentials/.test(raw)) {
    return { status: 503, code: "provider_auth", message: `${name} is temporarily unavailable: its provider credentials are invalid.` };
  }
  if (statusCode === 404 ||
      /model_not_found|does not exist|no such model|unknown model|not a valid model|model .*not (found|available|supported)/.test(raw)) {
    return { status: 502, code: "model_unavailable", message: `${name} is temporarily unavailable: the configured model was rejected by the provider.` };
  }
  if (statusCode === 429 || /rate.?limit|too many requests/.test(raw)) {
    return { status: 429, code: "provider_rate_limit", message: `${name} is busy right now (provider rate limit). Please retry in a moment.` };
  }
  if (statusCode === 408 || statusCode === 504 || /timeout|timed out|etimedout|econnaborted|aborted|deadline/.test(raw)) {
    return { status: 504, code: "provider_timeout", message: `${name} timed out waiting for the provider. Please retry.` };
  }
  return { status: 502, code: "provider_error", message: `${name} could not complete the request (provider error). Please retry.` };
}

// ---------- PROVIDER CALLS ----------
// Each provider uses its official SDK. Errors are normalized to the
// { config, detail, provider } shape the chat routes already understand.
const openAiClient = (apiKey) => new OpenAI({ apiKey, timeout: 30000, maxRetries: 1 });
const openRouterClient = (apiKey) => new OpenAI({
  apiKey,
  baseURL: "https://openrouter.ai/api/v1",
  timeout: 30000,
  maxRetries: 1,
  defaultHeaders: {
    "HTTP-Referer": process.env.FRONTEND_URL || "http://localhost:3001",
    "X-Title": "The Tech Guider AI",
  },
});

async function callProvider(provider, model, messages) {
  if (provider === "openai" || provider === "openrouter") {
    const key = provider === "openai" ? process.env.OPENAI_API_KEY : process.env.OPENROUTER_API_KEY;
    if (!key) throw { config: true, provider };
    const client = provider === "openai" ? openAiClient(key) : openRouterClient(key);
    try {
      const completion = await client.chat.completions.create({
        model,
        messages,
        ...(provider === "openrouter" ? { max_tokens: 1024 } : {}),
      });
      const content = completion.choices?.[0]?.message?.content || "";
      // An empty completion is a provider failure, never a valid answer.
      if (!content.trim()) throw { empty: true, provider };
      return content;
    } catch (error) {
      throw { config: false, detail: sdkErrorDetail(error, `${provider} request failed.`), provider };
    }
  }
  if (provider === "anthropic") {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw { config: true, provider };
    const client = new Anthropic({ apiKey: key, timeout: 30000, maxRetries: 1 });
    // Anthropic takes the system prompt as a top-level field, not a message role.
    const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n").trim();
    const chat = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content }));
    try {
      const message = await client.messages.create({
        model,
        max_tokens: 2000,
        ...(system ? { system } : {}),
        messages: chat.length ? chat : [{ role: "user", content: "" }],
      });
      const text = (message.content || []).map((block) => block.text).filter(Boolean).join("\n");
      if (!text.trim()) throw { empty: true, provider };
      return text;
    } catch (error) {
      throw { config: false, detail: sdkErrorDetail(error, "anthropic request failed."), provider };
    }
  }
  if (provider === "google") {
    const key = process.env.GOOGLE_API_KEY;
    if (!key) throw { config: true, provider };
    // Gemini expects the system prompt in a dedicated top-level field. Passing
    // it as a chat turn makes recent Gemini 3.x models hang, so it is split out.
    const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n").trim();
    const contents = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));
    try {
      // Direct REST call instead of the SDK: faster, fewer moving parts, and
      // works with both legacy (AIza...) and new (AQ...) API key formats.
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 45000);
      let payload;
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-goog-api-key": key },
            body: JSON.stringify(system ? { contents, systemInstruction: { parts: [{ text: system }] } } : { contents }),
            signal: controller.signal,
          }
        );
        payload = await res.json();
      } finally {
        clearTimeout(timer);
      }
      if (payload.error) {
        throw new Error(payload.error.message || "google request failed.");
      }
      const text = (payload.candidates?.[0]?.content?.parts || [])
        .map((p) => p.text)
        .filter(Boolean)
        .join("")
        .trim();
      if (!text) throw { empty: true, provider };
      return text;
    } catch (error) {
      throw { config: false, detail: sdkErrorDetail(error, "google request failed."), provider };
    }
  }
  throw new Error("Unknown provider");
}

// Isolated from user conversations: these messages are never written to the
// conversations/messages tables and are available only through owner routes.
app.get("/api/owner/assistant/history", requireOwner, (req, res) => {
  res.json({ messages: db.prepare("SELECT role,content,created_at FROM owner_assistant_messages WHERE owner_id=? ORDER BY created_at ASC LIMIT 100").all(req.user.id) });
});
app.post("/api/owner/assistant", requireOwner, async (req, res) => {
  const parsed = validate(chatSchema, req.body);
  if (parsed.error) return res.status(400).json({ error: parsed.error });
  const { message, modelId = "guider-astron" } = parsed.data;
  const model = modelConfig(modelId);
  if (!model) return res.status(400).json({ error: "Unknown model selected." });
  const history = db.prepare("SELECT role,content FROM owner_assistant_messages WHERE owner_id=? ORDER BY created_at DESC LIMIT 16").all(req.user.id).reverse();
  db.prepare("INSERT INTO owner_assistant_messages (id,owner_id,role,content) VALUES (?,?,?,?)").run(nanoid(),req.user.id,"user",message.trim());
  try {
    const reply = await callProvider(model.provider, model.model, [{ role:"system",content:"You are the private The Tech Guider AI Owner Assistant. Help administer the platform safely. Never reveal secrets or claim unverified operational actions." },...history,{role:"user",content:message.trim()}]);
    db.prepare("INSERT INTO owner_assistant_messages (id,owner_id,role,content) VALUES (?,?,?,?)").run(nanoid(),req.user.id,"assistant",reply);
    audit(req.user.id,"owner_assistant.used",modelId);
    res.json({ reply });
  } catch (error) {
    if (error.config) return res.status(503).json({ error: `${model.name} isn't configured.` });
    res.status(502).json({ error: "Owner Assistant provider request failed." });
  }
});

// ---------- CHAT ROUTE ----------
app.post("/api/chat", async (req, res) => {
  const parsed = validate(chatSchema, req.body);
  if (parsed.error) return res.status(400).json({ error: parsed.error });
  const { message, modelId = "guider-astron", conversationId, mode } = parsed.data;
  const hubHelp = mode === "hub-help";

  const model = modelConfig(modelId);
  if (!model) return res.status(400).json({ error: "Unknown model selected." });

  const user = getUser(req);
  if (user?.disabled) return res.status(403).json({ error: "This account has been disabled." });
  if (maintenanceEnabled() && !isConfiguredOwner(user)) return res.status(503).json({ error: "The service is temporarily in maintenance mode." });
  if (!model.enabled) return res.status(503).json({ error: `${model.name} is temporarily unavailable.` });
  // tier "guest" is the only tier now: open to signed-in users and guests alike.
  if (model.tier === "paid" && !canUseModel(user, modelId)) {
    return res.status(403).json({ error: `${model.name} requires an upgrade. Visit /plans.html.` });
  }

  const usageKey = user ? user.id : (req.cookies?.tg_guest || (() => {
    const gid = nanoid();
    res.cookie("tg_guest", gid, { httpOnly: true, maxAge: 365 * 24 * 60 * 60 * 1000 });
    return gid;
  })());

  const limit = checkLimit(usageKey, modelId);
  if (!limit.allowed) return res.status(429).json({ error: limit.reason });

  // Conversation history (logged-in users only; hub-help chats stay ephemeral
  // so quick helper questions never clutter saved conversations)
  let conv = null;
  let history = [];
  if (user && !hubHelp) {
    if (conversationId) conv = db.prepare("SELECT * FROM conversations WHERE id = ? AND user_id = ?").get(conversationId, user.id);
    if (!conv) {
      const cid = nanoid();
      db.prepare("INSERT INTO conversations (id, user_id, title, model) VALUES (?, ?, ?, ?)").run(cid, user.id, message.slice(0, 50), modelId);
      conv = db.prepare("SELECT * FROM conversations WHERE id = ?").get(cid);
    }
    history = db.prepare("SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at ASC LIMIT 20").all(conv.id);
    db.prepare("INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, 'user', ?)").run(nanoid(), conv.id, message);
  }

  try {
    const reply = await callProvider(model.provider, model.model, [
      { role: "system", content: hubHelp ? HUB_HELP_SYSTEM : "You are The Tech Guider Hub Helper AI (model: Guider Astron), a helpful assistant of The Tech Guider Hub." },
      ...history,
      { role: "user", content: message },
    ]);
    logRequest(user ? user.id : null, modelId, "success");

    if (user && conv) {
      db.prepare("INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, 'assistant', ?)").run(nanoid(), conv.id, reply);
      db.prepare("UPDATE conversations SET updated_at = datetime('now') WHERE id = ?").run(conv.id);
    }

    res.json({ reply, remaining: limit.remaining, conversationId: hubHelp ? null : (conv?.id || null) });
  } catch (err) {
    logRequest(user ? user.id : null, modelId, "error");
    const failure = classifyProviderError(err, model);
    console.error(
      `[chat] req=${req.id} model=${modelId} provider=${model.provider} code=${failure.code}:`,
      providerErrorText(err?.detail, err?.empty ? "empty provider response" : "provider failure")
    );
    res.status(failure.status).json({ error: failure.message, code: failure.code, requestId: req.id });
  }
});

// ---------- IMAGE GENERATION ----------
app.post("/api/image/generate", requireAuth, async (req, res) => {
  if (maintenanceEnabled() && !isConfiguredOwner(req.user)) return res.status(503).json({ error: "The service is temporarily in maintenance mode." });
  const parsed = validate(imageSchema, req.body);
  if (parsed.error) return res.status(400).json({ error: parsed.error });
  const key = process.env.OPENAI_API_KEY;
  if (!key) return res.status(503).json({ error: "Image generation isn't configured yet (missing OPENAI_API_KEY)." });
  try {
    const client = new OpenAI({ apiKey: key, timeout: 60000, maxRetries: 1 });
    const result = await client.images.generate({ model: "dall-e-3", prompt: parsed.data.prompt, n: 1, size: "1024x1024" });
    logRequest(req.user.id, "guider-pro", "success");
    res.json({ url: result.data?.[0]?.url });
  } catch (err) {
    logRequest(req.user.id, "guider-pro", "error");
    console.error(err);
    res.status(502).json({ error: "Image generation failed." });
  }
});

// Reports which AI providers have credentials configured (booleans only; never
// key material). Lets the owner see why a model is unavailable without shelling
// into the environment.
const PROVIDER_KEY_ENV = {
  openai: "OPENAI_API_KEY",
  openrouter: "OPENROUTER_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  google: "GOOGLE_API_KEY",
};
app.get("/api/providers/status", (req, res) => {
  const providers = {};
  for (const [name, envName] of Object.entries(PROVIDER_KEY_ENV)) {
    providers[name] = { configured: Boolean(process.env[envName]) };
  }
  res.json({
    providers,
    database: { persistent: Boolean(process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN) },
    requestId: req.id,
  });
});

// An API request must never receive the HTML app shell. Auth endpoints above are
// the only API routes that intentionally redirect the browser.
app.all("/api/*", (req, res) => res.status(404).json({ error: "API endpoint not found." }));

// Express's default malformed-JSON error page is HTML. Keep the API contract
// JSON-only so browser clients can always display a useful message.
app.use((error, req, res, next) => {
  if (req.path.startsWith("/api/") && error?.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Request body must be valid JSON." });
  }
  if (req.path.startsWith("/api/")) {
    console.error("API error:", error);
    return res.status(error?.status || 500).json({ error: "Unexpected server error." });
  }
  next(error);
});

// ---------- FRONTEND FALLBACK ----------
app.get("*", (req, res) => res.sendFile(path.join(publicDir, "index.html")));

// Only start a listener when this file is the process entry point. When the app
// is imported by The Guider Hub (mounted at /ai) or by serverless-http, the
// host owns the HTTP server, so we must not call listen here.
const isDirectRun = (() => {
  try {
    return Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href;
  } catch {
    return false;
  }
})();

if (isDirectRun && !process.env.VERCEL && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
  app.listen(PORT, () => console.log(`✅ The Tech Guider AI running at http://localhost:${PORT}`));
}

export default app;
