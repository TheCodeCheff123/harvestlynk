/**
 * wallet.test.ts — /api/v1/wallet routes
 *
 * GET  /balance         — auto-create + return balances
 * GET  /transactions    — list user transactions
 * GET  /ledger          — list ledger entries
 * GET  /verify-bank     — mock Nomba account lookup
 * POST /withdraw        — debit wallet + initiate transfer
 * GET  /payout/:id/requery — requery stuck payout (mock Nomba)
 * POST /refresh         — sync missed VA credits from Nomba
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import request from "supertest";
import { randomUUID } from "node:crypto";
import app from "../app.js";
import { db } from "../db/index.js";
import { users, wallets, payouts, virtualAccounts } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { signAccessToken } from "../utils/jwt.js";
import * as nomba from "../utils/nomba.js";

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

// ─── Nomba mock — top-level so vi.mock is hoisted ─────────────────────────────

vi.mock("../utils/nomba.js", () => ({
  // Returns accepted:true so the controller marks payout as processing (no refund)
  initiateTransfer: vi.fn().mockResolvedValue({ accepted: true, pending: false, data: { status: "SUCCESS" }, code: "00" }),
  lookupAccount: vi.fn().mockResolvedValue({ accountName: "Test User", account_number: "0123456789", bank_code: "058" }),
  getNigerianBanks: vi.fn().mockResolvedValue([]),
  getBankList: vi.fn().mockResolvedValue([]),
  createNombaCheckout: vi.fn().mockResolvedValue({ checkoutUrl: null }),
  verifyNombaPaymentIfPossible: vi.fn().mockResolvedValue(null),
  verifyTransaction: vi.fn().mockResolvedValue(null),
  // POST-based requery — returns UNKNOWN so test stays non-5xx without settling
  requeryTransfer: vi.fn().mockResolvedValue({ status: "UNKNOWN", raw: {} }),
  cancelCheckoutOrder: vi.fn().mockResolvedValue({ success: true }),
  refundCheckoutPayment: vi.fn().mockResolvedValue({ success: true }),
  buildNombaSigningString: vi.fn().mockReturnValue(""),
  hmacDigest: vi.fn().mockReturnValue(""),
  verifyWebhookSignatureWithTimestamp: vi.fn().mockReturnValue(true),
  createVirtualAccount: vi.fn().mockResolvedValue({
    accountRef: "VA-mock",
    accountHolderId: "holder-1",
    accountName: "Mock Account",
    bankAccountNumber: "1234567890",
    bankAccountName: "Mock Buyer",
    bankName: "Nomba Test Bank",
    bvn: "",
    currency: "NGN",
    expired: false,
    createdAt: new Date().toISOString(),
  }),
  suspendVirtualAccount: vi.fn().mockResolvedValue(true),
  // By default return an empty list so refresh tests that don't override this are a no-op.
  fetchVirtualAccountTransactions: vi.fn().mockResolvedValue([]),
}));

// ─── helpers ──────────────────────────────────────────────────────────────────

const BASE = "/api/v1/wallet";

afterEach(() => { vi.restoreAllMocks(); });

async function insertUser(role: "farmer" | "buyer" = "farmer") {
  const userId = randomUUID();
  const email = `wal-${userId.slice(0, 8)}@wallet.test`;
  await db.insert(users).values({
    id: userId, firstName: "Wal", lastName: "User", email,
    passwordHash: "x", role, emailVerified: true, acceptedTerms: true,
  });
  await db.insert(wallets).values({ userId, availableBalance: 0, pendingBalance: 0, totalPaidIn: 0, totalPaidOut: 0 });
  const token = await signAccessToken({ userId, email, role });
  return { userId, email, token };
}

function auth(t: string) { return { Authorization: `Bearer ${t}` }; }

// ─── GET /balance ─────────────────────────────────────────────────────────────

describe("GET /api/v1/wallet/balance", () => {
  it("401 without auth", async () => {
    const res = await request(app).get(`${BASE}/balance`);
    expect(res.status).toBe(401);
  });

  it("returns zero balances for fresh user", async () => {
    const { token } = await insertUser();
    const res = await request(app).get(`${BASE}/balance`).set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.available_balance).toBe("0");
    expect(res.body.pending_balance).toBe("0");
    expect(res.body.total_paid_in).toBe("0");
    expect(res.body.wallet_id).toBeDefined();
  });

  it("auto-creates wallet if missing and returns it", async () => {
    const userId = randomUUID();
    const email = `auto-${userId.slice(0, 8)}@wallet.test`;
    await db.insert(users).values({ id: userId, firstName: "A", lastName: "B", email, passwordHash: "x", role: "buyer", emailVerified: true });
    const token = await signAccessToken({ userId, email, role: "buyer" });

    const res = await request(app).get(`${BASE}/balance`).set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.wallet_id).toBeDefined();
  });

  it("returns updated balance after manual DB update", async () => {
    const { userId, token } = await insertUser();
    await db.update(wallets).set({ availableBalance: 150000 }).where(eq(wallets.userId, userId));
    const res = await request(app).get(`${BASE}/balance`).set(auth(token));
    expect(res.body.available_balance).toBe("150000");
  });
});

// ─── GET /transactions ────────────────────────────────────────────────────────

describe("GET /api/v1/wallet/transactions", () => {
  it("401 without auth", async () => {
    const res = await request(app).get(`${BASE}/transactions`);
    expect(res.status).toBe(401);
  });

  it("returns empty array when no transactions", async () => {
    const { token } = await insertUser();
    const res = await request(app).get(`${BASE}/transactions`).set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("returns transaction after a withdrawal", async () => {
    const { userId, token } = await insertUser();
    await db.update(wallets).set({ availableBalance: 100000 }).where(eq(wallets.userId, userId));

    await request(app).post(`${BASE}/withdraw`).set(auth(token)).send({
      amount: 50000, bank_name: "GTBank", bank_code: "058",
      account_number: "0123456789", account_name: "Test User",
    });

    const res = await request(app).get(`${BASE}/transactions`).set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body[0].type).toBe("debit");
    expect(res.body[0].transaction_id).toBeDefined();
  });
});

// ─── GET /ledger ──────────────────────────────────────────────────────────────

describe("GET /api/v1/wallet/ledger", () => {
  it("401 without auth", async () => {
    const res = await request(app).get(`${BASE}/ledger`);
    expect(res.status).toBe(401);
  });

  it("returns empty array when no ledger entries", async () => {
    const { token } = await insertUser();
    const res = await request(app).get(`${BASE}/ledger`).set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

// ─── GET /verify-bank ─────────────────────────────────────────────────────────

describe("GET /api/v1/wallet/verify-bank", () => {
  it("401 without auth", async () => {
    const res = await request(app).get(`${BASE}/verify-bank?bank_code=058&account_number=0123456789`);
    expect(res.status).toBe(401);
  });

  it("400 when bank_code missing", async () => {
    const { token } = await insertUser();
    const res = await request(app).get(`${BASE}/verify-bank?account_number=0123456789`).set(auth(token));
    expect(res.status).toBe(400);
  });

  it("400 when account_number missing", async () => {
    const { token } = await insertUser();
    const res = await request(app).get(`${BASE}/verify-bank?bank_code=058`).set(auth(token));
    expect(res.status).toBe(400);
  });

  it("returns verified account name via mocked Nomba lookup", async () => {
    const { token } = await insertUser();
    // lookupAccount is mocked at module level to return { accountName: "Test User", ... }
    const res = await request(app)
      .get(`${BASE}/verify-bank?bank_code=058&account_number=0123456789`)
      .set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.account_name).toBeDefined();
  });
});

// ─── POST /withdraw ───────────────────────────────────────────────────────────

describe("POST /api/v1/wallet/withdraw", () => {
  it("401 without auth", async () => {
    const res = await request(app).post(`${BASE}/withdraw`).send({
      amount: 5000, bank_name: "GTB", bank_code: "058", account_number: "0123456789", account_name: "John",
    });
    expect(res.status).toBe(401);
  });

  it("400 when balance insufficient", async () => {
    const { token } = await insertUser();
    const res = await request(app).post(`${BASE}/withdraw`).set(auth(token)).send({
      amount: 50000, bank_name: "GTBank", bank_code: "058", account_number: "0123456789", account_name: "John",
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/insufficient/i);
  });

  it("400 for amount = 0", async () => {
    const { token } = await insertUser();
    const res = await request(app).post(`${BASE}/withdraw`).set(auth(token)).send({
      amount: 0, bank_name: "GTBank", bank_code: "058", account_number: "0123456789", account_name: "John",
    });
    expect(res.status).toBe(400);
  });

  it("400 when bank_code missing", async () => {
    const { token } = await insertUser();
    const res = await request(app).post(`${BASE}/withdraw`).set(auth(token)).send({
      amount: 5000, bank_name: "GTBank", account_number: "0123456789", account_name: "John",
    });
    expect(res.status).toBe(400);
  });

  it("deducts balance and returns transaction_id on success", async () => {
    const { userId, token } = await insertUser();
    await db.update(wallets).set({ availableBalance: 100000 }).where(eq(wallets.userId, userId));

    const res = await request(app).post(`${BASE}/withdraw`).set(auth(token)).send({
      amount: 40000, bank_name: "GTBank", bank_code: "058", account_number: "0123456789", account_name: "John Farmer",
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.transaction_id).toBeDefined();
    // code "00" → pending: false → status "pending"; code "01" → "processing"
    expect(["pending", "processing"]).toContain(res.body.status);

    const [w] = await db.select().from(wallets).where(eq(wallets.userId, userId)).limit(1);
    expect(Number(w!.availableBalance)).toBe(60000);
  });

  it("idempotent — same Idempotency-Key returns same transaction_id", async () => {
    const { userId, token } = await insertUser();
    await db.update(wallets).set({ availableBalance: 100000 }).where(eq(wallets.userId, userId));

    const headers = { ...auth(token), "Idempotency-Key": `idem-withdraw-${randomUUID()}` };
    const payload = { amount: 30000, bank_name: "GTBank", bank_code: "058", account_number: "0123456789", account_name: "John" };

    const r1 = await request(app).post(`${BASE}/withdraw`).set(headers).send(payload);
    const r2 = await request(app).post(`${BASE}/withdraw`).set(headers).send(payload);

    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
    expect(r1.body.transaction_id).toBe(r2.body.transaction_id);
    expect(r2.body.idempotent).toBe(true);

    // Balance should only be debited once
    const [w] = await db.select().from(wallets).where(eq(wallets.userId, userId)).limit(1);
    expect(Number(w!.availableBalance)).toBe(70000);
  });
});

// ─── GET /payout/:id/requery ──────────────────────────────────────────────────

describe("GET /api/v1/wallet/payout/:id/requery", () => {
  it("401 without auth", async () => {
    const res = await request(app).get(`${BASE}/payout/some-id/requery`);
    expect(res.status).toBe(401);
  });

  it("404 for unknown payout", async () => {
    const { token } = await insertUser();
    const res = await request(app)
      .get(`${BASE}/payout/00000000-0000-0000-0000-000000000000/requery`)
      .set(auth(token));
    expect(res.status).toBe(404);
  });

  it("returns payout status after mocked requery", async () => {
    const { userId, token } = await insertUser();
    const transferRef = `requery-${Date.now()}`;

    const [payout] = await db.insert(payouts).values({
      farmerId: userId,
      grossAmount: 50000,
      commissionAmount: 0,
      netAmount: 50000,
      commissionRate: "0.0000",
      nombaReference: transferRef,
      merchantTxRef: transferRef,
      status: "processing",
    }).returning();

    const res = await request(app)
      .get(`${BASE}/payout/${payout!.payoutId}/requery`)
      .set(auth(token));

    // Result depends on requery logic — accept any non-5xx
    expect(res.status).toBeLessThan(500);
  });
});

// ─── POST /refresh ────────────────────────────────────────────────────────────

describe("POST /api/v1/wallet/refresh", () => {
  it("401 without auth", async () => {
    const res = await request(app).post(`${BASE}/refresh`);
    expect(res.status).toBe(401);
  });

  it("404 when user has no virtual account", async () => {
    const { token } = await insertUser();
    const res = await request(app).post(`${BASE}/refresh`).set(auth(token));
    expect(res.status).toBe(404);
  });

  it("returns synced:0 when Nomba returns no new transactions", async () => {
    const { userId, token } = await insertUser();

    await db.insert(virtualAccounts).values({
      userId,
      accountRef: `VA-refresh-empty-${userId}`,
      accountName: "Test",
      bankName: "Test Bank",
      bankAccountNumber: "1111111111",
      bankAccountName: "Test User",
      nombaAccountId: "nomba-acct-id-1",
      status: "active",
    });

    // fetchVirtualAccountTransactions default mock returns []
    const res = await request(app).post(`${BASE}/refresh`).set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.synced).toBe(0);
    expect(res.body.wallet_balance).toBeDefined();
  });

  it("credits wallet for unseen Nomba transactions and returns synced count", async () => {
    const { userId, token } = await insertUser();

    await db.insert(virtualAccounts).values({
      userId,
      accountRef: `VA-refresh-credit-${userId}`,
      accountName: "Test",
      bankName: "Test Bank",
      bankAccountNumber: "2222222222",
      bankAccountName: "Test User",
      nombaAccountId: "nomba-acct-id-2",
      status: "active",
    });

    // Override the mock to return one new inflow transaction (₦500 = 50000 kobo)
    vi.spyOn(nomba, "fetchVirtualAccountTransactions").mockResolvedValueOnce([
      {
        transactionRef: `txref-${userId}-001`,
        amount: 500,
        type: "credit",
        status: "successful",
        currency: "NGN",
      },
    ]);

    const res = await request(app).post(`${BASE}/refresh`).set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.synced).toBe(1);

    // Wallet should now have ₦500 (50000 kobo) credited.
    const [w] = await db.select().from(wallets).where(eq(wallets.userId, userId)).limit(1);
    expect(Number(w!.availableBalance)).toBe(50000);
  });

  it("is idempotent — same Nomba transaction is not double-credited", async () => {
    const { userId, token } = await insertUser();

    await db.insert(virtualAccounts).values({
      userId,
      accountRef: `VA-refresh-idem-${userId}`,
      accountName: "Test",
      bankName: "Test Bank",
      bankAccountNumber: "3333333333",
      bankAccountName: "Test User",
      nombaAccountId: "nomba-acct-id-3",
      status: "active",
    });

    const sameNombaTx = [
      {
        transactionRef: `txref-${userId}-idem`,
        amount: 200,
        type: "credit",
        status: "successful",
        currency: "NGN",
      },
    ];

    vi.spyOn(nomba, "fetchVirtualAccountTransactions").mockResolvedValueOnce(sameNombaTx);
    const r1 = await request(app).post(`${BASE}/refresh`).set(auth(token));
    expect(r1.body.synced).toBe(1);

    vi.spyOn(nomba, "fetchVirtualAccountTransactions").mockResolvedValueOnce(sameNombaTx);
    const r2 = await request(app).post(`${BASE}/refresh`).set(auth(token));
    expect(r2.body.synced).toBe(0); // already in ledger — not credited again

    const [w] = await db.select().from(wallets).where(eq(wallets.userId, userId)).limit(1);
    expect(Number(w!.availableBalance)).toBe(20000); // ₦200 = 20000 kobo, once only
  });

  it("502 when Nomba is unreachable", async () => {
    const { userId, token } = await insertUser();

    await db.insert(virtualAccounts).values({
      userId,
      accountRef: `VA-refresh-err-${userId}`,
      accountName: "Test",
      bankName: "Test Bank",
      bankAccountNumber: "4444444444",
      bankAccountName: "Test User",
      nombaAccountId: "nomba-acct-id-4",
      status: "active",
    });

    vi.spyOn(nomba, "fetchVirtualAccountTransactions").mockRejectedValueOnce(new Error("network timeout"));

    const res = await request(app).post(`${BASE}/refresh`).set(auth(token));
    expect(res.status).toBe(502);
    expect(res.body.error).toMatch(/nomba/i);
  });
});
