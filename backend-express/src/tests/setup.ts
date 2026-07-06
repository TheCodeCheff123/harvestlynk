/**
 * Global test setup — runs once per test file via vitest config.
 *
 * Strategy for authentication:
 *   Every test file that needs authenticated routes uses vi.mock to intercept
 *   getSupabaseAdmin().auth.getUser(). The mock decodes our local JWT (signed by
 *   signAccessToken) to extract the user's email, so authenticate() can look up
 *   the local DB row without any Supabase round-trip.
 *
 *   insertTestUser() seeds a user + wallet directly into the DB and returns a
 *   signed local JWT — no signup/verify-email HTTP flow required.
 *
 * SAFETY: This file hard-fails when NODE_ENV !== "test" so it can never
 * run cleanAll() against a production database by accident.
 * vitest.config.ts sets envFile: ".env.test" and env: { NODE_ENV: "test" }
 * so the correct database URL is loaded before any test code runs.
 */

// Hard-fail immediately if someone accidentally runs tests against production.
if (process.env["NODE_ENV"] !== "test") {
  throw new Error(
    `[setup.ts] NODE_ENV is "${process.env["NODE_ENV"]}" — refusing to run test teardown outside of a test environment. ` +
    `Set NODE_ENV=test and point DATABASE_URL at a dedicated test database.`,
  );
}

// Do NOT import "dotenv/config" here. vitest.config.ts already loads .env.test
// via the `envFile` option before this file runs. Importing dotenv here would
// override those values with whatever is in .env (production credentials).
import { db } from "../db/index.js";
import {
  users,
  wallets,
  listings,
  orders,
  notifications,
  transactions,
  walletLedgerEntries,
  farmerRatings,
  scans,
  refreshTokens,
  payments,
  payouts,
  virtualAccounts,
} from "../db/schema.js";
import { afterAll, beforeEach } from "vitest";

async function cleanAll() {
  await db.delete(notifications);
  await db.delete(farmerRatings);
  await db.delete(transactions);
  await db.delete(walletLedgerEntries);
  await db.delete(payments);
  await db.delete(payouts);
  await db.delete(orders);
  await db.delete(virtualAccounts);
  await db.delete(scans);
  await db.delete(listings);
  await db.delete(refreshTokens);
  await db.delete(wallets);
  await db.delete(users);
}

beforeEach(cleanAll);
afterAll(cleanAll);
