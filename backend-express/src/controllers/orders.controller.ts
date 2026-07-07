import type { Response } from "express";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/index.js";
import {
  orders,
  listings,
  users,
  wallets,
  transactions,
  walletLedgerEntries,
  payments,
} from "../db/schema.js";
import { generateOrderRef } from "../utils/orderRef.js";
import { createNotification } from "../utils/notifications.js";
import {
  createCheckoutLink,
  cancelCheckoutOrder,
  refundCheckoutPayment,
} from "../utils/nomba.js";
import type { AuthRequest } from "../middleware/auth.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const createOrderSchema = z.object({
  listing_id: z.string().uuid(),
  quantity: z.number().positive(),
  delivery_method: z.enum(["pickup", "delivery"]),
  delivery_address: z.string().nullable().optional(),
  special_instructions: z.string().nullable().optional(),
  payment_method: z.enum(["wallet", "checkout"]).default("checkout"),
});

function escrowState(status: string): string {
  if (status === "pending_payment") return "awaiting_payment";
  if (status === "cancellation_requested") return "secured_in_escrow";
  if (status === "refund_pending") return "pending_refund";
  if (["payment_confirmed", "processing", "ready_for_pickup"].includes(status)) return "secured_in_escrow";
  if (status === "completed") return "released_to_wallet";
  if (status === "disputed") return "frozen";
  return status;
}

/** True when the payment for this order has already been captured (escrow is live). */
function isOrderPaid(status: string): boolean {
  return ["payment_confirmed", "processing", "ready_for_pickup", "cancellation_requested", "refund_pending", "disputed"].includes(status);
}

/** True when the order is in a terminal state and no further mutations are allowed. */
function isOrderTerminal(status: string): boolean {
  return status === "completed" || status === "cancelled";
}

// ─── Create Order ─────────────────────────────────────────────────────────────

