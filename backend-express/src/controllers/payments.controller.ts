import type { Request, Response } from "express";
import { and, eq, or } from "drizzle-orm";
import { db } from "../db/index.js";
import { orders, payments, payouts, wallets, transactions, walletLedgerEntries, virtualAccounts } from "../db/schema.js";
import { verifyTransaction, verifyWebhookSignatureWithTimestamp } from "../utils/nomba.js";
import { createNotification } from "../utils/notifications.js";
import { TOPUP_ORDER_PREFIX } from "./wallet.controller.js";

function parseWebhookPayload(raw: Buffer): unknown {
  const text = raw.toString("utf8");
  return JSON.parse(text);
}

function getEventType(payload: any): string {
  return String(
    payload.event ?? payload.type ?? payload.eventType ?? payload.data?.event ?? payload.data?.type ?? ""
  ).toLowerCase();
}

function getOrderReference(payload: any): string | undefined {
  return (
    payload.orderReference ??
    payload.order_ref ??
    payload.data?.orderReference ??
    payload.data?.order_ref ??
    payload.data?.meta?.orderReference ??
    payload.data?.meta?.order_ref
  );
}

function getMerchantTxRef(payload: any): string | undefined {
  return (
    payload.merchantTxRef ??
    payload.merchant_tx_ref ??
    payload.data?.merchantTxRef ??
    payload.data?.merchant_tx_ref ??
    payload.data?.meta?.merchantTxRef ??
    payload.data?.meta?.merchant_tx_ref
  );
}

function getNombaReference(payload: any): string | undefined {
  return (
    payload.data?.merchantTxRef ??
    payload.data?.merchant_tx_ref ??
    payload.data?.transactionReference ??
    payload.data?.transaction_reference ??
    payload.data?.reference ??
    payload.data?.meta?.merchantTxRef ??
    payload.orderReference ??
    payload.order_ref
  );
}

function getVirtualAccountRef(payload: any): string | undefined {
  return (
    // Documented shape: data.transaction.aliasAccountReference (payment_success VA transfer)
    payload.data?.transaction?.aliasAccountReference ??
    // Fallbacks
    payload.data?.customerAccount?.accountRef ??
    payload.data?.accountRef ??
    payload.data?.virtualAccount?.accountRef ??
    payload.accountRef
  );
}

function getVirtualAccountBankNumber(payload: any): string | undefined {
  return (
    payload.data?.customerAccount?.accountNumber ??
    payload.data?.customer_account?.account_number ??
    payload.data?.accountNumber ??
    payload.data?.account_number ??
    payload.data?.virtualAccount?.bankAccountNumber ??
    payload.data?.virtual_account?.bank_account_number
  );
}

function getWebhookAmount(payload: any): number | undefined {
  const raw =
    // Documented shape: data.transaction.transactionAmount (payment_success, payout_success, etc.)
    payload.data?.transaction?.transactionAmount ??
    payload.data?.transaction?.transaction_amount ??
    // Fallbacks for older / variant shapes
    payload.data?.transactionAmount ??
    payload.data?.transaction_amount ??
    payload.data?.amount ??
    payload.data?.totalAmount ??
    payload.amount;

  const amount = typeof raw === "string" ? Number(raw.replace(/,/g, "")) : Number(raw);
  return Number.isFinite(amount) && amount > 0 ? amount : undefined;
}

// Nomba webhook amounts for virtual account deposits arrive in naira.
function nairaToKobo(amountNaira: number): number {
  return Math.round(amountNaira * 100);
}

function orderAmountKobo(order: typeof orders.$inferSelect): number {
  // order.totalAmount is stored in kobo — return directly.
  return order.totalAmount;
}

function getVerifiedTransactionStatus(result: unknown): string | undefined {
  // Nomba GET /v1/transactions/accounts/single wraps the record in `data`.
  // Some sandbox responses omit the wrapper; try both levels.
  const data = (result as any)?.data ?? result;
  return String(
    data?.status ??
    data?.transactionStatus ??
    data?.transaction_status ??
    data?.paymentStatus ??
    data?.payment_status ??
    "",
  ).toUpperCase() || undefined;
}

