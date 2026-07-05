import type { Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { users, virtualAccounts, wallets } from "../db/schema.js";
import { createVirtualAccount, suspendVirtualAccount } from "../utils/nomba.js";
import type { AuthRequest } from "../middleware/auth.js";

export async function createBuyerVirtualAccount(req: AuthRequest, res: Response) {
  const userId = req.user?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  // Both buyers and farmers can create a virtual account to fund their wallet.

  const existingAccount = await db
    .select()
    .from(virtualAccounts)
    .where(eq(virtualAccounts.userId, userId))
    .limit(1);

  if (existingAccount.length > 0) {
    res.status(400).json({ error: "User already has a virtual account" });
    return;
  }

  const accountRef = `VA-${userId}-${Date.now()}`;
  // Nomba rejects accountName containing special characters (hyphens, dashes, etc.)
  // Use only letters and spaces — strip anything else from the user's name.
  const rawName = `${user.firstName} ${user.lastName}`.replace(/[^a-zA-Z\s]/g, "").trim();
  const accountName = rawName || "HarvestLynk User";

  try {
    const nombaResponse = await createVirtualAccount({
      accountRef,
      accountName,
      currency: "NGN",
    });

    const [virtualAccount] = await db
      .insert(virtualAccounts)
      .values({
        userId,
        accountRef: nombaResponse.accountRef,
        accountName: nombaResponse.accountName,
        bankAccountNumber: nombaResponse.bankAccountNumber,
        bankAccountName: nombaResponse.bankAccountName,
        bankName: nombaResponse.bankName,
        currency: nombaResponse.currency,
        bvn: nombaResponse.bvn,
        nombaAccountId: nombaResponse.accountHolderId,
        status: "active",
        isDynamic: false,
        metadata: nombaResponse,
      })
      .returning();

    res.status(201).json({
      success: true,
      virtualAccount: {
        virtual_account_id: virtualAccount.virtualAccountId,
        account_ref: virtualAccount.accountRef,
        account_name: virtualAccount.accountName,
        bank_account_number: virtualAccount.bankAccountNumber,
        bank_account_name: virtualAccount.bankAccountName,
        bank_name: virtualAccount.bankName,
        currency: virtualAccount.currency,
        status: virtualAccount.status,
        is_dynamic: virtualAccount.isDynamic,
        created_at: virtualAccount.createdAt,
      },
    });
  } catch (error: any) {
    console.error("Error creating virtual account:", error);
    res.status(500).json({ error: "Failed to create virtual account", message: error.message });
  }
}

export async function getMyVirtualAccount(req: AuthRequest, res: Response) {
  const userId = req.user?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const [virtualAccount] = await db
    .select()
    .from(virtualAccounts)
    .where(eq(virtualAccounts.userId, userId))
    .limit(1);

  if (!virtualAccount) {
    res.status(404).json({ error: "Virtual account not found" });
    return;
  }

  res.status(200).json({
    success: true,
    virtualAccount: {
      virtual_account_id: virtualAccount.virtualAccountId,
      account_ref: virtualAccount.accountRef,
      account_name: virtualAccount.accountName,
      bank_account_number: virtualAccount.bankAccountNumber,
      bank_account_name: virtualAccount.bankAccountName,
      bank_name: virtualAccount.bankName,
      currency: virtualAccount.currency,
      status: virtualAccount.status,
      is_dynamic: virtualAccount.isDynamic,
      created_at: virtualAccount.createdAt,
    },
  });
}

export async function suspendMyVirtualAccount(req: AuthRequest, res: Response) {
  const userId = req.user?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const [virtualAccount] = await db
    .select()
    .from(virtualAccounts)
    .where(eq(virtualAccounts.userId, userId))
    .limit(1);

  if (!virtualAccount) {
    res.status(404).json({ error: "Virtual account not found" });
    return;
  }

  if (virtualAccount.status !== "active") {
    res.status(400).json({ error: "Virtual account is not active" });
    return;
  }

  try {
    if (virtualAccount.nombaAccountId) {
      await suspendVirtualAccount(virtualAccount.nombaAccountId);
    }

    await db
      .update(virtualAccounts)
      .set({ status: "suspended", updatedAt: new Date() })
      .where(eq(virtualAccounts.virtualAccountId, virtualAccount.virtualAccountId));

    res.status(200).json({ success: true, message: "Virtual account suspended successfully" });
  } catch (error: any) {
    console.error("Error suspending virtual account:", error);
    res.status(500).json({ error: "Failed to suspend virtual account", message: error.message });
  }
}

export async function getWalletBalance(req: AuthRequest, res: Response) {
  const userId = req.user?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const [wallet] = await db.select().from(wallets).where(eq(wallets.userId, userId)).limit(1);

  if (!wallet) {
    res.status(404).json({ error: "Wallet not found" });
    return;
  }

  res.status(200).json({
    success: true,
    wallet: {
      wallet_id: wallet.walletId,
      user_id: wallet.userId,
      available_balance: String(wallet.availableBalance),
      pending_balance: String(wallet.pendingBalance),
      total_paid_in: String(wallet.totalPaidIn),
      total_paid_out: String(wallet.totalPaidOut),
      currency: wallet.currency,
      created_at: wallet.createdAt,
      updated_at: wallet.updatedAt,
    },
  });
}