export async function createOrder(req: AuthRequest, res: Response) {
  const parsed = createOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors });
    return;
  }

  const { listing_id, quantity, delivery_method, delivery_address, special_instructions, payment_method } = parsed.data;

  const [listing] = await db
    .select()
    .from(listings)
    .where(and(eq(listings.listingId, listing_id), eq(listings.status, "active")))
    .limit(1);

  if (!listing) { res.status(404).json({ error: "Listing not found or no longer available" }); return; }
  if (listing.farmerId === req.user!.userId) {
    res.status(400).json({ error: "You cannot order your own listing" });
    return;
  }

  // listing.pricePerUnit is stored in kobo (integer), so the product is already kobo.
  const totalAmountKobo = Math.round(quantity * listing.pricePerUnit);
  let orderRef: string;

  // Retry to avoid rare collisions
  for (let i = 0; i < 5; i++) {
    orderRef = generateOrderRef();
    const [exists] = await db.select({ orderRef: orders.orderRef }).from(orders).where(eq(orders.orderRef, orderRef)).limit(1);
    if (!exists) break;
  }

  let order: typeof orders.$inferSelect;

  if (payment_method === "wallet") {
    try {
      order = await db.transaction(async (tx) => {
        const [buyerWallet] = await tx.select().from(wallets).where(eq(wallets.userId, req.user!.userId)).limit(1);
        if (!buyerWallet) throw new Error("Buyer wallet not found");
        if (buyerWallet.availableBalance < totalAmountKobo) throw new Error("Insufficient wallet balance");

        const [createdOrder] = await tx.insert(orders).values({
          orderRef: orderRef!,
          listingId: listing_id,
          farmerId: listing.farmerId,
          buyerId: req.user!.userId,
          quantity: String(quantity),
          unitPrice: listing.pricePerUnit,
          totalAmount: totalAmountKobo,
          deliveryMethod: delivery_method,
          deliveryAddress: delivery_address ?? null,
          specialInstructions: special_instructions ?? null,
          status: "payment_confirmed",
        }).returning();
        if (!createdOrder) throw new Error("Failed to create order");

        const newBuyerAvailableBalance = buyerWallet.availableBalance - totalAmountKobo;
        await tx.update(wallets)
          .set({ availableBalance: newBuyerAvailableBalance, lastUpdated: new Date(), updatedAt: new Date() })
          .where(eq(wallets.walletId, buyerWallet.walletId));

        await tx.insert(walletLedgerEntries).values({
          walletId: buyerWallet.walletId,
          userId: req.user!.userId,
          type: "debit",
          amount: totalAmountKobo,
          balanceBefore: buyerWallet.availableBalance,
          balanceAfter: newBuyerAvailableBalance,
          referenceId: createdOrder.orderId,
          referenceType: "order",
          idempotencyKey: `buyer_debit_${createdOrder.orderId}`,
          description: `Order payment for ${listing.productName}`,
          status: "completed",
        });

        await tx.insert(transactions).values({
          walletId: buyerWallet.walletId,
          userId: req.user!.userId,
          type: "debit",
          amount: totalAmountKobo,
          balanceBefore: buyerWallet.availableBalance,
          balanceAfter: newBuyerAvailableBalance,
          referenceId: createdOrder.orderId,
          referenceType: "order",
          description: `Order payment for ${listing.productName}`,
          status: "completed",
        });

        await tx.insert(payments).values({
          orderId: createdOrder.orderId,
          buyerId: req.user!.userId,
          farmerId: listing.farmerId,
          amount: totalAmountKobo,
          status: "success",
          paymentMethod: "wallet",
          paidAt: new Date(),
        });

        const [farmerWallet] = await tx.select().from(wallets).where(eq(wallets.userId, listing.farmerId)).limit(1);
        if (!farmerWallet) throw new Error("Farmer wallet not found");

        const newPendingBalance = farmerWallet.pendingBalance + totalAmountKobo;
        const newTotalPaidIn = farmerWallet.totalPaidIn + totalAmountKobo;

        await tx.update(wallets)
          .set({ pendingBalance: newPendingBalance, totalPaidIn: newTotalPaidIn, lastUpdated: new Date(), updatedAt: new Date() })
          .where(eq(wallets.walletId, farmerWallet.walletId));

        await tx.insert(walletLedgerEntries).values({
          walletId: farmerWallet.walletId,
          userId: listing.farmerId,
          type: "credit",
          amount: totalAmountKobo,
          balanceBefore: farmerWallet.pendingBalance,
          balanceAfter: newPendingBalance,
          referenceId: createdOrder.orderId,
          referenceType: "order",
          idempotencyKey: `escrow_hold_${createdOrder.orderId}`,
          description: `Escrow credit for order ${createdOrder.orderRef}`,
          status: "completed",
        });

        await tx.insert(transactions).values({
          walletId: farmerWallet.walletId,
          userId: listing.farmerId,
          type: "credit",
          amount: totalAmountKobo,
          balanceBefore: farmerWallet.pendingBalance,
          balanceAfter: newPendingBalance,
          referenceId: createdOrder.orderId,
          referenceType: "order",
          description: `Escrow credit for order ${createdOrder.orderRef}`,
          status: "completed",
        });

        return createdOrder;
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to create wallet-paid order";
      const status = message.includes("wallet not found") ? 404 : message.includes("Insufficient") ? 400 : 409;
      res.status(status).json({ error: message });
      return;
    }
  } else {
    const [createdOrder] = await db.insert(orders).values({
      orderRef: orderRef!,
      listingId: listing_id,
      farmerId: listing.farmerId,
      buyerId: req.user!.userId,
      quantity: String(quantity),
      unitPrice: listing.pricePerUnit,
      totalAmount: totalAmountKobo,
      deliveryMethod: delivery_method,
      deliveryAddress: delivery_address ?? null,
      specialInstructions: special_instructions ?? null,
      status: "pending_payment",
    }).returning();
    order = createdOrder!;
  }

  // Generate Nomba checkout link only if payment method is checkout
  let checkoutLink: string | null = null;
  let nombaOrderReference: string | null = null;

  if (payment_method === "checkout") {
    try {
      const appBase = process.env["FRONTEND_URL"] ?? "http://localhost:3000";
      // Redirect back to the orders list page with a success flag.
      // The dynamic-segment path (/orders/:id) does not exist as a Next.js route;
      // using the list page + query params avoids the 404.
      const callbackUrl = `${appBase}/dashboard/buyer/orders?payment=success&ref=${encodeURIComponent(order.orderRef)}&orderId=${encodeURIComponent(order.orderId)}`;
      const result = await createCheckoutLink({
        amountKobo: totalAmountKobo,
        customerEmail: req.user!.email,
        orderReference: order.orderRef,
        callbackUrl,
        customerId: req.user!.userId,
        allowedPaymentMethods: ["Card", "Transfer"],
        orderMetaData: {
          productName: listing.productName,
          quantity: String(quantity),
        },
        tokenizeCard: false,
        currency: "NGN",
      });
      checkoutLink = result.checkoutLink;
      nombaOrderReference = result.orderReference;

      await db.update(orders).set({ checkoutLink, nombaOrderReference }).where(eq(orders.orderId, order.orderId));
    } catch (error) {
      console.error("[Nomba Checkout Error]", error);
    }
  }

  await createNotification({
    userId: listing.farmerId,
    type: "order",
    title: "New Order Received",
    message: `You have a new order #${order.orderRef} for ${listing.productName}`,
    referenceId: order.orderId,
    referenceType: "order",
  });

  if (payment_method === "wallet") {
    await createNotification({
      userId: listing.farmerId,
      type: "payment",
      title: "Payment Confirmed",
      message: `Payment for order #${order.orderRef} has been confirmed and secured in escrow`,
      referenceId: order.orderId,
      referenceType: "order",
    });
  }

  const [farmerUser] = await db
    .select({ firstName: users.firstName, lastName: users.lastName, farmName: users.farmName })
    .from(users)
    .where(eq(users.id, listing.farmerId))
    .limit(1);

  res.status(201).json({ ...formatBuyerOrder(order, listing, farmerUser!), checkout_link: checkoutLink });
}

// ─── List Orders ──────────────────────────────────────────────────────────────

export async function getMyBuyerOrders(req: AuthRequest, res: Response) {
  const rows = await db
    .select({ order: orders, listing: listings, farmer: { firstName: users.firstName, lastName: users.lastName, farmName: users.farmName } })
    .from(orders)
    .innerJoin(listings, eq(orders.listingId, listings.listingId))
    .innerJoin(users, eq(orders.farmerId, users.id))
    .where(eq(orders.buyerId, req.user!.userId))
    .orderBy(orders.createdAt);

  res.json(rows.map(({ order, listing, farmer }) => formatBuyerOrder(order, listing, farmer)));
}

export async function getMyFarmerOrders(req: AuthRequest, res: Response) {
  const rows = await db
    .select({ order: orders, listing: listings, buyer: { firstName: users.firstName, lastName: users.lastName, image: users.image } })
    .from(orders)
    .innerJoin(listings, eq(orders.listingId, listings.listingId))
    .innerJoin(users, eq(orders.buyerId, users.id))
    .where(eq(orders.farmerId, req.user!.userId))
    .orderBy(orders.createdAt);

  res.json(rows.map(({ order, listing, buyer }) => ({
    order_id: order.orderId,
    order_ref: `#${order.orderRef}`,
    buyer_id: order.buyerId,
    quantity: order.quantity,
    unit_price: order.unitPrice,
    total_amount: order.totalAmount,
    delivery_method: order.deliveryMethod,
    delivery_address: order.deliveryAddress,
    status: order.status,
    escrow_state: escrowState(order.status),
    cancellation_requested_at: order.cancellationRequestedAt,
    farmer_cancellation_accepted: order.farmerCancellationAccepted,
    dispute_resolution: order.disputeResolution,
    completed_at: order.completedAt,
    created_at: order.createdAt,
    updated_at: order.updatedAt,
    listing: { product_name: listing.productName, unit: listing.unit },
    buyer: { name: `${buyer.firstName} ${buyer.lastName}`, image: buyer.image },
  })));
}

// ─── Farmer: advance order status ─────────────────────────────────────────────

const FARMER_STATUS_TRANSITIONS: Record<string, string> = {
  // Farmer may only start processing AFTER payment is confirmed.
  // pending_payment is intentionally absent — prevents processing unpaid orders.
  payment_confirmed: "processing",
  processing: "ready_for_pickup",
};

export async function updateOrderStatus(req: AuthRequest, res: Response) {
  const id = String(req.params["id"]);

  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.orderId, id), eq(orders.farmerId, req.user!.userId)))
    .limit(1);

  if (!order) { res.status(404).json({ error: "Order not found" }); return; }

  const nextStatus = FARMER_STATUS_TRANSITIONS[order.status];
  if (!nextStatus) {
    res.status(400).json({ error: `Cannot advance order from status '${order.status}'` });
    return;
  }

  const [updated] = await db
    .update(orders)
    .set({ status: nextStatus as typeof orders.$inferSelect.status })
    .where(eq(orders.orderId, id))
    .returning();

  await createNotification({
    userId: order.buyerId,
    type: "order",
    title: "Order Update",
    message: `Your order #${order.orderRef} status has been updated to ${nextStatus.replace(/_/g, " ")}`,
    referenceId: order.orderId,
    referenceType: "order",
  });

  res.json({ order_id: updated!.orderId, status: updated!.status, escrow_state: escrowState(updated!.status) });
}