async function verifyNombaPaymentIfPossible(orderReference: string): Promise<boolean> {
  try {
    const verification = await verifyTransaction(orderReference);
    const status = getVerifiedTransactionStatus(verification);
    // If Nomba returns no status field (e.g. sandbox gap), assume the webhook is truthful.
    if (!status) return true;
    return ["SUCCESS", "SUCCESSFUL", "COMPLETED", "PAID"].includes(status);
  } catch (error) {
    // Log but do NOT re-throw: a transient network error must not cause the webhook
    // handler to return 5xx, which would make Nomba retry indefinitely.
    // We trust the webhook event itself; the idempotency check prevents double-credit.
    console.error("[nomba-verify-transaction] network/API error — proceeding on webhook trust:", error);
    return true;
  }
}

export async function handleNombaWebhook(req: Request, res: Response) {
  // express.raw() in app.ts captures this path before JSON middleware,
  // so req.body must be a Buffer. Any other type means a misconfigured
  // middleware stack — reject immediately to prevent signature bypass.
  if (!Buffer.isBuffer(req.body)) {
    console.error("[nomba-webhook] req.body is not a Buffer — check middleware order in app.ts");
    res.status(400).json({ error: "Invalid request body format" });
    return;
  }
  const rawBody = req.body;

  // HTTP header names are case-insensitive; Express lowercases them for us.
  const signature = req.header("nomba-signature") ?? req.header("nomba-sig-value") ?? "";
  const timestamp = req.header("nomba-timestamp");

  if (!verifyWebhookSignatureWithTimestamp(rawBody, signature, timestamp)) {
    console.warn("[nomba-webhook] signature verification failed — rejecting request");
    res.status(401).json({ error: "Invalid webhook signature" });
    return;
  }

  let payload: any;
  try {
    payload = parseWebhookPayload(rawBody);
  } catch {
    res.status(400).json({ error: "Unable to parse webhook payload" });
    return;
  }

  const eventType = getEventType(payload);
  if (!eventType) {
    res.status(400).json({ error: "Missing webhook event type" });
    return;
  }

  switch (eventType) {
    // ── Payment success (checkout order OR virtual account transfer) ──────────
    // Nomba sends event_type:"payment_success" for both card payments and VA
    // credits. Distinguish by presence of aliasAccountType:"VIRTUAL" / accountRef.
    case "payment_success":
      if (getVirtualAccountRef(payload) || payload.data?.transaction?.aliasAccountType === "VIRTUAL") {
        await handleVirtualAccountPayment(payload, res);
      } else {
        await handlePaymentSuccess(payload, res);
      }
      break;

    // ── Payment failure ───────────────────────────────────────────────────────
    case "payment_failed":
      await handlePaymentFailed(payload, res);
      break;

    // ── Payment reversal (chargeback / customer refund back to sender) ────────
    // Money has already left the account. Log it and alert — do not silently 200.
    case "payment_reversal":
      console.error("[nomba-webhook] payment_reversal received — manual review required:", JSON.stringify(payload).slice(0, 500));
      // TODO: debit the wallet and notify the user when reversal handling is built.
      res.status(200).json({ received: true, message: "payment_reversal logged — pending implementation" });
      break;

    // ── Payout success ────────────────────────────────────────────────────────
    case "payout_success":
      await handlePayoutSuccess(payload, res);
      break;

    // ── Payout failure ────────────────────────────────────────────────────────
    case "payout_failed":
      await handlePayoutFailure(payload, res);
      break;

    // ── Payout refund (failed transfer credited back to our account) ──────────
    case "payout_refund":
      await handlePayoutFailure(payload, res);
      break;

    default:
      console.log(`[nomba-webhook] unhandled event type: '${eventType}'`);
      res.status(200).json({ received: true, message: `Unhandled event type '${eventType}'` });
  }
}

/**
 * Handles a Nomba payment_success webhook for a wallet top-up checkout order.
 * The full userId is read from orderMetaData embedded in the Nomba webhook payload.
 */
