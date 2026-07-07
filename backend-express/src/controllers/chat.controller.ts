import type { Response } from "express";
import { eq, or, and, asc, gt, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/index.js";
import {
  conversations,
  messages,
  listings,
  users,
  orders,
  wallets,
  walletLedgerEntries,
  transactions,
  payments,
} from "../db/schema.js";
import { createNotification } from "../utils/notifications.js";
import { pushToUser } from "../utils/wsServer.js";
import { createCheckoutLink } from "../utils/nomba.js";
import { generateOrderRef } from "../utils/orderRef.js";
import type { AuthRequest } from "../middleware/auth.js";

// ─── Three-day retention constant ─────────────────────────────────────────────
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMessage(m: typeof messages.$inferSelect) {
  return {
    message_id: m.messageId,
    conversation_id: m.conversationId,
    sender_id: m.senderId,
    content: m.content,
    type: m.type,
    offer_price_kobo: m.offerPriceKobo ?? null,
    offer_quantity: m.offerQuantity ? parseFloat(m.offerQuantity) : null,
    offer_unit: m.offerUnit ?? null,
    offer_expires_at: m.offerExpiresAt?.toISOString() ?? null,
    is_read: m.isRead,
    created_at: m.createdAt.toISOString(),
    expires_at: m.expiresAt.toISOString(),
  };
}

function formatConversation(
  conv: typeof conversations.$inferSelect,
  extra: {
    listing_name: string;
    listing_image: string | null;
    other_party_name: string;
    last_message_preview: string | null;
    unread_count: number;
  }
) {
  return {
    conversation_id: conv.conversationId,
    buyer_id: conv.buyerId,
    farmer_id: conv.farmerId,
    listing_id: conv.listingId,
    listing_name: extra.listing_name,
    listing_image: extra.listing_image,
    other_party_name: extra.other_party_name,
    last_message_preview: extra.last_message_preview,
    unread_count: extra.unread_count,
    last_message_at: conv.lastMessageAt.toISOString(),
    created_at: conv.createdAt.toISOString(),
  };
}

// ─── 1. POST /api/v1/conversations ────────────────────────────────────────────

const createConversationSchema = z.object({
  listing_id: z.string().uuid(),
});

export async function createConversation(req: AuthRequest, res: Response) {
  if (req.user!.role !== "buyer") {
    res.status(403).json({ error: "Only buyers can initiate conversations" });
    return;
  }

  const parsed = createConversationSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors });
    return;
  }

  const { listing_id } = parsed.data;

  const [listing] = await db
    .select({ farmerId: listings.farmerId, productName: listings.productName, images: listings.images })
    .from(listings)
    .where(eq(listings.listingId, listing_id))
    .limit(1);

  if (!listing) {
    res.status(404).json({ error: "Listing not found" });
    return;
  }
  if (listing.farmerId === req.user!.userId) {
    res.status(400).json({ error: "You cannot chat with yourself" });
    return;
  }

  // Upsert — return existing conversation if it exists
  const [existing] = await db
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.buyerId, req.user!.userId),
        eq(conversations.farmerId, listing.farmerId),
        eq(conversations.listingId, listing_id)
      )
    )
    .limit(1);

  if (existing) {
    const [farmerUser] = await db
      .select({ firstName: users.firstName, lastName: users.lastName })
      .from(users)
      .where(eq(users.id, listing.farmerId))
      .limit(1);

    const lastMsg = await db
      .select({ content: messages.content })
      .from(messages)
      .where(and(eq(messages.conversationId, existing.conversationId), gt(messages.expiresAt, new Date())))
      .orderBy(asc(messages.createdAt))
      .limit(1);

    const unreadRows = await db
      .select({ count: sql<number>`count(*)` })
      .from(messages)
      .where(
        and(
          eq(messages.conversationId, existing.conversationId),
          eq(messages.isRead, false),
          ne(messages.senderId, req.user!.userId)
        )
      );

    const images = listing.images as string[] | null;
    res.json(formatConversation(existing, {
      listing_name: listing.productName,
      listing_image: images?.[0] ?? null,
      other_party_name: farmerUser ? `${farmerUser.firstName} ${farmerUser.lastName}` : "Farmer",
      last_message_preview: lastMsg[0]?.content ?? null,
      unread_count: Number(unreadRows[0]?.count ?? 0),
    }));
    return;
  }

  const [conv] = await db.insert(conversations).values({
    buyerId: req.user!.userId,
    farmerId: listing.farmerId,
    listingId: listing_id,
  }).returning();

  const [farmerUser] = await db
    .select({ firstName: users.firstName, lastName: users.lastName })
    .from(users)
    .where(eq(users.id, listing.farmerId))
    .limit(1);

  const images = listing.images as string[] | null;
  res.status(201).json(formatConversation(conv!, {
    listing_name: listing.productName,
    listing_image: images?.[0] ?? null,
    other_party_name: farmerUser ? `${farmerUser.firstName} ${farmerUser.lastName}` : "Farmer",
    last_message_preview: null,
    unread_count: 0,
  }));
}

