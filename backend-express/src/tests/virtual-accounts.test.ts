/**
 * virtual-accounts.test.ts — /api/v1/virtual-accounts routes
 *
 * POST /virtual-accounts          — create (buyer only)
 * GET  /virtual-accounts          — get my virtual account
 * PUT  /virtual-accounts/suspend  — suspend my virtual account
 * GET  /virtual-accounts/wallet/balance — wallet balance
 *
 * Nomba is mocked so tests run offline.
 */

import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import { randomUUID } from "node:crypto";
import app from "../app.js";
import { db } from "../db/index.js";
import { users, wallets, virtualAccounts } from "../db/schema.js";
import { eq } from "drizzle-orm";
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
    },
  }),
  getAuthRedirectUrl: (p: string) => `http://localhost${p}`,
  getSupabaseUserNameParts: () => ({ firstName: "T", lastName: "U" }),
  isSupabaseEmailVerified: () => true,
}));

// ─── Nomba mock — createVirtualAccount + suspendVirtualAccount ────────────────

vi.mock("../utils/nomba.js", () => ({
  createNombaCheckout: vi.fn().mockResolvedValue({ checkoutUrl: null }),
  initiateTransfer: vi.fn().mockResolvedValue({ success: true, merchantTxRef: "mock", status: "processing" }),
  lookupAccount: vi.fn().mockResolvedValue({ accountName: "Mock", account_number: "0000000000", bank_code: "000" }),
  getNigerianBanks: vi.fn().mockResolvedValue([]),
  getBankList: vi.fn().mockResolvedValue([]),
  verifyNombaPaymentIfPossible: vi.fn().mockResolvedValue(null),
  verifyTransaction: vi.fn().mockResolvedValue(null),
  cancelCheckoutOrder: vi.fn().mockResolvedValue({ success: true }),
  refundCheckoutPayment: vi.fn().mockResolvedValue({ success: true }),
  buildNombaSigningString: vi.fn().mockReturnValue(""),
  hmacDigest: vi.fn().mockReturnValue(""),
  verifyWebhookSignatureWithTimestamp: vi.fn().mockReturnValue(true),
  // Controller imports createVirtualAccount (not createNombaVirtualAccount)
  createVirtualAccount: vi.fn().mockResolvedValue({
    accountRef: "VA-mock-ref",
    accountHolderId: "holder-mock",
    accountName: "Test Buyer - HarvestLynk",
    bankAccountNumber: "1234567890",
    bankAccountName: "Test Buyer",
    bankName: "Nomba Test Bank",
    bvn: "",
    currency: "NGN",
    expired: false,
    createdAt: new Date().toISOString(),
  }),
  suspendVirtualAccount: vi.fn().mockResolvedValue(true),
}));

// ─── helpers ──────────────────────────────────────────────────────────────────

const BASE = "/api/v1/virtual-accounts";

async function insertUser(role: "farmer" | "buyer" = "buyer") {
  const userId = randomUUID();
  const email = `va-${userId.slice(0, 8)}@va.test`;
  await db.insert(users).values({
    id: userId, firstName: "VA", lastName: "User", email,
    passwordHash: "x", role, emailVerified: true, acceptedTerms: true,
  });
  await db.insert(wallets).values({ userId, availableBalance: 50000, pendingBalance: 0, totalPaidIn: 50000, totalPaidOut: 0 });
  const token = await signAccessToken({ userId, email, role });
  return { userId, email, token };
}

function auth(t: string) { return { Authorization: `Bearer ${t}` }; }

// ─── POST /virtual-accounts ───────────────────────────────────────────────────

