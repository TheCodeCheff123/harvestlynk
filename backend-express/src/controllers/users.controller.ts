import type { Request, Response } from "express";
import { eq, count, sum, and, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/index.js";
import { users, wallets, listings, orders, livenessChecks } from "../db/schema.js";
import { safeUser } from "./auth.controller.js";
import type { AuthRequest } from "../middleware/auth.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,30}$/;

const updateProfileSchema = z.object({
  fullName: z.string().min(2).trim().optional(),
  firstName: z.string().min(1).trim().optional(),
  lastName: z.string().min(1).trim().optional(),
  phoneNumber: z.string().optional(),
  bio: z.string().max(500).optional(),
  locationState: z.string().optional(),
  locationLga: z.string().optional(),
  locationVillage: z.string().optional(),
  bankName: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  bankAccountName: z.string().optional(),
  preferredLanguage: z.string().optional(),
  farmName: z.string().optional(),
  username: z.string().max(30).optional(),
});


// ─── Check username availability ─────────────────────────────────────────────

export async function checkUsername(req: Request, res: Response) {
  const username = typeof req.query["username"] === "string" ? req.query["username"].trim() : "";
  if (!username) {
    res.json({ available: false, valid: false });
    return;
  }

  const valid = USERNAME_REGEX.test(username);
  if (!valid) {
    res.json({ available: false, valid: false });
    return;
  }

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(sql`LOWER(${users.username}) = LOWER(${username})`)
    .limit(1);

  res.json({ available: !existing, valid: true });
}

export async function getUser(req: Request, res: Response) {
  const id = String(req.params["id"]);
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const [wallet] = await db.select().from(wallets).where(eq(wallets.userId, String(id))).limit(1);
  const result = {
    ...safeUser(user),
    wallet: wallet ? {
      wallet_id: wallet.walletId,
      user_id: wallet.userId,
      available_balance: String(wallet.availableBalance),
      pending_balance: String(wallet.pendingBalance),
      total_paid_in: String(wallet.totalPaidIn),
      created_at: wallet.createdAt,
      updated_at: wallet.updatedAt,
    } : null,
  };

  res.json(result);
}

export async function updateUser(req: AuthRequest, res: Response) {
  const parsed = updateProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors });
    return;
  }

  const data = parsed.data;
  const updates: Record<string, unknown> = {};

  if (data.fullName) {
    const [first, ...rest] = data.fullName.trim().split(" ");
    updates["firstName"] = first;
    updates["lastName"] = rest.join(" ") || "-";
  }
  if (data.firstName) updates["firstName"] = data.firstName.trim();
  if (data.lastName) updates["lastName"] = data.lastName.trim();
  if (data.phoneNumber !== undefined) updates["phoneNumber"] = data.phoneNumber;
  if (data.bio !== undefined) updates["bio"] = data.bio;
  if (data.locationState !== undefined) updates["locationState"] = data.locationState;
  if (data.locationLga !== undefined) updates["locationLga"] = data.locationLga;
  if (data.locationVillage !== undefined) updates["locationVillage"] = data.locationVillage;
  if (data.bankName !== undefined) updates["bankName"] = data.bankName;
  if (data.bankAccountNumber !== undefined) updates["bankAccountNumber"] = data.bankAccountNumber;
  if (data.bankAccountName !== undefined) updates["bankAccountName"] = data.bankAccountName;
  if (data.preferredLanguage !== undefined) updates["preferredLanguage"] = data.preferredLanguage;
  if (data.farmName !== undefined) updates["farmName"] = data.farmName;

  if (data.username !== undefined) {
    if (data.username === "") {
      // Allow clearing username
      updates["username"] = null;
    } else {
      const uname = data.username.toLowerCase();
      if (!USERNAME_REGEX.test(data.username)) {
        res.status(400).json({ error: "Invalid username format. Use 3–30 letters, numbers, or underscores." });
        return;
      }
      updates["username"] = uname;
    }
  }

  let updated: typeof users.$inferSelect | undefined;
  try {
    [updated] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, req.user!.userId))
      .returning();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("users_username_lower_idx") || msg.includes("unique")) {
      res.status(409).json({ error: "Username already taken" });
      return;
    }
    throw err;
  }

  if (!updated) { res.status(404).json({ error: "User not found" }); return; }
  res.json(safeUser(updated));
}

export async function uploadNinDocument(req: AuthRequest, res: Response) {
  const file = (req as AuthRequest & { file?: Express.Multer.File }).file;
  if (!file) { res.status(400).json({ error: "No file provided" }); return; }

  const url = await uploadToCloudinary(file.buffer, "harvestlynk/nin-documents");
  const [updated] = await db
    .update(users)
    .set({ ninDocumentUrl: url })
    .where(eq(users.id, req.user!.userId))
    .returning();

  res.json({ url, user: safeUser(updated!) });
}

export async function uploadOwnershipDocument(req: AuthRequest, res: Response) {
  const file = (req as AuthRequest & { file?: Express.Multer.File }).file;
  if (!file) { res.status(400).json({ error: "No file provided" }); return; }

  const url = await uploadToCloudinary(file.buffer, "harvestlynk/ownership-documents");
  const [updated] = await db
    .update(users)
    .set({ ownershipDocumentUrl: url })
    .where(eq(users.id, req.user!.userId))
    .returning();

  res.json({ url, user: safeUser(updated!) });
}