// ─── 2. GET /api/v1/conversations ────────────────────────────────────────────

export async function getConversations(req: AuthRequest, res: Response) {
  const userId = req.user!.userId;

  const convRows = await db
    .select()
    .from(conversations)
    .where(or(eq(conversations.buyerId, userId), eq(conversations.farmerId, userId)))
    .orderBy(asc(conversations.lastMessageAt));

  if (convRows.length === 0) {
    res.json([]);
    return;
  }

  // Fetch listing info and other-party info for each conversation
  const result = await Promise.all(
    convRows.map(async (conv) => {
      const otherPartyId = conv.buyerId === userId ? conv.farmerId : conv.buyerId;

      const [listing] = await db
        .select({ productName: listings.productName, images: listings.images })
        .from(listings)
        .where(eq(listings.listingId, conv.listingId))
        .limit(1);

      const [otherParty] = await db
        .select({ firstName: users.firstName, lastName: users.lastName })
        .from(users)
        .where(eq(users.id, otherPartyId))
        .limit(1);

      const lastMsgRows = await db
        .select({ content: messages.content })
        .from(messages)
        .where(and(eq(messages.conversationId, conv.conversationId), gt(messages.expiresAt, new Date())))
        .orderBy(asc(messages.createdAt))
        .limit(1);

      const unreadRows = await db
        .select({ count: sql<number>`count(*)` })
        .from(messages)
        .where(
          and(
            eq(messages.conversationId, conv.conversationId),
            eq(messages.isRead, false),
            ne(messages.senderId, userId)
          )
        );

      const images = listing?.images as string[] | null;
      return formatConversation(conv, {
        listing_name: listing?.productName ?? "Unknown listing",
        listing_image: images?.[0] ?? null,
        other_party_name: otherParty ? `${otherParty.firstName} ${otherParty.lastName}` : "User",
        last_message_preview: lastMsgRows[0]?.content ?? null,
        unread_count: Number(unreadRows[0]?.count ?? 0),
      });
    })
  );

  // Return sorted by last_message_at DESC
  res.json(result.sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()));
}

// ─── 3. GET /api/v1/conversations/:id ────────────────────────────────────────

export async function getConversation(req: AuthRequest, res: Response) {
  const id = String(req.params["id"]);
  const userId = req.user!.userId;

  const [conv] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.conversationId, id))
    .limit(1);

  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  if (conv.buyerId !== userId && conv.farmerId !== userId) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const otherPartyId = conv.buyerId === userId ? conv.farmerId : conv.buyerId;
  const [listing] = await db
    .select({ productName: listings.productName, images: listings.images })
    .from(listings)
    .where(eq(listings.listingId, conv.listingId))
    .limit(1);

  const [otherParty] = await db
    .select({ firstName: users.firstName, lastName: users.lastName })
    .from(users)
    .where(eq(users.id, otherPartyId))
    .limit(1);

  const unreadRows = await db
    .select({ count: sql<number>`count(*)` })
    .from(messages)
    .where(
      and(
        eq(messages.conversationId, id),
        eq(messages.isRead, false),
        ne(messages.senderId, userId)
      )
    );

  const recentMessages = await db
    .select()
    .from(messages)
    .where(and(eq(messages.conversationId, id), gt(messages.expiresAt, new Date())))
    .orderBy(asc(messages.createdAt))
    .limit(50);

  const images = listing?.images as string[] | null;
  const conversation = formatConversation(conv, {
    listing_name: listing?.productName ?? "Unknown listing",
    listing_image: images?.[0] ?? null,
    other_party_name: otherParty ? `${otherParty.firstName} ${otherParty.lastName}` : "User",
    last_message_preview: recentMessages.at(-1)?.content ?? null,
    unread_count: Number(unreadRows[0]?.count ?? 0),
  });

  res.json({ conversation, messages: recentMessages.map(formatMessage) });
}