describe("POST /api/v1/virtual-accounts", () => {
  it("401 without auth", async () => {
    const res = await request(app).post(BASE);
    expect(res.status).toBe(401);
  });

  it("creates virtual account for farmer too (both roles allowed)", async () => {
    const { token } = await insertUser("farmer");
    const res = await request(app).post(BASE).set(auth(token));
    // Farmers can now create virtual accounts to fund their wallet
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it("creates virtual account for buyer (201)", async () => {
    const { token } = await insertUser("buyer");
    const res = await request(app).post(BASE).set(auth(token));
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.virtualAccount).toBeDefined();
    expect(res.body.virtualAccount.bank_account_number).toBe("1234567890");
    expect(res.body.virtualAccount.status).toBe("active");
  });

  it("400 when buyer already has a virtual account", async () => {
    const { userId, token } = await insertUser("buyer");
    // Seed an existing virtual account — accountRef is NOT NULL UNIQUE
    await db.insert(virtualAccounts).values({
      userId,
      accountRef: `VA-existing-${userId}`,
      accountName: "Already There",
      bankName: "Existing Bank",
      bankAccountNumber: "9876543210",
      bankAccountName: "Already There",
      status: "active",
    });

    // Controller returns 400 (not 409) for duplicate
    const res = await request(app).post(BASE).set(auth(token));
    expect(res.status).toBe(400);
  });
});

// ─── GET /virtual-accounts ────────────────────────────────────────────────────

describe("GET /api/v1/virtual-accounts", () => {
  it("401 without auth", async () => {
    const res = await request(app).get(BASE);
    expect(res.status).toBe(401);
  });

  it("404 when no virtual account exists", async () => {
    const { token } = await insertUser("buyer");
    const res = await request(app).get(BASE).set(auth(token));
    // Controller returns 404 when not found
    expect(res.status).toBe(404);
  });

  it("returns virtual account details when one exists", async () => {
    const { userId, token } = await insertUser("buyer");
    await db.insert(virtualAccounts).values({
      userId,
      accountRef: `VA-get-${userId}`,
      accountName: "Test Buyer",
      bankName: "Test Bank",
      bankAccountNumber: "1234567890",
      bankAccountName: "Test Buyer",
      status: "active",
    });

    const res = await request(app).get(BASE).set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.virtualAccount).toBeDefined();
    expect(res.body.virtualAccount.bank_account_number).toBe("1234567890");
    expect(res.body.virtualAccount.bank_name).toBe("Test Bank");
    expect(res.body.virtualAccount.status).toBe("active");
  });
});

// ─── PUT /virtual-accounts/suspend ───────────────────────────────────────────

describe("PUT /api/v1/virtual-accounts/suspend", () => {
  it("401 without auth", async () => {
    const res = await request(app).put(`${BASE}/suspend`);
    expect(res.status).toBe(401);
  });

  it("404 when no virtual account exists to suspend", async () => {
    const { token } = await insertUser("buyer");
    const res = await request(app).put(`${BASE}/suspend`).set(auth(token));
    expect(res.status).toBe(404);
  });

  it("suspends an active virtual account", async () => {
    const { userId, token } = await insertUser("buyer");
    await db.insert(virtualAccounts).values({
      userId,
      accountRef: `VA-suspend-${userId}`,
      accountName: "Buyer",
      bankName: "Bank",
      bankAccountNumber: "0000000001",
      bankAccountName: "Buyer",
      status: "active",
    });

    const res = await request(app).put(`${BASE}/suspend`).set(auth(token));
    expect(res.status).toBe(200);

    const [va] = await db.select().from(virtualAccounts).where(eq(virtualAccounts.userId, userId)).limit(1);
    expect(va?.status).toBe("suspended");
  });

  it("400 when virtual account is already suspended", async () => {
    const { userId, token } = await insertUser("buyer");
    await db.insert(virtualAccounts).values({
      userId,
      accountRef: `VA-alreadysuspended-${userId}`,
      accountName: "Buyer",
      bankName: "Bank",
      bankAccountNumber: "0000000002",
      bankAccountName: "Buyer",
      status: "suspended",
    });

    const res = await request(app).put(`${BASE}/suspend`).set(auth(token));
    expect(res.status).toBe(400);
  });
});

// ─── GET /virtual-accounts/wallet/balance ─────────────────────────────────────

describe("GET /api/v1/virtual-accounts/wallet/balance", () => {
  it("401 without auth", async () => {
    const res = await request(app).get(`${BASE}/wallet/balance`);
    expect(res.status).toBe(401);
  });

  it("returns wallet balance for authenticated user", async () => {
    const { token } = await insertUser("buyer");
    const res = await request(app).get(`${BASE}/wallet/balance`).set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.wallet).toBeDefined();
    expect(res.body.wallet.available_balance).toBeDefined();
  });
});
