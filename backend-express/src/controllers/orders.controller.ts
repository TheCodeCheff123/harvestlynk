import type { Response } from "express";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/index.js";
import { orders, listings, users, wallets, transactions, walletLedgerEntries } from "../db/schema.js";
import { generateOrderRef } from "../utils/orderRef.js";
import { createNotification } from "../utils/notifications.js";
import { createCheckoutLink } from "../utils/nomba.js";
import type { AuthRequest } from "../middleware/auth.js";

const createOrderSchema = z.object({
  listing_id: z.string().uuid(),
  quantity: z.number().positive(),
  delivery_method: z.enum(["pickup", "delivery"]),
  delivery_address: z.string().nullable().optional(),
  special_instructions: z.string().nullable().optional(),
});

function escrowState(status: string): string {
  if (status === "pending_payment") return "awaiting_payment";
  if (["payment_confirmed", "processing", "ready_for_pickup"].includes(status)) return "secured_in_escrow";
  if (status === "completed") return "released_to_wallet";
  return status;
}

export async function createOrder(req: AuthRequest, res: Response) {
  const parsed = createOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors });
    return;
  }

  const { listing_id, quantity, delivery_method, delivery_address, special_instructions } = parsed.data;

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

  const totalAmount = Math.round(quantity * listing.pricePerUnit);
  let orderRef: string;

  // Retry to avoid rare collisions
  for (let i = 0; i < 5; i++) {
    orderRef = generateOrderRef();
    const [exists] = await db.select({ orderRef: orders.orderRef }).from(orders).where(eq(orders.orderRef, orderRef)).limit(1);
    if (!exists) break;
  }

  const [order] = await db.insert(orders).values({
    orderRef: orderRef!,
    listingId: listing_id,
    farmerId: listing.farmerId,
    buyerId: req.user!.userId,
    quantity: String(quantity),
    unitPrice: listing.pricePerUnit,
    totalAmount,
    deliveryMethod: delivery_method,
    deliveryAddress: delivery_address ?? null,
    specialInstructions: special_instructions ?? null,
  }).returning();

  // Generate Nomba checkout link
  let checkoutLink: string | null = null;
  let nombaOrderReference: string | null = null;
  try {
    const result = await createCheckoutLink({
      amountKobo: totalAmount * 100, // Convert Naira to Kobo
      customerEmail: req.user!.email,
      orderReference: order!.orderRef,
      callbackUrl: `${process.env["FRONTEND_URL"] ?? "http://localhost:3000"}/dashboard/buyer/orders/${order!.orderId}`,
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

    // Update order with checkout link
    await db.update(orders).set({ checkoutLink, nombaOrderReference }).where(eq(orders.orderId, order!.orderId));
  } catch (error) {
    console.error("[Nomba Checkout Error]", error);
    // If checkout link generation fails, order still exists but checkout will be retried
  }

  // Notify farmer
  await createNotification({
    userId: listing.farmerId,
    type: "order",
    title: "New Order Received",
    message: `You have a new order #${order!.orderRef} for ${listing.productName}`,
    referenceId: order!.orderId,
    referenceType: "order",
  });

  const [farmerUser] = await db.select({ firstName: users.firstName, lastName: users.lastName, farmName: users.farmName }).from(users).where(eq(users.id, listing.farmerId)).limit(1);

  res.status(201).json({ ...formatBuyerOrder(order!, listing, farmerUser!), checkout_link: checkoutLink });
}

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
    .select({ order: orders, listing: listings, buyer: { firstName: users.firstName, lastName: users.lastName } })
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
    completed_at: order.completedAt,
    created_at: order.createdAt,
    updated_at: order.updatedAt,
    listing: { product_name: listing.productName, unit: listing.unit },
    buyer: { name: `${buyer.firstName} ${buyer.lastName}` },
  })));
}

const FARMER_STATUS_TRANSITIONS: Record<string, string> = {
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

export async function cancelOrder(req: AuthRequest, res: Response) {
  const id = String(req.params["id"]);
  const reason = typeof req.body?.reason === "string" ? req.body.reason : undefined;

  const userId = req.user!.userId;

  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.orderId, id))
    .limit(1);

  if (!order) { res.status(404).json({ error: "Order not found" }); return; }

  const isBuyer = order.buyerId === userId;
  const isFarmer = order.farmerId === userId;

  if (!isBuyer && !isFarmer) { res.status(404).json({ error: "Order not found" }); return; }

  const cancellableStatuses = ["pending_payment", "payment_confirmed", "processing"];
  if (!cancellableStatuses.includes(order.status)) {
    res.status(400).json({ error: `Order in status '${order.status}' cannot be cancelled` });
    return;
  }

  const [updated] = await db
    .update(orders)
    .set({ status: "cancelled", cancelledBy: userId, cancellationReason: reason ?? null })
    .where(eq(orders.orderId, id))
    .returning();

  const notifyUserId = isBuyer ? order.farmerId : order.buyerId;
  await createNotification({
    userId: notifyUserId,
    type: "order",
    title: "Order Cancelled",
    message: `Order #${order.orderRef} has been cancelled`,
    referenceId: order.orderId,
    referenceType: "order",
  });

  res.json({ order_id: updated!.orderId, status: updated!.status });
}

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

  const [updated] = await db
    .update(orders)
    .set({ status: "payment_confirmed" })
    .where(eq(orders.orderId, id))
    .returning();

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

  const [wallet] = await db.select().from(wallets).where(eq(wallets.userId, order.farmerId)).limit(1);

  let orderUpdate = { status: "completed" as const, completedAt: new Date() };
  if (wallet) {
    const newPending = wallet.pendingBalance - order.totalAmount;
    const newAvailable = wallet.availableBalance + order.totalAmount;

    await db.update(wallets)
      .set({ pendingBalance: newPending, availableBalance: newAvailable, updatedAt: new Date() })
      .where(eq(wallets.walletId, wallet.walletId));

    await db.insert(walletLedgerEntries).values({
      walletId: wallet.walletId,
      userId: order.farmerId,
      type: "credit",
      amount: order.totalAmount,
      balanceBefore: wallet.availableBalance,
      balanceAfter: newAvailable,
      referenceId: order.orderId,
      referenceType: "order_release",
      description: `Release escrow for order ${order.orderRef}`,
      status: "completed",
      metadata: { orderRef: order.orderRef },
    });

    await db.insert(transactions).values({
      walletId: wallet.walletId,
      userId: order.farmerId,
      type: "credit",
      amount: order.totalAmount,
      balanceBefore: wallet.availableBalance,
      balanceAfter: newAvailable,
      description: `Release escrow for order ${order.orderRef}`,
      status: "completed",
    });
  }

  const [updated] = await db
    .update(orders)
    .set(orderUpdate)
    .where(eq(orders.orderId, id))
    .returning();

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
    completed_at: order.completedAt,
    created_at: order.createdAt,
    updated_at: order.updatedAt,
    checkout_link: order.checkoutLink,
    listing: { product_name: listing.productName, unit: listing.unit },
    farmer: { name: `${farmer.firstName} ${farmer.lastName}`, farmName: farmer.farmName },
  };
}