// ─── Cancel Order ─────────────────────────────────────────────────────────────
//
// State machine rules:
//   buyer  + pending_payment         → cancelled immediately (no money moved)
//   buyer  + payment_confirmed       → cancelled immediately + wallet/Nomba refund
//   buyer  + processing/ready_for_pickup → NOT allowed via this endpoint;
//                                         buyer must use /request-cancellation
//   farmer + payment_confirmed       → cancelled immediately + wallet/Nomba refund
//   farmer + processing/ready_for_pickup → NOT allowed (order already in progress)

export async function cancelOrder(req: AuthRequest, res: Response) {
  const id = String(req.params["id"]);
  const reason = typeof req.body?.reason === "string" ? req.body.reason : undefined;
  const userId = req.user!.userId;

  const [order] = await db.select().from(orders).where(eq(orders.orderId, id)).limit(1);
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }

  const isBuyer = order.buyerId === userId;
  const isFarmer = order.farmerId === userId;
  if (!isBuyer && !isFarmer) { res.status(404).json({ error: "Order not found" }); return; }

  if (isOrderTerminal(order.status)) {
    res.status(400).json({ error: `Order in status '${order.status}' cannot be cancelled` });
    return;
  }

  // Buyers cannot cancel once the farmer has started working — they must request cancellation.
  if (isBuyer && (order.status === "processing" || order.status === "ready_for_pickup")) {
    res.status(400).json({
      error: "Order is already in progress. Use /request-cancellation to ask the farmer to stop.",
    });
    return;
  }

  // Farmers cannot cancel once they are already processing or ready.
  if (isFarmer && (order.status === "processing" || order.status === "ready_for_pickup")) {
    res.status(400).json({
      error: "Order is already in progress. Raise a dispute if there is an issue.",
    });
    return;
  }

  // Cancellable statuses for both parties at this point:
  //   pending_payment, payment_confirmed, cancellation_requested, refund_pending
  const cancellableStatuses = ["pending_payment", "payment_confirmed", "cancellation_requested", "refund_pending"];
  if (!cancellableStatuses.includes(order.status)) {
    res.status(400).json({ error: `Order in status '${order.status}' cannot be cancelled` });
    return;
  }

  const paid = isOrderPaid(order.status);
  const amountKobo = order.totalAmount;

  // For pending_payment checkout orders, attempt to cancel the Nomba checkout link.
  if (!paid && order.status === "pending_payment" && order.nombaOrderReference) {
    try {
      await cancelCheckoutOrder(order.nombaOrderReference);
    } catch (error) {
      // Non-fatal: Nomba may already have expired the link; log and proceed.
      console.error("[Nomba Cancel Checkout]", error);
    }
  }

  // Lookup payment record for paid orders to decide refund path.
  let buyerPayment: typeof payments.$inferSelect | null = null;
  if (paid) {
    const [p] = await db
      .select()
      .from(payments)
      .where(and(eq(payments.orderId, order.orderId), eq(payments.status, "success")))
      .limit(1);
    buyerPayment = p ?? null;
  }

  const isWalletPaid = buyerPayment?.paymentMethod === "wallet" || buyerPayment?.paymentMethod === "simulation";

  try {
    await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(orders)
        .set({ status: "cancelled", cancelledBy: userId, cancellationReason: reason ?? null })
        .where(eq(orders.orderId, id))
        .returning();
      if (!updated) throw new Error("Order update failed");

      if (!paid) return; // no money moved — done

      // ── Reverse farmer escrow ────────────────────────────────────────────────
      const [farmerWallet] = await tx.select().from(wallets).where(eq(wallets.userId, order.farmerId)).limit(1);
      if (!farmerWallet) throw new Error("Farmer wallet not found during cancellation reversal");
      if (farmerWallet.pendingBalance < amountKobo) throw new Error("Farmer pending balance insufficient for reversal");

      const farmerNewPending = farmerWallet.pendingBalance - amountKobo;
      await tx.update(wallets)
        .set({ pendingBalance: farmerNewPending, updatedAt: new Date() })
        .where(eq(wallets.walletId, farmerWallet.walletId));

      await tx.insert(walletLedgerEntries).values({
        walletId: farmerWallet.walletId,
        userId: order.farmerId,
        type: "debit",
        amount: amountKobo,
        balanceBefore: farmerWallet.pendingBalance,
        balanceAfter: farmerNewPending,
        referenceId: order.orderId,
        referenceType: "order_cancel",
        idempotencyKey: `escrow_cancel_farmer_${order.orderId}`,
        description: `Escrow reversal — order ${order.orderRef} cancelled`,
        status: "completed",
      });

      await tx.insert(transactions).values({
        walletId: farmerWallet.walletId,
        userId: order.farmerId,
        type: "debit",
        amount: amountKobo,
        balanceBefore: farmerWallet.pendingBalance,
        balanceAfter: farmerNewPending,
        referenceId: order.orderId,
        referenceType: "order_cancel",
        description: `Escrow reversal — order ${order.orderRef} cancelled`,
        status: "completed",
      });

      // ── Refund buyer (wallet-paid only; checkout goes through Nomba) ─────────
      if (isWalletPaid && buyerPayment) {
        const [buyerWallet] = await tx.select().from(wallets).where(eq(wallets.userId, order.buyerId)).limit(1);
        if (buyerWallet) {
          const buyerNewAvailable = buyerWallet.availableBalance + amountKobo;
          await tx.update(wallets)
            .set({ availableBalance: buyerNewAvailable, updatedAt: new Date() })
            .where(eq(wallets.walletId, buyerWallet.walletId));

          await tx.insert(walletLedgerEntries).values({
            walletId: buyerWallet.walletId,
            userId: order.buyerId,
            type: "credit",
            amount: amountKobo,
            balanceBefore: buyerWallet.availableBalance,
            balanceAfter: buyerNewAvailable,
            referenceId: order.orderId,
            referenceType: "order_refund",
            idempotencyKey: `refund_cancel_buyer_${order.orderId}`,
            description: `Refund for cancelled order ${order.orderRef}`,
            status: "completed",
          });

          await tx.insert(transactions).values({
            walletId: buyerWallet.walletId,
            userId: order.buyerId,
            type: "credit",
            amount: amountKobo,
            balanceBefore: buyerWallet.availableBalance,
            balanceAfter: buyerNewAvailable,
            referenceId: order.orderId,
            referenceType: "order_refund",
            description: `Refund for cancelled order ${order.orderRef}`,
            status: "completed",
          });

          await tx.update(payments)
            .set({ status: "refunded", updatedAt: new Date() })
            .where(eq(payments.paymentId, buyerPayment.paymentId));
        }
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to cancel order";
    res.status(409).json({ error: message });
    return;
  }

  // For checkout-paid cancellations, attempt Nomba refund asynchronously after DB commit.
  if (paid && !isWalletPaid && buyerPayment && order.nombaOrderReference) {
    try {
      await refundCheckoutPayment({
        orderReference: order.nombaOrderReference,
        reason: reason ?? "Order cancelled by user",
      });
    } catch (error) {
      // Non-fatal — refund may require manual follow-up. DB state is already cancelled.
      console.error("[Nomba Refund on Cancel]", error);
    }
  }

  const notifyUserId = isBuyer ? order.farmerId : order.buyerId;
  await createNotification({
    userId: notifyUserId,
    type: "order",
    title: "Order Cancelled",
    message: `Order #${order.orderRef} has been cancelled${paid ? " and payment reversed" : ""}`,
    referenceId: order.orderId,
    referenceType: "order",
  });

  if (isBuyer && paid && !isWalletPaid) {
    await createNotification({
      userId: userId,
      type: "payment",
      title: "Refund Initiated",
      message: `A refund for order #${order.orderRef} has been initiated and may take 1–3 business days`,
      referenceId: order.orderId,
      referenceType: "order",
    });
  }

  res.json({ order_id: order.orderId, status: "cancelled", refunded: paid, method: isWalletPaid ? "wallet" : "checkout" });
}