// ─── 4. POST /api/v1/conversations/:id/messages ───────────────────────────────

const sendMessageSchema = z.object({
  content: z.string().min(1).max(2000),
  type: z.enum(["text", "offer"]).default("text"),
  offer_price_kobo: z.number().int().positive().optional(),
  offer_quantity: z.number().positive().optional(),
  offer_unit: z.string().min(1).max(30).optional(),
  offer_expires_hours: z.number().int().min(1).max(72).optional(),
});

export async function sendMessage(req: AuthRequest, res: Response) {
  const id = String(req.params["id"]);
  const userId = req.user!.userId;

  const [conv] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.conversationId, id))
    .limit(1);

  if (!conv) { res.status(404).json({ error: "Conversation not found" }); return; }
  if (conv.buyerId !== userId && conv.farmerId !== userId) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const parsed = sendMessageSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors });
    return;
  }

  const { content, type, offer_price_kobo, offer_quantity, offer_unit, offer_expires_hours } = parsed.data;

  // Only farmers can send offer messages
  if (type === "offer" && req.user!.role !== "farmer") {
    res.status(403).json({ error: "Only farmers can send price offers" });
    return;
  }
  if (type === "offer" && conv.farmerId !== userId) {
    res.status(403).json({ error: "You are not the farmer of this conversation" });
    return;
  }
  if (type === "offer" && (!offer_price_kobo || !offer_quantity || !offer_unit || !offer_expires_hours)) {
    res.status(400).json({ error: "Offer requires price, quantity, unit, and expiry hours" });
    return;
  }

  const expiresAt = new Date(Date.now() + THREE_DAYS_MS);
  const offerExpiresAt =
    type === "offer" ? new Date(Date.now() + offer_expires_hours! * 60 * 60 * 1000) : null;

  const [msg] = await db.insert(messages).values({
    conversationId: id,
    senderId: userId,
    content,
    type,
    offerPriceKobo: offer_price_kobo ?? null,
    offerQuantity: offer_quantity ? String(offer_quantity) : null,
    offerUnit: offer_unit ?? null,
    offerExpiresAt,
    expiresAt,
  }).returning();

  // Update last_message_at on conversation
  await db.update(conversations)
    .set({ lastMessageAt: new Date() })
    .where(eq(conversations.conversationId, id));

  const formatted = formatMessage(msg!);

  // Push real-time event to recipient
  const recipientId = conv.buyerId === userId ? conv.farmerId : conv.buyerId;
  pushToUser(recipientId, { type: "chat_message", conversation_id: id, message: formatted });

  // Create a notification for the recipient
  const [senderUser] = await db
    .select({ firstName: users.firstName, lastName: users.lastName })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const senderName = senderUser ? `${senderUser.firstName} ${senderUser.lastName}` : "Someone";
  const preview = content.length > 60 ? content.slice(0, 60) + "…" : content;

  await createNotification({
    userId: recipientId,
    type: "system",
    title: `New message from ${senderName}`,
    message: type === "offer" ? `New price offer: ${preview}` : preview,
    referenceId: id,
    referenceType: "conversation",
  });

  res.status(201).json(formatted);
}

// ─── 5. PATCH /api/v1/conversations/:id/read ─────────────────────────────────

export async function markConversationRead(req: AuthRequest, res: Response) {
  const id = String(req.params["id"]);
  const userId = req.user!.userId;

  const [conv] = await db
    .select({ buyerId: conversations.buyerId, farmerId: conversations.farmerId })
    .from(conversations)
    .where(eq(conversations.conversationId, id))
    .limit(1);

  if (!conv) { res.status(404).json({ error: "Conversation not found" }); return; }
  if (conv.buyerId !== userId && conv.farmerId !== userId) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const result = await db
    .update(messages)
    .set({ isRead: true })
    .where(
      and(
        eq(messages.conversationId, id),
        eq(messages.isRead, false),
        ne(messages.senderId, userId)
      )
    );

  res.json({ updated: (result as { rowCount?: number }).rowCount ?? 0 });
}

// ─── 6. POST /api/v1/conversations/:id/buy ────────────────────────────────────

