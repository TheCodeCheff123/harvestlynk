import { randomBytes, createHash } from "crypto";
import type { Request, Response } from "express";
import { eq, and, gt } from "drizzle-orm";
import { db } from "../db/index.js";
import { users, wallets, refreshTokens } from "../db/schema.js";
import { hashPassword, comparePassword } from "../utils/password.js";
import { signAccessToken, signRevokeToken, verifyRevokeToken, signEmailVerificationToken, verifyEmailVerificationToken } from "../utils/jwt.js";
import { signupSchema, loginSchema } from "../validators/auth.validator.js";
import { sendVerificationEmail, sendNewLoginAlert } from "../utils/email.js";

// Minimal shape returned in auth responses (login, signup, verify)
export const authUser = (user: typeof users.$inferSelect) => ({
  id: user.id,
  name: `${user.firstName} ${user.lastName}`,
  email: user.email,
  role: user.role,
  image: user.image,
  emailVerified: user.emailVerified,
});

// Full shape returned when the user explicitly fetches their own profile
export const safeUser = (user: typeof users.$inferSelect) => ({
  id: user.id,
  name: `${user.firstName} ${user.lastName}`,
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  role: user.role,
  phoneNumber: user.phoneNumber,
  farmName: user.farmName,
  location: user.location,
  image: user.image,
  emailVerified: user.emailVerified,
  trustScore: user.trustScore,
  location_state: user.locationState,
  location_lga: user.locationLga,
  location_village: user.locationVillage,
  bank_name: user.bankName,
  bank_account_number: user.bankAccountNumber,
  bank_account_name: user.bankAccountName,
  liveness_verified: user.livenessVerified,
  preferred_language: user.preferredLanguage,
  bio: user.bio,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

function generateRefreshToken() {
  const raw = randomBytes(40).toString("hex");
  const hash = createHash("sha256").update(raw).digest("hex");
  return { raw, hash };
}

async function storeRefreshToken(userId: string, hash: string, ipAddress: string, userAgent: string) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const [stored] = await db
    .insert(refreshTokens)
    .values({ userId, tokenHash: hash, ipAddress, userAgent, expiresAt })
    .returning();
  return stored!;
}

export async function signup(req: Request, res: Response) {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors });
    return;
  }

  const { firstName, lastName, email, password, phoneNumber, location, role } = parsed.data;

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing) {
    res.status(409).json({ error: "An account with this email already exists" });
    return;
  }

  if (phoneNumber) {
    const [existingPhone] = await db.select({ id: users.id }).from(users).where(eq(users.phoneNumber, phoneNumber)).limit(1);
    if (existingPhone) {
      res.status(409).json({ error: "An account with this phone number already exists" });
      return;
    }
  }

  const passwordHash = await hashPassword(password);
  const [newUser] = await db.insert(users).values({ firstName, lastName, email, passwordHash, role, phoneNumber, location, acceptedTerms: true }).returning();
  if (!newUser) { res.status(500).json({ error: "Failed to create account" }); return; }

  await db.insert(wallets).values({
    userId: newUser.id,
    availableBalance: 0,
    pendingBalance: 0,
    totalPaidIn: 0,
    totalPaidOut: 0,
  }).onConflictDoNothing();

  const emailToken = await signEmailVerificationToken(newUser.id, newUser.email);
  const appUrl = process.env["APP_URL"] ?? "http://localhost:4000";
  const verifyLink = `${appUrl}/api/v1/auth/verify-email?token=${emailToken}`;

  sendVerificationEmail({
    to: newUser.email,
    name: `${newUser.firstName} ${newUser.lastName}`,
    verifyLink,
  }).catch(() => {});

  res.status(201).json({ message: "Account created. Please check your email to verify your account." });
}

