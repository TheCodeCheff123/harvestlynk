/**
 * orders-escrow.test.ts — escrow state machine
 *
 * PATCH /orders/:id/cancel               — cancel before/after payment
 * PATCH /orders/:id/request-refund       — refund for wallet-paid / checkout
 * PATCH /orders/:id/dispute              — freeze escrow
 * PATCH /orders/:id/request-cancellation — buyer asks farmer to cancel
 * PATCH /orders/:id/respond-cancellation — farmer accepts/rejects
 * PATCH /orders/:id/resolve-dispute      — admin resolves
 */

import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import { randomUUID } from "node:crypto";
import app from "../app.js";
import { db } from "../db/index.js";
import { users, orders, wallets, payments, walletLedgerEntries } from "../db/schema.js";
import { eq, and } from "drizzle-orm";
import { signAccessToken } from "../utils/jwt.js";

// ─── Supabase mock ────────────────────────────────────────────────────────────

vi.mock("../utils/supabase.js", () => ({
  getSupabaseAdmin: () => ({
    auth: {
      getUser: async (token: string) => {
        try {
          const [, b64] = token.split(".");
          const p = JSON.parse(Buffer.from(b64, "base64url").toString()) as { email?: string; userId?: string };
          if (p.email)
            return { data: { user: { id: `sb-${p.userId ?? "x"}`, email: p.email, email_confirmed_at: new Date().toISOString() } }, error: null };
        } catch { /* */ }
        return { data: { user: null }, error: { message: "invalid" } };
      },
      signUp: async () => ({ data: { user: null }, error: { message: "not used" } }),
    },
  }),
  getAuthRedirectUrl: (p: string) => `http://localhost${p}`,
  getSupabaseUserNameParts: () => ({ firstName: "T", lastName: "U" }),
  isSupabaseEmailVerified: () => true,
}));

// Also mock Nomba so cancel/refund calls don't hit real API
vi.mock("../utils/nomba.js", () => ({
  initiateTransfer: vi.fn().mockResolvedValue({ accepted: true, pending: false, data: { status: "SUCCESS" }, code: "00" }),
  lookupAccount: vi.fn().mockResolvedValue({ accountName: "Mock", account_number: "0000000000", bank_code: "000" }),
  getNigerianBanks: vi.fn().mockResolvedValue([]),
  getBankList: vi.fn().mockResolvedValue([]),
  createNombaCheckout: vi.fn().mockResolvedValue({ checkoutUrl: null }),
  createCheckoutLink: vi.fn().mockResolvedValue({ checkoutUrl: null, orderId: "mock-order-id" }),
  verifyNombaPaymentIfPossible: vi.fn().mockResolvedValue(null),
  verifyTransaction: vi.fn().mockResolvedValue(null),
  cancelCheckoutOrder: vi.fn().mockResolvedValue({ success: true }),
  refundCheckoutPayment: vi.fn().mockResolvedValue({ success: true }),
  buildNombaSigningString: vi.fn().mockReturnValue(""),
  hmacDigest: vi.fn().mockReturnValue(""),
  verifyWebhookSignatureWithTimestamp: vi.fn().mockReturnValue(true),
  createVirtualAccount: vi.fn().mockResolvedValue({ accountRef: "VA-mock", accountHolderId: "h", accountName: "Mock", bankAccountNumber: "0000000000", bankAccountName: "Mock", bankName: "Bank", bvn: "", currency: "NGN", expired: false, createdAt: new Date().toISOString() }),
  suspendVirtualAccount: vi.fn().mockResolvedValue(true),
}));

// ─── helpers ──────────────────────────────────────────────────────────────────

const BASE = "/api/v1/orders";
const BASE_MARKET = "/api/v1/marketplace";

async function insertUser(role: "farmer" | "buyer") {
  const userId = randomUUID();
  const email = `esc-${userId.slice(0, 8)}@escrow.test`;
  await db.insert(users).values({
    id: userId, firstName: role, lastName: "User", email,
    passwordHash: "x", role, emailVerified: true, acceptedTerms: true,
    livenessVerified: role === "farmer",
  });
  await db.insert(wallets).values({ userId, availableBalance: 0, pendingBalance: 0, totalPaidIn: 0, totalPaidOut: 0 });
  const token = await signAccessToken({ userId, email, role });
  return { userId, email, token };
}

function auth(t: string) { return { Authorization: `Bearer ${t}` }; }