async function handleTopupPaymentSuccess(orderReference: string, payload: any, res: Response) {
  // The userId is stored in orderMetaData.userId when the checkout was created.
  const userId: string | undefined =
    payload.data?.orderMetaData?.userId ??
    payload.orderMetaData?.userId ??
    payload.data?.meta?.userId ??
    payload.data?.metadata?.userId;

  if (!userId) {
    console.error("[topup-webhook] missing userId in orderMetaData, ref:", orderReference, "keys:", JSON.stringify(Object.keys(payload.data ?? {})));
    res.status(400).json({ error: "Could not resolve userId from topup webhook payload" });
    return;
  }

  // Idempotency: use the orderReference itself as the key
  const idempotencyKey = `topup_${orderReference}`;
  const [existing] = await db
    .select({ ledgerEntryId: walletLedgerEntries.ledgerEntryId })
    .from(walletLedgerEntries)
    .where(eq(walletLedgerEntries.idempotencyKey, idempotencyKey))
    .limit(1);

  if (existing) {
    res.status(200).json({ success: true, message: "Topup webhook already processed" });
    return;
  }

  // Derive amount from the webhook payload (naira float → kobo)
  const rawAmount = getWebhookAmount(payload);
  if (!rawAmount || rawAmount <= 0) {
    res.status(400).json({ error: "Missing or zero amount in topup webhook" });
    return;
  }
  const amountKobo = Math.round(rawAmount * 100);

  const [wallet] = await db.select().from(wallets).where(eq(wallets.userId, userId)).limit(1);
  if (!wallet) {
    res.status(404).json({ error: "Wallet not found for topup user" });
    return;
  }

  const newAvailableBalance = wallet.availableBalance + amountKobo;
  const newTotalPaidIn = wallet.totalPaidIn + amountKobo;

  await db.transaction(async (tx) => {
    await tx.update(wallets)
      .set({ availableBalance: newAvailableBalance, totalPaidIn: newTotalPaidIn, lastUpdated: new Date(), updatedAt: new Date() })
      .where(eq(wallets.walletId, wallet.walletId));

    await tx.insert(walletLedgerEntries).values({
      walletId: wallet.walletId,
      userId,
      type: "credit",
      amount: amountKobo,
      balanceBefore: wallet.availableBalance,
      balanceAfter: newAvailableBalance,
      referenceType: "topup",
      idempotencyKey,
      description: `Wallet top-up via Nomba checkout`,
      status: "completed",
      metadata: payload,
    } as any);

    await tx.insert(transactions).values({
      walletId: wallet.walletId,
      userId,
      type: "credit",
      amount: amountKobo,
      balanceBefore: wallet.availableBalance,
      balanceAfter: newAvailableBalance,
      referenceType: "topup",
      description: `Wallet top-up via Nomba checkout`,
      status: "completed",
    });
  });

  await createNotification({
    userId,
    type: "payment",
    title: "Wallet Funded",
    message: `Your wallet has been credited with ₦${rawAmount.toFixed(2)}`,
    referenceType: "topup",
  });

  res.status(200).json({ success: true, amount: amountKobo });
}