// ─── Buyer: Request Cancellation (after farmer has started) ──────────────────
//
// When the farmer is already processing or ready, the buyer cannot unilaterally
// cancel. They submit a request; the farmer then accepts or rejects via
// PATCH /:id/respond-cancellation.

export async function requestCancellation(req: AuthRequest, res: Response) {
  const id = String(req.params["id"]);
  const reason = typeof req.body?.reason === "string" ? req.body.reason : "Buyer requested cancellation";

  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.orderId, id), eq(orders.buyerId, req.user!.userId)))
    .limit(1);

  if (!order) { res.status(404).json({ error: "Order not found" }); return; }

  const requestableStatuses = ["processing", "ready_for_pickup"];
  if (!requestableStatuses.includes(order.status)) {
    res.status(400).json({
      error: `Cancellation requests can only be made when the order is processing or ready. Current status: '${order.status}'`,
    });
    return;
  }

  const [updated] = await db
    .update(orders)
    .set({
      status: "cancellation_requested",
      cancellationReason: reason,
      cancellationRequestedAt: new Date(),
    })
    .where(eq(orders.orderId, id))
    .returning();

  await createNotification({
    userId: order.farmerId,
    type: "order",
    title: "Cancellation Requested",
    message: `Buyer has requested to cancel order #${order.orderRef}. Please accept or reject within 24 hours.`,
    referenceId: order.orderId,
    referenceType: "order",
  });

  res.json({ order_id: updated!.orderId, status: updated!.status });
}

// ─── Farmer: Respond to Cancellation Request ─────────────────────────────────
//
// Farmer accepts → immediate wallet reversal + cancel.
// Farmer rejects → order returns to previous in-flight status.