export async function login(req: Request, res: Response) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors });
    return;
  }

  const { email, password } = parsed.data;
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

  if (!user) { res.status(401).json({ error: "Invalid email or password" }); return; }
  if (user.banned) { res.status(403).json({ error: "This account has been suspended", reason: user.banReason }); return; }
  if (!user.emailVerified) { res.status(403).json({ error: "Please verify your email before logging in" }); return; }

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) { res.status(401).json({ error: "Invalid email or password" }); return; }

  await db.update(users).set({ lastActiveAt: new Date() }).where(eq(users.id, user.id));

  const ip = req.ip ?? "unknown";
  const ua = req.headers["user-agent"] ?? "unknown";

  // Check for existing active sessions — send alert if found
  const existingSessions = await db
    .select()
    .from(refreshTokens)
    .where(and(eq(refreshTokens.userId, user.id), gt(refreshTokens.expiresAt, new Date())));

  const accessToken = await signAccessToken({ userId: user.id, email: user.email, role: user.role });
  const { raw: refreshToken, hash } = generateRefreshToken();
  const newSession = await storeRefreshToken(user.id, hash, ip, ua);

  if (existingSessions.length > 0) {
    const revokeToken = await signRevokeToken(newSession.id);
    const appUrl = process.env["APP_URL"] ?? "http://localhost:4000";
    const revokeLink = `${appUrl}/api/v1/auth/revoke-session?token=${revokeToken}`;

    // Fire-and-forget — alert must never block the login response
    sendNewLoginAlert({
      to: user.email,
      name: `${user.firstName} ${user.lastName}`,
      ipAddress: ip,
      userAgent: ua,
      loginTime: new Date(),
      revokeLink,
    }).catch(() => {});
  }

  res.json({ accessToken, refreshToken, user: authUser(user) });
}

export async function verifyEmail(req: Request, res: Response) {
  const token = typeof req.query["token"] === "string" ? req.query["token"] : null;
  if (!token) { res.status(400).json({ error: "Token is required" }); return; }

  try {
    const { userId } = await verifyEmailVerificationToken(token);

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    if (user.emailVerified) { res.status(400).json({ error: "Email already verified" }); return; }

    await db.update(users).set({ emailVerified: true }).where(eq(users.id, userId));

    const ip = req.ip ?? "unknown";
    const ua = req.headers["user-agent"] ?? "unknown";

    const accessToken = await signAccessToken({ userId: user.id, email: user.email, role: user.role });
    const { raw: refreshToken, hash } = generateRefreshToken();
    await storeRefreshToken(user.id, hash, ip, ua);

    res.json({ accessToken, refreshToken, user: authUser({ ...user, emailVerified: true }) });
  } catch {
    res.status(400).json({ error: "Invalid or expired verification link. Please request a new one." });
  }
}

export async function resendVerification(req: Request, res: Response) {
  const { email } = req.body as { email?: string };
  if (!email) { res.status(400).json({ error: "Email is required" }); return; }

  const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);

  // Always respond the same way to prevent email enumeration
  if (!user || user.emailVerified) {
    res.json({ message: "If that email exists and is unverified, a new link has been sent." });
    return;
  }

  const token = await signEmailVerificationToken(user.id, user.email);
  const appUrl = process.env["APP_URL"] ?? "http://localhost:4000";
  const verifyLink = `${appUrl}/api/v1/auth/verify-email?token=${token}`;

  sendVerificationEmail({
    to: user.email,
    name: `${user.firstName} ${user.lastName}`,
    verifyLink,
  }).catch(() => {});

  res.json({ message: "If that email exists and is unverified, a new link has been sent." });
}