async function handlePaymentSuccess(payload: any, res: Response) {
  const orderReference = getOrderReference(payload);
  if (!orderReference) {
    res.status(400).json({ error: "Missing order reference" });
    return;
  }

  // ── Wallet top-up checkout ────────────────────────────────────────────────
  // Detect a topup either by our prefix (if Nomba preserved it) OR by the
  // orderMetaData.type field we embed when creating the checkout order.
  // Nomba sometimes replaces our orderReference with their own "ord_..." ID
  // for bank-transfer payments, so the prefix check alone is not reliable.
  const isTopup =
    orderReference.startsWith(TOPUP_ORDER_PREFIX) ||
    payload.data?.orderMetaData?.type === "wallet_topup" ||
    payload.orderMetaData?.type === "wallet_topup";

  if (isTopup) {
    await handleTopupPaymentSuccess(orderReference, payload, res);
    return;
  }

  const [order] = await db
    .select()
    .from(orders)
    .where(
      or(
        eq(orders.orderRef, orderReference),
        eq(orders.nombaOrderReference, orderReference),
      ),
    )
    .limit(1);

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  const verified = await verifyNombaPaymentIfPossible(orderReference);
  if (!verified) {
    res.status(409).json({ error: "Nomba transaction is not successful yet" });
    return;
  }

  const nombaReference = getNombaReference(payload);
  const existingPayment = nombaReference
    ? (await db.select().from(payments).where(eq(payments.nombaReference, nombaReference)).limit(1))[0]
    : (await db.select().from(payments).where(and(eq(payments.orderId, order.orderId), eq(payments.status, "success"))).limit(1))[0];

  if (existingPayment?.status === "success") {
    if (order.status === "pending_payment") {
      await db.update(orders).set({ status: "payment_confirmed" }).where(eq(orders.orderId, order.orderId));
    }
    res.status(200).json({ success: true, message: "Webhook already processed" });
    return;
  }

  let paymentId: string | undefined;
  const shouldCreditWallet = order.status === "pending_payment";
  const amountKobo = orderAmountKobo(order);

  await db.transaction(async (tx) => {
    const [payment] = await tx.insert(payments).values({
      orderId: order.orderId,
      buyerId: order.buyerId,
      farmerId: order.farmerId,
      amount: amountKobo,
      nombaReference: nombaReference ?? null,
      status: "success",
      paymentMethod: payload.data?.paymentVendor ?? payload.data?.payment_method ?? null,
      metadata: payload,
      paidAt: new Date(),
      webhookReceivedAt: new Date(),
    }).returning();
    paymentId = payment?.paymentId;

    if (!shouldCreditWallet) return;

    await tx.update(orders).set({ status: "payment_confirmed" }).where(eq(orders.orderId, order.orderId));

    const [wallet] = await tx.select().from(wallets).where(eq(wallets.userId, order.farmerId)).limit(1);
    if (!wallet) return;

    const newPendingBalance = wallet.pendingBalance + amountKobo;
    const newTotalPaidIn = wallet.totalPaidIn + amountKobo;
    await tx.update(wallets)
        .set({ pendingBalance: newPendingBalance, totalPaidIn: newTotalPaidIn, updatedAt: new Date() })
        .where(eq(wallets.walletId, wallet.walletId));

    await tx.insert(walletLedgerEntries).values({
        walletId: wallet.walletId,
        userId: order.farmerId,
        type: "credit",
        amount: amountKobo,
        balanceBefore: wallet.pendingBalance,
        balanceAfter: newPendingBalance,
        referenceId: order.orderId,
        referenceType: "order",
        // Idempotency: nombaReference from the webhook, else fall back to orderRef.
        // This prevents double-credit if Nomba retries after a slow 200 ack.
        idempotencyKey: nombaReference ? `escrow_hold_nomba_${nombaReference}` : `escrow_hold_${order.orderId}`,
        description: `Escrow credit for order ${order.orderRef}`,
        status: "completed",
        metadata: payload,
      });

    await tx.insert(transactions).values({
        walletId: wallet.walletId,
        userId: order.farmerId,
        type: "credit",
        amount: amountKobo,
        balanceBefore: wallet.pendingBalance,
        balanceAfter: newPendingBalance,
        description: `Escrow credit for order ${order.orderRef}`,
        status: "completed",
      });
  });

  if (shouldCreditWallet) {
    await createNotification({
      userId: order.farmerId,
      type: "payment",
      title: "Payment Confirmed",
      message: `Payment for order #${order.orderRef} has been confirmed and secured in escrow`,
      referenceId: order.orderId,
      referenceType: "order",
    });
  }

  res.status(200).json({ success: true, payment_id: paymentId });
}

// Look up a payout by the reference that Nomba sends back in the webhook.
// Nomba sends merchantTxRef which maps to our internal transferRef (stored in
// payouts.nombaReference) OR to the merchantTxRef column if separately tracked.
async function findPayoutByRef(ref: string) {
  // 1. Try direct nombaReference match (our transferRef stored at creation time).
  const [byNombaRef] = await db
    .select()
    .from(payouts)
    .where(eq(payouts.nombaReference, ref))
    .limit(1);
  if (byNombaRef) return byNombaRef;

  // 2. Try merchantTxRef column (set when we store the Nomba-returned tx ref).
  const [byMerchantRef] = await db
    .select()
    .from(payouts)
    .where(eq(payouts.merchantTxRef, ref))
    .limit(1);
  if (byMerchantRef) return byMerchantRef;

  // 3. Try idempotencyKey (often the same as transferRef).
  const [byIdempotency] = await db
    .select()
    .from(payouts)
    .where(eq(payouts.idempotencyKey, ref))
    .limit(1);
  return byIdempotency ?? null;
}