export async function farmerRespondCancellation(req: AuthRequest, res: Response) {
  const id = String(req.params["id"]);
  const acceptSchema = z.object({ accept: z.boolean() });
  const parsed = acceptSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Body must contain { accept: boolean }" });
    return;
  }

  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.orderId, id), eq(orders.farmerId, req.user!.userId)))
    .limit(1);

  if (!order) { res.status(404).json({ error: "Order not found" }); return; }
  if (order.status !== "cancellation_requested") {
    res.status(400).json({ error: "No pending cancellation request for this order" });
    return;
  }

  const { accept } = parsed.data;

  if (!accept) {
    // Reject: restore the order to processing (most likely previous state).
    const [updated] = await db
      .update(orders)
      .set({
        status: "processing",
        farmerCancellationAccepted: false,
      })
      .where(eq(orders.orderId, id))
      .returning();

    await createNotification({
      userId: order.buyerId,
      type: "order",
      title: "Cancellation Rejected",
      message: `The farmer has rejected your cancellation request for order #${order.orderRef}. The order will continue.`,
      referenceId: order.orderId,
      referenceType: "order",
    });

    res.json({ order_id: updated!.orderId, status: updated!.status, accepted: false });
    return;
  }

  // Accept: reverse escrow and mark cancelled.
  const amountKobo = order.totalAmount;

  const [buyerPayment] = await db
    .select()
    .from(payments)
    .where(and(eq(payments.orderId, order.orderId), eq(payments.status, "success")))
    .limit(1);

  const isWalletPaid = buyerPayment?.paymentMethod === "wallet" || buyerPayment?.paymentMethod === "simulation";

  try {
    await db.transaction(async (tx) => {
      await tx.update(orders)
        .set({ status: "cancelled", farmerCancellationAccepted: true, cancelledBy: order.farmerId })
        .where(eq(orders.orderId, id));

      // Debit farmer escrow
      const [farmerWallet] = await tx.select().from(wallets).where(eq(wallets.userId, order.farmerId)).limit(1);
      if (!farmerWallet) throw new Error("Farmer wallet not found");
      if (farmerWallet.pendingBalance < amountKobo) throw new Error("Farmer pending balance insufficient");

      const farmerNewPending = farmerWallet.pendingBalance - amountKobo;
      await tx.update(wallets)
        .set({ pendingBalance: farmerNewPending, updatedAt: new Date() })
        .where(eq(wallets.walletId, farmerWallet.walletId));

      await tx.insert(walletLedgerEntries).values({
        walletId: farmerWallet.walletId,
        userId: order.farmerId,
        type: "debit",
        amount: amountKobo,
        balanceBefore: farmerWallet.pendingBalance,
        balanceAfter: farmerNewPending,
        referenceId: order.orderId,
        referenceType: "order_cancel",
        idempotencyKey: `escrow_cancel_farmer_accept_${order.orderId}`,
        description: `Escrow reversal — farmer accepted cancellation for order ${order.orderRef}`,
        status: "completed",
      });

      await tx.insert(transactions).values({
        walletId: farmerWallet.walletId,
        userId: order.farmerId,
        type: "debit",
        amount: amountKobo,
        balanceBefore: farmerWallet.pendingBalance,
        balanceAfter: farmerNewPending,
        referenceId: order.orderId,
        referenceType: "order_cancel",
        description: `Escrow reversal — farmer accepted cancellation for order ${order.orderRef}`,
        status: "completed",
      });

      // Refund buyer (wallet-paid only)
      if (isWalletPaid && buyerPayment) {
        const [buyerWallet] = await tx.select().from(wallets).where(eq(wallets.userId, order.buyerId)).limit(1);
        if (buyerWallet) {
          const buyerNewAvailable = buyerWallet.availableBalance + amountKobo;
          await tx.update(wallets)
            .set({ availableBalance: buyerNewAvailable, updatedAt: new Date() })
            .where(eq(wallets.walletId, buyerWallet.walletId));

          await tx.insert(walletLedgerEntries).values({
            walletId: buyerWallet.walletId,
            userId: order.buyerId,
            type: "credit",
            amount: amountKobo,
            balanceBefore: buyerWallet.availableBalance,
            balanceAfter: buyerNewAvailable,
            referenceId: order.orderId,
            referenceType: "order_refund",
            idempotencyKey: `refund_farmer_accept_${order.orderId}`,
            description: `Refund — farmer accepted cancellation for order ${order.orderRef}`,
            status: "completed",
          });

          await tx.insert(transactions).values({
            walletId: buyerWallet.walletId,
            userId: order.buyerId,
            type: "credit",
            amount: amountKobo,
            balanceBefore: buyerWallet.availableBalance,
            balanceAfter: buyerNewAvailable,
            referenceId: order.orderId,
            referenceType: "order_refund",
            description: `Refund — farmer accepted cancellation for order ${order.orderRef}`,
            status: "completed",
          });

          await tx.update(payments)
            .set({ status: "refunded", updatedAt: new Date() })
            .where(eq(payments.paymentId, buyerPayment.paymentId));
        }
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to process cancellation acceptance";
    res.status(409).json({ error: message });
    return;
  }

  // Checkout-paid: attempt Nomba refund
  if (!isWalletPaid && buyerPayment && order.nombaOrderReference) {
    try {
      await refundCheckoutPayment({
        orderReference: order.nombaOrderReference,
        reason: order.cancellationReason ?? "Farmer accepted buyer cancellation request",
      });
    } catch (error) {
      console.error("[Nomba Refund on Farmer Accept]", error);
    }
  }

  await createNotification({
    userId: order.buyerId,
    type: "order",
    title: "Cancellation Accepted",
    message: `The farmer has accepted your cancellation for order #${order.orderRef}${isWalletPaid ? ". Your funds have been refunded." : ". A refund has been initiated."}`,
    referenceId: order.orderId,
    referenceType: "order",
  });

  res.json({ order_id: order.orderId, status: "cancelled", accepted: true, refunded: true, method: isWalletPaid ? "wallet" : "checkout" });
}

// ─── Simulate Payment (dev only) ─────────────────────────────────────────────

export async function simulatePayment(req: AuthRequest, res: Response) {
  const id = String(req.params["id"]);

  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.orderId, id), eq(orders.buyerId, req.user!.userId)))
    .limit(1);

  if (!order) { res.status(404).json({ error: "Order not found" }); return; }
  if (order.status !== "pending_payment") {
    res.status(400).json({ error: "Order is not awaiting payment" });
    return;
  }

  const amountKobo = order.totalAmount;
  const [updated] = await db.transaction(async (tx) => {
    const [wallet] = await tx.select().from(wallets).where(eq(wallets.userId, order.farmerId)).limit(1);
    if (!wallet) throw new Error("Farmer wallet not found");

    const newPendingBalance = wallet.pendingBalance + amountKobo;
    const newTotalPaidIn = wallet.totalPaidIn + amountKobo;

    await tx.update(wallets)
      .set({ pendingBalance: newPendingBalance, totalPaidIn: newTotalPaidIn, updatedAt: new Date() })
      .where(eq(wallets.walletId, wallet.walletId));

    await tx.insert(payments).values({
      orderId: order.orderId,
      buyerId: order.buyerId,
      farmerId: order.farmerId,
      amount: amountKobo,
      status: "success",
      paymentMethod: "simulation",
      paidAt: new Date(),
    });

    await tx.insert(walletLedgerEntries).values({
      walletId: wallet.walletId,
      userId: order.farmerId,
      type: "credit",
      amount: amountKobo,
      balanceBefore: wallet.pendingBalance,
      balanceAfter: newPendingBalance,
      referenceId: order.orderId,
      referenceType: "order",
      idempotencyKey: `escrow_hold_sim_${order.orderId}`,
      description: `Simulated escrow credit for order ${order.orderRef}`,
      status: "completed",
    });

    await tx.insert(transactions).values({
      walletId: wallet.walletId,
      userId: order.farmerId,
      type: "credit",
      amount: amountKobo,
      balanceBefore: wallet.pendingBalance,
      balanceAfter: newPendingBalance,
      referenceId: order.orderId,
      referenceType: "order",
      description: `Simulated escrow credit for order ${order.orderRef}`,
      status: "completed",
    });

    return tx
      .update(orders)
      .set({ status: "payment_confirmed" })
      .where(eq(orders.orderId, id))
      .returning();
  }).catch((error) => {
    res.status(409).json({ error: error instanceof Error ? error.message : "Unable to simulate payment" });
    return [];
  });

  if (!updated) return;

  await createNotification({
    userId: order.farmerId,
    type: "payment",
    title: "Payment Received",
    message: `Payment for order #${order.orderRef} has been confirmed`,
    referenceId: order.orderId,
    referenceType: "order",
  });

  res.json({ order_id: updated!.orderId, status: updated!.status, escrow_state: escrowState(updated!.status) });
}

// ─── Buyer: Confirm Delivery ──────────────────────────────────────────────────