export async function refresh(req: Request, res: Response) {
  const { refreshToken } = req.body as { refreshToken?: string };
  if (!refreshToken) {
    res.status(400).json({ error: "Refresh token is required" });
    return;
  }

  const hash = createHash("sha256").update(refreshToken).digest("hex");
  const now = new Date();

  const [stored] = await db
    .select()
    .from(refreshTokens)
    .where(and(eq(refreshTokens.tokenHash, hash), gt(refreshTokens.expiresAt, now)))
    .limit(1);

  if (!stored) {
    res.status(401).json({ error: "Invalid or expired refresh token" });
    return;
  }

  const [user] = await db.select().from(users).where(eq(users.id, stored.userId)).limit(1);
  if (!user || user.banned) {
    res.status(401).json({ error: "User not found or suspended" });
    return;
  }

  const ip = req.ip ?? "unknown";
  const ua = req.headers["user-agent"] ?? "unknown";

  // Rotate: delete old token, issue new pair
  await db.delete(refreshTokens).where(eq(refreshTokens.id, stored.id));

  const accessToken = await signAccessToken({ userId: user.id, email: user.email, role: user.role });
  const { raw: newRefreshToken, hash: newHash } = generateRefreshToken();
  await storeRefreshToken(user.id, newHash, ip, ua);

  res.json({ accessToken, refreshToken: newRefreshToken });
}

export async function logout(req: Request, res: Response) {
  const { refreshToken } = req.body as { refreshToken?: string };
  if (refreshToken) {
    const hash = createHash("sha256").update(refreshToken).digest("hex");
    await db.delete(refreshTokens).where(eq(refreshTokens.tokenHash, hash));
  }
  res.json({ message: "Logged out" });
}

// Called from email link — no auth required, token is self-contained signed JWT
export async function revokeSession(req: Request, res: Response) {
  const token = typeof req.query["token"] === "string" ? req.query["token"] : null;
  if (!token) {
    res.status(400).json({ error: "Token is required" });
    return;
  }

  try {
    const { sessionId } = await verifyRevokeToken(token);
    await db.delete(refreshTokens).where(eq(refreshTokens.id, sessionId));
    res.send(`
      <html><body style="font-family:sans-serif;max-width:480px;margin:80px auto;text-align:center">
        <h2 style="color:#1a1a1a">Device logged out</h2>
        <p style="color:#555">The unknown device has been successfully logged out of your account.</p>
        <p style="color:#555">If you continue to see suspicious activity, please change your password.</p>
      </body></html>
    `);
  } catch {
    res.status(400).json({ error: "Invalid or expired revoke link" });
  }
}

// List all active sessions for the authenticated user
export async function getSessions(req: Request & { user?: { userId: string } }, res: Response) {
  const sessions = await db
    .select({
      id: refreshTokens.id,
      ipAddress: refreshTokens.ipAddress,
      userAgent: refreshTokens.userAgent,
      createdAt: refreshTokens.createdAt,
      expiresAt: refreshTokens.expiresAt,
    })
    .from(refreshTokens)
    .where(and(eq(refreshTokens.userId, req.user!.userId), gt(refreshTokens.expiresAt, new Date())))
    .orderBy(refreshTokens.createdAt);

  res.json(sessions.map(s => ({
    session_id: s.id,
    ip_address: s.ipAddress,
    user_agent: s.userAgent,
    created_at: s.createdAt,
    expires_at: s.expiresAt,
  })));
}

// Revoke all sessions except the one making this request
export async function revokeOtherSessions(req: Request & { user?: { userId: string } }, res: Response) {
  const { currentRefreshToken } = req.body as { currentRefreshToken?: string };
  if (!currentRefreshToken) {
    res.status(400).json({ error: "currentRefreshToken is required" });
    return;
  }

  const currentHash = createHash("sha256").update(currentRefreshToken).digest("hex");
  const all = await db
    .select({ id: refreshTokens.id, tokenHash: refreshTokens.tokenHash })
    .from(refreshTokens)
    .where(eq(refreshTokens.userId, req.user!.userId));

  const toDelete = all.filter(s => s.tokenHash !== currentHash).map(s => s.id);
  for (const id of toDelete) {
    await db.delete(refreshTokens).where(eq(refreshTokens.id, id));
  }

  res.json({ message: `${toDelete.length} other session(s) revoked` });
}