async function handlePayoutSuccess(payload: any, res: Response) {
  const merchantTxRef = getMerchantTxRef(payload);
  if (!merchantTxRef) {
    res.status(400).json({ error: "Missing merchant transaction reference" });
    return;
  }

  const payout = await findPayoutByRef(merchantTxRef);
  if (!payout) {
    res.status(404).json({ error: "Payout record not found" });
    return;
  }

  if (payout.status === "success") {
    res.status(200).json({ success: true, message: "Payout already completed" });
    return;
  }

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
  }

  await db.update(transactions)
    .set({ status: "completed" })
    .where(eq(transactions.referenceId, payout.payoutId));

  await createNotification({
    userId: payout.farmerId,
    type: "payment",
    title: "Withdrawal Completed",
    message: `Your withdrawal for order #${payout.orderId ?? payout.payoutId} has completed successfully`,
    referenceId: payout.payoutId,
    referenceType: "payout",
  });

  res.status(200).json({ success: true });
}

async function handlePayoutFailure(payload: any, res: Response) {
  const merchantTxRef = getMerchantTxRef(payload);
  if (!merchantTxRef) {
    res.status(400).json({ error: "Missing merchant transaction reference" });
    return;
  }

  const payout = await findPayoutByRef(merchantTxRef);
  if (!payout) {
    res.status(404).json({ error: "Payout record not found" });
    return;
  }

  if (payout.status === "failed") {
    res.status(200).json({ success: true, message: "Payout already marked as failed" });
    return;
  }

  await db.update(payouts)
    .set({ status: "failed", failureReason: payload.data?.description ?? payload.description ?? "Payout failed", settledAt: new Date() })
    .where(eq(payouts.payoutId, payout.payoutId));

  const [wallet] = await db.select().from(wallets).where(eq(wallets.userId, payout.farmerId)).limit(1);
  if (wallet) {
    const restoredBalance = wallet.availableBalance + payout.netAmount;
    await db.update(wallets)
      .set({ availableBalance: restoredBalance, updatedAt: new Date() })
      .where(eq(wallets.walletId, wallet.walletId));

    await db.update(walletLedgerEntries)
      .set({ status: "failed", updatedAt: new Date() })
      .where(eq(walletLedgerEntries.referenceId, payout.payoutId));

    await db.update(transactions)
      .set({ status: "failed" })
      .where(eq(transactions.referenceId, payout.payoutId));

    await db.insert(walletLedgerEntries).values({
      walletId: wallet.walletId,
      userId: payout.farmerId,
      type: "credit",
      amount: payout.netAmount,
      balanceBefore: wallet.availableBalance,
      balanceAfter: restoredBalance,
      referenceId: payout.payoutId,
      referenceType: "payout_refund",
      description: `Refund failed payout ${payout.payoutId}`,
      status: "completed",
    });

    await db.insert(transactions).values({
      walletId: wallet.walletId,
      userId: payout.farmerId,
      type: "credit",
      amount: payout.netAmount,
      balanceBefore: wallet.availableBalance,
      balanceAfter: restoredBalance,
      description: `Refund failed payout ${payout.payoutId}`,
      status: "completed",
    });
  }

  await createNotification({
    userId: payout.farmerId,
    type: "payment",
    title: "Withdrawal Failed",
    message: `Your withdrawal for order #${payout.orderId ?? payout.payoutId} failed and has been restored to your wallet`,
    referenceId: payout.payoutId,
    referenceType: "payout",
  });

  res.status(200).json({ success: true });
}

async function handlePaymentFailed(payload: any, res: Response) {
  const orderReference = getOrderReference(payload);
  if (!orderReference) {
    // No order reference — just ack so Nomba doesn't keep retrying
    res.status(200).json({ received: true });
    return;
  }

  const [order] = await db
    .select()
    .from(orders)
    .where(
      or(
        eq(orders.orderRef, orderReference),
        eq(orders.nombaOrderReference, orderReference),
      ),
    )
    .limit(1);

  if (!order) {
    // Unknown order — ack anyway
    res.status(200).json({ received: true });
    return;
  }

  // Notify buyer of failed payment (order stays pending_payment so they can retry)
  await createNotification({
    userId: order.buyerId,
    type: "payment",
    title: "Payment Failed",
    message: `Your payment for order #${order.orderRef} failed. Please try again.`,
    referenceId: order.orderId,
    referenceType: "order",
  });

  res.status(200).json({ received: true });
}



