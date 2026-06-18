import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { hashPassword, comparePassword } from "../utils/password.js";
import { signToken, verifyToken } from "../utils/jwt.js";
import { signupSchema, loginSchema } from "../validators/auth.validator.js";


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

export async function signup(req: Request, res: Response) {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors });
    return;
  }

  const { firstName, lastName, email, password, phoneNumber, location, role, acceptTerms } = parsed.data;

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
  const [newUser] = await db.insert(users).values({ firstName, lastName, email, passwordHash, role, phoneNumber, location, acceptedTerms: acceptTerms }).returning();

  if (!newUser) { res.status(500).json({ error: "Failed to create account" }); return; }

  const token = await signToken({ userId: newUser.id, email: newUser.email, role: newUser.role });
  res.status(201).json({ token, user: safeUser(newUser) });
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

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) { res.status(401).json({ error: "Invalid email or password" }); return; }

  await db.update(users).set({ lastActiveAt: new Date() }).where(eq(users.id, user.id));

  const token = await signToken({ userId: user.id, email: user.email, role: user.role });
  res.json({ token, user: safeUser(user) });
}

export async function logout(_req: Request, res: Response) {
  res.json({ message: "Logged out" });
}

export async function getSession(req: Request, res: Response) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) { res.json({ user: null, session: null }); return; }

  try {
    const payload = await verifyToken(token);
    const [user] = await db.select().from(users).where(eq(users.id, payload.userId)).limit(1);
    if (!user) { res.json({ user: null, session: null }); return; }
    res.json({ user: safeUser(user), session: { userId: user.id } });
  } catch {
    res.json({ user: null, session: null });
  }
}