const buyViaChatSchema = z.object({
  message_id: z.string().uuid(),
  delivery_method: z.enum(["pickup", "delivery"]),
  delivery_address: z.string().optional(),
  payment_method: z.enum(["wallet", "checkout"]),
});

export async function buyViaChat(req: AuthRequest, res: Response) {
  const convId = String(req.params["id"]);
  const userId = req.user!.userId;

  if (req.user!.role !== "buyer") {
    res.status(403).json({ error: "Only buyers can accept offers" });
    return;
  }

  const [conv] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.conversationId, convId))
    .limit(1);

  if (!conv) { res.status(404).json({ error: "Conversation not found" }); return; }
  if (conv.buyerId !== userId) { res.status(403).json({ error: "Access denied" }); return; }

  const parsed = buyViaChatSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors });
    return;
  }

  const { message_id, delivery_method, delivery_address, payment_method } = parsed.data;

  const [offerMsg] = await db
    .select()
    .from(messages)
    .where(and(eq(messages.messageId, message_id), eq(messages.conversationId, convId)))
    .limit(1);

  if (!offerMsg) { res.status(404).json({ error: "Message not found" }); return; }
  if (offerMsg.type !== "offer") { res.status(400).json({ error: "Message is not an offer" }); return; }
  if (!offerMsg.offerExpiresAt || offerMsg.offerExpiresAt < new Date()) {
    res.status(400).json({ error: "Offer has expired" });
    return;
  }

  const [listing] = await db
    .select()
    .from(listings)
    .where(eq(listings.listingId, conv.listingId))
    .limit(1);

  if (!listing) { res.status(404).json({ error: "Listing not found" }); return; }

  const quantity = offerMsg.offerQuantity ? parseFloat(offerMsg.offerQuantity) : 1;
  const pricePerUnitKobo = offerMsg.offerPriceKobo ?? listing.pricePerUnit;
  const totalAmountKobo = Math.round(quantity * pricePerUnitKobo);

  let orderRef!: string;
  for (let i = 0; i < 5; i++) {
    orderRef = generateOrderRef();
    const [exists] = await db.select({ orderRef: orders.orderRef }).from(orders).where(eq(orders.orderRef, orderRef)).limit(1);
    if (!exists) break;
  }

  let order: typeof orders.$inferSelect;

  if (payment_method === "wallet") {
    try {
      order = await db.transaction(async (tx) => {
        const [buyerWallet] = await tx.select().from(wallets).where(eq(wallets.userId, userId)).limit(1);
        if (!buyerWallet) throw new Error("Buyer wallet not found");
        if (buyerWallet.availableBalance < totalAmountKobo) throw new Error("Insufficient wallet balance");

        const [createdOrder] = await tx.insert(orders).values({
          orderRef,
          listingId: conv.listingId,
          farmerId: conv.farmerId,
          buyerId: userId,
          quantity: String(quantity),
          unitPrice: pricePerUnitKobo,
          totalAmount: totalAmountKobo,
          deliveryMethod: delivery_method,
          deliveryAddress: delivery_address ?? null,
          status: "payment_confirmed",
        }).returning();
        if (!createdOrder) throw new Error("Failed to create order");

        const newBuyerBalance = buyerWallet.availableBalance - totalAmountKobo;
        await tx.update(wallets).set({ availableBalance: newBuyerBalance, lastUpdated: new Date(), updatedAt: new Date() }).where(eq(wallets.walletId, buyerWallet.walletId));

        await tx.insert(walletLedgerEntries).values({
          walletId: buyerWallet.walletId, userId,
          type: "debit", amount: totalAmountKobo,
          balanceBefore: buyerWallet.availableBalance, balanceAfter: newBuyerBalance,
          referenceId: createdOrder.orderId, referenceType: "order",
          idempotencyKey: `buyer_debit_${createdOrder.orderId}`,
          description: `Chat offer purchase for ${listing.productName}`,
          status: "completed",
        });

        await tx.insert(transactions).values({
          walletId: buyerWallet.walletId, userId,
          type: "debit", amount: totalAmountKobo,
          balanceBefore: buyerWallet.availableBalance, balanceAfter: newBuyerBalance,
          referenceId: createdOrder.orderId, referenceType: "order",
          description: `Chat offer purchase for ${listing.productName}`,
          status: "completed",
        });

        await tx.insert(payments).values({
          orderId: createdOrder.orderId, buyerId: userId, farmerId: conv.farmerId,
          amount: totalAmountKobo, status: "success", paymentMethod: "wallet", paidAt: new Date(),
        });

        const [farmerWallet] = await tx.select().from(wallets).where(eq(wallets.userId, conv.farmerId)).limit(1);
        if (!farmerWallet) throw new Error("Farmer wallet not found");
        const newPending = farmerWallet.pendingBalance + totalAmountKobo;
        const newTotalIn = farmerWallet.totalPaidIn + totalAmountKobo;
        await tx.update(wallets).set({ pendingBalance: newPending, totalPaidIn: newTotalIn, lastUpdated: new Date(), updatedAt: new Date() }).where(eq(wallets.walletId, farmerWallet.walletId));

        await tx.insert(walletLedgerEntries).values({
          walletId: farmerWallet.walletId, userId: conv.farmerId,
          type: "credit", amount: totalAmountKobo,
          balanceBefore: farmerWallet.pendingBalance, balanceAfter: newPending,
          referenceId: createdOrder.orderId, referenceType: "order",
          idempotencyKey: `escrow_hold_${createdOrder.orderId}`,
          description: `Escrow credit for chat order ${createdOrder.orderRef}`,
          status: "completed",
        });

        await tx.insert(transactions).values({
          walletId: farmerWallet.walletId, userId: conv.farmerId,
          type: "credit", amount: totalAmountKobo,
          balanceBefore: farmerWallet.pendingBalance, balanceAfter: newPending,
          referenceId: createdOrder.orderId, referenceType: "order",
          description: `Escrow credit for chat order ${createdOrder.orderRef}`,
          status: "completed",
        });

        return createdOrder;
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unable to create wallet-paid order";
      const statusCode = msg.includes("wallet not found") ? 404 : msg.includes("Insufficient") ? 400 : 409;
      res.status(statusCode).json({ error: msg });
      return;
    }
  } else {
    const [createdOrder] = await db.insert(orders).values({
      orderRef,
      listingId: conv.listingId,
      farmerId: conv.farmerId,
      buyerId: userId,
      quantity: String(quantity),
      unitPrice: pricePerUnitKobo,
      totalAmount: totalAmountKobo,
      deliveryMethod: delivery_method,
      deliveryAddress: delivery_address ?? null,
      status: "pending_payment",
    }).returning();
    order = createdOrder!;
  }

  let checkoutLink: string | null = null;
  if (payment_method === "checkout") {
    try {
      const result = await createCheckoutLink({
        amountKobo: totalAmountKobo,
        customerEmail: req.user!.email,
        orderReference: order.orderRef,
        callbackUrl: `${process.env["FRONTEND_URL"] ?? "http://localhost:3000"}/dashboard/buyer/orders/${order.orderId}`,
        customerId: userId,
        allowedPaymentMethods: ["Card", "Transfer"],
        orderMetaData: { productName: listing.productName, quantity: String(quantity) },
        tokenizeCard: false,
        currency: "NGN",
      });
      checkoutLink = result.checkoutLink;
      await db.update(orders).set({ checkoutLink, nombaOrderReference: result.orderReference }).where(eq(orders.orderId, order.orderId));
    } catch (err) {
      console.error("[buyViaChat] Nomba checkout error:", err);
    }
  }

  // System message in the conversation: "Order placed ✓"
  const systemMsg = `Order #${order.orderRef} placed via chat offer ✓`;
  const sysExpiresAt = new Date(Date.now() + THREE_DAYS_MS);
  await db.insert(messages).values({
    conversationId: convId,
    senderId: userId,
    content: systemMsg,
    type: "text",
    expiresAt: sysExpiresAt,
  });
  await db.update(conversations).set({ lastMessageAt: new Date() }).where(eq(conversations.conversationId, convId));
  pushToUser(conv.farmerId, { type: "chat_message", conversation_id: convId, message: { content: systemMsg } });

  await createNotification({
    userId: conv.farmerId,
    type: "order",
    title: "New Order via Chat",
    message: `Order #${order.orderRef} placed from a chat offer for ${listing.productName}`,
    referenceId: order.orderId,
    referenceType: "order",
  });

  res.status(201).json({ order_id: order.orderId, checkout_link: checkoutLink });
}
