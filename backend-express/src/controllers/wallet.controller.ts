import type { Response } from "express";
import { eq, desc, and, gte, sql } from "drizzle-orm";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { db } from "../db/index.js";
import { getNigerianBanks, lookupAccount, initiateTransfer, requeryTransfer, fetchVirtualAccountTransactions, createCheckoutLink, type TransferOutcome } from "../utils/nomba.js";
import { payouts, wallets, transactions, walletLedgerEntries, virtualAccounts, users } from "../db/schema.js";
import { createNotification } from "../utils/notifications.js";
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
  // account_name must now be provided (obtained from /verify-bank before calling withdraw).
  account_name: z.string().min(1, "account_name is required — verify the bank account first"),
  idempotency_key: z.string().min(1).optional(),
});

export async function withdraw(req: AuthRequest, res: Response) {
  const parsed = withdrawSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors });
    return;
  }

  const { amount, bank_name, bank_code, account_number, account_name: accountName, idempotency_key } = parsed.data;
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
      // nombaReference holds our internal transferRef before Nomba confirms.
      // merchantTxRef mirrors it so inbound payout webhooks can find this row by either field.
      nombaReference: transferRef,
      merchantTxRef: transferRef,
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

  let outcome: TransferOutcome;
  try {
    outcome = await initiateTransfer({
      amountKobo: amount,
      accountNumber: account_number,
      accountName,
      bankCode: bank_code,
      transferRef: walletSnapshot.transferRef,
      senderName: "HarvestLynk Payout",
      narration: `Withdrawal ${walletSnapshot.transferRef}`,
      idempotencyKey: idempotencyKey ?? walletSnapshot.transferRef,
    });
  } catch (error) {
    // Network error or HTTP-level failure (Nomba unreachable / 5xx).
    // The transfer definitely never reached Nomba — safe to refund immediately.
    console.error("[withdraw] Nomba transfer call threw:", error);
    await _refundFailedPayout({
      walletId: walletSnapshot.walletId,
      payoutId: walletSnapshot.payoutId,
      transactionId: walletSnapshot.transactionId,
      userId: req.user!.userId,
      amount,
      idempotencyKey,
      transferRef: walletSnapshot.transferRef,
      reason: error instanceof Error ? error.message : String(error),
    });
    res.status(502).json({
      success: false,
      error: "Unable to reach payout provider",
      details: error instanceof Error ? error.message : String(error),
    });
    return;
  }

  if (!outcome.accepted) {
    console.warn("[withdraw] Nomba rejected transfer:", outcome.code, outcome.description);
    await _refundFailedPayout({
      walletId: walletSnapshot.walletId,
      payoutId: walletSnapshot.payoutId,
      transactionId: walletSnapshot.transactionId,
      userId: req.user!.userId,
      amount,
      idempotencyKey,
      transferRef: walletSnapshot.transferRef,
      reason: `Nomba rejection code ${outcome.code}: ${outcome.description}`,
    });

    // Return a user-readable message for known rejection reasons.
    const desc = (outcome.description ?? "").toUpperCase();
    const userMessage =
      desc.includes("INSUFFICIENT") ? "Insufficient funds in the payout account. Please contact support." :
      desc.includes("INVALID_ACCOUNT") || desc.includes("ACCOUNT_NOT_FOUND") ? "Invalid destination bank account. Please verify your account details." :
      desc.includes("INVALID_BANK") ? "Invalid bank code. Please select a valid bank." :
      `Transfer rejected: ${outcome.description}`;

    res.status(422).json({
      success: false,
      error: userMessage,
      nomba_code: outcome.code,
      details: outcome.description,
    });
    return;
  }

  // Transfer accepted (code "00" = instant success, other accepted codes = still processing).
  // Do NOT refund. Mark payout as processing and wait for the webhook to settle it.
  await db.update(payouts)
    .set({ status: "processing", processedAt: new Date(), updatedAt: new Date() })
    .where(eq(payouts.payoutId, walletSnapshot.payoutId));

  await db.update(walletLedgerEntries)
    .set({ status: "completed", updatedAt: new Date() })
    .where(eq(walletLedgerEntries.referenceId, walletSnapshot.payoutId));

  res.json({
    success: true,
    message: outcome.pending ? "Withdrawal submitted — awaiting bank confirmation" : "Withdrawal initiated",
    transaction_id: walletSnapshot.transactionId,
    payout_id: walletSnapshot.payoutId,
    status: outcome.pending ? "processing" : "pending",
    idempotency_key: idempotencyKey,
    nomba_code: outcome.code,
  });
}