export async function confirmDelivery(req: AuthRequest, res: Response) {
  const id = String(req.params["id"]);

  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.orderId, id), eq(orders.buyerId, req.user!.userId)))
    .limit(1);

  if (!order) { res.status(404).json({ error: "Order not found" }); return; }
  if (order.status === "completed") { res.status(400).json({ error: "Order already completed" }); return; }
  if (!["processing", "ready_for_pickup", "payment_confirmed"].includes(order.status)) {
    res.status(400).json({ error: "Order cannot be confirmed yet" });
    return;
  }

  const [updated] = await db.transaction(async (tx) => {
    const [wallet] = await tx.select().from(wallets).where(eq(wallets.userId, order.farmerId)).limit(1);
    if (!wallet) throw new Error("Farmer wallet not found");

    const amountKobo = order.totalAmount;
    if (wallet.pendingBalance < amountKobo) throw new Error("Escrow balance is insufficient for this order");

    const newPending = wallet.pendingBalance - amountKobo;
    const newAvailable = wallet.availableBalance + amountKobo;

    await tx.update(wallets)
      .set({ pendingBalance: newPending, availableBalance: newAvailable, updatedAt: new Date() })
      .where(eq(wallets.walletId, wallet.walletId));

    await tx.insert(walletLedgerEntries).values({
      walletId: wallet.walletId,
      userId: order.farmerId,
      type: "credit",
      amount: amountKobo,
      balanceBefore: wallet.availableBalance,
      balanceAfter: newAvailable,
      referenceId: order.orderId,
      referenceType: "order_release",
      idempotencyKey: `escrow_release_${order.orderId}`,
      description: `Release escrow for order ${order.orderRef}`,
      status: "completed",
      metadata: { orderRef: order.orderRef },
    });

    await tx.insert(transactions).values({
      walletId: wallet.walletId,
      userId: order.farmerId,
      type: "credit",
      amount: amountKobo,
      balanceBefore: wallet.availableBalance,
      balanceAfter: newAvailable,
      description: `Release escrow for order ${order.orderRef}`,
      status: "completed",
    });

    return tx
      .update(orders)
      .set({ status: "completed" as const, completedAt: new Date() })
      .where(eq(orders.orderId, id))
      .returning();
  }).catch((error) => {
    res.status(409).json({ error: error instanceof Error ? error.message : "Unable to release escrow" });
    return [];
  });

  if (!updated) return;

  await createNotification({
    userId: order.farmerId,
    type: "payment",
    title: "Payment Released",
    message: `Payment for order #${order.orderRef} has been released to your wallet`,
    referenceId: order.orderId,
    referenceType: "order",
  });

  res.json({ message: "Delivery confirmed", order: { order_id: updated!.orderId, status: updated!.status } });
}

// ─── Buyer: Dispute Order ─────────────────────────────────────────────────────
//
// Funds remain frozen in farmer's pendingBalance until admin resolves.

export async function disputeOrder(req: AuthRequest, res: Response) {
  const id = String(req.params["id"]);
  const reason = typeof req.body?.reason === "string" ? req.body.reason : undefined;

  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.orderId, id), eq(orders.buyerId, req.user!.userId)))
    .limit(1);

  if (!order) { res.status(404).json({ error: "Order not found" }); return; }

  const disputableStatuses = ["payment_confirmed", "processing", "ready_for_pickup"];
  if (!disputableStatuses.includes(order.status)) {
    res.status(400).json({ error: `Order in status '${order.status}' cannot be disputed` });
    return;
  }

  const [updated] = await db
    .update(orders)
    .set({
      status: "disputed",
      cancellationReason: reason ?? null,
      disputeResolution: "pending",
    })
    .where(eq(orders.orderId, id))
    .returning();

  await createNotification({
    userId: order.farmerId,
    type: "order",
    title: "Order Disputed",
    message: `Buyer has raised a dispute on order #${order.orderRef}. Funds are frozen pending resolution.`,
    referenceId: order.orderId,
    referenceType: "order",
  });

  res.json({ order_id: updated!.orderId, status: updated!.status });
}

// ─── Admin: Resolve Dispute ───────────────────────────────────────────────────
//
// Three outcomes:
//   release_to_farmer  — full escrow goes to farmer's availableBalance
//   refund_to_buyer    — full escrow reversed to buyer (wallet or Nomba refund)
//   partial_refund     — refundAmount to buyer, remainder to farmer
//
// This endpoint is intentionally not role-gated at the controller level;
// add an admin middleware in the route if needed.

const resolveDisputeSchema = z.object({
  outcome: z.enum(["release_to_farmer", "refund_to_buyer", "partial_refund"]),
  /** Kobo amount to refund to buyer (required for partial_refund). */
  refund_amount: z.number().int().nonnegative().optional(),
  resolution_notes: z.string().optional(),
});

