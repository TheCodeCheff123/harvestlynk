import type { Request, Response } from "express";
import { eq, or } from "drizzle-orm";
import { db } from "../db/index.js";
import { orders, payments, payouts, wallets, transactions, walletLedgerEntries } from "../db/schema.js";
import { verifyWebhookSignature } from "../utils/nomba.js";
import { createNotification } from "../utils/notifications.js";

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

export async function handleNombaWebhook(req: Request, res: Response) {
  const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body));
  const signature = String(req.header("nomba-signature") ?? req.header("Nomba-Signature") ?? "");

  if (!verifyWebhookSignature(rawBody, signature)) {
    res.status(401).json({ error: "Invalid webhook signature" });
    return;
  }

  let payload: any;
  try {
    payload = parseWebhookPayload(rawBody);
  } catch (error) {
    res.status(400).json({ error: "Unable to parse webhook payload" });
    return;
  }

  const eventType = getEventType(payload);
  if (!eventType) {
    res.status(400).json({ error: "Missing webhook event type" });
    return;
  }

  switch (eventType) {
    case "payment_success":
      await handlePaymentSuccess(payload, res);
      break;
    case "payout_success":
      await handlePayoutSuccess(payload, res);
      break;
    case "payout_failed":
    case "payout_refund":
      await handlePayoutFailure(payload, res);
      break;
    default:
      res.status(200).json({ received: true, message: `Ignored event type '${eventType}'` });
  }
}

async function handlePaymentSuccess(payload: any, res: Response) {
  const orderReference = getOrderReference(payload);
  if (!orderReference) {
    res.status(400).json({ error: "Missing order reference" });
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

  const nombaReference = getNombaReference(payload);
  const existingPayment = nombaReference ?
    (await db.select().from(payments).where(eq(payments.nombaReference, nombaReference)).limit(1))[0] :
    undefined;

  if (existingPayment?.status === "success") {
    if (order.status === "pending_payment") {
      await db.update(orders).set({ status: "payment_confirmed" }).where(eq(orders.orderId, order.orderId));
    }
    res.status(200).json({ success: true, message: "Webhook already processed" });
    return;
  }

  const [payment] = await db.insert(payments).values({
    orderId: order.orderId,
    buyerId: order.buyerId,
    farmerId: order.farmerId,
    amount: order.totalAmount,
    nombaReference: nombaReference ?? null,
    status: "success",
    paymentMethod: payload.data?.paymentVendor ?? payload.data?.payment_method ?? null,
    metadata: payload,
    paidAt: new Date(),
    webhookReceivedAt: new Date(),
  }).returning();

  const shouldCreditWallet = order.status === "pending_payment";
  if (shouldCreditWallet) {
    await db.update(orders).set({ status: "payment_confirmed" }).where(eq(orders.orderId, order.orderId));

    const [wallet] = await db.select().from(wallets).where(eq(wallets.userId, order.farmerId)).limit(1);
    if (wallet) {
      const newPendingBalance = wallet.pendingBalance + order.totalAmount;
      const newTotalPaidIn = wallet.totalPaidIn + order.totalAmount;
      await db.update(wallets)
        .set({ pendingBalance: newPendingBalance, totalPaidIn: newTotalPaidIn, updatedAt: new Date() })
        .where(eq(wallets.walletId, wallet.walletId));

      await db.insert(walletLedgerEntries).values({
        walletId: wallet.walletId,
        userId: order.farmerId,
        type: "credit",
        amount: order.totalAmount,
        balanceBefore: wallet.pendingBalance,
        balanceAfter: newPendingBalance,
        referenceId: order.orderId,
        referenceType: "order",
        description: `Escrow credit for order ${order.orderRef}`,
        status: "completed",
        metadata: payload,
      });

      await db.insert(transactions).values({
        walletId: wallet.walletId,
        userId: order.farmerId,
        type: "credit",
        amount: order.totalAmount,
        balanceBefore: wallet.pendingBalance,
        balanceAfter: newPendingBalance,
        description: `Escrow credit for order ${order.orderRef}`,
        status: "completed",
      });
    }

    await createNotification({
      userId: order.farmerId,
      type: "payment",
      title: "Payment Confirmed",
      message: `Payment for order #${order.orderRef} has been confirmed and secured in escrow`,
      referenceId: order.orderId,
      referenceType: "order",
    });
  }

  res.status(200).json({ success: true, payment_id: payment!.paymentId });
}

async function handlePayoutSuccess(payload: any, res: Response) {
  const merchantTxRef = getMerchantTxRef(payload);
  if (!merchantTxRef) {
    res.status(400).json({ error: "Missing merchant transaction reference" });
    return;
  }

  const [payout] = await db.select().from(payouts).where(eq(payouts.nombaReference, merchantTxRef)).limit(1);
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

  const [payout] = await db.select().from(payouts).where(eq(payouts.nombaReference, merchantTxRef)).limit(1);
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