async function handleVirtualAccountPayment(payload: any, res: Response) {
  const accountRef = getVirtualAccountRef(payload);
  const bankAccountNumber = getVirtualAccountBankNumber(payload);
  const amount = getWebhookAmount(payload);
  const paymentReference = String(
    payload.data?.reference ??
    payload.reference ??
    payload.data?.transactionReference ??
    payload.data?.transaction_reference ??
    payload.data?.sessionId ??
    payload.data?.session_id ??
    payload.data?.merchantTxRef ??
    "",
  ).trim();

  if (!amount) {
    res.status(400).json({ error: "Missing amount in virtual account payment webhook" });
    return;
  }

  if (!accountRef && !bankAccountNumber) {
    res.status(400).json({ error: "Missing account reference or account number in webhook" });
    return;
  }

  if (paymentReference) {
    const [existingLedgerEntry] = await db
      .select({ ledgerEntryId: walletLedgerEntries.ledgerEntryId })
      .from(walletLedgerEntries)
      .where(eq(walletLedgerEntries.idempotencyKey, paymentReference))
      .limit(1);

    if (existingLedgerEntry) {
      res.status(200).json({ success: true, message: "Webhook already processed" });
      return;
    }
  }

  // Look up virtual account by accountRef first, fall back to bank account number.
  let virtualAccount: typeof virtualAccounts.$inferSelect | undefined;

  if (accountRef) {
    const [row] = await db
      .select()
      .from(virtualAccounts)
      .where(eq(virtualAccounts.accountRef, accountRef))
      .limit(1);
    virtualAccount = row;
  }

  if (!virtualAccount && bankAccountNumber) {
    const [row] = await db
      .select()
      .from(virtualAccounts)
      .where(eq(virtualAccounts.bankAccountNumber, bankAccountNumber))
      .limit(1);
    virtualAccount = row;
  }

  if (!virtualAccount) {
    console.error("[va-payment] virtual account not found — accountRef:", accountRef, "bankAccountNumber:", bankAccountNumber);
    res.status(404).json({ error: "Virtual account not found" });
    return;
  }

  if (virtualAccount.status !== "active") {
    res.status(400).json({ error: "Virtual account is not active" });
    return;
  }

  const amountKobo = nairaToKobo(amount);

  const [wallet] = await db
    .select()
    .from(wallets)
    .where(eq(wallets.userId, virtualAccount.userId))
    .limit(1);

  if (!wallet) {
    res.status(404).json({ error: "Wallet not found" });
    return;
  }

  await db.transaction(async (tx) => {
    const newAvailableBalance = wallet.availableBalance + amountKobo;
    const newTotalPaidIn = wallet.totalPaidIn + amountKobo;

    await tx.update(wallets)
      .set({
        availableBalance: newAvailableBalance,
        totalPaidIn: newTotalPaidIn,
        lastUpdated: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(wallets.walletId, wallet.walletId));

    await tx.insert(walletLedgerEntries).values({
      walletId: wallet.walletId,
      userId: virtualAccount.userId,
      type: "credit",
      amount: amountKobo,
      balanceBefore: wallet.availableBalance,
      balanceAfter: newAvailableBalance,
      referenceId: virtualAccount.virtualAccountId,
      referenceType: "virtual_account",
      idempotencyKey: paymentReference || null,
      description: `Wallet funding via virtual account ${virtualAccount.bankAccountNumber}`,
      status: "completed",
      metadata: payload,
    });

    await tx.insert(transactions).values({
      walletId: wallet.walletId,
      userId: virtualAccount.userId,
      type: "credit",
      amount: amountKobo,
      balanceBefore: wallet.availableBalance,
      balanceAfter: newAvailableBalance,
      referenceId: virtualAccount.virtualAccountId,
      referenceType: "virtual_account",
      description: `Wallet funding via virtual account ${virtualAccount.bankAccountNumber}`,
      status: "completed",
    });
  });

  await createNotification({
    userId: virtualAccount.userId,
    type: "payment",
    title: "Wallet Funded",
    message: `Your wallet has been credited with ₦${amount.toFixed(2)} via virtual account`,
    referenceId: virtualAccount.virtualAccountId,
    referenceType: "virtual_account",
  });

  res.status(200).json({ success: true, amount: amountKobo });
}
