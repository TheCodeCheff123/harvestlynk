import type { Response } from "express";
import { eq, desc, and, gte, sql } from "drizzle-orm";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { db } from "../db/index.js";
import { getNigerianBanks, lookupAccount, initiateTransfer } from "../utils/nomba.js";
import { payouts, wallets, transactions, walletLedgerEntries } from "../db/schema.js";
import type { AuthRequest } from "../middleware/auth.js";

type WithdrawIdempotencyKey = string | null;

type WithdrawResult =
  | { kind: "missing" }
  | {
      kind: "duplicate";
      payoutId: string;
      transactionId: string | null;
      status: string;
      transferRef: string | null;
    }
  | {
      kind: "ready";
      walletId: string;
      payoutId: string;
      transactionId: string;
      transferRef: string;
    }
  | { kind: "insufficient" };

export async function getBanks(_req: AuthRequest, res: Response) {
  try {
    const banks = await getNigerianBanks();
    const normalizedBanks = Array.isArray(banks)
      ? banks
          .filter((bank): bank is { code?: unknown; name?: unknown } => !!bank && typeof bank === "object")
          .map((bank) => ({
            code: String(bank.code ?? "").trim(),
            name: String(bank.name ?? "").trim(),
          }))
          .filter((bank) => bank.code.length > 0 && bank.name.length > 0)
          .filter((bank, index, list) => list.findIndex((item) => item.code === bank.code) === index)
      : [];

    res.json({ banks: normalizedBanks });
  } catch (error) {
    res.status(502).json({
      error: "Unable to fetch banks from Nomba",
      details: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function getBalance(req: AuthRequest, res: Response) {
  const [wallet] = await db
    .select()
    .from(wallets)
    .where(eq(wallets.userId, req.user!.userId))
    .limit(1);

  if (!wallet) {
    // Auto-create wallet if missing
    const [created] = await db
      .insert(wallets)
      .values({ userId: req.user!.userId, availableBalance: 0, pendingBalance: 0, totalPaidIn: 0, totalPaidOut: 0 })
      .returning();
    res.json({
      wallet_id: created!.walletId,
      user_id: created!.userId,
      available_balance: "0",
      pending_balance: "0",
      total_paid_in: "0",
      created_at: created!.createdAt,
      updated_at: created!.updatedAt,
    });
    return;
  }

  res.json({
    wallet_id: wallet.walletId,
    user_id: wallet.userId,
    available_balance: String(wallet.availableBalance),
    pending_balance: String(wallet.pendingBalance),
    total_paid_in: String(wallet.totalPaidIn),
    created_at: wallet.createdAt,
    updated_at: wallet.updatedAt,
  });
}

export async function getTransactions(req: AuthRequest, res: Response) {
  const rows = await db
    .select()
    .from(transactions)
    .where(eq(transactions.userId, req.user!.userId))
    .orderBy(desc(transactions.createdAt))
    .limit(50);

  res.json(
    rows.map((t) => ({
      transaction_id: t.transactionId,
      wallet_id: t.walletId,
      user_id: t.userId,
      type: t.type,
      amount: String(t.amount),
      balance_before: String(t.balanceBefore),
      balance_after: String(t.balanceAfter),
      reference_id: t.referenceId,
      reference_type: t.referenceType,
      description: t.description,
      status: t.status,
      created_at: t.createdAt,
    }))
  );
}

export async function getLedgerEntries(req: AuthRequest, res: Response) {
  const rows = await db
    .select()
    .from(walletLedgerEntries)
    .where(eq(walletLedgerEntries.userId, req.user!.userId))
    .orderBy(desc(walletLedgerEntries.createdAt))
    .limit(50);

  res.json(
    rows.map((entry) => ({
      ledger_entry_id: entry.ledgerEntryId,
      wallet_id: entry.walletId,
      user_id: entry.userId,
      type: entry.type,
      amount: String(entry.amount),
      balance_before: String(entry.balanceBefore),
      balance_after: String(entry.balanceAfter),
      reference_id: entry.referenceId,
      reference_type: entry.referenceType,
      idempotency_key: entry.idempotencyKey,
      description: entry.description,
      status: entry.status,
      metadata: entry.metadata,
      created_at: entry.createdAt,
      updated_at: entry.updatedAt,
    }))
  );
}

export async function verifyBank(req: AuthRequest, res: Response) {
  const bank_code = typeof req.query["bank_code"] === "string" ? req.query["bank_code"] : undefined;
  const account_number = typeof req.query["account_number"] === "string" ? req.query["account_number"] : undefined;

  if (!bank_code || !account_number) {
    res.status(400).json({ error: "bank_code and account_number are required" });
    return;
  }

  try {
    const data = await lookupAccount(account_number, bank_code);
    const accountName = String(
      (data as any)?.accountName ??
      (data as any)?.account_name ??
      (data as any)?.account?.name ??
      ""
    );

    res.json({
      success: true,
      message: "Bank account verified",
      data: {
        account_name: accountName,
        details: data,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : "Unable to verify bank account",
      data: { account_name: "", details: null },
    });
  }
}

const withdrawSchema = z.object({
  amount: z.number().int().positive("Amount must be a positive number (in kobo)"),
  bank_name: z.string().min(1),
  bank_code: z.string().min(1),
  account_number: z.string().min(10),
  account_name: z.string().min(1).optional(),
  idempotency_key: z.string().min(1).optional(),
});

export async function withdraw(req: AuthRequest, res: Response) {
  const parsed = withdrawSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors });
    return;
  }

  const { amount, bank_name, bank_code, account_number, idempotency_key } = parsed.data;
  const accountName = String(req.body.account_name ?? req.body.accountName ?? account_number);
  const idempotencyKey: WithdrawIdempotencyKey =
    String(req.header("idempotency-key") ?? idempotency_key ?? req.body.idempotencyKey ?? "").trim() || null;
  const commissionRate = 0.0;
  const commissionAmount = Math.round(amount * commissionRate);
  const netAmount = amount - commissionAmount;
  const transferRef = `withdrawal_${randomUUID()}`;

  const walletSnapshot = await db.transaction<WithdrawResult>(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${req.user!.userId}))`);

    const [wallet] = await tx
      .select()
      .from(wallets)
      .where(eq(wallets.userId, req.user!.userId))
      .limit(1);

    if (!wallet) {
      return { kind: "missing" as const };
    }

    if (idempotencyKey) {
      const [existingPayout] = await tx
        .select()
        .from(payouts)
        .where(and(eq(payouts.farmerId, req.user!.userId), eq(payouts.idempotencyKey, idempotencyKey)))
        .limit(1);

      if (existingPayout) {
        const [existingTransaction] = await tx
          .select({ transactionId: transactions.transactionId })
          .from(transactions)
          .where(eq(transactions.referenceId, existingPayout.payoutId))
          .limit(1);

        return {
          kind: "duplicate" as const,
          payoutId: existingPayout.payoutId,
          transactionId: existingTransaction?.transactionId ?? null,
          status: existingPayout.status,
          transferRef: existingPayout.nombaReference ?? null,
        };
      }
    }

    const [debitedWallet] = await tx
      .update(wallets)
      .set({
        availableBalance: sql`${wallets.availableBalance} - ${amount}`,
        updatedAt: new Date(),
      })
      .where(and(eq(wallets.walletId, wallet.walletId), gte(wallets.availableBalance, amount)))
      .returning({
        walletId: wallets.walletId,
        availableBalance: wallets.availableBalance,
        userId: wallets.userId,
      });

    if (!debitedWallet) {
      return { kind: "insufficient" as const };
    }

    const [payout] = await tx.insert(payouts).values({
      farmerId: req.user!.userId,
      grossAmount: amount,
      commissionAmount,
      netAmount,
      commissionRate: commissionRate.toString(),
      nombaReference: transferRef,
      idempotencyKey,
      status: "pending",
    }).returning();

    await tx.insert(walletLedgerEntries).values({
      walletId: debitedWallet.walletId,
      userId: req.user!.userId,
      type: "debit",
      amount,
      balanceBefore: debitedWallet.availableBalance + amount,
      balanceAfter: debitedWallet.availableBalance,
      referenceId: payout!.payoutId,
      referenceType: "payout",
      idempotencyKey,
      description: `Withdrawal reserve for ${bank_name}`,
      status: "pending",
      metadata: {
        bank_name,
        bank_code,
        account_number,
        transfer_ref: transferRef,
      },
    }).returning();

    const [txRow] = await tx.insert(transactions).values({
      walletId: debitedWallet.walletId,
      userId: req.user!.userId,
      type: "debit",
      amount,
      balanceBefore: debitedWallet.availableBalance + amount,
      balanceAfter: debitedWallet.availableBalance,
      referenceId: payout!.payoutId,
      referenceType: "payout",
      description: `Withdrawal to ${bank_name}`,
      status: "pending",
    }).returning();

    return {
      kind: "ready" as const,
      walletId: debitedWallet.walletId,
      payoutId: payout!.payoutId,
      transactionId: txRow!.transactionId,
      transferRef,
    };
  });

  if (walletSnapshot.kind === "missing") {
    res.status(404).json({ error: "Wallet not found" });
    return;
  }

  if (walletSnapshot.kind === "insufficient") {
    res.status(400).json({ error: "Insufficient balance" });
    return;
  }

  if (walletSnapshot.kind === "duplicate") {
    res.status(walletSnapshot.status === "failed" ? 409 : 200).json({
      success: walletSnapshot.status !== "failed",
      message: walletSnapshot.status === "failed"
        ? "This withdrawal was already attempted and failed"
        : "Withdrawal already initiated",
      transaction_id: walletSnapshot.transactionId,
      payout_id: walletSnapshot.payoutId,
      status: walletSnapshot.status,
      transfer_ref: walletSnapshot.transferRef,
      idempotent: true,
    });
    return;
  }

  try {
    const transferResult = await initiateTransfer({
      amountKobo: amount,
      accountNumber: account_number,
      accountName,
      bankCode: bank_code,
      transferRef: walletSnapshot.transferRef,
      senderName: "HarvestLynk Payout",
      narration: `Withdrawal ${walletSnapshot.transferRef}`,
    });

    await db.update(payouts)
      .set({ status: "processing", processedAt: new Date(), updatedAt: new Date() })
      .where(eq(payouts.payoutId, walletSnapshot.payoutId));

    await db.update(walletLedgerEntries)
      .set({ status: "completed", updatedAt: new Date() })
      .where(eq(walletLedgerEntries.referenceId, walletSnapshot.payoutId));

    res.json({
      success: true,
      message: "Withdrawal initiated",
      transaction_id: walletSnapshot.transactionId,
      payout_id: walletSnapshot.payoutId,
      status: "pending",
      idempotency_key: idempotencyKey,
      transfer: transferResult,
    });
  } catch (error) {
    await db.transaction(async (tx) => {
      const [restoredWallet] = await tx.update(wallets)
        .set({
          availableBalance: sql`${wallets.availableBalance} + ${amount}`,
          updatedAt: new Date(),
        })
        .where(eq(wallets.walletId, walletSnapshot.walletId))
        .returning({ availableBalance: wallets.availableBalance });

      await tx.update(transactions)
        .set({ status: "failed" })
        .where(eq(transactions.transactionId, walletSnapshot.transactionId));

      await tx.update(walletLedgerEntries)
        .set({ status: "failed", updatedAt: new Date() })
        .where(eq(walletLedgerEntries.referenceId, walletSnapshot.payoutId));

      await tx.update(payouts)
        .set({
          status: "failed",
          failureReason: error instanceof Error ? error.message : String(error),
          settledAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(payouts.payoutId, walletSnapshot.payoutId));

      await tx.insert(walletLedgerEntries).values({
        walletId: walletSnapshot.walletId,
        userId: req.user!.userId,
        type: "credit",
        amount,
        balanceBefore: Number(restoredWallet!.availableBalance) - amount,
        balanceAfter: Number(restoredWallet!.availableBalance),
        referenceId: walletSnapshot.payoutId,
        referenceType: "payout_refund",
        idempotencyKey,
        description: `Refund failed withdrawal ${walletSnapshot.payoutId}`,
        status: "completed",
        metadata: {
          transfer_ref: walletSnapshot.transferRef,
        },
      });
    });

    res.status(502).json({
      success: false,
      error: "Unable to initiate payout transfer",
      details: error instanceof Error ? error.message : error,
    });
  }
}