const listingBody = {
  product_name: "Maize", category: "grains", quantity: 500,
  unit: "kg", price_per_unit: 40000, location_state: "Kwara",
};

async function setupOrder() {
  const farmer = await insertUser("farmer");
  const buyer = await insertUser("buyer");

  const listRes = await request(app)
    .post(`${BASE_MARKET}/listings`)
    .set(auth(farmer.token))
    .send(listingBody);
  if (!listRes.body.listing_id) throw new Error(`Listing failed: ${JSON.stringify(listRes.body)}`);

  const orderRes = await request(app)
    .post(BASE)
    .set(auth(buyer.token))
    .send({ listing_id: listRes.body.listing_id as string, quantity: 3, delivery_method: "pickup" });
  if (!orderRes.body.order_id) throw new Error(`Order failed: ${JSON.stringify(orderRes.body)}`);

  await db.update(orders).set({ status: "pending_payment" }).where(eq(orders.orderId, orderRes.body.order_id as string));

  return { farmer, buyer, orderId: orderRes.body.order_id as string };
}

/** Seeds a wallet-paid order (payment_confirmed state). */
async function setupWalletPaidOrder() {
  const { farmer, buyer, orderId } = await setupOrder();
  const [order] = await db.select().from(orders).where(eq(orders.orderId, orderId)).limit(1);
  const amountKobo = order!.totalAmount;

  await db.update(wallets).set({ pendingBalance: amountKobo }).where(eq(wallets.userId, farmer.userId));
  await db.update(wallets).set({ availableBalance: amountKobo * 5 }).where(eq(wallets.userId, buyer.userId));

  await db.insert(payments).values({
    orderId, buyerId: order!.buyerId, farmerId: order!.farmerId,
    amount: amountKobo, status: "success", paymentMethod: "wallet", paidAt: new Date(),
  });
  await db.update(orders).set({ status: "payment_confirmed" }).where(eq(orders.orderId, orderId));

  return { farmer, buyer, orderId, amountKobo };
}

// ─── PATCH /cancel — before payment ──────────────────────────────────────────