export async function resolveDispute(req: AuthRequest, res: Response) {
  const id = String(req.params["id"]);
  const parsed = resolveDisputeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors });
    return;
  }

  const { outcome, refund_amount, resolution_notes } = parsed.data;

  if (outcome === "partial_refund" && (refund_amount === undefined || refund_amount <= 0)) {
    res.status(400).json({ error: "refund_amount (in kobo) is required for partial_refund outcome" });
    return;
  }

  const [order] = await db.select().from(orders).where(eq(orders.orderId, id)).limit(1);
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }
  if (order.status !== "disputed") {
    res.status(400).json({ error: "Only disputed orders can be resolved" });
    return;
  }

  const totalKobo = order.totalAmount;
  const buyerRefundKobo = outcome === "refund_to_buyer" ? totalKobo :
                          outcome === "partial_refund" ? refund_amount! : 0;
  const farmerReleaseKobo = totalKobo - buyerRefundKobo;

  const [buyerPayment] = await db
    .select()
    .from(payments)
    .where(and(eq(payments.orderId, order.orderId), eq(payments.status, "success")))
    .limit(1);

  const isWalletPaid = buyerPayment?.paymentMethod === "wallet" || buyerPayment?.paymentMethod === "simulation";

  try {
    await db.transaction(async (tx) => {
      const resolutionValue: typeof orders.$inferSelect.disputeResolution =
        outcome === "release_to_farmer" ? "released_to_farmer" :
        outcome === "refund_to_buyer" ? "refunded_to_buyer" :
        "partial_refund";

      await tx.update(orders)
        .set({
          status: outcome === "release_to_farmer" ? "completed" : "cancelled",
          completedAt: outcome === "release_to_farmer" ? new Date() : null,
          disputeResolution: resolutionValue,
          disputeRefundAmount: buyerRefundKobo,
          cancellationReason: resolution_notes ?? null,
        })
        .where(eq(orders.orderId, id));

      const [farmerWallet] = await tx.select().from(wallets).where(eq(wallets.userId, order.farmerId)).limit(1);
      if (!farmerWallet) throw new Error("Farmer wallet not found");
      if (farmerWallet.pendingBalance < totalKobo) throw new Error("Farmer pending balance insufficient for dispute resolution");

      // Always debit all pending escrow from farmer first.
      const farmerNewPending = farmerWallet.pendingBalance - totalKobo;
      const farmerNewAvailable = farmerWallet.availableBalance + farmerReleaseKobo;

      await tx.update(wallets)
        .set({ pendingBalance: farmerNewPending, availableBalance: farmerNewAvailable, updatedAt: new Date() })
        .where(eq(wallets.walletId, farmerWallet.walletId));

      if (farmerReleaseKobo > 0) {
        await tx.insert(walletLedgerEntries).values({
          walletId: farmerWallet.walletId,
          userId: order.farmerId,
          type: "credit",
          amount: farmerReleaseKobo,
          balanceBefore: farmerWallet.availableBalance,
          balanceAfter: farmerNewAvailable,
          referenceId: order.orderId,
          referenceType: "dispute_release",
          idempotencyKey: `dispute_release_farmer_${order.orderId}`,
          description: `Dispute resolution: farmer release for order ${order.orderRef}`,
          status: "completed",
          metadata: { outcome, resolution_notes },
        });

        await tx.insert(transactions).values({
          walletId: farmerWallet.walletId,
          userId: order.farmerId,
          type: "credit",
          amount: farmerReleaseKobo,
          balanceBefore: farmerWallet.availableBalance,
          balanceAfter: farmerNewAvailable,
          referenceId: order.orderId,
          referenceType: "dispute_release",
          description: `Dispute resolution: farmer release for order ${order.orderRef}`,
          status: "completed",
        });
      }

      // Debit ledger entry for the escrow clear
      await tx.insert(walletLedgerEntries).values({
        walletId: farmerWallet.walletId,
        userId: order.farmerId,
        type: "debit",
        amount: totalKobo,
        balanceBefore: farmerWallet.pendingBalance,
        balanceAfter: farmerNewPending,
        referenceId: order.orderId,
        referenceType: "dispute_resolution",
        idempotencyKey: `dispute_escrow_clear_${order.orderId}`,
        description: `Dispute resolution: escrow cleared for order ${order.orderRef}`,
        status: "completed",
      });

      // Refund buyer wallet (wallet-paid only)
      if (buyerRefundKobo > 0 && isWalletPaid) {
        const [buyerWallet] = await tx.select().from(wallets).where(eq(wallets.userId, order.buyerId)).limit(1);
        if (buyerWallet) {
          const buyerNewAvailable = buyerWallet.availableBalance + buyerRefundKobo;
          await tx.update(wallets)
            .set({ availableBalance: buyerNewAvailable, updatedAt: new Date() })
            .where(eq(wallets.walletId, buyerWallet.walletId));

          await tx.insert(walletLedgerEntries).values({
            walletId: buyerWallet.walletId,
            userId: order.buyerId,
            type: "credit",
            amount: buyerRefundKobo,
            balanceBefore: buyerWallet.availableBalance,
            balanceAfter: buyerNewAvailable,
            referenceId: order.orderId,
            referenceType: "dispute_refund",
            idempotencyKey: `dispute_refund_buyer_${order.orderId}`,
            description: `Dispute resolution: buyer refund for order ${order.orderRef}`,
            status: "completed",
          });

          await tx.insert(transactions).values({
            walletId: buyerWallet.walletId,
            userId: order.buyerId,
            type: "credit",
            amount: buyerRefundKobo,
            balanceBefore: buyerWallet.availableBalance,
            balanceAfter: buyerNewAvailable,
            referenceId: order.orderId,
            referenceType: "dispute_refund",
            description: `Dispute resolution: buyer refund for order ${order.orderRef}`,
            status: "completed",
          });

          if (buyerPayment) {
            await tx.update(payments)
              .set({ status: "refunded", updatedAt: new Date() })
              .where(eq(payments.paymentId, buyerPayment.paymentId));
          }
        }
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to resolve dispute";
    res.status(409).json({ error: message });
    return;
  }

  // Checkout-paid buyer refund via Nomba
  if (buyerRefundKobo > 0 && !isWalletPaid && buyerPayment && order.nombaOrderReference) {
    try {
      await refundCheckoutPayment({
        orderReference: order.nombaOrderReference,
        amountKobo: buyerRefundKobo,
        reason: resolution_notes ?? `Dispute resolved: ${outcome}`,
      });
    } catch (error) {
      console.error("[Nomba Refund on Dispute Resolution]", error);
    }
  }

  // Notify both parties
  await createNotification({
    userId: order.farmerId,
    type: "payment",
    title: "Dispute Resolved",
    message: farmerReleaseKobo > 0
      ? `Dispute for order #${order.orderRef} has been resolved. ₦${(farmerReleaseKobo / 100).toFixed(2)} has been released to your wallet.`
      : `Dispute for order #${order.orderRef} has been resolved. No funds were released to your wallet.`,
    referenceId: order.orderId,
    referenceType: "order",
  });

  await createNotification({
    userId: order.buyerId,
    type: "payment",
    title: "Dispute Resolved",
    message: buyerRefundKobo > 0
      ? `Dispute for order #${order.orderRef} has been resolved. ₦${(buyerRefundKobo / 100).toFixed(2)} will be refunded to you.`
      : `Dispute for order #${order.orderRef} has been resolved in the farmer's favour.`,
    referenceId: order.orderId,
    referenceType: "order",
  });

  res.json({
    order_id: order.orderId,
    outcome,
    farmer_release_kobo: farmerReleaseKobo,
    buyer_refund_kobo: buyerRefundKobo,
    status: outcome === "release_to_farmer" ? "completed" : "cancelled",
  });
}

// ─── Buyer: Request Refund ────────────────────────────────────────────────────
//
// For payment_confirmed orders (farmer hasn't started yet):
//   wallet-paid  → immediate reversal + cancel
//   checkout-paid → call Nomba refund + mark refund_pending, then settle via webhook
//
// For processing orders:
//   wallet-paid  → immediate reversal + cancel
//   checkout-paid → freeze in disputed state for admin review

export async function requestRefund(req: AuthRequest, res: Response) {
  const id = String(req.params["id"]);
  const reason = typeof req.body?.reason === "string" ? req.body.reason : "Buyer requested refund";

  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.orderId, id), eq(orders.buyerId, req.user!.userId)))
    .limit(1);

  if (!order) { res.status(404).json({ error: "Order not found" }); return; }

  const refundableStatuses = ["payment_confirmed", "processing"];
  if (!refundableStatuses.includes(order.status)) {
    res.status(400).json({ error: `Order in status '${order.status}' cannot be refunded` });
    return;
  }

  const [buyerPayment] = await db
    .select()
    .from(payments)
    .where(and(eq(payments.orderId, order.orderId), eq(payments.status, "success")))
    .limit(1);

  if (!buyerPayment) {
    res.status(404).json({ error: "No successful payment found for this order" });
    return;
  }

  const amountKobo = order.totalAmount;
  const isWalletPaid = buyerPayment.paymentMethod === "wallet" || buyerPayment.paymentMethod === "simulation";

  // ── Wallet-paid: immediate full reversal ────────────────────────────────────
  if (isWalletPaid) {
    try {
      await db.transaction(async (tx) => {
        const [farmerWallet] = await tx.select().from(wallets).where(eq(wallets.userId, order.farmerId)).limit(1);
        if (!farmerWallet) throw new Error("Farmer wallet not found");
        if (farmerWallet.pendingBalance < amountKobo) throw new Error("Farmer pending balance insufficient for refund");

        const farmerNewPending = farmerWallet.pendingBalance - amountKobo;
        await tx.update(wallets)
          .set({ pendingBalance: farmerNewPending, updatedAt: new Date() })
          .where(eq(wallets.walletId, farmerWallet.walletId));

        await tx.insert(walletLedgerEntries).values({
          walletId: farmerWallet.walletId,
          userId: order.farmerId,
          type: "debit",
          amount: amountKobo,
          balanceBefore: farmerWallet.pendingBalance,
          balanceAfter: farmerNewPending,
          referenceId: order.orderId,
          referenceType: "order_refund",
          idempotencyKey: `refund_farmer_${order.orderId}`,
          description: `Refund reversal — order ${order.orderRef}`,
          status: "completed",
        });

        await tx.insert(transactions).values({
          walletId: farmerWallet.walletId,
          userId: order.farmerId,
          type: "debit",
          amount: amountKobo,
          balanceBefore: farmerWallet.pendingBalance,
          balanceAfter: farmerNewPending,
          referenceId: order.orderId,
          referenceType: "order_refund",
          description: `Refund reversal — order ${order.orderRef}`,
          status: "completed",
        });

        const [buyerWallet] = await tx.select().from(wallets).where(eq(wallets.userId, order.buyerId)).limit(1);
        if (!buyerWallet) throw new Error("Buyer wallet not found");

        const buyerNewAvailable = buyerWallet.availableBalance + amountKobo;
        await tx.update(wallets)
          .set({ availableBalance: buyerNewAvailable, updatedAt: new Date() })
          .where(eq(wallets.walletId, buyerWallet.walletId));

        await tx.insert(walletLedgerEntries).values({
          walletId: buyerWallet.walletId,
          userId: order.buyerId,
          type: "credit",
          amount: amountKobo,
          balanceBefore: buyerWallet.availableBalance,
          balanceAfter: buyerNewAvailable,
          referenceId: order.orderId,
          referenceType: "order_refund",
          idempotencyKey: `refund_buyer_${order.orderId}`,
          description: `Refund for order ${order.orderRef}`,
          status: "completed",
        });

        await tx.insert(transactions).values({
          walletId: buyerWallet.walletId,
          userId: order.buyerId,
          type: "credit",
          amount: amountKobo,
          balanceBefore: buyerWallet.availableBalance,
          balanceAfter: buyerNewAvailable,
          referenceId: order.orderId,
          referenceType: "order_refund",
          description: `Refund for order ${order.orderRef}`,
          status: "completed",
        });

        await tx.update(payments)
          .set({ status: "refunded", updatedAt: new Date() })
          .where(eq(payments.paymentId, buyerPayment.paymentId));

        await tx.update(orders)
          .set({ status: "cancelled", cancelledBy: order.buyerId, cancellationReason: reason })
          .where(eq(orders.orderId, order.orderId));
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to process refund";
      res.status(409).json({ error: message });
      return;
    }

    await createNotification({
      userId: order.farmerId,
      type: "payment",
      title: "Order Refunded",
      message: `Buyer has requested a refund for order #${order.orderRef}. Funds have been reversed.`,
      referenceId: order.orderId,
      referenceType: "order",
    });

    res.json({ order_id: order.orderId, status: "cancelled", refunded: true, method: "wallet" });
    return;
  }

  // ── Checkout-paid: call Nomba refund ────────────────────────────────────────
  // payment_confirmed (farmer hasn't started) → attempt immediate Nomba refund → mark refund_pending
  // processing (farmer already working) → freeze in disputed state for admin review
  if (order.status === "payment_confirmed" && order.nombaOrderReference) {
    let nombaRefundSucceeded = false;
    let refundReference: string | undefined;
    try {
      const result = await refundCheckoutPayment({
        orderReference: order.nombaOrderReference,
        reason,
      });
      refundReference = result.refundReference;
      nombaRefundSucceeded = true;
    } catch (error) {
      console.error("[Nomba Refund on Request]", error);
    }

    // Mark refund_pending regardless — webhook will confirm completion.
    // If Nomba call failed, admin can retry manually via resolveDispute.
    await db.update(orders)
      .set({
        status: "refund_pending",
        cancellationReason: reason,
      })
      .where(eq(orders.orderId, order.orderId));

    await createNotification({
      userId: order.farmerId,
      type: "payment",
      title: "Refund Requested",
      message: `Buyer has requested a refund for order #${order.orderRef}. Order is under review.`,
      referenceId: order.orderId,
      referenceType: "order",
    });

    res.json({
      order_id: order.orderId,
      status: "refund_pending",
      refunded: false,
      nomba_refund_initiated: nombaRefundSucceeded,
      refund_reference: refundReference,
      message: "Refund initiated. It may take 1–3 business days to reflect.",
    });
    return;
  }

  // processing + checkout-paid → disputed (funds frozen, admin reviews)
  await db.update(orders)
    .set({ status: "disputed", cancellationReason: reason, disputeResolution: "pending" })
    .where(eq(orders.orderId, order.orderId));

  await createNotification({
    userId: order.farmerId,
    type: "payment",
    title: "Refund Requested",
    message: `Buyer has requested a refund for order #${order.orderRef}. Order is under review.`,
    referenceId: order.orderId,
    referenceType: "order",
  });

  res.json({
    order_id: order.orderId,
    status: "disputed",
    refunded: false,
    message: "Refund request submitted. Escrow is frozen and will be reviewed by our team.",
  });
}

// ─── Format helpers ───────────────────────────────────────────────────────────

function formatBuyerOrder(
  order: typeof orders.$inferSelect,
  listing: typeof listings.$inferSelect,
  farmer: { firstName: string; lastName: string; farmName: string | null }
) {
  return {
    order_id: order.orderId,
    order_ref: `#${order.orderRef}`,
    farmer_id: order.farmerId,
    quantity: order.quantity,
    unit_price: order.unitPrice,
    total_amount: order.totalAmount,
    delivery_method: order.deliveryMethod,
    delivery_address: order.deliveryAddress,
    special_instructions: order.specialInstructions,
    status: order.status,
    escrow_state: escrowState(order.status),
    cancellation_requested_at: order.cancellationRequestedAt,
    farmer_cancellation_accepted: order.farmerCancellationAccepted,
    dispute_resolution: order.disputeResolution,
    completed_at: order.completedAt,
    created_at: order.createdAt,
    updated_at: order.updatedAt,
    checkout_link: order.checkoutLink,
    listing: { product_name: listing.productName, unit: listing.unit },
    farmer: { name: `${farmer.firstName} ${farmer.lastName}`, farmName: farmer.farmName },
  };
}