export async function livenessCheck(req: AuthRequest, res: Response) {
  const file = (req as AuthRequest & { file?: Express.Multer.File }).file;
  if (!file) { res.status(400).json({ error: "No selfie image provided" }); return; }

  const selfieImageUrl = await uploadToCloudinary(file.buffer, "harvestlynk/liveness");

  // Stub: simulate AI liveness scoring (replace with real AI call in production)
  const livenessScore = parseFloat((0.82 + Math.random() * 0.17).toFixed(4));
  const isLive = livenessScore > 0.75;
  const passed = isLive;

  await db.insert(livenessChecks).values({
    userId: req.user!.userId,
    selfieImageUrl,
    livenessScore: String(livenessScore),
    isLive,
    passed,
    spoofDetected: !isLive,
  });

  if (passed) {
    await db.update(users).set({ livenessVerified: true }).where(eq(users.id, req.user!.userId));
  }

  res.json({
    passed,
    liveness_score: livenessScore,
    is_live: isLive,
    message: passed
      ? "Liveness check passed. Your account is now verified."
      : "Liveness check failed — please try again in good lighting.",
  });
}

export async function uploadAvatar(req: AuthRequest, res: Response) {
  const file = (req as AuthRequest & { file?: Express.Multer.File }).file;
  if (!file) { res.status(400).json({ error: "No file provided" }); return; }

  const url = await uploadToCloudinary(file.buffer, "harvestlynk/avatars");
  const [updated] = await db
    .update(users)
    .set({ image: url })
    .where(eq(users.id, req.user!.userId))
    .returning();

  res.json({ url, user: safeUser(updated!) });
}

export async function getMe(req: AuthRequest, res: Response) {
  const [user] = await db.select().from(users).where(eq(users.id, req.user!.userId)).limit(1);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const [wallet] = await db.select().from(wallets).where(eq(wallets.userId, user.id)).limit(1);
  res.json({
    ...safeUser(user),
    wallet: wallet ? {
      wallet_id: wallet.walletId,
      user_id: wallet.userId,
      available_balance: String(wallet.availableBalance),
      pending_balance: String(wallet.pendingBalance),
      total_paid_in: String(wallet.totalPaidIn),
      created_at: wallet.createdAt,
      updated_at: wallet.updatedAt,
    } : null,
  });
}

export async function getStats(req: AuthRequest, res: Response) {
  const userId = req.user!.userId;
  const [user] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId)).limit(1);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  if (user.role === "farmer") {
    const [listingStats] = await db
      .select({ total: count(), active: count(listings.status) })
      .from(listings)
      .where(eq(listings.farmerId, userId));

    const [orderStats] = await db
      .select({ total: count(), revenue: sum(orders.totalAmount) })
      .from(orders)
      .where(and(eq(orders.farmerId, userId), eq(orders.status, "completed")));

    const [totalOrders] = await db
      .select({ total: count() })
      .from(orders)
      .where(eq(orders.farmerId, userId));

    res.json({
      listings_count: Number(listingStats?.total ?? 0),
      orders_received: Number(totalOrders?.total ?? 0),
      completed_orders: Number(orderStats?.total ?? 0),
      total_revenue: Number(orderStats?.revenue ?? 0),
    });
  } else {
    const [orderStats] = await db
      .select({ total: count() })
      .from(orders)
      .where(eq(orders.buyerId, userId));

    const [completedStats] = await db
      .select({ total: count() })
      .from(orders)
      .where(and(eq(orders.buyerId, userId), eq(orders.status, "completed")));

    res.json({
      orders_placed: Number(orderStats?.total ?? 0),
      completed_orders: Number(completedStats?.total ?? 0),
    });
  }
}

export async function getVerificationStatus(req: AuthRequest, res: Response) {
  const [user] = await db
    .select({
      role: users.role,
      emailVerified: users.emailVerified,
      livenessVerified: users.livenessVerified,
      ninDocumentUrl: users.ninDocumentUrl,
      ownershipDocumentUrl: users.ownershipDocumentUrl,
    })
    .from(users)
    .where(eq(users.id, req.user!.userId))
    .limit(1);

  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const ninUploaded = !!user.ninDocumentUrl;
  const ownershipDocUploaded = !!user.ownershipDocumentUrl;

  const isFullyVerified = user.role === "farmer"
    ? user.emailVerified && user.livenessVerified && ninUploaded && ownershipDocUploaded
    : user.emailVerified && user.livenessVerified && ninUploaded;

  const status: Record<string, unknown> = {
    email_verified: user.emailVerified,
    liveness_verified: user.livenessVerified,
    nin_uploaded: ninUploaded,
    is_fully_verified: isFullyVerified,
  };

  if (user.role === "farmer") {
    status["ownership_doc_uploaded"] = ownershipDocUploaded;
  }

  res.json(status);
}

export async function completeOAuthProfile(req: AuthRequest, res: Response) {
  const schema = z.object({
    role: z.enum(["farmer", "buyer"]),
    farmName: z.string().optional(),
    location: z.string().optional(),
    phoneNumber: z.string().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors });
    return;
  }

  const [updated] = await db
    .update(users)
    .set({ role: parsed.data.role, farmName: parsed.data.farmName, location: parsed.data.location, phoneNumber: parsed.data.phoneNumber })
    .where(eq(users.id, req.user!.userId))
    .returning();

  res.json(safeUser(updated!));
}