describe("PATCH /orders/:id/cancel — before payment", () => {
  it("cancels pending_payment without touching wallets", async () => {
    const { farmer, buyer, orderId } = await setupOrder();
    const [fw] = await db.select().from(wallets).where(eq(wallets.userId, farmer.userId)).limit(1);
    const pendingBefore = fw!.pendingBalance;

    const res = await request(app)
      .patch(`${BASE}/${orderId}/cancel`)
      .set(auth(buyer.token))
      .send({ reason: "Changed mind" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("cancelled");
    expect(res.body.refunded).toBe(false);

    const [fwAfter] = await db.select().from(wallets).where(eq(wallets.userId, farmer.userId)).limit(1);
    expect(fwAfter!.pendingBalance).toBe(pendingBefore);

    const ledger = await db.select().from(walletLedgerEntries).where(eq(walletLedgerEntries.referenceId, orderId));
    expect(ledger.length).toBe(0);
  });

  it("401 without auth", async () => {
    const { orderId } = await setupOrder();
    const res = await request(app).patch(`${BASE}/${orderId}/cancel`).send({ reason: "test" });
    expect(res.status).toBe(401);
  });
});

// ─── PATCH /cancel — after wallet payment ─────────────────────────────────────

describe("PATCH /orders/:id/cancel — after wallet payment", () => {
  it("reverses farmer pendingBalance and restores buyer availableBalance", async () => {
    const { farmer, buyer, orderId, amountKobo } = await setupWalletPaidOrder();

    const [fSnap] = await db.select().from(wallets).where(eq(wallets.userId, farmer.userId)).limit(1);
    const [bSnap] = await db.select().from(wallets).where(eq(wallets.userId, buyer.userId)).limit(1);

    const res = await request(app)
      .patch(`${BASE}/${orderId}/cancel`)
      .set(auth(buyer.token))
      .send({ reason: "Wrong item" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("cancelled");
    expect(res.body.refunded).toBe(true);

    const [fAfter] = await db.select().from(wallets).where(eq(wallets.userId, farmer.userId)).limit(1);
    expect(Number(fAfter!.pendingBalance)).toBe(Number(fSnap!.pendingBalance) - amountKobo);

    const [bAfter] = await db.select().from(wallets).where(eq(wallets.userId, buyer.userId)).limit(1);
    expect(Number(bAfter!.availableBalance)).toBe(Number(bSnap!.availableBalance) + amountKobo);

    const [pmt] = await db.select().from(payments)
      .where(and(eq(payments.orderId, orderId), eq(payments.paymentMethod, "wallet")))
      .limit(1);
    expect(pmt?.status).toBe("refunded");

    const ledger = await db.select().from(walletLedgerEntries).where(eq(walletLedgerEntries.referenceId, orderId));
    expect(ledger.length).toBeGreaterThanOrEqual(2);
  });

  it("400 when trying to cancel an in-progress order", async () => {
    const { buyer, orderId } = await setupWalletPaidOrder();
    await db.update(orders).set({ status: "processing" }).where(eq(orders.orderId, orderId));

    const res = await request(app)
      .patch(`${BASE}/${orderId}/cancel`)
      .set(auth(buyer.token))
      .send({ reason: "Too late" });

    expect(res.status).toBe(400);
  });
});

// ─── PATCH /request-refund ────────────────────────────────────────────────────

describe("PATCH /orders/:id/request-refund", () => {
  it("wallet-paid: immediately refunds buyer and reverses farmer escrow", async () => {
    const { buyer, orderId, amountKobo } = await setupWalletPaidOrder();

    const [bSnap] = await db.select().from(wallets).where(eq(wallets.userId, buyer.userId)).limit(1);

    const res = await request(app)
      .patch(`${BASE}/${orderId}/request-refund`)
      .set(auth(buyer.token))
      .send({ reason: "Damaged goods" });

    expect(res.status).toBe(200);
    expect(res.body.refunded).toBe(true);
    expect(res.body.status).toBe("cancelled");

    const [bAfter] = await db.select().from(wallets).where(eq(wallets.userId, buyer.userId)).limit(1);
    expect(Number(bAfter!.availableBalance)).toBe(Number(bSnap!.availableBalance) + amountKobo);
  });

  it("400 when order is still pending_payment", async () => {
    const { buyer, orderId } = await setupOrder();
    const res = await request(app)
      .patch(`${BASE}/${orderId}/request-refund`)
      .set(auth(buyer.token))
      .send({ reason: "test" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/cannot be refunded/i);
  });

  it("401 without auth", async () => {
    const { orderId } = await setupOrder();
    const res = await request(app).patch(`${BASE}/${orderId}/request-refund`).send({ reason: "test" });
    expect(res.status).toBe(401);
  });
});

// ─── PATCH /dispute ───────────────────────────────────────────────────────────

describe("PATCH /orders/:id/dispute", () => {
  it("sets status=disputed without moving wallet balances", async () => {
    const { farmer, buyer, orderId } = await setupWalletPaidOrder();
    await db.update(orders).set({ status: "processing" }).where(eq(orders.orderId, orderId));

    const [fw] = await db.select().from(wallets).where(eq(wallets.userId, farmer.userId)).limit(1);
    const pendingBefore = fw!.pendingBalance;

    const res = await request(app)
      .patch(`${BASE}/${orderId}/dispute`)
      .set(auth(buyer.token))
      .send({ reason: "Goods not as described" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("disputed");

    const [fwAfter] = await db.select().from(wallets).where(eq(wallets.userId, farmer.userId)).limit(1);
    expect(fwAfter!.pendingBalance).toBe(pendingBefore);
  });

  it("400 when order is pending_payment", async () => {
    const { buyer, orderId } = await setupOrder();
    const res = await request(app)
      .patch(`${BASE}/${orderId}/dispute`)
      .set(auth(buyer.token))
      .send({ reason: "test" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/cannot be disputed/i);
  });

  it("401 without auth", async () => {
    const res = await request(app).patch(`${BASE}/some-id/dispute`).send({ reason: "test" });
    expect(res.status).toBe(401);
  });
});

// ─── PATCH /request-cancellation ─────────────────────────────────────────────

describe("PATCH /orders/:id/request-cancellation", () => {
  it("sets status=cancellation_requested when order is processing", async () => {
    const { buyer, orderId } = await setupWalletPaidOrder();
    // Controller only allows processing or ready_for_pickup — advance the order
    await db.update(orders).set({ status: "processing" }).where(eq(orders.orderId, orderId));

    const res = await request(app)
      .patch(`${BASE}/${orderId}/request-cancellation`)
      .set(auth(buyer.token))
      .send({ reason: "Found cheaper source" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("cancellation_requested");
  });

  it("400 when order is payment_confirmed (must be processing/ready first)", async () => {
    const { buyer, orderId } = await setupWalletPaidOrder();
    // payment_confirmed is not in requestableStatuses
    const res = await request(app)
      .patch(`${BASE}/${orderId}/request-cancellation`)
      .set(auth(buyer.token))
      .send({ reason: "test" });
    expect(res.status).toBe(400);
  });

  it("400 for pending_payment order", async () => {
    const { buyer, orderId } = await setupOrder();
    const res = await request(app)
      .patch(`${BASE}/${orderId}/request-cancellation`)
      .set(auth(buyer.token))
      .send({ reason: "test" });
    expect(res.status).toBe(400);
  });
});

// ─── PATCH /respond-cancellation ─────────────────────────────────────────────

describe("PATCH /orders/:id/respond-cancellation", () => {
  it("farmer accepts → order becomes cancelled and funds reversed", async () => {
    const { farmer, buyer, orderId, amountKobo } = await setupWalletPaidOrder();
    await db.update(orders).set({ status: "cancellation_requested" }).where(eq(orders.orderId, orderId));

    const [bSnap] = await db.select().from(wallets).where(eq(wallets.userId, buyer.userId)).limit(1);

    const res = await request(app)
      .patch(`${BASE}/${orderId}/respond-cancellation`)
      .set(auth(farmer.token))
      .send({ accept: true });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("cancelled");

    const [bAfter] = await db.select().from(wallets).where(eq(wallets.userId, buyer.userId)).limit(1);
    expect(Number(bAfter!.availableBalance)).toBe(Number(bSnap!.availableBalance) + amountKobo);
  });

  it("farmer rejects → order returns to processing (controller hard-codes this)", async () => {
    const { farmer, orderId } = await setupWalletPaidOrder();
    await db.update(orders).set({ status: "cancellation_requested" }).where(eq(orders.orderId, orderId));

    const res = await request(app)
      .patch(`${BASE}/${orderId}/respond-cancellation`)
      .set(auth(farmer.token))
      .send({ accept: false });

    expect(res.status).toBe(200);
    // Controller always restores to "processing" when farmer rejects cancellation
    expect(res.body.status).toBe("processing");
  });

  it("400 when order is not cancellation_requested", async () => {
    const { farmer, orderId } = await setupWalletPaidOrder();
    const res = await request(app)
      .patch(`${BASE}/${orderId}/respond-cancellation`)
      .set(auth(farmer.token))
      .send({ accept: true });
    expect(res.status).toBe(400);
  });
});

// ─── PATCH /resolve-dispute ───────────────────────────────────────────────────

describe("PATCH /orders/:id/resolve-dispute", () => {
  it("full refund to buyer — restores buyer available and reduces farmer pending", async () => {
    const { farmer, buyer, orderId } = await setupWalletPaidOrder();
    await db.update(orders).set({ status: "disputed" }).where(eq(orders.orderId, orderId));

    const [bSnap] = await db.select().from(wallets).where(eq(wallets.userId, buyer.userId)).limit(1);
    const [fSnap] = await db.select().from(wallets).where(eq(wallets.userId, farmer.userId)).limit(1);

    // Controller expects: outcome (not resolution), resolution_notes (not notes)
    // Valid outcome values: "release_to_farmer" | "refund_to_buyer" | "partial_refund"
    const res = await request(app)
      .patch(`${BASE}/${orderId}/resolve-dispute`)
      .set(auth(farmer.token))
      .send({ outcome: "refund_to_buyer", resolution_notes: "Admin decision" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("cancelled");

    const [bAfter] = await db.select().from(wallets).where(eq(wallets.userId, buyer.userId)).limit(1);
    expect(Number(bAfter!.availableBalance)).toBeGreaterThanOrEqual(Number(bSnap!.availableBalance));

    const [fAfter] = await db.select().from(wallets).where(eq(wallets.userId, farmer.userId)).limit(1);
    expect(Number(fAfter!.pendingBalance)).toBeLessThanOrEqual(Number(fSnap!.pendingBalance));
  });

  it("400 for non-disputed order", async () => {
    const { farmer, orderId } = await setupWalletPaidOrder();
    const res = await request(app)
      .patch(`${BASE}/${orderId}/resolve-dispute`)
      .set(auth(farmer.token))
      .send({ outcome: "refund_to_buyer" });
    expect(res.status).toBe(400);
  });

  it("401 without auth", async () => {
    const res = await request(app).patch(`${BASE}/some-id/resolve-dispute`).send({ outcome: "released_to_farmer" });
    expect(res.status).toBe(401);
  });
});