// ─── Internal helper: roll back a payout that never reached Nomba ────────────

async function _refundFailedPayout(opts: {
  walletId: string;
  payoutId: string;
  transactionId: string;
  userId: string;
  amount: number;
  idempotencyKey: string | null;
  transferRef: string;
  reason: string;
}) {
  await db.transaction(async (tx) => {
    const [restoredWallet] = await tx.update(wallets)
      .set({
        availableBalance: sql`${wallets.availableBalance} + ${opts.amount}`,
        updatedAt: new Date(),
      })
      .where(eq(wallets.walletId, opts.walletId))
      .returning({ availableBalance: wallets.availableBalance });

    await tx.update(transactions)
      .set({ status: "failed" })
      .where(eq(transactions.transactionId, opts.transactionId));

    await tx.update(walletLedgerEntries)
      .set({ status: "failed", updatedAt: new Date() })
      .where(eq(walletLedgerEntries.referenceId, opts.payoutId));

    await tx.update(payouts)
      .set({
        status: "failed",
        failureReason: opts.reason,
        settledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(payouts.payoutId, opts.payoutId));

    await tx.insert(walletLedgerEntries).values({
      walletId: opts.walletId,
      userId: opts.userId,
      type: "credit",
      amount: opts.amount,
      balanceBefore: Number(restoredWallet!.availableBalance) - opts.amount,
      balanceAfter: Number(restoredWallet!.availableBalance),
      referenceId: opts.payoutId,
      referenceType: "payout_refund",
      idempotencyKey: opts.idempotencyKey,
      description: `Refund failed withdrawal ${opts.payoutId}`,
      status: "completed",
      metadata: { transfer_ref: opts.transferRef },
    });
  });
}

// ─── Payout Requery ──────────────────────────────────────────────────────────
//
// Used as a fallback when a payout webhook is delayed or missed.
// Queries Nomba for the transfer status by the stored transferRef (nombaReference),
// then settles the payout and wallet in the same way the webhook would.

export async function requeryPayout(req: AuthRequest, res: Response) {
  const payoutId = String(req.params["id"]);

  const [payout] = await db
    .select()
    .from(payouts)
    .where(and(eq(payouts.payoutId, payoutId), eq(payouts.farmerId, req.user!.userId)))
    .limit(1);

  if (!payout) {
    res.status(404).json({ error: "Payout not found" });
    return;
  }

  // Only requery transfers that are still in a non-terminal state.
  if (payout.status === "success" || payout.status === "failed") {
    res.json({ payout_id: payout.payoutId, status: payout.status, already_settled: true });
    return;
  }

  // The transferRef stored in nombaReference is the merchantTxRef we sent to Nomba.
  const transferRef = payout.nombaReference;
  if (!transferRef) {
    res.status(400).json({ error: "No transfer reference available for requery" });
    return;
  }

  let nombaStatus: string | undefined;
  try {
    const result = await requeryTransfer(transferRef);
    nombaStatus = result.status || undefined;
  } catch (error) {
    console.error("[payout-requery] Nomba requery error:", error);
    res.status(502).json({ error: "Unable to reach Nomba for requery", details: error instanceof Error ? error.message : String(error) });
    return;
  }

  if (!nombaStatus) {
    res.json({ payout_id: payout.payoutId, status: payout.status, nomba_status: null, message: "No status returned from Nomba yet" });
    return;
  }

  const isSuccess = ["SUCCESS", "SUCCESSFUL", "COMPLETED", "PAID"].includes(nombaStatus);
  const isFailed = ["FAILED", "REVERSED", "CANCELLED"].includes(nombaStatus);

  if (!isSuccess && !isFailed) {
    res.json({ payout_id: payout.payoutId, status: payout.status, nomba_status: nombaStatus, message: "Transfer still in progress" });
    return;
  }

  if (isSuccess) {
    await db.update(payouts)
      .set({ status: "success", processedAt: new Date(), settledAt: new Date(), updatedAt: new Date() })
      .where(eq(payouts.payoutId, payout.payoutId));

    const [wallet] = await db.select().from(wallets).where(eq(wallets.userId, payout.farmerId)).limit(1);
    if (wallet) {
      await db.update(wallets)
        .set({ totalPaidOut: wallet.totalPaidOut + payout.netAmount, updatedAt: new Date() })
        .where(eq(wallets.walletId, wallet.walletId));

      await db.update(walletLedgerEntries)
        .set({ status: "completed", updatedAt: new Date() })
        .where(eq(walletLedgerEntries.referenceId, payout.payoutId));

      await db.update(transactions)
        .set({ status: "completed" })
        .where(eq(transactions.referenceId, payout.payoutId));
    }

    res.json({ payout_id: payout.payoutId, status: "success", nomba_status: nombaStatus, settled: true });
    return;
  }

  // Failed / reversed — restore available balance
  const [wallet] = await db.select().from(wallets).where(eq(wallets.userId, payout.farmerId)).limit(1);

  await db.transaction(async (tx) => {
    await tx.update(payouts)
      .set({ status: "failed", failureReason: `Requery: ${nombaStatus}`, settledAt: new Date(), updatedAt: new Date() })
      .where(eq(payouts.payoutId, payout.payoutId));

    await tx.update(transactions)
      .set({ status: "failed" })
      .where(eq(transactions.referenceId, payout.payoutId));

    await tx.update(walletLedgerEntries)
      .set({ status: "failed", updatedAt: new Date() })
      .where(eq(walletLedgerEntries.referenceId, payout.payoutId));

    if (wallet) {
      const restoredAvailable = wallet.availableBalance + payout.netAmount;
      await tx.update(wallets)
        .set({ availableBalance: restoredAvailable, updatedAt: new Date() })
        .where(eq(wallets.walletId, wallet.walletId));

      await tx.insert(walletLedgerEntries).values({
        walletId: wallet.walletId,
        userId: payout.farmerId,
        type: "credit",
        amount: payout.netAmount,
        balanceBefore: wallet.availableBalance,
        balanceAfter: restoredAvailable,
        referenceId: payout.payoutId,
        referenceType: "payout_refund",
        idempotencyKey: `requery_refund_${payout.payoutId}`,
        description: `Refund for failed payout ${payout.payoutId} (requery)`,
        status: "completed",
      });

      await tx.insert(transactions).values({
        walletId: wallet.walletId,
        userId: payout.farmerId,
        type: "credit",
        amount: payout.netAmount,
        balanceBefore: wallet.availableBalance,
        balanceAfter: restoredAvailable,
        referenceId: payout.payoutId,
        referenceType: "payout_refund",
        description: `Refund for failed payout ${payout.payoutId} (requery)`,
        status: "completed",
      });
    }
  });

  res.json({ payout_id: payout.payoutId, status: "failed", nomba_status: nombaStatus, settled: true });
}

/**
 * POST /wallet/refresh
 *
 * Queries Nomba for recent transactions on the user's virtual account and
 * credits any that are not yet reflected in the local wallet ledger (i.e.
 * whose idempotency key is missing). This is the "manual refresh" safety net
 * for cases where a webhook was missed or delayed.
 */
export async function refreshWalletBalance(req: AuthRequest, res: Response) {
  const userId = req.user!.userId;

  // Look up the user's virtual account — without one there is nothing to sync.
  const [virtualAccount] = await db
    .select()
    .from(virtualAccounts)
    .where(eq(virtualAccounts.userId, userId))
    .limit(1);

  if (!virtualAccount) {
    res.status(404).json({ error: "No virtual account found. Fund your wallet by creating one first." });
    return;
  }

  if (!virtualAccount.nombaAccountId) {
    res.status(400).json({ error: "Virtual account has no Nomba account ID; cannot query Nomba." });
    return;
  }

  // Fetch recent transactions from Nomba.
  let nombaTransactions: Array<Record<string, unknown>>;
  try {
    nombaTransactions = await fetchVirtualAccountTransactions(virtualAccount.nombaAccountId);
  } catch (error) {
    console.error("[wallet-refresh] Nomba fetch failed:", error);
    res.status(502).json({ error: "Unable to reach Nomba", details: error instanceof Error ? error.message : String(error) });
    return;
  }

  console.log(`[wallet-refresh] fetched ${nombaTransactions.length} txs from Nomba for account ${virtualAccount.nombaAccountId}`);
  if (nombaTransactions.length > 0) {
    console.log("[wallet-refresh] sample tx:", JSON.stringify(nombaTransactions[0]).slice(0, 400));
  }

  // Filter to successful VA-credit transactions directed at this specific VA.
  //
  // The /v1/transactions/accounts endpoint returns ALL parent-account transactions
  // (card, checkout, transfers, VA credits). The shape observed in production:
  //   type:                   "vact_transfer"  — VA inflow
  //   status:                 "SUCCESS"
  //   aliasAccountReference:  the accountRef of the virtual account that received funds
  //                           (same value we store in virtualAccounts.accountRef)
  //
  // We match on BOTH type and aliasAccountReference so we never credit a transfer
  // that belongs to a different VA or a different application on this parent account.
  const VA_REF = virtualAccount.accountRef;
  const inflowTxs = nombaTransactions.filter((tx) => {
    const txType  = String(tx["type"] ?? "").toLowerCase();
    const status  = String(tx["status"] ?? tx["transactionStatus"] ?? "").toUpperCase();
    // aliasAccountReference identifies which virtual account received the funds
    const vaRef   = String(tx["aliasAccountReference"] ?? tx["virtualAccountReference"] ?? "");

    const isVaCredit = txType === "vact_transfer";
    const isSuccess  = status === "SUCCESS" || status === "SUCCESSFUL" || status === "COMPLETED";
    const isOurVa    = vaRef === VA_REF;

    return isVaCredit && isSuccess && isOurVa;
  });

  console.log(`[wallet-refresh] VA_REF="${VA_REF}" → ${inflowTxs.length} matching vact_transfer txs after filter`);

  if (inflowTxs.length === 0) {
    // Nothing to sync — just return current balance.
    const [wallet] = await db.select().from(wallets).where(eq(wallets.userId, userId)).limit(1);
    res.json({ synced: 0, wallet_balance: wallet ? String(wallet.availableBalance) : "0" });
    return;
  }

  // Load the user's wallet.
  const [wallet] = await db.select().from(wallets).where(eq(wallets.userId, userId)).limit(1);
  if (!wallet) {
    res.status(404).json({ error: "Wallet not found" });
    return;
  }

  let synced = 0;

  for (const tx of inflowTxs) {
    // Derive the canonical reference for this transaction — used as the
    // idempotency key so we never double-credit the same transfer.
    // Nomba's /v1/transactions/accounts fields (in priority order):
    //   sessionId              — NIP session ID, unique per bank transfer
    //   billingVendorReference — Nomba's internal unique reference
    //   id                     — Nomba transaction document ID (always present)
    const txRef = String(
      tx["sessionId"] ??
      tx["billingVendorReference"] ??
      tx["id"] ??
      tx["transactionRef"] ??
      tx["reference"] ??
      "",
    ).trim();

    if (!txRef) continue; // No reference means we cannot guarantee idempotency — skip.

    // Check whether this transaction is already in the ledger.
    const [existing] = await db
      .select({ ledgerEntryId: walletLedgerEntries.ledgerEntryId })
      .from(walletLedgerEntries)
      .where(eq(walletLedgerEntries.idempotencyKey, txRef))
      .limit(1);

    if (existing) continue; // Already credited.

    // Nomba's /v1/transactions/accounts returns amount as a naira decimal
    // string e.g. "100.0" or "1500.50". Always multiply by 100 to get kobo.
    const rawAmount = Number(tx["amount"] ?? tx["transactionAmount"] ?? 0);
    if (!rawAmount || rawAmount <= 0) continue;
    const amountKobo = Math.round(rawAmount * 100);

    // Re-read wallet inside the loop so each credit sees the latest balance.
    const [freshWallet] = await db.select().from(wallets).where(eq(wallets.walletId, wallet.walletId)).limit(1);
    if (!freshWallet) break;

    const newAvailableBalance = freshWallet.availableBalance + amountKobo;
    const newTotalPaidIn = freshWallet.totalPaidIn + amountKobo;

    await db.transaction(async (dbTx) => {
      await dbTx.update(wallets)
        .set({ availableBalance: newAvailableBalance, totalPaidIn: newTotalPaidIn, lastUpdated: new Date(), updatedAt: new Date() })
        .where(eq(wallets.walletId, freshWallet.walletId));

      await dbTx.insert(walletLedgerEntries).values({
        walletId: freshWallet.walletId,
        userId,
        type: "credit",
        amount: amountKobo,
        balanceBefore: freshWallet.availableBalance,
        balanceAfter: newAvailableBalance,
        referenceId: virtualAccount.virtualAccountId,
        referenceType: "virtual_account",
        idempotencyKey: txRef,
        description: `Wallet funding via virtual account ${virtualAccount.bankAccountNumber} (refresh)`,
        status: "completed",
        metadata: tx,
      });

      await dbTx.insert(transactions).values({
        walletId: freshWallet.walletId,
        userId,
        type: "credit",
        amount: amountKobo,
        balanceBefore: freshWallet.availableBalance,
        balanceAfter: newAvailableBalance,
        referenceId: virtualAccount.virtualAccountId,
        referenceType: "virtual_account",
        description: `Wallet funding via virtual account ${virtualAccount.bankAccountNumber} (refresh)`,
        status: "completed",
      });
    });

    synced += 1;
  }

  const [updatedWallet] = await db.select().from(wallets).where(eq(wallets.userId, userId)).limit(1);

  res.json({
    synced,
    wallet_balance: String(updatedWallet?.availableBalance ?? wallet.availableBalance),
    available_balance: String(updatedWallet?.availableBalance ?? wallet.availableBalance),
    pending_balance: String(updatedWallet?.pendingBalance ?? wallet.pendingBalance),
  });
}

// ─── Topup prefix — used to identify wallet-funding checkout orders in webhooks ─
export const TOPUP_ORDER_PREFIX = "topup-";

const topupSchema = z.object({
  amount: z.number().int().min(10000, "Minimum top-up is ₦100"),   // kobo
});

/**
 * POST /wallet/topup
 *
 * Creates a Nomba Checkout order for wallet funding.
 * The user pays via card or bank transfer on Nomba's hosted page.
 * On success Nomba fires a payment_success webhook which credits the wallet.
 * The callbackUrl brings the user back to the wallet page for confirmation.
 */
export async function createTopup(req: AuthRequest, res: Response) {
  const parsed = topupSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors });
    return;
  }

  const { amount } = parsed.data;
  const userId = req.user!.userId;
  const userEmail = req.user!.email;

  // Nomba caps orderReference at 50 chars.
  // Format: "topup-" (6) + 8-char userId prefix + "-" + 8-char random = 23 chars total.
  // The full userId is embedded in orderMetaData so the webhook can look it up.
  const orderReference = `${TOPUP_ORDER_PREFIX}${userId.slice(0, 8)}-${randomUUID().slice(0, 8)}`;

  // Callback URL: where Nomba redirects after payment.
  // The dashboard reads ?topup=success&ref=... and refreshes the balance.
  const appBaseUrl = process.env["FRONTEND_URL"] ?? "http://localhost:3000";
  const role = req.user!.role; // "buyer" | "farmer"
  const callbackUrl = `${appBaseUrl}/dashboard/${role}/wallet?topup=success&ref=${encodeURIComponent(orderReference)}`;

  let checkoutLink: string;
  try {
    const result = await createCheckoutLink({
      amountKobo: amount,
      customerEmail: userEmail,
      orderReference,
      callbackUrl,
      orderMetaData: {
        type: "wallet_topup",
        userId,
      },
    });
    checkoutLink = result.checkoutLink;
  } catch (error) {
    console.error("[wallet-topup] Nomba checkout creation failed:", error);
    res.status(502).json({
      error: "Unable to create payment session",
      details: error instanceof Error ? error.message : String(error),
    });
    return;
  }

  res.json({ checkout_url: checkoutLink, order_reference: orderReference, amount });
}

// ─── Internal Transfer ────────────────────────────────────────────────────────

const internalTransferSchema = z.object({
  to_username: z.string().min(1),
  amount: z.number().int().min(10000, "Minimum transfer is ₦100 (10000 kobo)"),
  note: z.string().max(100).optional(),
});

export async function internalTransfer(req: AuthRequest, res: Response) {
  const parsed = internalTransferSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors });
    return;
  }

  const { to_username, amount, note } = parsed.data;
  const senderId = req.user!.userId;

  // Look up recipient by username (case-insensitive)
  const [recipient] = await db
    .select({ id: users.id, firstName: users.firstName, lastName: users.lastName, username: users.username })
    .from(users)
    .where(sql`LOWER(${users.username}) = LOWER(${to_username})`)
    .limit(1);

  if (!recipient) {
    res.status(404).json({ error: `No user found with username @${to_username}` });
    return;
  }

  if (recipient.id === senderId) {
    res.status(400).json({ error: "You cannot transfer to yourself" });
    return;
  }

  // Advisory-lock both wallets to prevent race conditions (lower id first to prevent deadlock)
  const lockA = senderId < recipient.id ? senderId : recipient.id;
  const lockB = senderId < recipient.id ? recipient.id : senderId;

  let transactionId: string;
  let senderName: string;

  try {
    transactionId = await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${lockA})), pg_advisory_xact_lock(hashtext(${lockB}))`);

      const [senderWallet] = await tx.select().from(wallets).where(eq(wallets.userId, senderId)).limit(1);
      if (!senderWallet) throw new Error("Sender wallet not found");
      if (senderWallet.availableBalance < amount) throw new Error("Insufficient balance");

      const [recipientWallet] = await tx.select().from(wallets).where(eq(wallets.userId, recipient.id)).limit(1);
      if (!recipientWallet) throw new Error("Recipient wallet not found");

      const [senderUser] = await tx.select({ firstName: users.firstName, lastName: users.lastName, username: users.username }).from(users).where(eq(users.id, senderId)).limit(1);
      senderName = senderUser ? `${senderUser.firstName} ${senderUser.lastName}` : "User";
      const senderHandle = senderUser?.username ?? senderId;
      const recipientHandle = recipient.username ?? recipient.id;
      const recipientFullName = `${recipient.firstName} ${recipient.lastName}`;

      const newSenderBalance = senderWallet.availableBalance - amount;
      const newRecipientBalance = recipientWallet.availableBalance + amount;

      await tx.update(wallets).set({ availableBalance: newSenderBalance, updatedAt: new Date() }).where(eq(wallets.walletId, senderWallet.walletId));
      await tx.update(wallets).set({ availableBalance: newRecipientBalance, updatedAt: new Date() }).where(eq(wallets.walletId, recipientWallet.walletId));

      const idempotencyKeySender = `transfer_sender_${senderId}_${recipient.id}_${Date.now()}`;
      const idempotencyKeyRecipient = `transfer_recipient_${recipient.id}_${senderId}_${Date.now()}`;

      await tx.insert(walletLedgerEntries).values([
        {
          walletId: senderWallet.walletId, userId: senderId, type: "debit", amount,
          balanceBefore: senderWallet.availableBalance, balanceAfter: newSenderBalance,
          referenceId: recipient.id, referenceType: "internal_transfer",
          idempotencyKey: idempotencyKeySender,
          description: note ? `Transfer to @${recipientHandle}: ${note}` : `Transfer to @${recipientHandle}`,
          status: "completed",
        },
        {
          walletId: recipientWallet.walletId, userId: recipient.id, type: "credit", amount,
          balanceBefore: recipientWallet.availableBalance, balanceAfter: newRecipientBalance,
          referenceId: senderId, referenceType: "internal_transfer",
          idempotencyKey: idempotencyKeyRecipient,
          description: note ? `Transfer from @${senderHandle}: ${note}` : `Transfer from @${senderHandle}`,
          status: "completed",
        },
      ]);

      const [senderTx] = await tx.insert(transactions).values({
        walletId: senderWallet.walletId, userId: senderId, type: "debit", amount,
        balanceBefore: senderWallet.availableBalance, balanceAfter: newSenderBalance,
        referenceType: "internal_transfer",
        description: note ? `Transfer to @${recipientHandle}: ${note}` : `Transfer to @${recipientHandle}`,
        status: "completed",
      }).returning({ transactionId: transactions.transactionId });

      await tx.insert(transactions).values({
        walletId: recipientWallet.walletId, userId: recipient.id, type: "credit", amount,
        balanceBefore: recipientWallet.availableBalance, balanceAfter: newRecipientBalance,
        referenceType: "internal_transfer",
        description: note ? `Transfer from @${senderHandle}: ${note}` : `Transfer from @${senderHandle}`,
        status: "completed",
      });

      // Notifications
      const nairaAmount = (amount / 100).toLocaleString("en-NG", { minimumFractionDigits: 2 });
      await createNotification({
        userId: senderId,
        type: "payment",
        title: "Transfer Sent",
        message: `You sent ₦${nairaAmount} to @${recipientHandle} (${recipientFullName})`,
        referenceType: "internal_transfer",
      });
      await createNotification({
        userId: recipient.id,
        type: "payment",
        title: "Transfer Received",
        message: `You received ₦${nairaAmount} from @${senderHandle} (${senderName!})`,
        referenceType: "internal_transfer",
      });

      return senderTx!.transactionId;
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Transfer failed";
    const status = msg.includes("wallet not found") ? 404 : msg.includes("Insufficient") ? 400 : 500;
    res.status(status).json({ error: msg });
    return;
  }

  const recipientFullName = `${recipient.firstName} ${recipient.lastName}`;
  res.json({
    success: true,
    amount,
    recipient_name: recipientFullName,
    recipient_username: recipient.username ?? to_username,
    transaction_id: transactionId!,
  });
}
